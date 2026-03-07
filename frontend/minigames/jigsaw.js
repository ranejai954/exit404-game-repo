// minigames/jigsaw.js

window.startJigsawGame = function(canvasId, onComplete) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Jigsaw Game: Canvas not found!");
        if (onComplete) onComplete(false);
        return;
    }
    const ctx = canvas.getContext('2d');

    // Make Canvas Full Screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // --- CONFIGURATION ---
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    // Colors
    const C_BG = '#050514';
    const C_SIDEBAR = '#111';
    const C_NEON_CYAN = [0, 255, 255];
    const C_NEON_GREEN = [0, 255, 150];
    const C_NEON_RED = [255, 30, 60];
    const C_NEON_YELLOW = [255, 255, 0];
    const C_WHITE = [255, 255, 255];

    // Symbols for the puzzle
    const SYMBOLS = ["Ω", "Ψ", "Ξ", "Φ", "Δ", "Σ", "Π", "Θ", "Γ", "λ", "μ", "π", "⚡", "❖", "⚙", "◈"];

    let animationFrameId;
    let gameInstance = null;

    // --- UTILS ---
    function rgb(arr) { return `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`; }
    
    function scaleColor(colorArr, factor) {
        return [
            Math.floor(colorArr[0] * factor),
            Math.floor(colorArr[1] * factor),
            Math.floor(colorArr[2] * factor)
        ];
    }
    
    // Helper for rounded rectangles (Polyfill)
    function roundRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // --- CLASSES ---
    class JigsawPiece {
        constructor(symbol, correctRow, correctCol) {
            this.symbol = symbol;
            this.correctPos = { r: correctRow, c: correctCol };
            this.currentPos = { r: correctRow, c: correctCol };
            this.size = 90;
            this.selected = false;
            this.x = 0; 
            this.y = 0;
        }

        draw(ctx, x, y) {
            this.x = x; 
            this.y = y;
            const inPlace = (this.currentPos.r === this.correctPos.r && this.currentPos.c === this.correctPos.c);
            
            let baseColor = inPlace ? C_NEON_GREEN : C_NEON_CYAN;
            if (this.selected) baseColor = C_NEON_YELLOW;

            // Draw Tile Body with Gradient Effect
            for (let i = 0; i < 5; i++) {
                const offset = i * 2;
                const size = this.size - i * 4;
                const colorFactor = 1.0 - (i * 0.15);
                const shadeColor = scaleColor(baseColor, colorFactor);
                
                ctx.fillStyle = rgb(shadeColor);
                
                if(ctx.roundRect) { 
                     ctx.beginPath(); 
                     ctx.roundRect(x + offset, y + offset, size, size, 8 - i); 
                     ctx.fill();
                } else {
                     roundRect(ctx, x + offset, y + offset, size, size, 8-i); 
                     ctx.fill();
                }
            }

            // Draw Border
            let borderColor = this.selected ? C_WHITE : (inPlace ? baseColor : [40, 60, 100]);
            ctx.strokeStyle = rgb(borderColor);
            ctx.lineWidth = (inPlace || this.selected) ? 3 : 1;
            roundRect(ctx, x, y, this.size, this.size, 8);
            ctx.stroke();

            // Draw Symbol
            ctx.fillStyle = inPlace ? rgb(C_WHITE) : rgb(baseColor);
            ctx.font = "bold 40px Arial";
            ctx.textAlign = "center"; 
            ctx.textBaseline = "middle";
            ctx.fillText(this.symbol, x + this.size / 2, y + this.size / 2);
        }

        contains(mx, my) {
            return mx >= this.x && mx <= this.x + this.size && my >= this.y && my <= this.y + this.size;
        }
    }

    class Exit404Jigsaw {
        constructor() {
            this.level = 1;
            this.maxLevels = 3;
            this.fullCode = "4D72A9";
            this.revealedCode = ["?", "?", "?", "?", "?", "?"];
            this.timeLimit = 180; // 3 Minutes
            
            // Layout
            this.gameX = WIDTH * 0.3;
            this.gameW = WIDTH * 0.7;
            
            this.pieces = [];
            this.selectedPiece = null;
            
            // Start in Prepare Phase
            this.gameState = "prepare"; 
            this.prepareTimer = 5.0; // 5 Seconds
            
            // Bind click handler specifically to this instance
            this.boundHandleClick = (e) => this.handleClick(e);
            canvas.addEventListener('mousedown', this.boundHandleClick);

            this.setupLevel();
        }

        setupLevel() {
            this.pieces = [];
            
            // Randomize Symbols for Uniqueness
            // We shuffle the symbol palette so the grid looks different every level
            let levelSymbols = [...SYMBOLS].sort(() => Math.random() - 0.5);
            
            let idx = 0;
            // Create 4x4 grid
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    this.pieces.push(new JigsawPiece(levelSymbols[idx], r, c));
                    idx++;
                }
            }
            
            // Shuffle Positions
            let positions = this.pieces.map(p => ({...p.currentPos}));
            
            // Fisher-Yates Shuffle
            for (let i = positions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [positions[i], positions[j]] = [positions[j], positions[i]];
            }
            
            // Assign shuffled positions back to pieces
            for (let i = 0; i < this.pieces.length; i++) {
                this.pieces[i].currentPos = positions[i];
            }
        }

        handleClick(e) {
            if (this.gameState !== "playing") return;
            
            const rect = canvas.getBoundingClientRect();
            // Scale logic for fullscreen canvas
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            for (let piece of this.pieces) {
                if (piece.contains(mx, my)) {
                    if (this.selectedPiece === null) {
                        // Select first piece
                        this.selectedPiece = piece;
                        piece.selected = true;
                    } else {
                        // Swap with second piece
                        if (this.selectedPiece !== piece) {
                            const temp = { ...this.selectedPiece.currentPos };
                            this.selectedPiece.currentPos = { ...piece.currentPos };
                            piece.currentPos = temp;
                        }
                        
                        // Deselect
                        this.selectedPiece.selected = false;
                        this.selectedPiece = null;
                        
                        this.checkWin();
                    }
                    return;
                }
            }
        }

        checkWin() {
            const allCorrect = this.pieces.every(p => 
                p.currentPos.r === p.correctPos.r && p.currentPos.c === p.correctPos.c
            );

            if (allCorrect) {
                // Reveal 2 digits of the code per level
                const idx = (this.level - 1) * 2;
                this.revealedCode[idx] = this.fullCode[idx];
                this.revealedCode[idx + 1] = this.fullCode[idx + 1];

                if (this.level < this.maxLevels) {
                    this.level++;
                    this.setupLevel();
                } else {
                    this.gameState = "victory";
                    setTimeout(() => cleanupAndFinish(true), 3000);
                }
            }
        }

        update() {
            // Prepare Phase
            if (this.gameState === "prepare") {
                this.prepareTimer -= 1/60;
                if (this.prepareTimer <= 0) {
                    this.gameState = "playing";
                    this.startTime = Date.now(); // Start actual timer
                }
                return;
            }

            // Playing Phase
            if (this.gameState === "playing") {
                const elapsed = (Date.now() - this.startTime) / 1000;
                this.timeLeft = Math.max(0, this.timeLimit - elapsed);
                
                if (this.timeLeft <= 0) {
                    this.gameState = "game_over";
                    setTimeout(() => cleanupAndFinish(false), 3000);
                }
            }
        }

        drawSidebar() {
            const sbW = WIDTH * 0.3;
            
            // Background
            ctx.fillStyle = C_SIDEBAR;
            ctx.fillRect(0, 0, sbW, HEIGHT);
            
            // Border
            ctx.strokeStyle = '#334455';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sbW, 0);
            ctx.lineTo(sbW, HEIGHT);
            ctx.stroke();

            // --- INSTRUCTIONS (Aligned below hearts ~ Y:130) ---
            ctx.textAlign = 'left';
            ctx.fillStyle = rgb(C_NEON_CYAN);
            ctx.font = 'bold 22px Courier New';
            ctx.fillText("DECRYPTION", 20, 130);

            ctx.strokeStyle = rgb(C_NEON_CYAN);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(20, 140);
            ctx.lineTo(sbW - 20, 140);
            ctx.stroke();

            const instructions = [
                { color: '#fff', text: "■ CLICK to Select" },
                { color: '#fff', text: "■ CLICK 2nd to Swap" },
                { color: '#00ff99', text: "■ ORDER the Grid" },
                { color: '#ffd700', text: "■ REVEAL the Key" }
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
            ctx.font = 'bold 20px Courier New';
            ctx.fillText(`LAYER: ${this.level}/3`, 20, startY);
            
            startY += 30;
            const timeColor = this.timeLeft < 30 ? C_NEON_RED : C_NEON_YELLOW;
            ctx.fillStyle = rgb(timeColor);
            ctx.fillText(`TIME: ${Math.floor(this.timeLeft)}s`, 20, startY);

            // --- REVEALED CODE ---
            startY += 60;
            ctx.fillStyle = rgb(C_NEON_CYAN);
            ctx.fillText("ACCESS KEY FRAGMENTS:", 20, startY);
            
            startY += 20;
            // Draw slots
            for (let i = 0; i < 6; i++) {
                const char = this.revealedCode[i];
                const color = char === "?" ? C_NEON_RED : C_NEON_GREEN;
                const rectX = 20 + i * 40;
                
                ctx.strokeStyle = rgb(color);
                ctx.lineWidth = 2;
                ctx.strokeRect(rectX, startY, 30, 40);

                ctx.fillStyle = rgb(color);
                ctx.font = "bold 24px 'Courier New'";
                ctx.textAlign = "center";
                ctx.fillText(char, rectX + 15, startY + 28);
            }
        }

        draw() {
            // Background
            ctx.fillStyle = C_BG;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            this.drawSidebar();

            const cx = this.gameX + this.gameW / 2;
            const cy = HEIGHT / 2;

            // --- PREPARE PHASE ---
            if (this.gameState === "prepare") {
                ctx.textAlign = "center";
                ctx.fillStyle = "#fff";
                ctx.font = "24px Courier New";
                ctx.fillText("INITIALIZING DECRYPTION MATRIX...", cx, cy - 50);

                ctx.fillStyle = rgb(C_NEON_CYAN);
                ctx.font = "bold 80px Courier New";
                ctx.fillText(Math.ceil(this.prepareTimer), cx, cy + 40);
                return;
            }

            // --- GAME GRID ---
            // Calculate grid drawing offset to center it in the Game Area
            const gridWidth = 4 * 90 + 3 * 8; // approx 384px wide (90 size + margins)
            const gridStartX = this.gameX + (this.gameW - gridWidth) / 2;
            const gridStartY = (HEIGHT - gridWidth) / 2;
            const spacing = 98; // 90 size + 8 gap

            for (let piece of this.pieces) {
                const drawX = gridStartX + piece.currentPos.c * spacing;
                const drawY = gridStartY + piece.currentPos.r * spacing;
                piece.draw(ctx, drawX, drawY);
            }

            // End Screen Overlays (Inside Game Area)
            if (this.gameState !== "playing" && this.gameState !== "prepare") {
                ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
                ctx.fillRect(this.gameX, 0, this.gameW, HEIGHT);
                
                ctx.textAlign = "center";
                if (this.gameState === "victory") {
                    ctx.fillStyle = rgb(C_NEON_GREEN);
                    ctx.font = "bold 40px 'Courier New'";
                    ctx.fillText("ACCESS CODE REVEALED", cx, cy - 40);
                    
                    ctx.fillStyle = rgb(C_WHITE);
                    ctx.font = "bold 24px 'Courier New'";
                    ctx.fillText(`RECOVERY KEY: ${this.fullCode}`, cx, cy + 30);
                } else {
                    ctx.fillStyle = rgb(C_NEON_RED);
                    ctx.font = "bold 40px 'Courier New'";
                    ctx.fillText("SYSTEM LOCKOUT", cx, cy - 40);
                    
                    ctx.fillStyle = rgb(C_WHITE);
                    ctx.font = "bold 24px 'Courier New'";
                    ctx.fillText("Rebooting...", cx, cy + 30);
                }
            }
        }
    }

    // --- INIT ---
    gameInstance = new Exit404Jigsaw();

    function gameLoop() {
        // --- ZOMBIE PROCESS CHECK ---
        if (canvas.style.display === 'none' || canvas.classList.contains('hidden')) {
             if (gameInstance) gameInstance.gameState = "finished";
             cancelAnimationFrame(animationFrameId);
             return;
        }

        if (gameInstance.gameState === "finished") return;

        gameInstance.update();
        gameInstance.draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    gameLoop();

    // --- CLEANUP FUNCTION ---
    function cleanupAndFinish(success) {
        if (gameInstance.gameState === "finished") return;
        gameInstance.gameState = "finished";

        canvas.removeEventListener('mousedown', gameInstance.boundHandleClick);
        cancelAnimationFrame(animationFrameId);

        if (onComplete) onComplete(success);
    }
    
    window.stopJigsawGame = function() {
        if(gameInstance) cleanupAndFinish(true); 
    };
};