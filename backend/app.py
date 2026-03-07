from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import os

app = Flask(__name__)
CORS(app)

# Database configuration
db_config = {
    "host": os.getenv("MYSQLHOST"),
    "user": os.getenv("MYSQLUSER"),
    "password": os.getenv("MYSQLPASSWORD"),
    "database": os.getenv("MYSQLDATABASE"),
    "port": int(os.getenv("MYSQLPORT", 3306))
}


def get_connection():
    return mysql.connector.connect(**db_config)


@app.route('/')
def home():
    return "🎮 EXIT 404 Game API is running!"


@app.route('/api/register', methods=['POST'])
def register_player():
    try:
        data = request.json
        player_name = data.get('player_name', '').strip()

        if not player_name:
            return jsonify({'error': 'Player name required'}), 400

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM players WHERE player_name=%s", (player_name,))
        player = cursor.fetchone()

        if player:
            player_id = player['id']
        else:
            cursor.execute(
                "INSERT INTO players (player_name) VALUES (%s)",
                (player_name,)
            )
            conn.commit()
            player_id = cursor.lastrowid

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'player_id': player_id,
            'player_name': player_name
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/save-score', methods=['POST'])
def save_score():
    try:
        data = request.json

        player_name = data.get('player_name')
        total_score = data.get('total_score', 0)
        ending_type = data.get('ending_type', 'unknown')

        if not player_name:
            return jsonify({'error': 'Player name required'}), 400

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO scores (player_name, total_score, ending_type)
            VALUES (%s, %s, %s)
        """, (player_name, total_score, ending_type))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Score saved successfully'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
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

        leaderboard = []

        for i, score in enumerate(scores, start=1):
            leaderboard.append({
                "rank": i,
                "player_name": score["player_name"],
                "score": score["total_score"],
                "ending_type": score["ending_type"],
                "date": score["created_at"].strftime("%Y-%m-%d %H:%M")
            })

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "leaderboard": leaderboard
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/test-db')
def test_db():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT 1")
        cursor.fetchone()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Database connection successful"
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/api/init-db")
def init_db():
    conn = mysql.connector.connect(**db_config)
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

    return {"success": True, "message": "Tables created"}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
