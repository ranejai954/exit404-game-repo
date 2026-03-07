from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import os

app = Flask(__name__)
CORS(app)

# Database configuration
db_config = {
    'host': os.getenv("DB_HOST", "localhost"),
    'user': os.getenv("DB_USER", "root"),
    'password': os.getenv("DB_PASSWORD", "root"),
    'database': os.getenv("DB_NAME", "exit404_game")
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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
