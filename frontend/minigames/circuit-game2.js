// circuit-game2.js - Auto-start with 5s timer & Aligned UI

class DoorOverrideGame {
    constructor(width, height) {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = width || this.canvas.width;
        this.height = height || this.canvas.height;
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.ROWS = 3;
        this.COLS = 2;
        this.SIZE = Math.min(130, Math.min(this.width, this.height) / 4.0);
        
        this.STATE = {
            PREPARE: 'prepare', 
            PLAYING: 'playing',
            LEVEL_TRANSITION: 'transition',
            WIN: 'win',
            LOSE: 'lose'
        };

        this.LEVELS = {
            1: { 
                name: "SECURITY LAYER 1",
                timeLimit: 30,
                switchSpeed: 2.0,
                jamDuration: 1.0,
                trapChance: 0.0,
                bonusChance: 0.05,
                progressPerClick: 12
            },
            2: { 
                name: "ENCRYPTION LAYER 2",
                timeLimit: 25,
                switchSpeed: 1.5,
                jamDuration: 2.0,
                trapChance: 0.1,
                bonusChance: 0.05,
                progressPerClick: 10
            },
            3: { 
                name: "CORE MAINFRAME",
                timeLimit: 30,
                switchSpeed: 1.0,
                jamDuration: 2.0,
                trapChance: 0.25,
                bonusChance: 0.08,
                progressPerClick: 10
            }
        };

        this.canvas.addEventListener('mousedown', (e) => this.handleClick(e));
        
        this.currentState = this.STATE.PREPARE; // Start directly in prepare mode
        this.currentLevelIdx = 1;
        this.jamEndTime = 0; 
        this.prepareEndTime = 0; 
        
        this.initGame();
    }

    get time() { return Date.now() / 1000; }

    initGame() {
        // Immediately start the 5-second timer
        this.startPreparePhase();
    }

    startPreparePhase() {
        this.currentState = this.STATE.PREPARE;
        this.prepareEndTime = this.time + 5; // 5 Seconds Prepare Time
    }

    initLevel(levelIdx) {
        this.currentLevelIdx = levelIdx;
        this.levelConfig = this.LEVELS[levelIdx];
        
        this.progress = 0;      
        this.timeLeft = this.levelConfig.timeLimit;
        this.lastTime = this.time;
        this.jamEndTime = 0;
        
        this.lastSwitchChange = this.time;
        this.switches = [];
        
        this.combo = 0;
        this.multiplier = 1;
        this.lastClickTime = 0;

        this.generateSwitches();
        this.currentState = this.STATE.PLAYING;
    }

    generateSwitches() {
        this.switches = [];
        for (let i = 0; i < this.ROWS * this.COLS; i++) {
            this.switches.push({
                isSafe: Math.random() < 0.5,
                isBonus: false, 
                isTrap: false,
                animScale: 1.0
            });
        }
    }

    update() {
        const now = this.time;
        const dt = now - this.lastTime;
        this.lastTime = now;

        // Handle Prepare Phase
        if (this.currentState === this.STATE.PREPARE) {
            if (now >= this.prepareEndTime) {
                this.initLevel(1);
            }
            return;
        }

        if (this.currentState === this.STATE.PLAYING) {
            
            if (this.progress < 100) {
                this.timeLeft -= dt;
            }
            
            if (this.timeLeft <= 0) {
                this.handleLose("TIMED OUT - CAPTURED");
            }

            if (now > this.jamEndTime) {
                if (now - this.lastSwitchChange > this.levelConfig.switchSpeed) {
                    this.rerollSwitches();
                    this.lastSwitchChange = now;
                }
            }

            this.switches.forEach(s => {
                if(s.animScale > 1.0) s.animScale -= 0.05;
            });

            if (this.progress >= 100) {
                this.handleLevelComplete();
            }
        }
    }

