// minigames/antivirus-connector.js

window.startAntivirusMinigameConnector = function(scene) {
    console.log("Initializing Antivirus Protocol...");

    // 1. CLAIM THE SCENE (Stops Biometric from running over it)
    window.currentScene = scene;

    const canvas = document.getElementById('gameCanvas');
    const controls = document.getElementById('controls-container');
    const dialogueBox = document.getElementById('dialogue-box');

    if (!canvas) {
        console.error("Critical: Canvas not found!");
        return;
    }

    // 2. FORCE CANVAS VISIBILITY (Fixes 0.0s instant skip)
    canvas.classList.remove('hidden');
    canvas.style.display = 'block';

    // 3. UI SETUP
    if (controls) controls.style.display = 'none';
    if (dialogueBox) dialogueBox.style.display = 'none';
    
    // Ensure hearts are visible
    const hearts = document.getElementById('hearts-container');
    if (hearts) hearts.style.display = 'flex';

    function cleanupUI() {
        canvas.style.display = 'none';
        canvas.classList.add('hidden');
        
        if (controls) controls.style.display = 'flex';
        if (dialogueBox) dialogueBox.style.display = 'block';
    }

    // 4. START GAME
    // Small delay to ensure the DOM has updated visibility
    requestAnimationFrame(() => {
        if (window.startAntivirusGame) {
            window.startAntivirusGame('gameCanvas', function(success) {
                cleanupUI();
                if (window.handleAntivirusMinigameEnd) {
                    window.handleAntivirusMinigameEnd(success, scene, false);
                }
            });
        } else {
            console.error("antivirus.js not loaded!");
            cleanupUI();
            if (window.handleAntivirusMinigameEnd) {
                window.handleAntivirusMinigameEnd(true, scene, true);
            }
        }
    });
};