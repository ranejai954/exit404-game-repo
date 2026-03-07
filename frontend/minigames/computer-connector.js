// minigames/computer-connector.js

window.startComputerMinigameConnector = function(scene) {
    console.log("Initializing Mainframe Access...");

    const canvas = document.getElementById('gameCanvas');
    const controls = document.getElementById('controls-container');
    const dialogueBox = document.getElementById('dialogue-box');

    if (!canvas) {
        console.error("Critical: Canvas not found!");
        return;
    }

    // 1. CLEAN UP PREVIOUS BUTTONS (If any exist from other games)
    const oldBtn = document.getElementById('skip-btn');
    if (oldBtn) oldBtn.style.display = 'none';

    // 2. UI SETUP
    if (controls) controls.style.display = 'none';
    if (dialogueBox) dialogueBox.style.display = 'none';
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.classList.remove('hidden');
    canvas.style.display = 'block';
    
    const hearts = document.getElementById('hearts-container');
    if (hearts) hearts.style.display = 'flex';

    function cleanupUI() {
        canvas.style.display = 'none';
        canvas.classList.add('hidden');
        if (controls) controls.style.display = 'flex';
        if (dialogueBox) dialogueBox.style.display = 'block';
    }

    // 3. CHECK PASSWORD STATE
    const hasPassword = (window.scores && window.scores['jigsaw'] > 0);
    console.log("Computer Game - Password Known:", hasPassword);

    // 4. START GAME
    if (window.startComputerGame) {
        // We now accept (success, skipped) from the game
        window.startComputerGame('gameCanvas', hasPassword, function(success, skipped) {
            cleanupUI();
            if (window.handleComputerMinigameEnd) {
                // Pass the 'skipped' status correctly
                window.handleComputerMinigameEnd(success, scene, skipped);
            }
        });
    } else {
        console.error("computer.js not loaded!");
        cleanupUI();
    }
};