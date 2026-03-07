# app.py - SIMPLIFIED VERSION
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Allow all origins for testing

# Database configuration - UPDATE THESE VALUES!
db_config = {
    'host': 'localhost',
    'user': 'root',  # Change this to your MySQL username
    'password': 'root',  # Change this to your MySQL password
    'database': 'exit404_game'
}

def init_database():
    """Initialize database with required tables"""
    try:
        # First connect without database to create it
        conn = mysql.connector.connect(
            host=db_config['host'],
            user=db_config['user'],
            password=db_config['password']
        )
        cursor = conn.cursor()
        
        # Create database if it doesn't exist
        cursor.execute("CREATE DATABASE IF NOT EXISTS exit404_game")
        cursor.execute("USE exit404_game")
        
        # Create players table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS players (
                id INT AUTO_INCREMENT PRIMARY KEY,
                player_name VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create scores table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scores (
                id INT AUTO_INCREMENT PRIMARY KEY,
                player_name VARCHAR(50) NOT NULL,
                total_score INT DEFAULT 0,
                ending_type VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Database initialized successfully!")
        return True
        
    except mysql.connector.Error as err:
        print(f"❌ Database error: {err}")
        return False

@app.route('/')
def home():
    return "🎮 EXIT 404 Game API is running!"

@app.route('/api/register', methods=['POST'])
def register_player():
    """Simple player registration"""
    try:
        data = request.json
        player_name = data.get('player_name', '').strip()
        
        if not player_name:
            return jsonify({'error': 'Player name required'}), 400
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        # Check if player exists
        cursor.execute("SELECT * FROM players WHERE player_name = %s", (player_name,))
        player = cursor.fetchone()
        
        if player:
            player_id = player['id']
        else:
            # Create new player
            cursor.execute("INSERT INTO players (player_name) VALUES (%s)", (player_name,))
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
    """Save game score"""
    try:
        data = request.json
        player_name = data.get('player_name')
        total_score = data.get('total_score', 0)
        ending_type = data.get('ending_type', 'unknown')
        
        if not player_name:
            return jsonify({'error': 'Player name required'}), 400
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # Insert score
        cursor.execute('''
            INSERT INTO scores (player_name, total_score, ending_type)
            VALUES (%s, %s, %s)
        ''', (player_name, total_score, ending_type))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Score saved'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get top 10 scores"""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute('''
            SELECT 
                player_name,
                total_score,
                ending_type,
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as date
            FROM scores
            ORDER BY total_score DESC
            LIMIT 10
        ''')
        
        scores = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Add rankings
        leaderboard = []
        for i, score in enumerate(scores, 1):
            medal = ""
            if i == 1:
                medal = "gold"
            elif i == 2:
                medal = "silver"
            elif i == 3:
                medal = "bronze"
            
            leaderboard.append({
                'rank': i,
                'medal': medal,
                'player_name': score['player_name'],
                'score': score['total_score'],
                'ending_type': score['ending_type'],
                'date': score['date']
            })
        
        return jsonify({'success': True, 'leaderboard': leaderboard})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/test-db', methods=['GET'])
def test_db():
    """Test database connection"""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        cursor.execute("SELECT 'Database connection successful!' as message")
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'message': result[0]})
    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 500

if __name__ == '__main__':
    print("🚀 Starting EXIT 404 Game API Server...")
    print("Initializing database...")
    if init_database():
        print("✅ Database ready!")
        print("🌐 Starting Flask server on http://localhost:5000")
        app.run(debug=True, port=5000)
    else:
        print("❌ Failed to initialize database. Please check MySQL connection.")