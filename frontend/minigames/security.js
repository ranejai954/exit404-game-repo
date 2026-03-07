// minigames/security.js

window.startSecurityGame = function(canvasId, onComplete) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Security Game: Canvas not found!");
        if(onComplete) onComplete(false);
        return;
    }
    const ctx = canvas.getContext('2d');

    // Colors
    const COLORS = {
        BG: '#0a0c12',          // Void black
        SIDEBAR: '#111',
        UI_DARK: '#1e232d',     // Dark UI
        CORRUPTION: '#b400ff',  // Glitch Purple
        STABLE: '#00ff78',      // System Green
        WARNING: '#ff3250',     // Warning Red
        NODE_BORDER: '#3c4650', 
        TEXT_DIM: '#c8c8c8',
        TIMER_BAR: '#00ccff',   // Cyan for global timer
        INFO_YELLOW: '#ffcc00'
    };
    
    // Game Loop Reference
    let animationFrameId;
    let gameInstance = null;

    // --- CLASSES ---

    class DataNode {
        constructor(offsetX, offsetY, index) {
            // Store OFFSET from center of GAME AREA
            this.offsetX = offsetX;
            this.offsetY = offsetY;
            
            this.w = 120;
            this.h = 120;
            this.index = index;
            
            this.activeTimer = 0;
            this.currentColor = COLORS.UI_DARK;
            
            // Initial position calculation
            this.recalculatePosition();
        }

        recalculatePosition() {
            // Calculate center of the GAME AREA (Right 70%)
            const gameX = canvas.width * 0.3;
            const gameW = canvas.width * 0.7;
            const centerX = gameX + gameW / 2;
            const centerY = canvas.height / 2;
            
            this.baseX = centerX + this.offsetX;
            this.baseY = centerY + this.offsetY;
            this.x = this.baseX;
            this.y = this.baseY;
            
            this.drawX = this.x - this.w / 2;
            this.drawY = this.y - this.h / 2;
        }

        trigger(color = COLORS.CORRUPTION) {
            this.activeTimer = 45; 
            this.currentColor = color;
        }

        update(corruption) {
            if (this.activeTimer > 0) {
                this.activeTimer--;
            } else {
                this.currentColor = COLORS.UI_DARK;
            }

            // Shake Effect
            const shake = Math.floor(corruption / 30);
            const moveX = (Math.random() * shake * 2) - shake;
            const moveY = (Math.random() * shake * 2) - shake;
            
            this.x = this.baseX + moveX;
            this.y = this.baseY + moveY;
            
            this.drawX = this.x - this.w / 2;
            this.drawY = this.y - this.h / 2;
        }

        draw(ctx) {
            ctx.fillStyle = this.currentColor;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(this.drawX, this.drawY, this.w, this.h, 4);
            } else {
                ctx.rect(this.drawX, this.drawY, this.w, this.h);
            }
            ctx.fill();

            ctx.strokeStyle = COLORS.NODE_BORDER;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = COLORS.TEXT_DIM;
            ctx.font = "bold 16px 'Courier New'";
            // Center text inside node
            ctx.textAlign = "center";
            ctx.fillText(`SEC_${this.index.toString().padStart(2, '0')}`, this.drawX + this.w/2, this.drawY + this.h/2 + 5);
        }

        contains(mx, my) {
            return mx >= this.drawX && mx <= this.drawX + this.w &&
                   my >= this.drawY && my <= this.drawY + this.h;
        }
    }

    class Exit404Stabilizer {
        constructor() {
            // Define nodes by OFFSET from the center (X, Y)
            // -110 is Left/Up, +110 is Right/Down
            this.nodes = [
                new DataNode(-110, -110, 1), 
                new DataNode(110, -110, 2),
                new DataNode(-110, 110, 3), 
                new DataNode(110, 110, 4)
            ];
            
            this.targetLevel = 10;
            this.maxGlobalTime = 150; 
            this.transitionMsg = "";
            this.waitingRestart = false;

            this.boundHandleClick = (e) => this.handleClick(e);
            canvas.addEventListener('mousedown', this.boundHandleClick);
            
            // Handle Window Resize
            this.boundResize = () => this.handleResize();
            window.addEventListener('resize', this.boundResize);

            this.reset();
        }

        handleResize() {
            // Update canvas dimensions to match window
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // Update node positions based on new center
            this.nodes.forEach(node => node.recalculatePosition());
        }

        reset() {
            this.level = 1;
            this.corruption = 0;
            this.globalTimer = this.maxGlobalTime * 60; 
            
            // START IN PREPARE MODE
            this.state = "PREPARE"; 
            this.prepareTimer = 5.0; // 5 Seconds
        }

        startRound() {
            this.sequence = [];
            const rawLength = 2 + Math.floor(this.level / 2);
            const length = Math.min(rawLength, 5); 
            
            for(let i=0; i<length; i++) {
                this.sequence.push(Math.floor(Math.random() * 4));
            }

            this.playerInput = [];
            this.seqIdx = 0;
            this.state = "MEMORIZE";
            this.timer = 0;
            this.inputTimer = 800 - (this.level * 20); 
        }

        handleClick(e) {
            // Block input during prepare/memorize/transition
            if (this.state === "VICTORY" || this.state === "FAILURE") {
                if (!this.waitingRestart) {
                    this.waitingRestart = true;
                    setTimeout(() => {
                        this.cleanupAndFinish(this.state === "VICTORY");
                    }, 500);
                }
                return;
            }

            if (this.state !== "INPUT") return;

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            this.nodes.forEach((node, index) => {
                if (node.contains(mx, my)) {
                    node.trigger(COLORS.STABLE);
                    this.playerInput.push(index);
                    this.checkInput();
                }
            });
        }

        checkInput() {
            const idx = this.playerInput.length - 1;
            const clickedNodeIndex = this.playerInput[idx];

            if (clickedNodeIndex !== this.sequence[idx]) {
                this.nodes[clickedNodeIndex].trigger(COLORS.WARNING);
                this.corruption += 15; 
                this.state = "TRANSITION";
                this.transitionMsg = "INVALID INPUT - RESETTING...";
                this.timer = 60; 
                return;
            }

            if (this.playerInput.length === this.sequence.length) {
                if (this.level >= this.targetLevel) {
                    this.state = "VICTORY";
                    setTimeout(() => this.cleanupAndFinish(true), 2000);
                } else {
                    this.level++;
                    this.corruption = Math.max(0, this.corruption - 15);
                    this.state = "TRANSITION";
                    this.transitionMsg = "SEQUENCE VERIFIED";
                    this.timer = 40;
                }
            }
        }

        update() {
            if (this.state === "FINISHED") return;
            
            // --- PREPARE PHASE ---
            if (this.state === "PREPARE") {
                this.prepareTimer -= 1/60;
                if (this.prepareTimer <= 0) {
                    this.startRound();
                }
                return;
            }

            this.corruption = Math.min(100, Math.max(0, this.corruption));

            if (this.state !== "VICTORY" && this.state !== "FAILURE") {
                this.globalTimer--;
                if (this.globalTimer <= 0) {
                    this.state = "FAILURE";
                    this.failMessage = "CONNECTION TIMED OUT";
                    setTimeout(() => this.cleanupAndFinish(false), 2000);
                }
            }

            if (this.state === "MEMORIZE") {
                this.timer++;
                if (this.timer % 60 === 0) { 
                    if (this.seqIdx < this.sequence.length) {
                        const nodeIndex = this.sequence[this.seqIdx];
                        this.nodes[nodeIndex].trigger(COLORS.CORRUPTION);
                        this.seqIdx++;
                    } else {
                        this.state = "INPUT";
                    }
                }
            } 
            else if (this.state === "INPUT") {
                this.inputTimer--;
                if (this.inputTimer <= 0) {
                    this.corruption += 10; 
                    this.startRound();
                }
            }
            else if (this.state === "TRANSITION") {
                this.timer--;
                if (this.timer <= 0) {
                    this.startRound();
                }
            }

            if (this.corruption >= 100 && this.state !== "FAILURE") {
                this.state = "FAILURE";
                this.failMessage = "SYSTEM FAILURE: PERMANENT CORRUPTION";
                setTimeout(() => this.cleanupAndFinish(false), 2000);
            }

            this.nodes.forEach(node => node.update(this.corruption));
        }

        drawSidebar(W, H) {
            const sbW = W * 0.3;
            
            // Background
            ctx.fillStyle = COLORS.SIDEBAR;
            ctx.fillRect(0, 0, sbW, H);
            
            // Border
            ctx.strokeStyle = '#334455';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sbW, 0);
            ctx.lineTo(sbW, H);
            ctx.stroke();

            // --- INSTRUCTIONS (Aligned below hearts ~ Y:130) ---
            ctx.textAlign = 'left';
            ctx.fillStyle = COLORS.STABLE;
            ctx.font = 'bold 22px Courier New';
            ctx.fillText("STABILIZER", 20, 130);

            ctx.strokeStyle = COLORS.STABLE;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(20, 140);
            ctx.lineTo(sbW - 20, 140);
            ctx.stroke();

            const instructions = [
                { color: '#fff', text: "■ Watch Sequence" },
                { color: '#fff', text: "■ Memorize Flashes" },
                { color: '#00ff99', text: "■ Repeat Pattern" },
                { color: '#ff3333', text: "■ Errors +Corruption" },
                { color: '#ffd700', text: "■ Reduce to 0%" }
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
            ctx.fillText(`LEVEL: ${this.level} / ${this.targetLevel}`, 20, startY);
            
            startY += 30;
            const secondsLeft = Math.ceil(this.globalTimer / 60);
            ctx.fillStyle = secondsLeft < 30 ? COLORS.WARNING : '#fff';
            ctx.fillText(`TIME: ${secondsLeft}s`, 20, startY);

            startY += 30;
            ctx.fillStyle = this.corruption > 80 ? COLORS.WARNING : COLORS.STABLE;
            ctx.fillText(`CORRUPTION: ${Math.floor(this.corruption)}%`, 20, startY);
            
            // Corruption Bar in Sidebar
            startY += 10;
            ctx.fillStyle = '#333';
            ctx.fillRect(20, startY, sbW - 40, 10);
            ctx.fillStyle = this.corruption > 80 ? COLORS.WARNING : COLORS.CORRUPTION;
            ctx.fillRect(20, startY, (sbW - 40) * (this.corruption / 100), 10);
        }

        draw(ctx) {
            if (this.state === "FINISHED") return;

            const W = canvas.width;
            const H = canvas.height;

            // Clear Screen
            ctx.fillStyle = COLORS.BG;
            ctx.fillRect(0, 0, W, H);

            // Draw Sidebar
            this.drawSidebar(W, H);

            const gameX = W * 0.3;
            const gameW = W * 0.7;
            const cx = gameX + gameW / 2;
            const cy = H / 2;

            if (this.state === "FAILURE") {
                this.drawEndScreen(COLORS.WARNING, this.failMessage || "MISSION FAILED");
                return;
            }
            if (this.state === "VICTORY") {
                this.drawEndScreen(COLORS.STABLE, "SYSTEM STABILIZED: ACCESS GRANTED");
                return;
            }
            
            // --- PREPARE SCREEN ---
            if (this.state === "PREPARE") {
                ctx.textAlign = "center";
                ctx.fillStyle = "#fff";
                ctx.font = "24px Courier New";
                ctx.fillText("INITIALIZING SEQUENCE...", cx, cy - 50);

                ctx.fillStyle = COLORS.STABLE;
                ctx.font = "bold 80px Courier New";
                ctx.fillText(Math.ceil(this.prepareTimer), cx, cy + 40);
                return;
            }

            // --- DYNAMIC INSTRUCTIONS (Above Nodes) ---
            ctx.textAlign = "center";
            ctx.font = "bold 28px Courier New";
            
            let instruction = "WAITING...";
            let instColor = COLORS.INFO_YELLOW;

            if(this.state === "MEMORIZE") {
                instruction = "WATCH THE PATTERN";
                instColor = COLORS.CORRUPTION;
            }
            else if(this.state === "INPUT") {
                const sequenceLen = this.sequence ? this.sequence.length : 0;
                instruction = `ENTER SEQUENCE: ${this.playerInput.length} / ${sequenceLen}`;
                instColor = COLORS.STABLE;
            }
            else if(this.state === "TRANSITION") {
                instruction = this.transitionMsg;
                instColor = COLORS.WARNING;
            }
            
            ctx.fillStyle = instColor;
            ctx.fillText(instruction, cx, cy - 180); // Position above nodes

            // Draw Nodes
            this.nodes.forEach(node => node.draw(ctx));

            // Input Timeout Bar (Below nodes)
            if (this.state === "INPUT") {
                const maxTime = 800 - (this.level * 20);
                const barWidth = 400;
                const barX = cx - barWidth / 2;
                const barY = cy + 180;
                
                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barWidth, 8);
                
                ctx.fillStyle = COLORS.WARNING;
                ctx.fillRect(barX, barY, barWidth * (this.inputTimer / maxTime), 8);
            }
        }

        drawEndScreen(color, msg) {
            const W = canvas.width;
            const H = canvas.height;
            const gameX = W * 0.3;
            const gameW = W * 0.7;
            
            // Only fill game area
            ctx.fillStyle = color;
            ctx.fillRect(gameX, 0, gameW, H);
            
            ctx.fillStyle = COLORS.BG;
            ctx.textAlign = "center";
            ctx.font = "bold 36px 'Courier New'"; // Slightly smaller font to fit
            
            // Wrap text if needed or center properly
            const cx = gameX + gameW / 2;
            const cy = H / 2;
            
            ctx.fillText(msg, cx, cy);
            
            ctx.font = "20px 'Courier New'";
            ctx.fillText("Processing...", cx, cy + 50);
            ctx.textAlign = "left";
        }

        cleanupAndFinish(success) {
            if (this.state === "FINISHED") return;
            this.state = "FINISHED";

            canvas.removeEventListener('mousedown', this.boundHandleClick);
            window.removeEventListener('resize', this.boundResize);

            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            if (onComplete) onComplete(success);
        }
    }

    // --- INIT ---
    // Ensure canvas is full size immediately
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    gameInstance = new Exit404Stabilizer();

    function gameLoop() {
        if (!gameInstance || gameInstance.state === "FINISHED") return;

        // --- FIXED: AUTO-KILL IF CANVAS IS HIDDEN ---
        if (canvas.style.display === 'none' || canvas.classList.contains('hidden')) {
            console.log("Security Game background process detected - Stopping.");
            gameInstance.state = "FINISHED";
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            return;
        }

        gameInstance.update();
        gameInstance.draw(ctx); // Pass ctx correctly
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    gameLoop();

    // --- EXPOSE STOP FUNCTION FOR EXTERNAL USE ---
    window.stopSecurityGame = function() {
        if (gameInstance) {
            gameInstance.state = "FINISHED";
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        }
    };

    // Polyfill
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
};  