    rerollSwitches() {
        this.switches.forEach(s => {
            s.isSafe = Math.random() < 0.5;
            s.isBonus = false;
            s.isTrap = false;

            if (s.isSafe) {
                if (Math.random() < this.levelConfig.trapChance) {
                    s.isTrap = true;
                }
                else if (Math.random() < this.levelConfig.bonusChance) {
                    s.isBonus = true;
                }
            }
        });
    }

    handleClick(e) {
        // No start screen click needed anymore

        if (this.currentState === this.STATE.PREPARE) {
            return; // Wait for timer
        }

        if (this.currentState === this.STATE.LOSE || this.currentState === this.STATE.WIN) {
            return; 
        }

        if (this.currentState !== this.STATE.PLAYING) return;

        if (this.time < this.jamEndTime) {
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Game Board Area is on the RIGHT side
        const totalGameWidth = this.COLS * this.SIZE + (this.COLS - 1) * 20;
        const startX = this.width * 0.35 + (this.width * 0.65 - totalGameWidth) / 2;
        const startY = this.height * 0.15;

        for (let i = 0; i < this.switches.length; i++) {
            const r = Math.floor(i / this.COLS);
            const c = i % this.COLS;
            const x = startX + c * (this.SIZE + 20);
            const y = startY + r * (this.SIZE + 20);

            if (mx >= x && mx <= x + this.SIZE && my >= y && my <= y + this.SIZE) {
                this.onSwitchClick(i);
                break;
            }
        }
    }

    onSwitchClick(index) {
        const s = this.switches[index];
        const now = this.time;
        s.animScale = 1.2; 

        if (now - this.lastClickTime < 2.0) { 
            this.combo++;
            this.multiplier = 1 + (this.combo * 0.1); 
        } else {
            this.combo = 0;
            this.multiplier = 1;
        }
        this.lastClickTime = now;

        if (s.isTrap) {
            this.triggerJam();
            s.isTrap = false;
            s.isSafe = false;
            return;
        }

        if (s.isBonus) {
            this.progress = Math.min(100, this.progress + 25); 
            s.isBonus = false;
            s.isSafe = false; 
            return;
        }

        if (s.isSafe) {
            const gain = this.levelConfig.progressPerClick * this.multiplier;
            this.progress = Math.min(100, this.progress + gain);
            s.isSafe = Math.random() < 0.4; 
        } else {
            this.triggerJam();
        }
    }

    triggerJam() {
        if (this.levelConfig.jamDuration > 0) {
            this.jamEndTime = this.time + this.levelConfig.jamDuration;
            this.combo = 0;
            this.multiplier = 1;
        }
    }

    handleLevelComplete() {
        if (this.currentLevelIdx < 3) {
            this.currentState = this.STATE.LEVEL_TRANSITION;
            setTimeout(() => {
                this.initLevel(this.currentLevelIdx + 1);
            }, 2000);
        } else {
            this.currentState = this.STATE.WIN;
        }
    }

    handleLose(reason) {
        this.currentState = this.STATE.LOSE;
        this.loseReason = reason;
    }

    draw() {
        this.ctx.fillStyle = '#0d0d15';
        this.ctx.fillRect(0, 0, this.width, this.height);

        switch (this.currentState) {
            case this.STATE.PREPARE:
                this.drawPrepareScreen();
                break;
            case this.STATE.PLAYING:
                this.drawGameInterface();
                break;
            case this.STATE.LEVEL_TRANSITION:
                this.drawTransition();
                break;
            case this.STATE.WIN:
                this.drawWinScreen();
                break;
            case this.STATE.LOSE:
                this.drawLoseScreen();
                break;
        }
    }

    drawInstructionsPanel() {
        // Draw Left Panel Background
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.width * 0.3, this.height);
        this.ctx.strokeStyle = '#334455';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.width * 0.3, 0);
        this.ctx.lineTo(this.width * 0.3, this.height);
        this.ctx.stroke();

        // --- ALIGNMENT FIX: Moved everything down to clear the Hearts ---
        // Title (Moved to Y: 130)
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = '#00ffcc';
        this.ctx.font = 'bold 22px Consolas';
        this.ctx.fillText("INSTRUCTIONS", 20, 130);

