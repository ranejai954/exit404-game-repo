// minigames/circuit-game.js

class CircuitGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // --- THEME & COLORS ---
        this.COLORS = {
            BG: '#050505',
            SIDEBAR_BG: '#0a0a0a',
            SIDEBAR_BORDER: '#444',
            TEXT: '#00ff00', 
            TEXT_WARN: '#ffaa00',
            TEXT_CRIT: '#ff0000',
            TEXT_INFO: '#00ccff',
            SAFE: 'rgb(0, 255, 150)',
            UNSAFE: 'rgb(255, 50, 50)',
            CRITICAL: 'rgb(255, 180, 0)',
            OUTLINE: 'rgb(60, 60, 80)',
            GRID_BG: 'rgba(20, 20, 30, 0.5)'
        };

        // --- CONFIGURATION ---
        this.levelConfigs = {
            1: {
                rows: 3, cols: 3,
                switchInterval: 3.0, 
                survivalTime: 12, 
                infectionGain: 60, infectionLoss: 40,
                criticalMultiplier: 1.2,
                title: "BYPASS LEVEL 1"
            },
            2: {
                rows: 3, cols: 3,
                switchInterval: 2.5, 
                survivalTime: 15, 
                infectionGain: 80, infectionLoss: 30,
                criticalMultiplier: 1.5,
                title: "BYPASS LEVEL 2"
            },
            3: {
                rows: 4, cols: 4, 
                switchInterval: 2.0,
                survivalTime: 18, 
                infectionGain: 80,
                infectionLoss: 30,
                criticalMultiplier: 1.5,
                title: "BYPASS LEVEL 3"
            }
        };

        // Global Flag for Instructions (Persists across retries)
        if (typeof window.circuitInstructionsSeen === 'undefined') {
            window.circuitInstructionsSeen = false;
        }

        // State
        this.currentLevel = 1;
        this.infection = 0;
        this.switches = [];
        this.isRunning = false;
        this.gameState = "MENU"; 
        
        // UPDATED: 5 Seconds Prep Time
        this.prepTimer = 5; 
        
        this.sidebarWidth = 300;
        this.lastTime = 0;
        
        // Input Binding
        this.boundHandleClick = (e) => this.handleClick(e);
        this.canvas.addEventListener('mousedown', this.boundHandleClick);
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    cleanup() {
        this.isRunning = false;
        this.canvas.removeEventListener('mousedown', this.boundHandleClick);
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.sidebarWidth = Math.max(250, Math.min(350, this.width * 0.25));
        
        // Game Area (Right side)
        this.gameAreaX = this.sidebarWidth;
        this.gameAreaW = this.width - this.sidebarWidth;
        this.gameAreaH = this.height;
    }

    startGame() {
        this.currentLevel = 1;
        this.startLevel(1);
        this.loop();
    }

    startLevel(levelNum) {
        this.currentLevel = levelNum;
        this.config = this.levelConfigs[levelNum];
        this.infection = 0;
        this.switches = []; 
        
        this.generateSwitches();
        this.isRunning = true; // Ensure loop runs

        // --- INSTRUCTION LOGIC ---
        if (!window.circuitInstructionsSeen) {
            this.gameState = "PREPARING";
            this.prepTimer = 5; // 5 Seconds
            this.lastTime = Date.now();
            window.circuitInstructionsSeen = true; 
        } else {
            this.startPlaying(); // Immediate start for Level 2/3 or Retry
        }
    }

    startPlaying() {
        this.gameState = "PLAYING";
        this.startTime = Date.now() / 1000;
        this.lastChangeTime = Date.now() / 1000;
        this.lastTime = Date.now();
        this.generateSwitches(); 
    }

    generateSwitches() {
        const { rows, cols } = this.config;
        this.switches = [];
        
        const gridW = Math.min(600, this.gameAreaW - 100);
        const gridH = Math.min(500, this.gameAreaH - 100);
        
        const startX = this.gameAreaX + (this.gameAreaW - gridW) / 2;
        const startY = (this.gameAreaH - gridH) / 2;
        
        const cellW = gridW / cols;
        const cellH = gridH / rows;
        const size = Math.min(cellW, cellH) * 0.7; 

        const criticalIndex = Math.floor(Math.random() * (rows * cols));

        for (let i = 0; i < rows * cols; i++) {
            const r = Math.floor(i / cols);
            const c = i % cols;
            
            const cx = startX + c * cellW + cellW/2;
            const cy = startY + r * cellH + cellH/2;
            
            this.switches.push({
                x: cx - size/2,
                y: cy - size/2,
                w: size,
                h: size,
                state: Math.random() < 0.5, 
                clicked: false,
                critical: (i === criticalIndex),
                flashTime: 0
            });
        }
    }

    checkClearCondition() {
        const greenSwitches = this.switches.filter(s => s.state);
        if (greenSwitches.length === 0) return true;

        const allCleared = greenSwitches.every(s => s.clicked);
        if (!allCleared) {
            this.infection += 80; 
        }
        return allCleared;
    }

    handleClick(e) {
        if (!this.isRunning) return;
        if (this.gameState !== "PLAYING") return;

        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (mx < this.gameAreaX) return;

        for (let s of this.switches) {
            if (mx >= s.x && mx <= s.x + s.w && 
                my >= s.y && my <= s.y + s.h && !s.clicked) {
                
                s.flashTime = Date.now() / 1000;
                let multiplier = s.critical ? this.config.criticalMultiplier : 1.0;

                if (!s.state) { // Red
                    this.infection += this.config.infectionGain * multiplier;
                } else { // Green
                    this.infection = Math.max(0, this.infection - this.config.infectionLoss * multiplier);
                    s.clicked = true;
                }
                break;
            }
        }
    }

    update() {
        if (!this.isRunning) return;
        const now = Date.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // PREP PHASE
        if (this.gameState === "PREPARING") {
            this.prepTimer -= dt;
            if (this.prepTimer <= 0) {
                this.startPlaying();
            }
            return;
        }

        if (this.gameState !== "PLAYING") return;

        const currentTime = now / 1000;
        
        // Switch Logic
        if (currentTime - this.lastChangeTime >= this.config.switchInterval) {
            this.checkClearCondition();
            this.generateSwitches();
            this.lastChangeTime = currentTime;
        }

        const elapsed = currentTime - this.startTime;
        this.infection = Math.max(0, Math.min(this.infection, 400));

        // Win/Loss Checks
        if (this.infection >= 400) {
            this.finishLevel(false);
        } else if (elapsed >= this.config.survivalTime) {
            this.finishLevel(true);
        }
    }

    finishLevel(success) {
        // FIX: Do NOT set isRunning = false here. 
        // We want the loop to continue to render the "Transition" screen.
        this.gameState = "TRANSITION";
        
        setTimeout(() => {
            if (success) {
                if (this.currentLevel < 3) {
                    this.startLevel(this.currentLevel + 1);
                } else {
                    this.endGame(true);
                }
            } else {
                this.endGame(false);
            }
        }, 1500); 
    }

    endGame(success) {
        this.gameState = "END";
        setTimeout(() => {
            if (window.onCircuitEnd) window.onCircuitEnd(success);
        }, 1000);
    }

    // --- RENDERING ---

    draw() {
        this.ctx.fillStyle = this.COLORS.BG;
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.drawSidebar();

        if (this.gameState === "PREPARING") {
            this.drawSwitches(true); 
            this.drawPrepOverlay();
        } else if (this.gameState === "PLAYING") {
            this.drawSwitches(false); 
        } else if (this.gameState === "TRANSITION" || this.gameState === "END") {
            // This ensures the Success/Fail screen is drawn
            this.drawMessage(this.infection >= 400 ? "FAILURE" : "SUCCESS");
        }
    }

    drawSidebar() {
        const w = this.sidebarWidth;
        const h = this.height;
        const pad = 20;

        this.ctx.fillStyle = this.COLORS.SIDEBAR_BG;
        this.ctx.fillRect(0, 0, w, h);
        
        this.ctx.strokeStyle = this.COLORS.SIDEBAR_BORDER;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(w, 0); this.ctx.lineTo(w, h);
        this.ctx.stroke();

        // --- UPDATED ALIGNMENT: Start Y at 140px to safely clear Hearts ---
        let y = 140; 
        
        // Header
        this.ctx.fillStyle = "#fff";
        this.ctx.font = "bold 28px 'Courier New'";
        this.ctx.textAlign = "left";
        this.ctx.fillText("CIRCUIT BREAKER", pad, y);
        
        y += 40;
        this.ctx.font = "16px monospace";
        this.ctx.fillStyle = "#888";
        this.ctx.fillText(`PROTOCOL LVL: ${this.currentLevel}/3`, pad, y);

        // Instructions
        y += 60;
        this.ctx.fillStyle = this.COLORS.TEXT_INFO;
        this.ctx.font = "bold 20px 'Courier New'";
        this.ctx.fillText("INSTRUCTIONS:", pad, y);
        
        y += 30;
        this.ctx.font = "16px monospace";
        this.ctx.fillStyle = this.COLORS.SAFE;
        this.ctx.fillText("> CLICK GREEN NODES", pad, y);
        
        y += 25;
        this.ctx.fillStyle = this.COLORS.TEXT_CRIT;
        this.ctx.fillText("> AVOID RED NODES", pad, y);
        
        y += 25;
        this.ctx.fillStyle = "#fff";
        this.ctx.fillText("> KEEP BAR LOW", pad, y);

        // Timer
        y += 60;
        let timeDisplay = "0.0s";
        if (this.gameState === "PLAYING") {
            const elapsed = (Date.now()/1000) - this.startTime;
            const remaining = Math.max(0, this.config.survivalTime - elapsed);
            timeDisplay = remaining.toFixed(1) + "s";
        } else if (this.gameState === "PREPARING") {
            timeDisplay = "READY?";
        }
        
        this.ctx.fillStyle = "#fff";
        this.ctx.font = "bold 20px 'Courier New'";
        this.ctx.fillText("TIME REMAINING:", pad, y);
        this.ctx.font = "bold 36px 'Courier New'";
        this.ctx.fillStyle = this.COLORS.TEXT_WARN;
        this.ctx.fillText(timeDisplay, pad, y + 40);

        // Infection Bar
        y += 100;
        this.ctx.fillStyle = "#fff";
        this.ctx.font = "bold 18px 'Courier New'";
        this.ctx.fillText("SYSTEM INSTABILITY:", pad, y);
        
        y += 15;
        const barH = 20;
        const barW = w - (pad * 2);
        
        this.ctx.fillStyle = "#330000";
        this.ctx.fillRect(pad, y, barW, barH);
        
        const pct = Math.min(1, this.infection / 400);
        this.ctx.fillStyle = pct > 0.8 ? this.COLORS.TEXT_CRIT : this.COLORS.TEXT_WARN;
        this.ctx.fillRect(pad, y, barW * pct, barH);
        
        this.ctx.strokeStyle = "#555";
        this.ctx.strokeRect(pad, y, barW, barH);
    }

    drawPrepOverlay() {
        const cx = this.gameAreaX + this.gameAreaW / 2;
        const cy = this.height / 2;

        this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        this.ctx.fillRect(this.gameAreaX, 0, this.gameAreaW, this.height);

        this.ctx.textAlign = "center";
        this.ctx.fillStyle = "#fff";
        this.ctx.font = "bold 40px 'Courier New'";
        this.ctx.fillText("READ INSTRUCTIONS", cx, cy - 60);
        
        this.ctx.fillStyle = this.COLORS.TEXT_INFO;
        this.ctx.font = "bold 100px 'Courier New'";
        this.ctx.fillText(Math.ceil(this.prepTimer), cx, cy + 40);
        
        this.ctx.font = "24px monospace";
        this.ctx.fillStyle = "#aaa";
        this.ctx.fillText("Check the Sidebar <---", cx, cy + 120);
    }

    drawSwitches(dimmed = false) {
        const currentTime = Date.now() / 1000;
        const opacity = dimmed ? 0.3 : 1.0;

        for (let s of this.switches) {
            this.ctx.fillStyle = `rgba(30, 30, 40, ${opacity})`;
            this.ctx.fillRect(s.x, s.y, s.w, s.h);
            this.ctx.strokeStyle = `rgba(60, 60, 80, ${opacity})`;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(s.x, s.y, s.w, s.h);

            let color = s.state ? this.COLORS.SAFE : this.COLORS.UNSAFE;
            if (s.clicked) color = '#333'; 

            if (currentTime - s.flashTime < 0.1) {
                color = '#fff';
            }

            this.ctx.fillStyle = color;
            this.ctx.globalAlpha = opacity;
            this.ctx.fillRect(s.x + 10, s.y + 10, s.w - 20, s.h - 20);
            this.ctx.globalAlpha = 1.0;

            if (s.critical && !s.clicked) {
                this.ctx.strokeStyle = this.COLORS.CRITICAL;
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(s.x + 5, s.y + 5, s.w - 10, s.h - 10);
            }
        }
    }

    drawMessage(msg) {
        const cx = this.gameAreaX + this.gameAreaW / 2;
        const cy = this.height / 2;

        this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        this.ctx.fillRect(this.gameAreaX, 0, this.gameAreaW, this.height);

        const color = msg === "SUCCESS" ? this.COLORS.SAFE : this.COLORS.TEXT_CRIT;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = "center";
        this.ctx.font = "bold 60px 'Courier New'";
        this.ctx.fillText(msg, cx, cy);
    }

    loop() {
        if (this.isRunning) {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.loop());
        }
    }
}