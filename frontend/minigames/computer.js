// minigames/computer.js

window.startComputerGame = function(canvasId, hasPassword, onComplete) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Computer Game: Canvas not found!");
        if(onComplete) onComplete(false);
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
    const COLOR_BG = '#0f1114';      
    const COLOR_UI = '#c8d2dc';      
    const COLOR_ACCENT = '#0096ff';  
    const COLOR_ERR = '#ff3333';
    const COLOR_BTN = '#333';

    let animationFrameId;
    let gameInstance = null;

    class AccessSystem {
        constructor() {
            this.targetCode = "4D72A9";
            this.inputCode = "";
            this.status = "LOCKED";
            this.accessGranted = false;
            this.errorTimer = 0;
            this.hasPassword = hasPassword; 
            this.finished = false;
            
            // --- DIALOGUE SYSTEM (New Feature) ---
            this.dialogueActive = !hasPassword; // Only show dialogue if we DON'T have the password (first time)
            this.dialogueIndex = 0;
            
            // Generate Fake Codes for the "Story"
            this.fakeCode1 = this.generateRandomCode();
            this.fakeCode2 = this.generateRandomCode();

            this.dialogueLines = [
                { speaker: "JOHN", text: "The system is locked. I need the admin override." },
                { speaker: "JOHN", text: `Maybe I can guess it? Let's try... ${this.fakeCode1}` },
                { speaker: "SYSTEM", text: "[ ACCESS DENIED ] - SECURITY LEVEL 5" },
                { speaker: "JOHN", text: `Damn. Okay, let's try... ${this.fakeCode2}?` },
                { speaker: "SYSTEM", text: "[ ACCESS DENIED ] - INTRUSION LOGGED" },
                { speaker: "JOHN", text: "It's impossible. I don't have the sequence yet." },
                { speaker: "JOHN", text: "I should ABORT the login and look for the password elsewhere." }
            ];

            // Layout Calculations
            this.centerX = WIDTH / 2;
            this.keypadWidth = (3 * 80) + 70; 
            this.startX = this.centerX - (this.keypadWidth / 2);
            this.startY = HEIGHT / 2 - 50; 

            // Keypad Grid
            this.keys = [];
            const chars = "0123456789ABCDEF";
            for (let i = 0; i < chars.length; i++) {
                const char = chars[i];
                const x = this.startX + (i % 4) * 80;
                const y = this.startY + Math.floor(i / 4) * 80;
                this.keys.push({ char: char, x: x, y: y, w: 70, h: 70 });
            }
            
            // Abort Button Position (Bottom Left)
            this.abortBtn = { x: 50, y: HEIGHT - 100, w: 200, h: 60 };

            // Bind Click
            this.boundClick = (e) => this.handleClick(e);
            canvas.addEventListener('mousedown', this.boundClick);
        }

        generateRandomCode() {
            const chars = "0123456789ABCDEF";
            let code = "";
            for(let i=0; i<6; i++) {
                code += chars[Math.floor(Math.random() * chars.length)];
            }
            // Ensure we don't accidentally generate the real code
            if(code === this.targetCode) return "000000";
            return code;
        }

        handleClick(e) {
            if (this.accessGranted || this.finished) return;

            // --- DIALOGUE HANDLING ---
            // If dialogue is active, clicking anywhere advances it
            if (this.dialogueActive) {
                this.dialogueIndex++;
                if (this.dialogueIndex >= this.dialogueLines.length) {
                    this.dialogueActive = false; // Dialogue finished, allow gameplay
                }
                return; // Stop here, don't trigger buttons/keys
            }

            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left);
            const mouseY = (e.clientY - rect.top);

            // 1. CHECK ABORT BUTTON (Only if password is NOT known)
            if (!this.hasPassword) {
                if (mouseX >= this.abortBtn.x && mouseX <= this.abortBtn.x + this.abortBtn.w &&
                    mouseY >= this.abortBtn.y && mouseY <= this.abortBtn.y + this.abortBtn.h) {
                    
                    // Trigger Skip: Success=true, Skipped=true
                    cleanupAndFinish(true, true);
                    return;
                }
            }

            // 2. CHECK KEYPAD
            for (const key of this.keys) {
                if (mouseX >= key.x && mouseX <= key.x + key.w &&
                    mouseY >= key.y && mouseY <= key.y + key.h) {
                    
                    this.inputCode += key.char;
                    this.status = "VERIFYING...";
                    
                    if (this.inputCode.length === 6) {
                        if (this.inputCode === this.targetCode) {
                            this.accessGranted = true;
                            this.status = "UNLOCKED";
                            setTimeout(() => cleanupAndFinish(true, false), 2000);
                        } else {
                            this.status = "INVALID PASSCODE";
                            this.errorTimer = 40; 
                            this.inputCode = "";
                        }
                    }
                    return;
                }
            }
        }

        draw() {
            ctx.fillStyle = COLOR_BG;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            
            // --- HEADER ---
            ctx.fillStyle = this.accessGranted ? COLOR_ACCENT : COLOR_UI;
            ctx.beginPath();
            ctx.arc(this.centerX, this.startY - 200, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.centerX, this.startY - 140, 60, Math.PI, 0);
            ctx.fill();

            ctx.fillStyle = COLOR_UI;
            ctx.font = "bold 24px monospace";
            ctx.textAlign = "center";
            ctx.fillText("ADMINISTRATOR ACCESS", this.centerX, this.startY - 110);
            
            ctx.font = "16px monospace";
            ctx.fillStyle = this.errorTimer > 0 ? COLOR_ERR : (this.accessGranted ? COLOR_ACCENT : "#666");
            ctx.fillText(this.status, this.centerX, this.startY - 85);

            // --- INPUT DISPLAY ---
            let boxColor = COLOR_UI;
            if (this.errorTimer > 0) boxColor = COLOR_ERR;
            else if (this.accessGranted) boxColor = COLOR_ACCENT;
            
            ctx.strokeStyle = boxColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(this.startX, this.startY - 70, this.keypadWidth, 50);
            
            let displayText = this.inputCode;
            if (!this.accessGranted && Math.floor(Date.now() / 500) % 2 === 0) displayText += "_";
            
            ctx.fillStyle = boxColor;
            ctx.font = "bold 28px monospace";
            ctx.fillText(displayText, this.centerX, this.startY - 37);

            // --- KEYPAD ---
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            for (const key of this.keys) {
                ctx.strokeStyle = COLOR_UI;
                ctx.lineWidth = 1;
                ctx.strokeRect(key.x, key.y, key.w, key.h);
                ctx.fillStyle = COLOR_UI;
                ctx.fillText(key.char, key.x + key.w / 2, key.y + key.h / 2);
            }

            // --- ABORT BUTTON (Only if First Time) ---
            if (!this.hasPassword) {
                // Dim the button if dialogue is active to focus attention on text
                ctx.globalAlpha = this.dialogueActive ? 0.3 : 1.0;
                
                ctx.fillStyle = COLOR_BTN;
                ctx.fillRect(this.abortBtn.x, this.abortBtn.y, this.abortBtn.w, this.abortBtn.h);
                ctx.strokeStyle = COLOR_ERR;
                ctx.lineWidth = 2;
                ctx.strokeRect(this.abortBtn.x, this.abortBtn.y, this.abortBtn.w, this.abortBtn.h);
                
                ctx.fillStyle = COLOR_ERR;
                ctx.font = "bold 20px monospace";
                ctx.fillText("ABORT LOGIN", this.abortBtn.x + this.abortBtn.w/2, this.abortBtn.y + this.abortBtn.h/2);
                
                ctx.globalAlpha = 1.0;
            }

            // --- STICKY NOTE (Only if Second Time) ---
            if (this.hasPassword) {
                this.drawStickyNote();
            }

            // --- SUCCESS OVERLAY ---
            if (this.accessGranted) {
                ctx.fillStyle = "rgba(0, 20, 0, 0.9)";
                ctx.fillRect(0, 0, WIDTH, HEIGHT);
                ctx.fillStyle = COLOR_ACCENT;
                ctx.font = "bold 40px monospace";
                ctx.fillText("SYSTEM UNLOCKED", this.centerX, HEIGHT / 2);
            }

            // --- DIALOGUE OVERLAY (New Feature) ---
            if (this.dialogueActive && this.dialogueIndex < this.dialogueLines.length) {
                this.drawDialogue();
            }
        }

        drawDialogue() {
            const line = this.dialogueLines[this.dialogueIndex];
            
            // Dialogue Box Background
            const boxH = 150;
            ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
            ctx.fillRect(0, HEIGHT - boxH, WIDTH, boxH);
            
            // Top Border
            ctx.strokeStyle = line.speaker === "SYSTEM" ? COLOR_ERR : COLOR_ACCENT;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, HEIGHT - boxH);
            ctx.lineTo(WIDTH, HEIGHT - boxH);
            ctx.stroke();

            // Speaker Name
            ctx.textAlign = "left";
            ctx.font = "bold 24px 'Courier New'";
            ctx.fillStyle = line.speaker === "SYSTEM" ? COLOR_ERR : COLOR_ACCENT;
            ctx.fillText(line.speaker, 40, HEIGHT - boxH + 40);

            // Dialogue Text
            ctx.fillStyle = "#fff";
            ctx.font = "20px 'Courier New'";
            ctx.fillText(line.text, 40, HEIGHT - boxH + 80);

            // "Click to Continue" hint
            ctx.fillStyle = "#666";
            ctx.font = "14px monospace";
            ctx.textAlign = "right";
            ctx.fillText("[CLICK TO CONTINUE]", WIDTH - 40, HEIGHT - 20);
        }

        drawStickyNote() {
            const noteX = this.startX + this.keypadWidth + 50;
            const noteY = this.startY;
            ctx.fillStyle = "#ffeb3b"; 
            ctx.fillRect(noteX, noteY, 150, 150);
            ctx.fillStyle = "#ff0000";
            ctx.beginPath(); ctx.arc(noteX + 75, noteY + 10, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#000";
            ctx.font = "16px 'Courier New'";
            ctx.textAlign = "center"; // Reset alignment for note
            ctx.fillText("REMINDER:", noteX + 75, noteY + 50);
            ctx.font = "bold 24px 'Courier New'";
            ctx.fillText(this.targetCode, noteX + 75, noteY + 90);
        }

        update() {
            if (this.errorTimer > 0) this.errorTimer--;
        }
    }

    gameInstance = new AccessSystem();

    function gameLoop() {
        if (canvas.style.display === 'none' || canvas.classList.contains('hidden')) {
             if (gameInstance) gameInstance.finished = true;
             cancelAnimationFrame(animationFrameId);
             return;
        }
        if (gameInstance.finished) return;
        gameInstance.update();
        gameInstance.draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    gameLoop();

    function cleanupAndFinish(success, skipped = false) {
        if (gameInstance.finished) return;
        gameInstance.finished = true;
        canvas.removeEventListener('mousedown', gameInstance.boundClick);
        cancelAnimationFrame(animationFrameId);
        if (onComplete) onComplete(success, skipped);
    }
    
    window.stopComputerGame = function() {
        if(gameInstance) cleanupAndFinish(true, true);
    };
};