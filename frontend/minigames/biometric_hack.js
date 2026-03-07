// minigames/biometric_hack.js

window.startBiometricGame = function(canvasId, onComplete) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Biometric Game: Canvas not found!");
        if (onComplete) onComplete(false);
        return;
    }
    const ctx = canvas.getContext('2d');

    // Force Full Screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    // --- CONFIGURATION ---
    const GAME = {
        speedBase: 4,       
        speedMax: 12,        
        fillAmount: 10,      
        timeStart: 60,      
        timePenalty: 5,     
        zoneSizeBase: 150,  
        zoneSizeMin: 50,    
        
        colors: {
            scanner: '#00ffff', 
            zone: 'rgba(0, 255, 65, 0.4)', 
            zoneBorder: '#00ff41',
            bg: '#000000',
            fingerprint: '#0f1f0f',
            text: '#00ff41',
            err: '#ff3333',
            overlayBg: 'rgba(0, 20, 0, 0.95)',
            panelBorder: '#00ff41'
        }
    };

    let animationFrameId;
    let gameInstance = null;

    class BiometricSystem {
        constructor() {
            this.state = "WAITING"; // WAITING -> PLAYING -> FINISHED
            this.progress = 0;
            this.timeLeft = GAME.timeStart;
            
            this.scannerY = 0;
            this.scannerDir = 1;
            this.targetY = 150;
            this.targetH = 100;
            
            this.msg = "SYSTEM READY";
            this.shake = 0;
            this.lastTime = 0;

            // Input Binding
            this.boundHandleInput = (e) => {
                if(e.code === 'Space') {
                    e.preventDefault(); 
                    this.handleInput();
                }
            };
            this.boundClick = (e) => {
                e.preventDefault();
                this.handleInput();
            };

            window.addEventListener('keydown', this.boundHandleInput);
            canvas.addEventListener('mousedown', this.boundClick);
            canvas.addEventListener('touchstart', this.boundClick);
        }

        handleInput() {
            if (this.state === "FINISHED") return;

            // START GAME on first input
            if (this.state === "WAITING") {
                this.state = "PLAYING";
                this.timeLeft = GAME.timeStart;
                this.progress = 0;
                this.msg = "MATCH THE GREEN ZONE";
                this.randomizeTarget();
                this.lastTime = performance.now();
                return;
            }

            // GAMEPLAY INPUT
            if (this.state === "PLAYING") {
                this.checkHit();
            }
        }

        checkHit() {
            // Logic: Is scanner inside the green box?
            let hitTop = this.targetY - 10; 
            let hitBottom = this.targetY + this.targetH + 10;
            
            if (this.scannerY >= hitTop && this.scannerY <= hitBottom) {
                // SUCCESS
                this.progress += GAME.fillAmount;
                this.msg = "DATA PACKET UPLOADED";
                this.randomizeTarget();
                
                if (this.progress >= 100) {
                    this.endGame(true);
                }
            } else {
                // FAIL
                this.timeLeft -= GAME.timePenalty;
                this.shake = 15;
                this.msg = `ERROR! TIME PENALTY -${GAME.timePenalty}s`;
                
                if (this.timeLeft <= 0) {
                    this.timeLeft = 0;
                    this.endGame(false);
                }
            }
        }

        randomizeTarget() {
            // Increased padding to 150 to keep it centered away from UI
            let padding = 150; 
            let max = HEIGHT - this.targetH - padding;
            this.targetY = padding + Math.random() * (max - padding);
        }

        update(timestamp) {
            if (this.state !== "PLAYING") return;

            let dt = (timestamp - this.lastTime) / 1000;
            this.lastTime = timestamp;

            // 1. Update Timer
            this.timeLeft -= dt;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.endGame(false);
                return;
            }

            // 2. Dynamic Difficulty
            let difficulty = this.progress / 100;
            let currentSpeed = GAME.speedBase + (GAME.speedMax - GAME.speedBase) * difficulty;
            this.targetH = GAME.zoneSizeBase - (GAME.zoneSizeBase - GAME.zoneSizeMin) * difficulty;

            // 3. Move Scanner
            this.scannerY += currentSpeed * this.scannerDir;

            if (this.scannerY > HEIGHT) {
                this.scannerY = HEIGHT;
                this.scannerDir = -1;
            } else if (this.scannerY < 0) {
                this.scannerY = 0;
                this.scannerDir = 1;
            }

            if (this.shake > 0) this.shake -= 1;
        }

        draw() {
            // Screen Shake
            let tx = 0, ty = 0;
            if (this.shake > 0) {
                tx = (Math.random() - 0.5) * this.shake;
                ty = (Math.random() - 0.5) * this.shake;
            }

            ctx.save();
            ctx.translate(tx, ty);

            // 1. Background
            ctx.fillStyle = GAME.colors.bg;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            this.drawFingerprint();

            // 2. Green Zone (Only when playing)
            if (this.state === "PLAYING") {
                ctx.fillStyle = GAME.colors.zone;
                ctx.fillRect(0, this.targetY, WIDTH, this.targetH);
                ctx.strokeStyle = GAME.colors.zoneBorder;
                ctx.lineWidth = 2;
                ctx.strokeRect(0, this.targetY, WIDTH, this.targetH);
                
                ctx.fillStyle = "#fff";
                ctx.font = "bold 16px monospace";
                ctx.textAlign = "left";
                ctx.fillText(">>> LOCK TARGET <<<", 20, this.targetY + 25);
            }

            // 3. Scanner Line
            ctx.fillStyle = GAME.colors.scanner;
            ctx.shadowBlur = 15;
            ctx.shadowColor = GAME.colors.scanner;
            ctx.fillRect(0, this.scannerY - 2, WIDTH, 6);
            ctx.shadowBlur = 0;

            // 4. UI OVERLAYS
            if (this.state === "PLAYING") {
                this.drawHUD();
            } else if (this.state === "WAITING") {
                this.drawStartScreen();
            } else if (this.state === "FINISHED") {
                this.drawEndScreen();
            }

            ctx.restore();
        }

        drawFingerprint() {
            ctx.strokeStyle = GAME.colors.fingerprint;
            ctx.lineWidth = 3;
            let cx = WIDTH / 2;
            let cy = HEIGHT / 2;
            
            for (let i = 1; i < 18; i++) {
                ctx.beginPath();
                ctx.ellipse(cx, cy, i * 20, i * 28, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        drawHUD() {
            // Top Bar Background
            ctx.fillStyle = "#111";
            ctx.fillRect(0, 0, WIDTH, 100); 
            ctx.strokeStyle = "#333";
            ctx.strokeRect(0, 0, WIDTH, 100);

            // Progress Bar
            const barW = 400;
            const barH = 20;
            const barX = (WIDTH - barW) / 2;
            const barY = 30;

            ctx.fillStyle = "#222";
            ctx.fillRect(barX, barY, barW, barH);
            
            const fillW = (Math.min(100, this.progress) / 100) * barW;
            ctx.fillStyle = GAME.colors.text;
            ctx.fillRect(barX, barY, fillW, barH);
            
            ctx.strokeStyle = "#fff";
            ctx.strokeRect(barX, barY, barW, barH);

            // Text Info
            ctx.font = "bold 24px monospace";
            
            // Time
            ctx.fillStyle = this.timeLeft < 10 ? GAME.colors.err : "#fff";
            ctx.textAlign = "right";
            ctx.fillText(`TIME: ${this.timeLeft.toFixed(1)}`, WIDTH - 30, 80);

            // Message
            ctx.fillStyle = this.msg.includes("ERROR") ? GAME.colors.err : "#fff";
            ctx.textAlign = "left";
            ctx.fillText(this.msg, 30, 80);
        }

        drawStartScreen() {
            // Dark Overlay
            ctx.fillStyle = GAME.colors.overlayBg;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            // Container Box
            const boxW = 600;
            const boxH = 400;
            const boxX = (WIDTH - boxW) / 2;
            const boxY = (HEIGHT - boxH) / 2;

            ctx.strokeStyle = GAME.colors.panelBorder;
            ctx.lineWidth = 3;
            ctx.strokeRect(boxX, boxY, boxW, boxH);
            ctx.fillStyle = "rgba(0, 20, 0, 0.8)";
            ctx.fillRect(boxX, boxY, boxW, boxH);

            ctx.textAlign = "center";
            
            // Title
            ctx.fillStyle = GAME.colors.text;
            ctx.font = "bold 40px 'Courier New'";
            ctx.fillText("BIOMETRIC OVERRIDE", WIDTH / 2, boxY + 60);
            
            // Divider
            ctx.strokeStyle = GAME.colors.panelBorder;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(boxX + 50, boxY + 80);
            ctx.lineTo(boxX + boxW - 50, boxY + 80);
            ctx.stroke();

            // Instructions (Left Aligned relative to center)
            const startTextY = boxY + 130;
            const lineHeight = 40;
            ctx.font = "20px 'Courier New'";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "left";
            const textX = boxX + 80;

            ctx.fillText("■  Scanner moves automatically", textX, startTextY);
            ctx.fillText("■  Press SPACE/CLICK when inside GREEN ZONE", textX, startTextY + lineHeight);
            ctx.fillText("■  Fill Progress Bar to 100%", textX, startTextY + lineHeight * 2);
            ctx.fillText("■  Misses reduce Time & Shake Screen", textX, startTextY + lineHeight * 3);
            
            // Flashing Prompt
            if (Math.floor(Date.now() / 500) % 2 === 0) {
                ctx.textAlign = "center";
                ctx.fillStyle = GAME.colors.scanner;
                ctx.font = "bold 28px 'Courier New'";
                ctx.fillText("[ CLICK TO START HACK ]", WIDTH / 2, boxY + boxH - 50);
            }
        }

        drawEndScreen() {
            ctx.fillStyle = "rgba(0,0,0,0.9)";
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            
            ctx.textAlign = "center";
            ctx.font = "bold 48px monospace";
            
            if (this.progress >= 100) {
                ctx.fillStyle = "#00ff41";
                ctx.fillText("ACCESS GRANTED", WIDTH/2, HEIGHT/2 - 20);
                ctx.font = "24px monospace";
                ctx.fillStyle = "#fff";
                ctx.fillText("Identity Spoofed Successfully", WIDTH/2, HEIGHT/2 + 40);
            } else {
                ctx.fillStyle = "#ff3333";
                ctx.fillText("ACCESS DENIED", WIDTH/2, HEIGHT/2 - 20);
                ctx.font = "24px monospace";
                ctx.fillStyle = "#fff";
                ctx.fillText("Biometric Mismatch Detected", WIDTH/2, HEIGHT/2 + 40);
            }
        }

        endGame(win) {
            this.state = "FINISHED";
            setTimeout(() => cleanupAndFinish(win), 2000);
        }
    }

    gameInstance = new BiometricSystem();

    function loop(timestamp) {
        // --- ZOMBIE CHECK ---
        if (canvas.style.display === 'none' || canvas.classList.contains('hidden')) {
             if (gameInstance) gameInstance.state = "FINISHED";
             cancelAnimationFrame(animationFrameId);
             return;
        }

        if (!gameInstance) return;
        gameInstance.update(timestamp);
        gameInstance.draw();
        animationFrameId = requestAnimationFrame(loop);
    }
    
    // Start Loop
    requestAnimationFrame(loop);

    function cleanupAndFinish(success) {
        if (!gameInstance) return;
        gameInstance.state = "FINISHED";
        
        window.removeEventListener('keydown', gameInstance.boundHandleInput);
        canvas.removeEventListener('mousedown', gameInstance.boundClick);
        canvas.removeEventListener('touchstart', gameInstance.boundClick);
        
        cancelAnimationFrame(animationFrameId);
        gameInstance = null;

        if (onComplete) onComplete(success);
    }

    window.stopBiometricGame = function() {
        cleanupAndFinish(true); 
    };
};