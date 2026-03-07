// minigames/neural-pattern.js

// --- CONSTANTS ---
const PATTERN_WIDTH = 900;
const PATTERN_HEIGHT = 700;

// --- COLORS ---
const PATTERN_COLORS = {
    BLACK: 'rgb(10, 10, 20)',
    SIDEBAR: '#111',
    DARK_BLUE: 'rgb(20, 30, 60)',
    TERMINAL_GREEN: 'rgb(0, 255, 100)',
    TERMINAL_BLUE: 'rgb(0, 150, 255)',
    TERMINAL_RED: 'rgb(255, 50, 80)',
    TERMINAL_YELLOW: 'rgb(255, 220, 0)',
    TERMINAL_PURPLE: 'rgb(180, 70, 255)',
    TERMINAL_CYAN: 'rgb(0, 220, 220)',
    CELL_BG: 'rgb(30, 40, 60)',
    CELL_BORDER: 'rgb(60, 70, 90)',
    INPUT_BG: 'rgb(0, 60, 30)'
};

// Polyfill for roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}

class SecurityPuzzle {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        
        // Layout Calculations (Sidebar 30%, Game 70%)
        this.gameX = this.width * 0.3;
        this.gameW = this.width * 0.7;

        // Dynamic Grid Positioning (Centered in Game Area)
        this.gridSize = 5;
        this.cellSize = 70;
        const totalGridPixelWidth = this.gridSize * this.cellSize;
        
        this.gridX = this.gameX + (this.gameW - totalGridPixelWidth) / 2;
        this.gridY = (this.height - totalGridPixelWidth) / 2;

        this.targetPattern = [];
        this.playerPattern = [];
        this.distractionCells = [];
        this.level = 1;
        this.maxLevel = 5;
        this.score = 0;
        this.lives = 3;
        this.corruption = 0;
        
        this.messages = [];
        
        // Buttons
        this.submitBtn = {
            x: this.gameX + (this.gameW - 200) / 2,
            y: this.gridY + totalGridPixelWidth + 60, // Pushed down to make room for timers
            w: 200,
            h: 45
        };

