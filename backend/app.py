import os
from dotenv import load_dotenv
load_dotenv()

db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'root'),
    'database': os.getenv('DB_NAME', 'exit404_game'),
    'port': int(os.getenv('DB_PORT', 3306))
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

def init_database():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS players (
                id INT AUTO_INCREMENT PRIMARY KEY,
                player_name VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scores (
                id INT AUTO_INCREMENT PRIMARY KEY,
                player_id INT,
                total_score INT NOT NULL,
                ending_type VARCHAR(50),
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player_id) REFERENCES players(id)
            )
        ''')
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return False
