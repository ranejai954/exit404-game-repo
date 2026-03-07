from flask import Flask, request, jsonify
import mysql.connector
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Database config from Railway environment variables
db_config = {
    "host": os.getenv("MYSQLHOST"),
    "user": os.getenv("MYSQLUSER"),
    "password": os.getenv("MYSQLPASSWORD"),
    "database": os.getenv("MYSQLDATABASE"),
    "port": int(os.getenv("MYSQLPORT", 3306))
}


# Create DB connection
def get_connection():
    return mysql.connector.connect(**db_config)

@app.route("/debug")
def debug():
    return {
        "host": os.getenv("MYSQLHOST"),
        "user": os.getenv("MYSQLUSER"),
        "db": os.getenv("MYSQLDATABASE")
    }

# -----------------------
# TEST DATABASE
# -----------------------
@app.route("/api/test-db")
def test_db():
    try:
        conn = get_connection()
        conn.close()
        return {"status": "Database connected successfully"}
    except Exception as e:
        return {"error": str(e)}


# -----------------------
# INITIALIZE DATABASE
# -----------------------
@app.route("/api/init-db")
def init_db():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS players (
            id INT AUTO_INCREMENT PRIMARY KEY,
            player_name VARCHAR(50) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS scores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            player_name VARCHAR(50),
            total_score INT,
            ending_type VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        conn.commit()
        cursor.close()
        conn.close()

        return {"success": True, "message": "Tables created successfully"}

    except Exception as e:
        return {"error": str(e)}


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
            "INSERT INTO scores (player_name, total_score, ending_type) VALUES (%s, %s, %s)",
            (player_name, total_score, ending_type)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {"success": True}

    except Exception as e:
        return {"error": str(e)}


# -----------------------
# LEADERBOARD
# -----------------------
@app.route("/api/leaderboard")
def leaderboard():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
        SELECT player_name, total_score, ending_type, created_at
        FROM scores
        ORDER BY total_score DESC
        LIMIT 10
        """)

        scores = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(scores)

    except Exception as e:
        return {"error": str(e)}


# -----------------------
# ROOT
# -----------------------
@app.route("/")
def home():
    return {"message": "Game backend running"}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
