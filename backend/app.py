from flask import Flask, request, jsonify
import mysql.connector
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# -----------------------
# DATABASE CONFIG
# -----------------------
db_config = {
    "host": os.getenv("MYSQLHOST"),
    "user": os.getenv("MYSQLUSER"),
    "password": os.getenv("MYSQLPASSWORD"),
    "database": os.getenv("MYSQLDATABASE"),
    "port": int(os.getenv("MYSQLPORT", 55677))
}

# -----------------------
# DB CONNECTION
# -----------------------
def get_connection():
    return mysql.connector.connect(**db_config)


# -----------------------
# TEST DATABASE
# -----------------------
@app.route("/api/test-db")
def test_db():
    try:
        conn = get_connection()
        conn.close()
        return {"success": True, "status": "Database connected successfully"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# -----------------------
# REGISTER PLAYER
# -----------------------
@app.route("/api/register", methods=["POST"])
def register_player():
    try:
        data = request.json
        player_name = data.get("player_name")

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT IGNORE INTO players (player_name) VALUES (%s)",
            (player_name,)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {"success": True}

    except Exception as e:
        return {"success": False, "error": str(e)}


# -----------------------
# SAVE SCORE
# -----------------------
@app.route("/api/save-score", methods=["POST"])
def save_score():
    try:
        data = request.json

        player_name = data.get("player_name")
        total_score = data.get("total_score")
        ending_type = data.get("ending_type")

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO scores (player_name, total_score, ending_type)
            VALUES (%s, %s, %s)
            """,
            (player_name, total_score, ending_type)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {"success": True}

    except Exception as e:
        return {"success": False, "error": str(e)}


# -----------------------
# LEADERBOARD
# -----------------------
@app.route("/api/leaderboard")
def leaderboard():
    try:
        limit = request.args.get("limit", 10)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
        SELECT player_name, total_score, ending_type, created_at
        FROM scores
        ORDER BY total_score DESC
        LIMIT %s
        """, (limit,))

        scores = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "leaderboard": scores
        })

    except Exception as e:
        return {"success": False, "error": str(e)}


# -----------------------
# ROOT
# -----------------------
@app.route("/")
def home():
    return {"message": "Game backend running"}


# -----------------------
# RUN SERVER
# -----------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
