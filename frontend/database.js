// database.js - Simplified database functions
const API_BASE_URL = 'https://exit404-game-repo-production.up.railway.app/save';
let currentPlayerId = null;

// Register player
async function registerPlayer(playerName) {
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                player_name: playerName
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentPlayerId = data.player_id;
            localStorage.setItem('exit404_player_id', data.player_id);
            localStorage.setItem('exit404_player_name', playerName);
            console.log(`Registered player: ${playerName} (ID: ${data.player_id})`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Database offline, using localStorage:', error);
        return false; // Fallback to localStorage
    }
}

// Save score
async function saveScore(totalScore, endingType) {
    const playerName = localStorage.getItem('exit404_player_name') || 'Anonymous';
    
    try {
        const response = await fetch(`${API_BASE_URL}/save-score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                player_name: playerName,
                total_score: totalScore,
                ending_type: endingType
            })
        });
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Failed to save score to database:', error);
        return false;
    }
}

// Get leaderboard
async function getLeaderboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard`);
        const data = await response.json();
        
        if (data.success) {
            return data.leaderboard;
        }
        return [];
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        return [];
    }
}

// Test database connection
async function testDatabase() {
    try {
        const response = await fetch(`${https://exit404-game-repo-production.up.railway.app/testdb}/test-db`);
        const data = await response.json();
        return data.success;
    } catch (error) {
        return false;
    }
}
