// db.js - Database functions for EXIT 404

// Railway backend URL
const API_BASE_URL = "https://exit404-game-repo-production.up.railway.app/api";

let currentPlayerName = null;


// -----------------------------
// REGISTER PLAYER
// -----------------------------
async function registerPlayer(playerName) {
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                player_name: playerName
            })
        });

        const data = await response.json();

        if (data.success) {
            currentPlayerName = playerName;

            localStorage.setItem("exit404_player_name", playerName);

            console.log("Player registered:", playerName);
            return true;
        } else {
            console.error("Register failed:", data.error);
            return false;
        }

    } catch (error) {
        console.error("Database offline:", error);
        return false;
    }
}


// -----------------------------
// SAVE SCORE
// -----------------------------
async function saveScore(totalScore, endingType) {

    const playerName = localStorage.getItem("exit404_player_name") || "Anonymous";

    try {

        const response = await fetch(`${API_BASE_URL}/save-score`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                player_name: playerName,
                total_score: totalScore,
                ending_type: endingType
            })
        });

        const data = await response.json();

        if (data.success) {
            console.log("Score saved successfully");
            return true;
        } else {
            console.error("Save score failed:", data.error);
            return false;
        }

    } catch (error) {
        console.error("Failed to save score:", error);
        return false;
    }
}


// -----------------------------
// GET LEADERBOARD
// -----------------------------
async function getLeaderboard(limit = 10) {

    try {

        const response = await fetch(`${API_BASE_URL}/leaderboard`);

        const data = await response.json();

        // backend returns { success:true, leaderboard:[...] }
        if (data.success) {
            return data.leaderboard;
        } else {
            console.error("Failed to get leaderboard:", data.error);
            return [];
        }

    } catch (error) {

        console.error("Error getting leaderboard:", error);
        return [];
    }
}


// -----------------------------
// TEST DATABASE CONNECTION
// -----------------------------
async function testDatabase() {

    try {

        const response = await fetch(`${API_BASE_URL}/test-db`);
        const data = await response.json();

        if (data.status) {
            console.log("Database connected");
            return true;
        }

        console.error("Database test failed:", data.error);
        return false;

    } catch (error) {

        console.error("Database connection failed:", error);
        return false;
    }
}
