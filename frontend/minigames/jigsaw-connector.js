// minigames/jigsaw-connector.js

window.startJigsawMinigameConnector = function(scene) {
    console.log("Initializing Neural Jigsaw Interface...");

    const canvas = document.getElementById('gameCanvas');
    const controls = document.getElementById('controls-container');
    const dialogueBox = document.getElementById('dialogue-box');

    if (!canvas) {
        console.error("Critical: Canvas not found!");
        return;
    }

    // 2. UI SETUP
    if (controls) controls.style.display = 'none';
    if (dialogueBox) dialogueBox.style.display = 'none';
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.classList.remove('hidden');
    canvas.style.display = 'block';
    
    // Ensure hearts are visible
    const hearts = document.getElementById('hearts-container');
    if (hearts) hearts.style.display = 'flex';

    function cleanupUI() {
        canvas.style.display = 'none';
        canvas.classList.add('hidden');
        
        if (controls) controls.style.display = 'flex';
        if (dialogueBox) dialogueBox.style.display = 'block';
    }

    // 3. START GAME
    if (window.startJigsawGame) {
        window.startJigsawGame('gameCanvas', function(success) {
            cleanupUI();
            
            if (window.handleJigsawMinigameEnd) {
                window.handleJigsawMinigameEnd(success, scene, false);
            }
        });
    } else {
        console.error("jigsaw.js not loaded! Check index.html");
        cleanupUI();
    }
};