// neural-game.js - UI Update & Prepare Phase

// Encapsulate colors
window.NEURAL_COLORS = {
    BG: '#050a10',
    SIDEBAR: '#111',
    GRID: '#1a2a40',
    PULSE_BLUE: '#00ccff',
    PULSE_GREEN: '#00ff99',
    PULSE_YELLOW: '#ffcc00',
    PULSE_RED: '#ff3333',
    TEXT: '#ddeeff',
    JAMMED: 'rgba(255, 0, 0, 0.3)'
};

// Helper
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// --- NEURAL PULSE CLASS ---
class NeuralPulse {
    constructor(game) {
        this.game = game; // Reference to game for positioning
        this.radius = 0;
        
        // Calculate dynamic max radius based on the GAME AREA (Right side)
        const gameAreaWidth = this.game.width * 0.7;
        this.maxRadius = Math.min(gameAreaWidth, this.game.height) * 0.25;

        this.active = false;
        
        // 60 FPS assumed
        this.pulseInterval = 2.0 * 60; 
        this.nextPulseIn = 0;
        this.growthSpeed = this.maxRadius / (this.pulseInterval * 0.7);
        this.color = window.NEURAL_COLORS.PULSE_BLUE;
    }

    startPulse() {
        this.active = true;
        this.radius = 0;
        this.color = randomChoice([
            window.NEURAL_COLORS.PULSE_BLUE, 
            window.NEURAL_COLORS.PULSE_GREEN, 
            window.NEURAL_COLORS.PULSE_YELLOW
        ]);
    }

    update() {
        this.nextPulseIn--;

        if (this.active) {
            this.radius += this.growthSpeed;
            if (this.radius > this.maxRadius) {
                this.active = false; // Missed by timeout
            }
        }

        if (this.nextPulseIn <= 0) {
            this.startPulse();
            this.nextPulseIn = this.pulseInterval;
        }
    }

    checkHit() {
        if (!this.active) return "miss";
        
        // Timing Windows
        const perfectMin = this.maxRadius * 0.45;
        const perfectMax = this.maxRadius * 0.55;
        const goodMin = this.maxRadius * 0.30;
        const goodMax = this.maxRadius * 0.70;
        const okayMin = this.maxRadius * 0.20;
        const okayMax = this.maxRadius * 0.80;
        
        if (this.radius >= perfectMin && this.radius <= perfectMax) return "perfect";
        if (this.radius >= goodMin && this.radius <= goodMax) return "good";
        if (this.radius >= okayMin && this.radius <= okayMax) return "okay";
        
        return "miss";
    }