        // Start in Prepare Mode
        this.state = "prepare";
        this.prepareTimer = 5.0; // 5 Seconds
    }

    generatePuzzle() {
        this.targetPattern = [];
        
        // --- DIFFICULTY ADJUSTMENT ---
        const patternLength = Math.min(3 + this.level, 9); 

        // Generate Target Pattern
        while (this.targetPattern.length < patternLength) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const exists = this.targetPattern.some(p => p.x === x && p.y === y);
            if (!exists) {
                this.targetPattern.push({ x, y });
            }
        }

        // Generate Distractions
        this.distractionCells = [];
        const distractionCount = Math.max(0, Math.min(this.level - 1, 3));

        while (this.distractionCells.length < distractionCount) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            
            const inTarget = this.targetPattern.some(p => p.x === x && p.y === y);
            const inDistract = this.distractionCells.some(p => p.x === x && p.y === y);
            
            if (!inTarget && !inDistract) {
                this.distractionCells.push({ x, y });
            }
        }

        this.playerPattern = [];
        this.state = "show_pattern";
        
        // Timers (Frames @ 60FPS)
        this.showTime = 300; // 5s
        this.memorizeTime = Math.max(120, 315 - this.level * 10); 
        this.inputTime = Math.max(30 - this.level, 15) * 60; 
    }

    handleClick(x, y) {
        // Block clicks during prepare/show/memorize
        if (this.state !== "input_pattern") return;

        // Handle Submit Button
        if (x >= this.submitBtn.x && x <= this.submitBtn.x + this.submitBtn.w &&
            y >= this.submitBtn.y && y <= this.submitBtn.y + this.submitBtn.h) {
            this.verifySolution();
            return;
        }

        // Handle Grid Clicks
        if (x < this.gridX || x > this.gridX + this.gridSize * this.cellSize ||
            y < this.gridY || y > this.gridY + this.gridSize * this.cellSize) {
            return;
        }

        const cellX = Math.floor((x - this.gridX) / this.cellSize);
        const cellY = Math.floor((y - this.gridY) / this.cellSize);

        const index = this.playerPattern.findIndex(p => p.x === cellX && p.y === cellY);
        
        if (index !== -1) {
            this.playerPattern.splice(index, 1);
        } else {
            this.playerPattern.push({ x: cellX, y: cellY });
        }
    }

    verifySolution() {
        let correct = true;
        let msg = "Pattern Correct!";

        if (this.playerPattern.length !== this.targetPattern.length) {
            correct = false;
            msg = "Wrong cell count!";
        } else {
            for (let p of this.playerPattern) {
                if (this.distractionCells.some(d => d.x === p.x && d.y === p.y)) {
                    correct = false;
                    msg = "Distraction detected!";
                    break;
                }
            }
            
            if (correct) {
                const allMatch = this.targetPattern.every(t => 
                    this.playerPattern.some(p => p.x === t.x && p.y === t.y)
                );
                if (!allMatch) {
                    correct = false;
                    msg = "Pattern Mismatch!";
                }
            }
        }

        if (correct) {
            this.score += 250 * this.level;
            this.level++;
            if (this.level > this.maxLevel) {
                this.state = "victory";
            } else {
                this.addMessage(`Level ${this.level} Initialized`, PATTERN_COLORS.TERMINAL_GREEN);
                this.generatePuzzle();
            }
        } else {
            this.lives--;
            this.state = "verify";
            this.verifyMsg = msg;
        }
    }

    addMessage(text, color) {
        this.messages.push({ text, color, timer: 120 });
    }

    update() {
        if (this.state === "victory" || this.state === "game_over") return;
        
        // --- PREPARE PHASE ---
        if (this.state === "prepare") {
            this.prepareTimer -= 1/60;
            if (this.prepareTimer <= 0) {
                this.generatePuzzle();
            }
            return;
        }

        if (this.lives <= 0) {
            this.state = "game_over";
            return;
        }
        
        if (this.corruption >= 100) {
            this.state = "game_over";
            this.addMessage("SYSTEM CORRUPTED", PATTERN_COLORS.TERMINAL_RED);
            return;
        }

        this.corruption = Math.min(100, this.corruption + 0.01);

        if (this.state === "show_pattern") {
            this.showTime--;
            if (this.showTime <= 0) this.state = "memorize";
        } else if (this.state === "memorize") {
            this.memorizeTime--;
            if (this.memorizeTime <= 0) {
                this.state = "input_pattern";
                this.inputTime = Math.max(30 - this.level, 15) * 60; 
            }
        } else if (this.state === "input_pattern") {
            this.inputTime--;
            if (this.inputTime <= 0) {
                this.addMessage("Time's up!", PATTERN_COLORS.TERMINAL_RED);
                this.lives--;
                this.state = "verify";
                this.verifyMsg = "Time Expired!";
            }
        }

        this.messages = this.messages.filter(m => m.timer > 0);
        this.messages.forEach(m => m.timer--);
    }

    drawSidebar(ctx) {
        const sbW = this.width * 0.3;
        
        // Background
        ctx.fillStyle = PATTERN_COLORS.SIDEBAR;
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
        ctx.fillStyle = PATTERN_COLORS.TERMINAL_CYAN;
        ctx.font = 'bold 22px Courier New';
        ctx.fillText("PATTERN LOCK", 20, 130);

        ctx.strokeStyle = PATTERN_COLORS.TERMINAL_CYAN;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, 140);
        ctx.lineTo(sbW - 20, 140);
        ctx.stroke();

        const instructions = [
            { color: '#fff', text: "■ Watch Blue Cells" },
            { color: '#fff', text: "■ Memorize Pattern" },
            { color: '#00ff99', text: "■ Recreate & Submit" },
            { color: '#ff3333', text: "■ AVOID Purple" },
            { color: '#ffd700', text: "■ Click SUBMIT Btn" }
        ];

        let startY = 170;
        ctx.font = '16px Courier New';
        
        instructions.forEach(line => {
            ctx.fillStyle = line.color;
            ctx.fillText(line.text, 20, startY);
            startY += 30;
        });

        // --- GAME STATS ---
        startY += 40;
        
        ctx.fillStyle = '#8899aa';
        ctx.fillText("SYSTEM STATUS:", 20, startY);
        
        startY += 30;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Courier New';
        ctx.fillText(`LIVES: ${this.lives}`, 20, startY);
        
        startY += 30;
        ctx.fillText(`LEVEL: ${Math.min(this.level, this.maxLevel)}/5`, 20, startY);
        
        startY += 30;
        ctx.fillText(`SCORE: ${this.score}`, 20, startY);

        startY += 30;
        ctx.fillStyle = this.corruption > 80 ? PATTERN_COLORS.TERMINAL_RED : PATTERN_COLORS.TERMINAL_GREEN;
        ctx.fillText(`CORRUPTION: ${Math.floor(this.corruption)}%`, 20, startY);
    }

    draw(ctx) {
        // Clear Screen
        ctx.fillStyle = PATTERN_COLORS.BLACK;
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Left Sidebar
        this.drawSidebar(ctx);

        // Define Game Area Center
        const cx = this.gameX + this.gameW / 2;
        const cy = this.height / 2;

        // --- PREPARE SCREEN ---
        if (this.state === "prepare") {
            ctx.textAlign = "center";
            ctx.fillStyle = "#fff";
            ctx.font = "24px Courier New";
            ctx.fillText("SYSTEM INITIALIZING...", cx, cy - 50);

            ctx.fillStyle = PATTERN_COLORS.TERMINAL_GREEN;
            ctx.font = "bold 80px Courier New";
            ctx.fillText(Math.ceil(this.prepareTimer), cx, cy + 40);
            return;
        }

        // --- DYNAMIC TEXT (Instructions & Timers) ---
        // We draw these above or below the grid based on state
        
        let headerText = "";
        let timerText = "";
        let headerColor = "#fff";

        if (this.state === "show_pattern") {
            headerText = "MEMORIZE PATTERN";
            headerColor = PATTERN_COLORS.TERMINAL_BLUE;
            timerText = `Showing: ${Math.ceil(this.showTime / 60)}s`;
        } else if (this.state === "memorize") {
            headerText = "HOLD PATTERN IN MEMORY...";
            headerColor = PATTERN_COLORS.TERMINAL_CYAN;
            timerText = `Memorize: ${Math.ceil(this.memorizeTime / 60)}s`;
        } else if (this.state === "input_pattern") {
            headerText = "RECREATE PATTERN";
            headerColor = PATTERN_COLORS.TERMINAL_GREEN;
            timerText = `Remaining: ${Math.ceil(this.inputTime / 60)}s`;
        } else if (this.state === "verify") {
            // --- RESTORED INSTRUCTION TEXT ---
            headerText = "VERIFICATION FAILED";
            headerColor = PATTERN_COLORS.TERMINAL_RED;
            // The "Press SPACE" instruction
            timerText = "Press SPACE to retry"; 
        }

        // Draw Header (Above Grid)
        ctx.textAlign = "center";
        ctx.font = "bold 28px Courier New";
        ctx.fillStyle = headerColor;
        ctx.fillText(headerText, cx, this.gridY - 30);

        // Draw Timer / Sub-instruction (Below Grid)
        const gridHeight = this.gridSize * this.cellSize;
        ctx.font = "bold 24px Courier New";
        ctx.fillStyle = PATTERN_COLORS.TERMINAL_GREEN;
        
        // If verify, show the error message, then the retry text below it
        if (this.state === "verify") {
            ctx.fillStyle = PATTERN_COLORS.TERMINAL_RED;
            ctx.fillText(this.verifyMsg, cx, this.gridY + gridHeight + 30);
            ctx.fillStyle = "#fff";
            ctx.fillText(timerText, cx, this.gridY + gridHeight + 60);
        } else {
             // Normal Timer display
            ctx.fillText(timerText, cx, this.gridY + gridHeight + 30);
        }

        // --- GRID DRAWING ---
        const gridWidth = this.gridSize * this.cellSize;
        
        // Grid Background
        ctx.fillStyle = PATTERN_COLORS.DARK_BLUE;
        ctx.beginPath();
        ctx.roundRect(this.gridX - 10, this.gridY - 10, gridWidth + 20, gridWidth + 20, 10);
        ctx.fill();
        ctx.strokeStyle = PATTERN_COLORS.TERMINAL_CYAN;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw Cells
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const drawX = this.gridX + x * this.cellSize + 5;
                const drawY = this.gridY + y * this.cellSize + 5;
                const size = this.cellSize - 10;
                
                let cellColor = PATTERN_COLORS.CELL_BG;
                let borderColor = PATTERN_COLORS.CELL_BORDER;
                
                const inTarget = this.targetPattern.some(p => p.x === x && p.y === y);
                const inPlayer = this.playerPattern.some(p => p.x === x && p.y === y);
                const inDistract = this.distractionCells.some(p => p.x === x && p.y === y);

                if (this.state === "show_pattern") {
                    if (inTarget) {
                        cellColor = PATTERN_COLORS.TERMINAL_BLUE;
                        borderColor = PATTERN_COLORS.TERMINAL_CYAN;
                    } else if (inDistract) {
                        const pulse = Math.floor(Date.now() / 200) % 2;
                        cellColor = pulse ? PATTERN_COLORS.TERMINAL_PURPLE : 'rgb(100, 30, 150)';
                        borderColor = PATTERN_COLORS.TERMINAL_PURPLE;
                    }
                } else if (this.state === "memorize") {
                    if (inTarget) {
                        const fade = Math.max(0, this.memorizeTime / 180);
                        cellColor = `rgba(0, 150, 255, ${fade})`;
                        borderColor = `rgba(0, 220, 220, ${fade})`;
                    }
                } else if (this.state === "input_pattern") {
                    if (inPlayer) {
                        borderColor = 'rgb(150, 150, 150)';
                        cellColor = PATTERN_COLORS.INPUT_BG;
                    }
                } else if (["verify", "game_over", "victory"].includes(this.state)) {
                    if (inPlayer) {
                        if (inTarget) {
                            cellColor = PATTERN_COLORS.TERMINAL_GREEN;
                            borderColor = 'rgb(100, 255, 150)';
                        } else {
                            cellColor = PATTERN_COLORS.TERMINAL_RED;
                            borderColor = 'rgb(255, 100, 100)';
                        }
                    } else if (inTarget) {
                        cellColor = PATTERN_COLORS.TERMINAL_BLUE;
                        borderColor = PATTERN_COLORS.TERMINAL_CYAN;
                    } else if (inDistract) {
                        cellColor = 'rgb(80, 30, 120)';
                    }
                }

                ctx.fillStyle = cellColor;
                ctx.beginPath();
                ctx.roundRect(drawX, drawY, size, size, 5);
                ctx.fill();
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // --- SUBMIT BUTTON ---
        if (this.state === "input_pattern") {
            ctx.fillStyle = PATTERN_COLORS.INPUT_BG;
            ctx.beginPath();
            ctx.roundRect(this.submitBtn.x, this.submitBtn.y, this.submitBtn.w, this.submitBtn.h, 8);
            ctx.fill();
            ctx.strokeStyle = PATTERN_COLORS.TERMINAL_GREEN;
            ctx.stroke();
            
            // Text Centering
            ctx.textAlign = "center";
            ctx.fillStyle = PATTERN_COLORS.TERMINAL_GREEN;
            ctx.font = "bold 24px 'Courier New'";
            // Center text in button
            ctx.fillText("SUBMIT", this.submitBtn.x + this.submitBtn.w/2, this.submitBtn.y + 30);
        }

        // --- OVERLAYS ---
        if (this.state === "victory") {
            ctx.fillStyle = "rgba(0, 50, 0, 0.9)";
            ctx.fillRect(this.gameX, 0, this.gameW, this.height);
            ctx.textAlign = "center";
            ctx.fillStyle = PATTERN_COLORS.TERMINAL_GREEN;
            ctx.font = "bold 48px 'Courier New'";
            ctx.fillText("ACCESS GRANTED", cx, cy);
            ctx.font = "24px 'Courier New'";
            ctx.fillText(`Final Score: ${this.score}`, cx, cy + 50);
        }
        else if (this.state === "game_over") {
            ctx.fillStyle = "rgba(50, 0, 0, 0.9)";
            ctx.fillRect(this.gameX, 0, this.gameW, this.height);
            ctx.textAlign = "center";
            ctx.fillStyle = PATTERN_COLORS.TERMINAL_RED;
            ctx.font = "bold 48px 'Courier New'";
            ctx.fillText("ACCESS DENIED", cx, cy);
            ctx.font = "24px 'Courier New'";
            ctx.fillText("Security protocol triggered.", cx, cy + 50);
        }
    }
}

// Export
window.SecurityPuzzle = SecurityPuzzle;