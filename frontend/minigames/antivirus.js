// minigames/antivirus.js

window.startAntivirusGame = function(canvasId, onComplete) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Antivirus Game: Canvas not found!");
        if (onComplete) onComplete(false);
        return;
    }
    const ctx = canvas.getContext('2d');

    // --- 1. FORCE FULL SCREEN & HANDLE RESIZE ---
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize(); 
    window.addEventListener('resize', resize);

    // --- CONFIG ---
    const getW = () => canvas.width;
    const getH = () => canvas.height;

    // Colors
    const COLORS = {
        BG: '#050505',
        DATA: '#1a1a1a',      
        VIRUS: '#ff0033',     
        SYSTEM: '#00ff88', 
        UI_BG: '#0a0a0a',        
        TEXT: '#0f0',         
        BOSS_MAIN: '#880000',
        BOSS_MINI: '#cc6600',    
        SHIELD: '#0088ff',
        SELECT_BOX: 'rgba(0, 255, 255, 0.2)',
        SELECT_BORDER: '#00ffff'
    };

    let animationFrameId;
    let gameInstance = null;

    // --- UTILS ---
    function randomHex() {
        const chars = "XY0123456789"; 
        return chars[Math.floor(Math.random() * chars.length)] + chars[Math.floor(Math.random() * chars.length)];
    }

    // --- CLASSES ---

    // 1. GRID NODE (Levels 1-5)
    class DataNode {
        constructor(r, c, xOff, yOff, size, isHardLevel) {
            this.r = r; this.c = c; this.size = size; this.isHardLevel = isHardLevel;
            this.updatePosition(xOff, yOff, size);
            this.isDestroyed = false;
            this.type = 0; 
            this.hexVal = "00";
            this.refresh();
        }
        updatePosition(xOff, yOff, newSize) {
            if (newSize) this.size = newSize;
            this.x = xOff + this.c * this.size;
            this.y = yOff + this.r * this.size;
            this.w = this.size - 2;
            this.h = this.size - 2;
        }
        refresh() {
            this.hexVal = randomHex();
            this.isDestroyed = false;
            const rand = Math.random();
            if (this.isHardLevel && rand < 0.08) this.type = 3; 
            else if (rand < 0.30) this.type = 1; 
            else if (rand < 0.35) this.type = 2; 
            else this.type = 0; 
        }
        contains(mx, my) {
            return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
        }
        draw(ctx) {
            if (this.isDestroyed) return;
            let color = COLORS.DATA;
            let textColor = "#333";
            if (this.type === 1) { color = COLORS.VIRUS; textColor = "#500"; }
            else if (this.type === 2) { color = COLORS.SYSTEM; textColor = "#003300"; } 
            else if (this.type === 3) { color = "#aa00ff"; textColor = "#fff"; }

            ctx.fillStyle = color;
            ctx.fillRect(this.x, this.y, this.w, this.h);

            const fontSize = Math.max(10, Math.floor(this.size * 0.25));
            ctx.fillStyle = textColor;
            ctx.font = `bold ${fontSize}px monospace`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(this.hexVal, this.x + 5, this.y + 5);
            
            if (this.type === 1) {
                ctx.strokeStyle = "rgba(255, 50, 50, 0.4)";
                ctx.lineWidth = 1;
                ctx.strokeRect(this.x, this.y, this.w, this.h);
            }
            if (this.type === 3) {
                 ctx.strokeStyle = `rgba(200, 0, 255, ${Math.abs(Math.sin(Date.now()/100))})`;
                 ctx.lineWidth = 2;
                 ctx.strokeRect(this.x, this.y, this.w, this.h);
            }
        }
    }

    // 2. FALLING BLOCK (Final Level)
    class FileBlock {
        constructor(w, h) {
            this.size = 50; 
            this.x = Math.random() * (w - 60) + 10;
            this.y = -60; 
            this.vx = (Math.random() - 0.5) * 1.5;
            this.vy = Math.random() * 2 + 1.5; 
            
            this.type = Math.random() < 0.7 ? 1 : 2; 
            this.hexVal = randomHex();
            this.selected = false;
            this.isDestroyed = false;
        }

        update(h) {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > getW() - this.size) this.vx *= -1;
            if (this.y > h) {
                this.y = -60;
                this.x = Math.random() * (getW() - 60);
                this.selected = false; 
            }
        }

        draw(ctx) {
            if (this.isDestroyed) return;

            let color = this.type === 1 ? COLORS.VIRUS : COLORS.SYSTEM;
            let stroke = "none";

            if (this.selected) {
                color = "#ffffff"; 
                stroke = "#00ffff";
            }

            ctx.fillStyle = color;
            ctx.fillRect(this.x, this.y, this.size, this.size);
            
            if (this.selected) {
                ctx.shadowBlur = 10; ctx.shadowColor = "#00ffff";
                ctx.strokeStyle = stroke;
                ctx.lineWidth = 3;
                ctx.strokeRect(this.x, this.y, this.size, this.size);
                ctx.shadowBlur = 0;
            }

            ctx.fillStyle = this.selected ? "#000" : "#000";
            ctx.font = "bold 16px monospace";
            ctx.textAlign = "center";
            ctx.fillText(this.hexVal, this.x + this.size/2, this.y + this.size/2 + 5);
        }
    }

    class BossEntity {
        constructor(type = "main", difficultyMultiplier = 1) {
            this.type = type; 
            this.w = type === "mini" ? 300 : 450;
            this.h = type === "mini" ? 100 : 140;
            
            this.maxHp = (type === "mini" ? 60 : 120) * difficultyMultiplier;
            this.hp = this.maxHp;
            this.maxShield = (type === "mini" ? 50 : 50) * difficultyMultiplier;
            this.shield = this.maxShield;
            
            this.isVulnerable = false;
            this.vulnerableTimer = 0;
            this.rebootTime = type === "mini" ? 200 : 300; 
            this.flashTime = 0;
            this.shakeX = 0; this.shakeY = 0;
        }

        update(gridX, gridWidth, headerY) {
            const isEnraged = (this.type === "main") && (this.hp < this.maxHp * 0.5);
            if (isEnraged || this.flashTime > 0) {
                this.shakeX = (Math.random() - 0.5) * 10;
                this.shakeY = (Math.random() - 0.5) * 10;
            } else { this.shakeX = 0; this.shakeY = 0; }

            const targetX = gridX + (gridWidth - this.w) / 2;
            this.x = Math.max(gridX, targetX) + this.shakeX;
            this.y = (headerY || 50) + this.shakeY; 

            if (this.isVulnerable) {
                this.vulnerableTimer--;
                if (this.vulnerableTimer <= 0) {
                    this.isVulnerable = false;
                    this.shield = this.maxShield; 
                }
            }
            if (this.flashTime > 0) this.flashTime--;
        }

        damageShield(amount) {
            if (this.isVulnerable) return;
            this.shield -= amount;
            if (this.shield <= 0) {
                this.shield = 0;
                this.isVulnerable = true;
                this.vulnerableTimer = this.rebootTime;
            }
        }

        damageHp(amount) {
            if (!this.isVulnerable) return;
            this.hp -= amount;
            this.flashTime = 5;
        }

        contains(mx, my) {
            return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
        }

        draw(ctx) {
            const isMini = this.type === "mini";
            let bodyColor = this.isVulnerable ? "#003300" : "#1a0000"; 
            if (this.flashTime > 0) bodyColor = "#ffffff";

            ctx.save();
            ctx.shadowBlur = this.isVulnerable ? 30 : 20;
            ctx.shadowColor = this.isVulnerable ? "#00ff00" : (isMini ? "#ffaa00" : "#ff0000");
            
            ctx.fillStyle = bodyColor;
            ctx.fillRect(this.x, this.y, this.w, this.h);
            
            ctx.strokeStyle = this.isVulnerable ? "#00ff00" : (isMini ? "#ffaa00" : "#ff0000");
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x, this.y, this.w, this.h);
            ctx.restore();

            const bLen = 20;
            ctx.lineWidth = 5;
            ctx.strokeStyle = this.isVulnerable ? "#00ff00" : "#ff0000";
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + bLen); ctx.lineTo(this.x, this.y); ctx.lineTo(this.x + bLen, this.y);
            ctx.moveTo(this.x + this.w - bLen, this.y); ctx.lineTo(this.x + this.w, this.y); ctx.lineTo(this.x + this.w, this.y + bLen);
            ctx.moveTo(this.x, this.y + this.h - bLen); ctx.lineTo(this.x, this.y + this.h); ctx.lineTo(this.x + bLen, this.y + this.h);
            ctx.moveTo(this.x + this.w - bLen, this.y + this.h); ctx.lineTo(this.x + this.w, this.y + this.h); ctx.lineTo(this.x + this.w, this.y + this.h - bLen);
            ctx.stroke();

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `bold ${isMini ? 24 : 32}px 'Courier New'`;
            
            if (this.isVulnerable) {
                ctx.fillStyle = "#00ff00";
                ctx.fillText("⚠ EXPOSED ⚠", this.x + this.w/2, this.y + this.h/2 - 20);
                ctx.font = "bold 16px 'Courier New'";
                ctx.fillStyle = "#fff";
                ctx.fillText("[ DESTROY CORE ]", this.x + this.w/2, this.y + this.h/2 + 20);
            } else {
                ctx.fillStyle = isMini ? "#ffcc00" : "#ff4444";
                let status = isMini ? "GATEKEEPER" : "VIREX CORE";
                if (this.hp < this.maxHp * 0.4) status = "⚠ CRITICAL ⚠";
                ctx.fillText(status, this.x + this.w/2, this.y + this.h/2 - 15);
                
                const barW = this.w * 0.8;
                const barX = this.x + (this.w - barW)/2;
                const barY = this.y + this.h/2 + 15;
                ctx.fillStyle = "#330000";
                ctx.fillRect(barX, barY, barW, 8);
                const shieldPct = this.shield / this.maxShield;
                ctx.fillStyle = COLORS.SHIELD;
                ctx.fillRect(barX, barY, barW * shieldPct, 8);
            }

            const hpPct = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = "#220000";
            ctx.fillRect(this.x, this.y - 15, this.w, 8); 
            ctx.fillStyle = "#ff0000";
            ctx.fillRect(this.x, this.y - 15, this.w * hpPct, 8);
        }
    }

    class AntivirusProtocol {
        constructor() {
            if (typeof window.hearts === 'undefined') {
                window.hearts = 5; 
            }

            this.levels = [
                { size: 4, target: 10, time: 45, name: "BOOT SECTOR" },
                { size: 6, target: 20, time: 60, name: "RAM CACHE" },
                { size: 8, target: 999, time: 90, name: "GATEKEEPER", boss: true, bossType: 'mini', difficulty: 0.8 },
                { size: 10, target: 50, time: 90, name: "DATA STREAM" },
                { size: 10, target: 999, time: 180, name: "VIREX CORE", boss: true, bossType: 'main', difficulty: 1.2 },
                { type: "format", target: 1500, time: 100, name: "TOTAL FORMAT" }
            ];
            
            this.currentLvlIdx = 0;
            this.gameState = "playing"; 
            this.endMessage = "";
            this.boss = null;
            this.finished = false;
            this.cellSize = 60; 
            this.sidebarW = 300;
            this.bossY = 50; 
            this.grid = []; 
            
            // Format Level Vars
            this.fileBlocks = [];
            this.isSelecting = false;
            this.selX = 0; this.selY = 0; this.curX = 0; this.curY = 0;
            this.bossHp = 1500;
            this.maxBossHp = 1500;

            this.boundClick = (e) => this.handleMouseDown(e);
            this.boundMove = (e) => this.handleMouseMove(e);
            this.boundUp = (e) => this.handleMouseUp(e);
            this.boundKey = (e) => this.handleKey(e);
            
            canvas.addEventListener('mousedown', this.boundClick);
            canvas.addEventListener('mousemove', this.boundMove);
            window.addEventListener('mouseup', this.boundUp);
            window.addEventListener('keydown', this.boundKey);

            this.setupLevel();
        }

        setupLevel() {
            const lvl = this.levels[this.currentLvlIdx];
            
            // FORMAT LEVEL SETUP
            if (lvl.type === "format") {
                this.boss = null;
                this.grid = [];
                this.fileBlocks = [];
                this.timeLeft = lvl.time * 60;
                this.cleared = 0; 
                this.bossHp = lvl.target;
                this.maxBossHp = lvl.target;
                this.infection = 0;
                
                // Set special state for start instructions
                this.gameState = "prepare_format"; 
                
                // Initial Spawns
                for(let i=0; i<15; i++) {
                    this.fileBlocks.push(new FileBlock(getW(), getH()));
                }
                return;
            }

            // Normal/Boss Level Setup
            this.gridSize = lvl.size;
            if (lvl.boss) {
                if (!lvl.size) this.gridSize = lvl.bossType === 'mini' ? 6 : 8; 
                this.boss = new BossEntity(lvl.bossType || 'main', lvl.difficulty || 1);
            } else {
                this.boss = null;
            }

            this.target = lvl.target;
            this.timeLeft = lvl.time * 60; 
            this.cleared = 0;
            this.infection = 0; 
            this.shuffleDelay = 180; 
            this.shuffleTimer = this.shuffleDelay;

            this.recalculateGridPosition();
            const isHard = (lvl.mechanics === "bombs");

            this.grid = [];
            for (let r = 0; r < this.gridSize; r++) {
                const row = [];
                for (let c = 0; c < this.gridSize; c++) {
                    row.push(new DataNode(r, c, this.xOff, this.yOff, this.cellSize, isHard));
                }
                this.grid.push(row);
            }
        }
        
        recalculateGridPosition() {
            if (this.levels[this.currentLvlIdx].type === "format") return;

            this.sidebarW = Math.max(220, Math.min(300, getW() * 0.3));
            this.bossY = 50;
            let topReserve = 50; 
            if (this.boss) {
                topReserve = this.bossY + this.boss.h + 30; 
            }
            const availW = getW() - this.sidebarW - 40; 
            const availH = getH() - topReserve - 20;

            const maxCellW = Math.floor(availW / this.gridSize);
            const maxCellH = Math.floor(availH / this.gridSize);
            this.cellSize = Math.max(20, Math.min(80, maxCellW, maxCellH));
            
            this.xOff = this.sidebarW + Math.floor((availW - this.gridSize * this.cellSize) / 2) + 20;
            this.yOff = topReserve + Math.floor((availH - this.gridSize * this.cellSize) / 2);
        }

        // --- INPUT HANDLERS ---

        handleMouseDown(e) {
            // Start Format Level on click
            if (this.gameState === "prepare_format") {
                this.gameState = "playing";
                return;
            }

            if (this.gameState !== "playing") return;
            const lvl = this.levels[this.currentLvlIdx];
            
            const rect = canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
            const my = (e.clientY - rect.top) * (canvas.height / rect.height);

            // 1. FORMAT LEVEL: Start Selection
            if (lvl.type === "format") {
                this.isSelecting = true;
                this.selX = mx; this.selY = my;
                this.curX = mx; this.curY = my;
                return;
            }

            // 2. NORMAL LEVELS: Click
            if (this.boss && this.boss.contains(mx, my) && this.boss.isVulnerable) {
                this.boss.damageHp(5); 
                if (this.boss.hp <= 0) this.nextLevelOrWin();
                return;
            }
            if (this.grid) {
                for (const row of this.grid) {
                    for (const node of row) {
                        if (!node.isDestroyed && node.contains(mx, my)) {
                            node.isDestroyed = true;
                            if (node.type === 1) { // VIRUS
                                this.cleared += 1;
                                if (this.boss) this.boss.damageShield(10); 
                            } else if (node.type === 2) this.infection += 15; 
                            else if (node.type === 3) this.cleared += 2;
                            else this.infection += 2;  
                            return;
                        }
                    }
                }
            }
        }

        handleMouseMove(e) {
            if (this.isSelecting) {
                const rect = canvas.getBoundingClientRect();
                this.curX = (e.clientX - rect.left) * (canvas.width / rect.width);
                this.curY = (e.clientY - rect.top) * (canvas.height / rect.height);
                this.updateSelections();
            }
        }

        handleMouseUp(e) {
            this.isSelecting = false;
        }

        updateSelections() {
            const x = Math.min(this.selX, this.curX);
            const y = Math.min(this.selY, this.curY);
            const w = Math.abs(this.curX - this.selX);
            const h = Math.abs(this.curY - this.selY);

            for (const block of this.fileBlocks) {
                const cx = block.x + block.size/2;
                const cy = block.y + block.size/2;
                
                if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) {
                    block.selected = true;
                } else {
                    block.selected = false;
                }
            }
        }

        handleKey(e) {
            // Start Format Level on Space
            if (this.gameState === "prepare_format" && e.code === "Space") {
                this.gameState = "playing";
                return;
            }

            if (this.gameState !== "playing") return;
            const lvl = this.levels[this.currentLvlIdx];

            // SPACEBAR PURGE for Format Level
            if (lvl.type === "format" && e.code === "Space") {
                let damage = 0;
                let penalty = 0;
                let combo = 0;

                for (const block of this.fileBlocks) {
                    if (block.selected && !block.isDestroyed) {
                        block.isDestroyed = true;
                        
                        if (block.type === 1) { // VIRUS
                            damage += 50; 
                            combo++;
                        } else { // SYSTEM
                            penalty += 15;
                        }
                    }
                }

                if (combo > 1) damage += (combo * 5); 

                this.bossHp -= damage;
                this.infection += penalty;
                this.fileBlocks = this.fileBlocks.filter(b => !b.isDestroyed);
            }
        }

        nextLevelOrWin() {
            if (this.currentLvlIdx < this.levels.length - 1) {
                this.currentLvlIdx++;
                this.setupLevel();
            } else {
                this.gameState = "victory";
                this.endMessage = "VIRUS CLEANED\nSYSTEM RESTORED";
                setTimeout(() => cleanupAndFinish(true), 3000);
            }
        }

        handleLevelFail() {
            if (window.hearts > 0) window.hearts--;

            if (window.updateHearts) window.updateHearts();
            else {
                const hContainer = document.getElementById('hearts-container');
                if (hContainer && hContainer.children.length > 0) {
                    hContainer.removeChild(hContainer.lastElementChild);
                }
            }

            if (window.hearts > 0) {
                this.gameState = "retry_wait";
                this.endMessage = `BREACH DETECTED\nRETRYING... (${window.hearts} HEARTS LEFT)`;
                setTimeout(() => {
                    this.gameState = "playing";
                    this.setupLevel();
                }, 2000);
            } else {
                this.gameState = "failure";
                this.endMessage = "SYSTEM CRASH\nVIRUS TOOK OVER";
                setTimeout(() => cleanupAndFinish(false), 3000);
            }
        }

        update() {
            const lvl = this.levels[this.currentLvlIdx];
            
            // --- FORMAT LEVEL UPDATE ---
            if (lvl.type === "format" && this.gameState === "playing") {
                this.timeLeft--;
                
                // Spawn new blocks
                if (this.fileBlocks.length < 25 && Math.random() < 0.15) {
                    this.fileBlocks.push(new FileBlock(getW(), getH()));
                }

                for (const block of this.fileBlocks) {
                    block.update(getH());
                }

                if (this.timeLeft <= 0 || this.infection >= 100) {
                    this.handleLevelFail();
                } else if (this.bossHp <= 0) {
                    this.nextLevelOrWin();
                }
                
                if (this.infection > 0) this.infection -= 0.1; 
                return;
            }

            // --- STANDARD LEVEL UPDATE ---
            this.recalculateGridPosition();
            
            if (this.grid) {
                for (const row of this.grid) {
                    for (const node of row) node.updatePosition(this.xOff, this.yOff, this.cellSize);
                }
            }
            
            if (this.gameState === "playing") {
                this.timeLeft--;
                this.shuffleTimer--;

                let currentShuffleDelay = this.shuffleDelay;
                let infectionRate = 0.5;

                if (this.boss) {
                    if (this.boss.type === 'mini') infectionRate = 0.8;
                    if (this.boss.type === 'main' && this.boss.hp < this.boss.maxHp * 0.4) {
                        currentShuffleDelay = 140; infectionRate = 1.2;      
                    }
                } else if (this.currentLvlIdx === 3) infectionRate = 0.7;

                if (this.shuffleTimer <= 0) {
                    if (this.grid) {
                        for (const row of this.grid) {
                            for (const node of row) {
                                if (!node.isDestroyed && node.type === 3) this.infection += 15; 
                                if (!node.isDestroyed) node.refresh();
                            }
                        }
                    }
                    this.shuffleTimer = currentShuffleDelay;
                    if (this.boss) this.infection += infectionRate;
                }

                if (this.infection >= 100 || this.timeLeft <= 0) {
                    this.handleLevelFail();
                } else if (!this.boss && this.cleared >= this.target) {
                    this.nextLevelOrWin();
                }
            }
        }

        draw() {
            const WIDTH = getW();
            const HEIGHT = getH();
            
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            
            // Format Level Prepare Screen
            if (this.gameState === "prepare_format") {
                this.drawFormatStartScreen(ctx, WIDTH, HEIGHT);
                return;
            }

            let baseRed = 50;
            if (this.infection > 100) baseRed = 200;
            ctx.fillStyle = `rgba(${baseRed}, 0, 0, 0.15)`;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            if (this.gameState !== "playing") {
                this.drawEndScreen();
                return;
            }

            const lvl = this.levels[this.currentLvlIdx];

            if (lvl.type === "format") {
                this.drawFormatLevel(ctx, WIDTH, HEIGHT);
                return;
            }

            // --- STANDARD LEVEL DRAW ---
            ctx.fillStyle = "#0f0f0f";
            ctx.fillRect(0, 0, this.sidebarW, HEIGHT);
            ctx.strokeStyle = "#444";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(this.sidebarW, 0); ctx.lineTo(this.sidebarW, HEIGHT); ctx.stroke();

            // --- LEFT SIDE INSTRUCTIONS ---
            ctx.textAlign = "left";
            ctx.fillStyle = "#00ffff";
            ctx.font = "bold 22px 'Courier New'";
            ctx.fillText("INSTRUCTIONS", 20, 130);
            ctx.strokeStyle = "#00ffff";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(20, 140); ctx.lineTo(this.sidebarW - 20, 140); ctx.stroke();

            let instY = 170;
            const instLines = [
                {c: COLORS.VIRUS, t: "■ CLICK Red Data"},
                {c: COLORS.SYSTEM, t: "■ AVOID Green Data"},
            ];
            
            if (lvl.boss) {
                instLines.push({c: "#ffffff", t: "■ DAMAGE Boss Shield"});
                instLines.push({c: "#00ff00", t: "■ ATTACK Core when exposed"});
            } else {
                instLines.push({c: "#aa00ff", t: "■ PURGE Logic Bombs"});
            }

            ctx.font = "16px 'Courier New'";
            for (let line of instLines) {
                ctx.fillStyle = line.c;
                ctx.fillText(line.t, 20, instY);
                instY += 30;
            }

            // --- GAME STATS BELOW INSTRUCTIONS ---
            instY += 40;
            const info = [
                `TARGET: ${lvl.name}`, 
                `LAYER: ${this.currentLvlIdx + 1}/${this.levels.length}`,
                lvl.boss ? `BOSS SHIELD:` : `VIRUS PURGED:`,
                lvl.boss ? `${Math.floor(this.boss.shield)}%` : `${this.cleared} / ${this.target}`,
                `TIME REMAINING:`, 
                `${Math.ceil(this.timeLeft / 60)}s`,
                `SYSTEM INFECTION:`, 
                `${Math.floor(this.infection)}%`
            ];

            ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
            
            for (let i = 0; i < info.length; i++) {
                const isHeader = (i % 2 === 0);
                ctx.font = isHeader ? "16px 'Courier New'" : "bold 24px 'Courier New'";
                let color = isHeader ? "#aaa" : "#fff";
                
                if (!isHeader && info[i].includes("%") && this.infection > 80) color = "#ff0000";
                
                ctx.fillStyle = color;
                ctx.fillText(info[i], 20, instY);
                instY += isHeader ? 25 : 40;
            }

            if (this.grid) for (const row of this.grid) for (const node of row) node.draw(ctx);
            if (this.boss) { 
                this.boss.update(this.xOff, this.gridSize * this.cellSize, this.bossY); 
                this.boss.draw(ctx); 
            }
        }

        drawFormatStartScreen(ctx, w, h) {
            // Background
            ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
            ctx.fillRect(0, 0, w, h);

            // Box
            const boxW = 600;
            const boxH = 400;
            const bx = (w - boxW) / 2;
            const by = (h - boxH) / 2;

            ctx.strokeStyle = "#00ffff";
            ctx.lineWidth = 4;
            ctx.strokeRect(bx, by, boxW, boxH);
            ctx.fillStyle = "rgba(0, 20, 40, 0.8)";
            ctx.fillRect(bx, by, boxW, boxH);

            ctx.textAlign = "center";
            ctx.fillStyle = "#ff3333";
            ctx.font = "bold 40px 'Courier New'";
            ctx.fillText("FINAL STAGE: TOTAL FORMAT", w / 2, by + 60);

            ctx.fillStyle = "#fff";
            ctx.font = "20px 'Courier New'";
            ctx.textAlign = "left";
            let tx = bx + 80;
            let ty = by + 140;

            ctx.fillText("■  DRAG MOUSE to Select Blocks", tx, ty);
            ty += 40;
            ctx.fillText("■  PRESS SPACE to Purge Selected", tx, ty);
            ty += 40;
            ctx.fillStyle = "#ff0000";
            ctx.fillText("■  DESTROY THE CORE (Red Bar)", tx, ty);
            ty += 40;
            ctx.fillStyle = "#00ff00";
            ctx.fillText("■  AVOID System Files (Green)", tx, ty);

            // Flashing Prompt
            if (Math.floor(Date.now() / 500) % 2 === 0) {
                ctx.textAlign = "center";
                ctx.fillStyle = "#00ffff";
                ctx.font = "bold 28px 'Courier New'";
                ctx.fillText("[ CLICK TO EXECUTE ]", w / 2, by + boxH - 50);
            }
        }

        drawFormatLevel(ctx, w, h) {
            for (const block of this.fileBlocks) {
                block.draw(ctx);
            }

            if (this.isSelecting) {
                const x = Math.min(this.selX, this.curX);
                const y = Math.min(this.selY, this.curY);
                const width = Math.abs(this.curX - this.selX);
                const height = Math.abs(this.curY - this.selY);

                ctx.fillStyle = COLORS.SELECT_BOX;
                ctx.fillRect(x, y, width, height);
                ctx.strokeStyle = COLORS.SELECT_BORDER;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);
            }

            // HUD
            ctx.fillStyle = "rgba(0,0,0,0.85)";
            ctx.fillRect(0, 0, w, 140);

            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.font = "bold 32px 'Courier New'";
            ctx.fillText("VIREX CORE DELETION", w/2, 40);

            // Boss HP Bar
            const barW = Math.min(800, w - 100);
            const barH = 30;
            const barX = (w - barW) / 2;
            const hpPct = Math.max(0, this.bossHp / this.maxBossHp);
            
            ctx.fillStyle = "#330000";
            ctx.fillRect(barX, 60, barW, barH);
            ctx.fillStyle = "#ff0000";
            ctx.fillRect(barX, 60, barW * hpPct, barH);
            ctx.strokeStyle = "#fff";
            ctx.strokeRect(barX, 60, barW, barH);

            ctx.font = "20px monospace";
            ctx.textAlign = "left";
            ctx.fillStyle = this.timeLeft < 30 ? "#f00" : "#fff";
            ctx.fillText(`TIME: ${Math.ceil(this.timeLeft/60)}s`, 50, 60);
            ctx.fillStyle = this.infection > 50 ? "#f00" : "#0f0";
            ctx.fillText(`INFECTION: ${Math.floor(this.infection)}%`, 50, 90);
            
            ctx.textAlign = "right";
            ctx.fillStyle = "#00ffff";
            ctx.fillText("HOLD MOUSE TO SELECT > SPACE TO PURGE", w - 50, 90);
        }

        drawEndScreen() {
            const WIDTH = getW();
            const HEIGHT = getH();
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            
            const isRetry = (this.gameState === "retry_wait");
            const isSuccess = this.endMessage.includes("CLEANED") || this.endMessage.includes("RESTORED");
            
            ctx.fillStyle = isSuccess ? "#0f0" : (isRetry ? "#ffaa00" : "#f00");
            ctx.font = "bold 48px 'Courier New'";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            const lines = this.endMessage.split("\n");
            let startY = HEIGHT / 2 - 30;
            lines.forEach((line, index) => ctx.fillText(line, WIDTH / 2, startY + (index * 60)));
            
            ctx.fillStyle = "#666";
            ctx.font = "20px monospace";
            ctx.fillText("Processing...", WIDTH / 2, HEIGHT - 100);
        }
    }

    // --- INIT ---
    gameInstance = new AntivirusProtocol();

    function loop() {
        if (canvas.style.display === 'none' || canvas.classList.contains('hidden')) {
             if (gameInstance) gameInstance.finished = true;
             cancelAnimationFrame(animationFrameId);
             return;
        }
        if (gameInstance.finished) return;

        gameInstance.update();
        gameInstance.draw();
        animationFrameId = requestAnimationFrame(loop);
    }
    loop();

    function cleanupAndFinish(success) {
        if (gameInstance.finished) return;
        gameInstance.finished = true;
        
        window.removeEventListener('resize', resize); 
        canvas.removeEventListener('mousedown', gameInstance.boundClick);
        canvas.removeEventListener('mousemove', gameInstance.boundMove);
        window.removeEventListener('mouseup', gameInstance.boundUp);
        window.removeEventListener('keydown', gameInstance.boundKey);
        cancelAnimationFrame(animationFrameId);
        
        if (onComplete) onComplete(success);
    }

    window.stopAntivirusGame = function() {
        cleanupAndFinish(true);
    };
};