    draw(ctx, cx, cy) {
        // Target Ring
        ctx.strokeStyle = '#2a3a50';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, this.maxRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Perfect Zone Ring
        ctx.strokeStyle = 'rgba(0, 255, 150, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, this.maxRadius * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, this.maxRadius * 0.45, 0, Math.PI * 2);
        ctx.stroke();

        // Expanding Pulse
        if (this.active) {
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // Center Dot
        ctx.fillStyle = window.NEURAL_COLORS.TEXT;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- GAME LOGIC ---
class NeuralGame {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Ensure dimensions match
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Bind click handler for this instance
        this.boundClickHandler = (e) => { 
            e.preventDefault();
            // Allow clicking anywhere to trigger input
            this.handleInput('Space'); 
        };
        this.canvas.addEventListener('mousedown', this.boundClickHandler);
        
        this.pulse = new NeuralPulse(this);
        this.resetGame();
        this.rotatorAngle = 0;
    }

    // Cleanup method called by connector
    destroy() {
        if (this.boundClickHandler) {
            this.canvas.removeEventListener('mousedown', this.boundClickHandler);
        }
    }

    resetGame() {
        this.level = 1;
        this.hits = 0;
        
        this.levelConfig = {
            1: { target: 5, time: 20 },
            2: { target: 10, time: 30 },
            3: { target: 20, time: 45 }
        };
        
        this.timeLeft = this.levelConfig[1].time;
        
        // START IN PREPARE MODE
        this.gameState = "prepare";
        this.prepareTimer = 5.0; // 5 Seconds
        
        this.jamTimer = 0;
        this.message = "";
        this.messageColor = window.NEURAL_COLORS.TEXT;
        this.messageTimer = 0;
    }

    update() {
        this.rotatorAngle += 0.01;

        if (this.gameState === "gameover" || this.gameState === "victory") return;

        // --- PREPARE PHASE ---
        if (this.gameState === "prepare") {
            this.prepareTimer -= 1/60;
            if (this.prepareTimer <= 0) {
                this.gameState = "playing";
                this.pulse.startPulse();
            }
            return;
        }

        // --- PLAYING PHASE ---
        // Timer
        this.timeLeft -= 1/60;
        if (this.timeLeft <= 0) {
            this.gameState = "gameover";
            this.message = "TIMED OUT!";
            return;
        }

        // Jammed State
        if (this.gameState === "jammed") {
            this.jamTimer--;
            if (this.jamTimer <= 0) {
                this.gameState = "playing";
                this.pulse.active = false; 
                this.pulse.nextPulseIn = 60;
            }
            return;
        }

        this.pulse.update();
        if (this.messageTimer > 0) this.messageTimer--;
    }

    handleInput(code) {
        if (this.gameState !== "playing") return;

        // Only Space or Click triggers hit
        if (code === 'Space') {
            this.handleHit();
        }
    }

    handleHit() {
        if (this.gameState === "jammed") return;

        const result = this.pulse.checkHit();

        if (result === "miss") {
            this.triggerJam();
        } else {
            this.hits++;
            this.pulse.active = false; 
            
            if (result === "perfect") {
                this.timeLeft += 2.0; 
                this.showMessage("PERFECT +2s", window.NEURAL_COLORS.PULSE_GREEN);
            } 
            else if (result === "good") {
                this.showMessage("GOOD", window.NEURAL_COLORS.PULSE_YELLOW);
            } 
            else {
                this.showMessage("OKAY", window.NEURAL_COLORS.TEXT);
            }

            this.checkProgression();
        }
    }

    triggerJam() {
        this.gameState = "jammed";
        this.jamTimer = 120; // 2 Seconds
        this.showMessage("SYSTEM JAMMED", window.NEURAL_COLORS.PULSE_RED, 120);
    }

    checkProgression() {
        const config = this.levelConfig[this.level];
        
        if (this.hits >= config.target) {
            if (this.level < 3) {
                this.level++;
                this.hits = 0;
                this.timeLeft = this.levelConfig[this.level].time;
                this.showMessage(`LEVEL ${this.level} INITIATED`, window.NEURAL_COLORS.PULSE_BLUE, 120);
            } else {
                this.gameState = "victory";
            }
        }
    }

    showMessage(text, color, duration = 40) {
        this.message = text;
        this.messageColor = color;
        this.messageTimer = duration;
    }

    drawSidebar() {
        const ctx = this.ctx;
        const sbW = this.width * 0.3;
        
        // Background
        ctx.fillStyle = window.NEURAL_COLORS.SIDEBAR;
        ctx.fillRect(0, 0, sbW, this.height);
        
        // Border
        ctx.strokeStyle = '#334455';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sbW, 0);
        ctx.lineTo(sbW, this.height);
        ctx.stroke();

        // --- INSTRUCTIONS (Aligned below hearts ~ Y:130) ---
        ctx.textAlign = 'left';
        ctx.fillStyle = window.NEURAL_COLORS.PULSE_BLUE;
        ctx.font = 'bold 22px Courier New';
        ctx.fillText("NEURAL SYNC", 20, 130);

        ctx.strokeStyle = window.NEURAL_COLORS.PULSE_BLUE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, 140);
        ctx.lineTo(sbW - 20, 140);
        ctx.stroke();

        const instructions = [
            { color: '#fff', text: "■ Watch the Ring" },
            { color: '#fff', text: "■ CLICK or SPACE" },
            { color: '#fff', text: "  when circle hits" },
            { color: '#00ff99', text: "  the Green Zone" },
            { color: '#ff3333', text: "■ Missing JAMS signal" }
        ];

        let startY = 170;
        ctx.font = '16px Courier New';
        
        instructions.forEach(line => {
            ctx.fillStyle = line.color;
            ctx.fillText(line.text, 20, startY);
            startY += 30;
        });

        // --- GAME STATS (Moved from HUD) ---
        startY += 40;
        const config = this.levelConfig[this.level] || this.levelConfig[3];
        
        ctx.fillStyle = '#8899aa';
        ctx.fillText("CURRENT STATUS:", 20, startY);
        
        startY += 30;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Courier New';
        ctx.fillText(`LEVEL: ${this.level}/3`, 20, startY);
        
        startY += 30;
        ctx.fillText(`TARGET: ${this.hits}/${config.target}`, 20, startY);
    }