        // Divider
        this.ctx.strokeStyle = '#00ffcc';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(20, 140);
        this.ctx.lineTo(this.width * 0.3 - 20, 140);
        this.ctx.stroke();

        // Instructions List (Moved start to Y: 170)
        const instructions = [
            { color: '#00ccff', text: "■ CLICK Blue Boxes" },
            { color: '#ff3333', text: "■ AVOID Red Boxes" },
            { color: '#ffd700', text: "■ GRAB Gold Data" },
            { color: '#ffffff', text: " " },
            { color: '#ffffff', text: "GOAL:" },
            { color: '#00ff99', text: "Fill the bar to" },
            { color: '#00ff99', text: "100% before time" },
            { color: '#00ff99', text: "runs out!" }
        ];

        let startY = 170;
        this.ctx.font = '16px Consolas';
        
        instructions.forEach(line => {
            this.ctx.fillStyle = line.color;
            this.ctx.fillText(line.text, 20, startY);
            startY += 30;
        });

        // Combo Display
        if (this.combo > 1) {
            startY += 40;
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = 'bold 24px Consolas';
            this.ctx.fillText(`COMBO x${this.multiplier.toFixed(1)}`, 20, startY);
        }
    }

    drawPrepareScreen() {
        this.drawInstructionsPanel();

        // Right side: Countdown
        const remainingTime = Math.ceil(this.prepareEndTime - this.time);
        
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Consolas';
        this.ctx.fillText("SYSTEM INITIALIZING...", this.width * 0.65, this.height / 2 - 50);
        
        this.ctx.fillStyle = '#00ffcc';
        this.ctx.font = 'bold 100px Consolas';
        this.ctx.fillText(remainingTime, this.width * 0.65, this.height / 2 + 50);
        
        this.ctx.font = '18px Consolas';
        this.ctx.fillStyle = '#888';
        this.ctx.fillText("Get Ready to Override", this.width * 0.65, this.height / 2 + 100);
    }

    drawGameInterface() {
        // Draw Left Panel
        this.drawInstructionsPanel();

        // Define Game Area (Right Side)
        const gameAreaX = this.width * 0.3;
        const gameAreaWidth = this.width * 0.7;

        // Calculate Centered Offsets for the Grid within the Right Side
        const totalGridWidth = this.COLS * this.SIZE + (this.COLS - 1) * 20;
        const startX = gameAreaX + (gameAreaWidth - totalGridWidth) / 2;
        const startY = this.height * 0.15;
        
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#aaddff';
        this.ctx.font = '20px Consolas';
        this.ctx.fillText(this.levelConfig.name, gameAreaX + gameAreaWidth/2, 40);

        this.ctx.font = 'bold 36px Consolas';
        this.ctx.fillStyle = this.timeLeft < 10 ? '#ff3333' : '#ffffff';
        this.ctx.fillText(this.timeLeft.toFixed(1) + "s", gameAreaX + gameAreaWidth/2, 80);

        const isJammed = this.time < this.jamEndTime;

        for (let i = 0; i < this.switches.length; i++) {
            const s = this.switches[i];
            const r = Math.floor(i / this.COLS);
            const c = i % this.COLS;
            const x = startX + c * (this.SIZE + 20);
            const y = startY + r * (this.SIZE + 20);

            let color = s.isSafe ? '#00ccff' : '#ff3333';
            let text = s.isSafe ? "OPEN" : "LOCK";
            
            if (s.isTrap) {
                color = '#00ccff'; 
                text = "OPEN";
            }
            
            if (s.isBonus) {
                color = '#ffd700';
                text = "DATA";
            }
            
            if (isJammed) {
                color = '#555';
            }

            const size = this.SIZE * s.animScale;
            const dx = x + (this.SIZE - size)/2;
            const dy = y + (this.SIZE - size)/2;

            this.ctx.fillStyle = '#1a1a2e';
            this.ctx.fillRect(dx, dy, size, size);
            
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(dx, dy, size, size);

            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(dx + 10, dy + 10, size - 20, size - 20);
            this.ctx.globalAlpha = 1.0;

            this.ctx.fillStyle = s.isBonus && !isJammed ? '#ffd700' : 'white';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillText(text, x + this.SIZE/2, y + this.SIZE/2 + 8);
        }

        if (isJammed) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.fillRect(gameAreaX, 0, gameAreaWidth, this.height);
            
            this.ctx.save();
            this.ctx.translate(Math.random()*4-2, Math.random()*4-2); 
            this.ctx.fillStyle = '#ff3333';
            this.ctx.font = 'bold 48px Consolas';
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 4;
            this.ctx.strokeText("SYSTEM JAMMED", gameAreaX + gameAreaWidth/2, this.height/2);
            this.ctx.fillText("SYSTEM JAMMED", gameAreaX + gameAreaWidth/2, this.height/2);
            this.ctx.restore();
        }

        const barWidth = Math.min(400, gameAreaWidth * 0.8);
        const barX = gameAreaX + (gameAreaWidth - barWidth) / 2;
        const barY = this.height * 0.85;
        this.drawProgressBar(barX, barY, barWidth, 30, this.progress, 100, "OVERRIDE STATUS", isJammed ? '#555' : '#00ff99');
    }

    drawProgressBar(x, y, w, h, val, max, label, color) {
        this.ctx.strokeStyle = '#334455';
        this.ctx.strokeRect(x, y, w, h);
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(x, y, w, h);
        const pct = Math.min(1, Math.max(0, val / max));
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w * pct, h);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Consolas';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${label}: ${Math.floor(val)}%`, x, y - 5);
    }

    drawTransition() {
        this.drawInstructionsPanel(); // Keep instructions visible

        const gameAreaX = this.width * 0.3;
        const gameAreaWidth = this.width * 0.7;

        this.ctx.fillStyle = '#0d0d15';
        this.ctx.fillRect(gameAreaX, 0, gameAreaWidth, this.height);
        
        this.ctx.fillStyle = '#ffaa00';
        this.ctx.textAlign = 'center';
        this.ctx.font = '28px Consolas';
        this.ctx.fillText("BYPASS SUCCESSFUL", gameAreaX + gameAreaWidth/2, this.height/2 - 40);
        this.ctx.font = '18px Consolas';
        this.ctx.fillText("Accessing next security layer...", gameAreaX + gameAreaWidth/2, this.height/2);
        
        const barWidth = 200;
        const barX = gameAreaX + (gameAreaWidth - barWidth) / 2;
        this.drawProgressBar(barX, this.height/2 + 40, barWidth, 10, 100, 100, "", "#ffaa00");
    }

    drawWinScreen() {
        this.ctx.fillStyle = '#051005';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#00ff00';
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 40px Consolas';
        this.ctx.fillText("ACCESS GRANTED", this.width/2, this.height/2 - 50);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Consolas';
        this.ctx.fillText("Door Unlocked.", this.width/2, this.height/2);
        this.ctx.fillText("Proceeding to next level...", this.width/2, this.height/2 + 50);
    }

    drawLoseScreen() {
        this.ctx.fillStyle = '#150505';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#ff3333';
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 40px Consolas';
        this.ctx.fillText("ACCESS DENIED", this.width/2, this.height/2 - 100);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Consolas';
        this.ctx.fillText(this.loseReason || "SECURITY BREACH", this.width/2, this.height/2 - 40);
        this.ctx.font = '16px Consolas';
        this.ctx.fillStyle = '#888';
        this.ctx.fillText("Security teams alerted.", this.width/2, this.height/2 + 20);
        this.ctx.fillStyle = 'white';
        this.ctx.fillText("System resetting...", this.width/2, this.height/2 + 70);
    }
}

window.DoorOverrideGame = DoorOverrideGame;