    draw() {
        const ctx = this.ctx;
        
        // Clear Screen
        ctx.fillStyle = window.NEURAL_COLORS.BG;
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Sidebar
        this.drawSidebar();

        // --- DEFINE GAME AREA (Right 70%) ---
        const gameX = this.width * 0.3;
        const gameW = this.width * 0.7;
        const cx = gameX + gameW / 2;
        const cy = this.height / 2;

        if (this.gameState === "prepare") {
            // Draw Countdown
            ctx.textAlign = "center";
            ctx.fillStyle = window.NEURAL_COLORS.TEXT;
            ctx.font = "24px Courier New";
            ctx.fillText("ESTABLISHING LINK...", cx, cy - 50);

            ctx.fillStyle = window.NEURAL_COLORS.PULSE_BLUE;
            ctx.font = "bold 80px Courier New";
            ctx.fillText(Math.ceil(this.prepareTimer), cx, cy + 40);
            return;
        }

        // Rotator Ring
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.rotatorAngle);
        ctx.strokeStyle = this.gameState === "jammed" ? window.NEURAL_COLORS.PULSE_RED : '#0f1f30';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.setLineDash([20, 15]);
        const rotatorRadius = Math.min(gameW, this.height) * 0.35;
        ctx.arc(0, 0, rotatorRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Pulse Game Mechanic
        this.pulse.draw(ctx, cx, cy);

        // Timer Ring (Around the pulse)
        const config = this.levelConfig[this.level] || this.levelConfig[3];
        const maxTime = config.time;
        const timePct = Math.max(0, Math.min(1, this.timeLeft / maxTime));
        
        let ringColor = this.timeLeft < 5 ? window.NEURAL_COLORS.PULSE_RED : window.NEURAL_COLORS.PULSE_BLUE;
        if (this.gameState === "jammed") ringColor = window.NEURAL_COLORS.PULSE_RED;
        if (this.timeLeft > maxTime) ringColor = window.NEURAL_COLORS.PULSE_GREEN;

        const ringRadius = Math.min(gameW, this.height) * 0.25; // Same as pulse maxRadius
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 6;
        ctx.beginPath();
        // Draw arc
        ctx.arc(cx, cy, ringRadius + 10, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * timePct));
        ctx.stroke();

        // Timer Text (Center)
        ctx.textAlign = "center";
        ctx.font = "bold 40px Courier New";
        ctx.fillStyle = (this.timeLeft < 5 || this.gameState === "jammed") ? window.NEURAL_COLORS.PULSE_RED : window.NEURAL_COLORS.TEXT;
        ctx.fillText(this.timeLeft.toFixed(1), cx, cy - ringRadius - 40);

        // Feedback Message
        if (this.messageTimer > 0 || this.gameState === "jammed") {
            ctx.font = "bold 40px Courier New";
            ctx.fillStyle = this.messageColor;
            ctx.fillText(this.message, cx, cy + ringRadius + 60);
        }

        if (this.gameState === "jammed") {
            ctx.fillStyle = window.NEURAL_COLORS.JAMMED;
            ctx.fillRect(gameX, 0, gameW, this.height);
            
            ctx.font = "bold 60px Courier New";
            ctx.fillStyle = window.NEURAL_COLORS.PULSE_RED;
            ctx.fillText("LOCKED", cx, cy);
        }

        // --- END SCREENS ---
        if (this.gameState === "gameover" || this.gameState === "victory") {
            ctx.fillStyle = "rgba(0,0,0,0.9)";
            ctx.fillRect(gameX, 0, gameW, this.height);

            ctx.textAlign = "center";
            if (this.gameState === "victory") {
                ctx.fillStyle = window.NEURAL_COLORS.PULSE_GREEN;
                ctx.font = "bold 50px Courier New";
                ctx.fillText("SYSTEM SYNCED", cx, cy - 40);
                ctx.font = "20px Courier New";
                ctx.fillStyle = window.NEURAL_COLORS.TEXT;
                ctx.fillText("Neural link established.", cx, cy + 20);
            } else {
                ctx.fillStyle = window.NEURAL_COLORS.PULSE_RED;
                ctx.font = "bold 50px Courier New";
                ctx.fillText("CONNECTION LOST", cx, cy - 40);
                ctx.font = "20px Courier New";
                ctx.fillStyle = window.NEURAL_COLORS.TEXT;
                ctx.fillText("Signal timed out.", cx, cy + 20);
            }
        }
    }
}

// Export Class
window.NeuralGame = NeuralGame;