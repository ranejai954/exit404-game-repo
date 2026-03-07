// minigames/maze.js

// Configuration
let MAZE_WIDTH;
let MAZE_HEIGHT;
const MAZE_CELL_SIZE = 40;
let MAZE_GRID_WIDTH;
let MAZE_GRID_HEIGHT;
const SIDEBAR_WIDTH = 300; // Fixed width for UI

// --- GLOBAL FLAG FOR INSTRUCTIONS ---
if (typeof window.mazeInstructionsSeen === 'undefined') {
    window.mazeInstructionsSeen = false;
}

// Colors - Theme matching Survival/Circuit
const MAZE_COLORS = {   
    BACKGROUND: '#050505',
    SIDEBAR_BG: '#0a0a0a',
    SIDEBAR_BORDER: '#444',
    
    // Game Elements
    MAZE: 'rgb(40, 120, 200)',
    WALL: '#1a1a2e', // Dark blue-ish wall
    PATH: '#0d0d15', // Almost black path
    
    PLAYER: 'rgb(0, 255, 150)',
    ENEMY: 'rgb(255, 50, 50)',
    ENEMY2: 'rgb(255, 100, 50)',
    EXIT: 'rgb(255, 200, 50)',
    
    // UI Text
    TEXT: '#00ff00', 
    TEXT_WARN: '#ffaa00',
    TEXT_CRIT: '#ff0000',
    TEXT_INFO: '#00ccff',
    WHITE: '#ffffff'
};

// Input State
window.keys = window.keys || {};

window.addEventListener('keydown', (e) => {
    window.keys[e.key] = true;
    window.keys[e.code] = true;
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    window.keys[e.key] = false;
    window.keys[e.code] = false;
});

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// --- Virus Class ---
class Virus {
    constructor(x, y, color = null) {
        this.x = x;
        this.y = y;
        this.gridX = Math.floor(x / MAZE_CELL_SIZE);
        this.gridY = Math.floor(y / MAZE_CELL_SIZE);
        
        this.baseSpeed = 1.0;
        this.angrySpeed = 1.6;
        this.speed = this.baseSpeed;
        
        this.direction = randomChoice(["up", "down", "left", "right"]);
        this.nextDirection = null;
        this.pulse = 0;
        this.angry = false;
        this.angryTimer = 0;
        this.customColor = color;
    }

    update(mazeGrid, playerPos) {
        this.pulse += 0.05;
        this.gridX = Math.floor(this.x / MAZE_CELL_SIZE);
        this.gridY = Math.floor(this.y / MAZE_CELL_SIZE);

        this.gridX = Math.max(0, Math.min(this.gridX, mazeGrid[0].length - 1));
        this.gridY = Math.max(0, Math.min(this.gridY, mazeGrid.length - 1));

        const [px, py] = playerPos;
        const pxGrid = Math.floor(px / MAZE_CELL_SIZE);
        const pyGrid = Math.floor(py / MAZE_CELL_SIZE);

        const distanceToPlayer = Math.hypot(this.x - px, this.y - py);

        if (distanceToPlayer < 250 && Math.random() < 0.01) {
            this.angry = true;
            this.angryTimer = 240;
            this.speed = this.angrySpeed;
        }

        if (this.angry) {
            this.angryTimer--;
            if (this.angryTimer <= 0) {
                this.angry = false;
                this.speed = this.baseSpeed;
            }
        }

        // Pathfinding (Simple Lookahead)
        let possibleDirs = [];
        if (this.gridY > 0 && mazeGrid[this.gridY - 1][this.gridX] === 0) possibleDirs.push("up");
        if (this.gridY < mazeGrid.length - 1 && mazeGrid[this.gridY + 1][this.gridX] === 0) possibleDirs.push("down");
        if (this.gridX > 0 && mazeGrid[this.gridY][this.gridX - 1] === 0) possibleDirs.push("left");
        if (this.gridX < mazeGrid[0].length - 1 && mazeGrid[this.gridY][this.gridX + 1] === 0) possibleDirs.push("right");

        const opposite = { "up": "down", "down": "up", "left": "right", "right": "left" };
        if (possibleDirs.includes(opposite[this.direction]) && possibleDirs.length > 1) {
            possibleDirs = possibleDirs.filter(d => d !== opposite[this.direction]);
        }

        if (possibleDirs.length > 0) {
            let bestDir = null;
            let minDist = Infinity;

            for (let dir of possibleDirs) {
                let testX = this.gridX;
                let testY = this.gridY;

                if (dir === "up") testY -= 1;
                else if (dir === "down") testY += 1;
                else if (dir === "left") testX -= 1;
                else if (dir === "right") testX += 1;

                if (testX >= 0 && testX < mazeGrid[0].length && testY >= 0 && testY < mazeGrid.length) {
                    const dist = Math.abs(testX - pxGrid) + Math.abs(testY - pyGrid);
                    if (dist < minDist) {
                        minDist = dist;
                        bestDir = dir;
                    }
                }
            }

            if (bestDir && Math.random() < 0.90) {
                this.nextDirection = bestDir;
            } else {
                this.nextDirection = randomChoice(possibleDirs);
            }
        } else {
            this.nextDirection = opposite[this.direction] || randomChoice(["up", "down", "left", "right"]);
        }

        this.move(mazeGrid);
    }

    move(mazeGrid) {
        const centeredX = Math.abs(this.x % MAZE_CELL_SIZE - MAZE_CELL_SIZE / 2) < this.speed;
        const centeredY = Math.abs(this.y % MAZE_CELL_SIZE - MAZE_CELL_SIZE / 2) < this.speed;

        if (this.nextDirection && centeredX && centeredY) {
            if (this.canMove(this.nextDirection, mazeGrid)) {
                this.direction = this.nextDirection;
                this.nextDirection = null;
                this.x = this.gridX * MAZE_CELL_SIZE + MAZE_CELL_SIZE/2;
                this.y = this.gridY * MAZE_CELL_SIZE + MAZE_CELL_SIZE/2;
            }
        }

        let dx = 0, dy = 0;
        if (this.direction === "up") dy = -this.speed;
        else if (this.direction === "down") dy = this.speed;
        else if (this.direction === "left") dx = -this.speed;
        else if (this.direction === "right") dx = this.speed;

        const newX = this.x + dx;
        const newY = this.y + dy;

        const gridX = Math.floor(newX / MAZE_CELL_SIZE);
        const gridY = Math.floor(newY / MAZE_CELL_SIZE);

        if (gridX >= 0 && gridX < mazeGrid[0].length && gridY >= 0 && gridY < mazeGrid.length) {
            if (mazeGrid[gridY][gridX] === 0) {
                this.x = newX;
                this.y = newY;
            } else {
                this.findNewDirection(mazeGrid);
            }
        } else {
            this.findNewDirection(mazeGrid);
        }
    }

    findNewDirection(mazeGrid) {
        let possibleDirs = [];
        if (this.gridY > 0 && mazeGrid[this.gridY - 1][this.gridX] === 0) possibleDirs.push("up");
        if (this.gridY < mazeGrid.length - 1 && mazeGrid[this.gridY + 1][this.gridX] === 0) possibleDirs.push("down");
        if (this.gridX > 0 && mazeGrid[this.gridY][this.gridX - 1] === 0) possibleDirs.push("left");
        if (this.gridX < mazeGrid[0].length - 1 && mazeGrid[this.gridY][this.gridX + 1] === 0) possibleDirs.push("right");

        if (possibleDirs.length > 0) {
            this.direction = randomChoice(possibleDirs);
        }
    }

    canMove(direction, mazeGrid) {
        let testX = this.gridX;
        let testY = this.gridY;
        if (direction === "up") testY -= 1;
        else if (direction === "down") testY += 1;
        else if (direction === "left") testX -= 1;
        else if (direction === "right") testX += 1;

        if (testX >= 0 && testX < mazeGrid[0].length && testY >= 0 && testY < mazeGrid.length) {
            return mazeGrid[testY][testX] === 0;
        }
        return false;
    }

    draw(ctx) {
        const size = 16;
        const pulseSize = size + Math.sin(this.pulse) * 4;
        let baseColor = this.customColor || MAZE_COLORS.ENEMY;
        let color = this.angry ? '#ff0000' : baseColor; 

        if (this.angry) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, pulseSize * 1.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();

        // Spikes
        const spikeCount = this.angry ? 10 : 8;
        for (let i = 0; i < spikeCount; i++) {
            const angle = i * (2 * Math.PI / spikeCount);
            const spikeLength = this.angry ? pulseSize * 1.4 : pulseSize * 1.2;
            const spikeX = this.x + Math.cos(angle) * spikeLength;
            const spikeY = this.y + Math.sin(angle) * spikeLength;
            ctx.beginPath();
            ctx.arc(spikeX, spikeY, this.angry ? 4 : 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(this.x + 6, this.y - 4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(this.x - 6, this.y - 4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath(); ctx.arc(this.x + 6, this.y - 4, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(this.x - 6, this.y - 4, 2, 0, Math.PI * 2); ctx.fill();
    }
}

// --- Maze Class ---
class Maze {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = Array(height).fill().map(() => Array(width).fill(1));
        this.playerPos = [MAZE_CELL_SIZE * 1.5, MAZE_CELL_SIZE * 1.5];
        this.exitPos = [width - 2, height - 2];
        this.generateMaze();
    }

    generateMaze() {
        const stack = [[1, 1]];
        this.grid[1][1] = 0;

        while (stack.length > 0) {
            const [x, y] = stack[stack.length - 1];
            const neighbors = [];
            const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]];

            for (let [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && this.grid[ny][nx] === 1) {
                    neighbors.push([nx, ny, dx / 2, dy / 2]);
                }
            }

            if (neighbors.length > 0) {
                const [nx, ny, wx, wy] = randomChoice(neighbors);
                this.grid[y + wy][x + wx] = 0;
                this.grid[ny][nx] = 0;
                stack.push([nx, ny]);
            } else {
                stack.pop();
            }
        }

        this.grid[this.exitPos[1]][this.exitPos[0]] = 0;
        // Clear area around start to prevent instant traps
        this.grid[1][2] = 0; this.grid[2][1] = 0;
    }

    draw(ctx) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                ctx.fillStyle = (this.grid[y][x] === 1) ? MAZE_COLORS.WALL : MAZE_COLORS.PATH;
                // Add slight gap for grid look
                ctx.fillRect(x * MAZE_CELL_SIZE, y * MAZE_CELL_SIZE, MAZE_CELL_SIZE, MAZE_CELL_SIZE);
            }
        }

        const exitX = this.exitPos[0] * MAZE_CELL_SIZE;
        const exitY = this.exitPos[1] * MAZE_CELL_SIZE;

        const pulse = (Math.sin(Date.now() * 0.003) + 1) * 0.5;
        const exitSize = MAZE_CELL_SIZE + pulse * 10;
        
        ctx.save();
        ctx.fillStyle = 'rgba(255, 200, 50, 0.4)';
        ctx.beginPath();
        ctx.arc(exitX + MAZE_CELL_SIZE / 2, exitY + MAZE_CELL_SIZE / 2, exitSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = MAZE_COLORS.EXIT;
        ctx.fillRect(exitX + 5, exitY + 5, MAZE_CELL_SIZE - 10, MAZE_CELL_SIZE - 10);
    }

    checkWin(playerX, playerY) {
        const exitCenterX = this.exitPos[0] * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2;
        const exitCenterY = this.exitPos[1] * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2;
        return Math.hypot(playerX - exitCenterX, playerY - exitCenterY) < 25;
    }
}

// --- Game Class ---
class MazeGame {
    constructor() {
        this.maze = new Maze(MAZE_GRID_WIDTH, MAZE_GRID_HEIGHT);
        
        this.virus = new Virus(MAZE_CELL_SIZE * (MAZE_GRID_WIDTH - 2), MAZE_CELL_SIZE * (MAZE_GRID_HEIGHT - 2));
        this.virus2 = null;
        this.virus2SpawnTime = 5; 
        
        this.lives = 3;
        this.gameOver = false;
        this.won = false;
        this.time = 0;
        this.flashTimer = 0;
        
        // --- GAME STATE & INSTRUCTIONS ---
        this.gameState = "PREPARING"; // Default to preparing
        this.prepTimer = 5; // 5 Seconds countdown
        this.lastTime = Date.now();

        // Check global flag: If seen, skip prep
        if (window.mazeInstructionsSeen) {
            this.gameState = "PLAYING";
            this.startTime = Date.now();
            this.roundStartTime = Date.now();
        } else {
            // First time: Set flag so next retry skips it
            window.mazeInstructionsSeen = true;
        }
    }

    update() {
        const now = Date.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // --- PREP PHASE ---
        if (this.gameState === "PREPARING") {
            this.prepTimer -= dt;
            if (this.prepTimer <= 0) {
                this.gameState = "PLAYING";
                this.startTime = Date.now();
                this.roundStartTime = Date.now();
            }
            return;
        }

        if (this.gameOver) return;

        this.time = Math.floor((Date.now() - this.startTime) / 1000);
        let currentRoundTime = (Date.now() - this.roundStartTime) / 1000;
        
        // Virus 2 Spawn
        if (!this.virus2 && currentRoundTime >= this.virus2SpawnTime) {
            this.virus2 = new Virus(MAZE_CELL_SIZE * 1.5, MAZE_CELL_SIZE * 1.5, MAZE_COLORS.ENEMY2);
        }

        this.virus.update(this.maze.grid, this.maze.playerPos);
        if (this.virus2) this.virus2.update(this.maze.grid, this.maze.playerPos);

        const playerRadius = 12;
        const virusRadius = 16;
        
        let hit = false;
        if (Math.hypot(this.maze.playerPos[0] - this.virus.x, this.maze.playerPos[1] - this.virus.y) < playerRadius + virusRadius) hit = true;
        if (this.virus2 && Math.hypot(this.maze.playerPos[0] - this.virus2.x, this.maze.playerPos[1] - this.virus2.y) < playerRadius + virusRadius) hit = true;

        if (hit) {
            this.lives--;
            this.flashTimer = 30;
            if (this.lives <= 0) {
                this.gameOver = true;
            } else {
                this.maze.playerPos = [MAZE_CELL_SIZE * 1.5, MAZE_CELL_SIZE * 1.5];
                this.virus2 = null;
                this.roundStartTime = Date.now();
            }
        }

        if (this.maze.checkWin(this.maze.playerPos[0], this.maze.playerPos[1])) {
            this.won = true;
            this.gameOver = true;
        }

        if (this.flashTimer > 0) this.flashTimer--;
    }

    draw(ctx) {
        // Clear Full Screen
        ctx.fillStyle = MAZE_COLORS.BACKGROUND;
        ctx.fillRect(0, 0, MAZE_WIDTH, MAZE_HEIGHT);

        // --- DRAW SIDEBAR ---
        this.drawSidebar(ctx);

        // --- DRAW MAZE AREA ---
        ctx.save();
        // Offset everything to the right of sidebar
        ctx.translate(SIDEBAR_WIDTH, 0);
        
        // Optional: Center vertically if maze is shorter than screen
        const mazePixelHeight = this.maze.height * MAZE_CELL_SIZE;
        const vOffset = Math.max(0, (MAZE_HEIGHT - mazePixelHeight) / 2);
        ctx.translate(20, vOffset); // 20px padding left

        this.maze.draw(ctx);
        this.virus.draw(ctx);
        if (this.virus2) this.virus2.draw(ctx);

        // Player
        if (this.flashTimer <= 0 || this.flashTimer % 6 < 3) {
            const [px, py] = this.maze.playerPos;
            ctx.fillStyle = MAZE_COLORS.PLAYER;
            ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(px, py - 3, 4, 0, Math.PI * 2); ctx.stroke();
        }

        // --- PREP OVERLAY ---
        if (this.gameState === "PREPARING") {
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillRect(0, -vOffset, MAZE_WIDTH - SIDEBAR_WIDTH, MAZE_HEIGHT); // Cover game area
            
            ctx.textAlign = "center";
            ctx.fillStyle = MAZE_COLORS.TEXT_INFO;
            ctx.font = "bold 80px 'Courier New'";
            ctx.fillText(Math.ceil(this.prepTimer), (MAZE_WIDTH - SIDEBAR_WIDTH)/2, MAZE_HEIGHT/2);
            
            ctx.font = "20px monospace";
            ctx.fillStyle = "#aaa";
            ctx.fillText("Read Instructions on Left", (MAZE_WIDTH - SIDEBAR_WIDTH)/2, MAZE_HEIGHT/2 + 60);
        }

        // --- GAME OVER OVERLAY ---
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, -vOffset, MAZE_WIDTH - SIDEBAR_WIDTH, MAZE_HEIGHT);

            let message = this.won ? "NEURAL BRIDGE SECURED" : "CONNECTION LOST";
            let color = this.won ? MAZE_COLORS.TEXT : MAZE_COLORS.TEXT_CRIT;

            ctx.font = 'bold 40px "Courier New"';
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.fillText(message, (MAZE_WIDTH - SIDEBAR_WIDTH)/2, MAZE_HEIGHT/2);
        }

        ctx.restore();
    }

    drawSidebar(ctx) {
        // Background
        ctx.fillStyle = MAZE_COLORS.SIDEBAR_BG;
        ctx.fillRect(0, 0, SIDEBAR_WIDTH, MAZE_HEIGHT);
        
        // Border
        ctx.strokeStyle = MAZE_COLORS.SIDEBAR_BORDER;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(SIDEBAR_WIDTH, 0); ctx.lineTo(SIDEBAR_WIDTH, MAZE_HEIGHT); ctx.stroke();

        const pad = 20;
        let y = 50;

        // Title
        ctx.textAlign = "left";
        ctx.fillStyle = MAZE_COLORS.WHITE;
        ctx.font = "bold 28px 'Courier New'";
        ctx.fillText("NEURAL MAZE", pad, y);
        
        y += 40;
        ctx.font = "16px monospace";
        ctx.fillStyle = "#888";
        ctx.fillText("PROTOCOL: EVASION", pad, y);

        // Stats
        y += 60;
        ctx.fillStyle = MAZE_COLORS.WHITE;
        ctx.font = "bold 20px 'Courier New'";
        ctx.fillText("STATUS:", pad, y);

        y += 35;
        // Hearts
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i < this.lives ? MAZE_COLORS.TEXT_CRIT : '#444';
            ctx.beginPath();
            const hx = pad + (i * 35);
            const hy = y;
            ctx.moveTo(hx, hy);
            // Simple heart shape drawing
            ctx.arc(hx - 5, hy - 5, 8, Math.PI, 0); 
            ctx.arc(hx + 5, hy - 5, 8, Math.PI, 0); 
            ctx.lineTo(hx, hy + 10);
            ctx.fill();
        }

        y += 40;
        ctx.fillStyle = MAZE_COLORS.WHITE;
        ctx.fillText(`TIME: ${this.time}s`, pad, y);

        // Proximity Sensor
        y += 60;
        const d1 = Math.hypot(this.maze.playerPos[0] - this.virus.x, this.maze.playerPos[1] - this.virus.y);
        let dist = d1;
        if (this.virus2) {
            const d2 = Math.hypot(this.maze.playerPos[0] - this.virus2.x, this.maze.playerPos[1] - this.virus2.y);
            dist = Math.min(d1, d2);
        }

        ctx.fillText("THREAT PROXIMITY:", pad, y);
        y += 20;
        
        // Proximity Bar
        const barW = SIDEBAR_WIDTH - (pad * 2);
        const barH = 15;
        ctx.fillStyle = "#330000";
        ctx.fillRect(pad, y, barW, barH);
        
        // Fill based on distance (closer = fuller)
        const maxDist = 400;
        const dangerPct = Math.max(0, 1 - (dist / maxDist));
        ctx.fillStyle = dangerPct > 0.7 ? MAZE_COLORS.TEXT_CRIT : MAZE_COLORS.TEXT_WARN;
        ctx.fillRect(pad, y, barW * dangerPct, barH);
        ctx.strokeStyle = "#555";
        ctx.strokeRect(pad, y, barW, barH);

        // INSTRUCTIONS (ALWAYS VISIBLE)
        y += 80;
        ctx.fillStyle = MAZE_COLORS.TEXT_INFO;
        ctx.font = "bold 20px 'Courier New'";
        ctx.fillText("INSTRUCTIONS:", pad, y);
        
        y += 30;
        ctx.font = "14px monospace";
        ctx.fillStyle = MAZE_COLORS.WHITE;
        ctx.fillText("> USE ARROW KEYS TO MOVE", pad, y);
        y += 25;
        ctx.fillText("> REACH THE YELLOW EXIT", pad, y);
        y += 25;
        ctx.fillStyle = MAZE_COLORS.TEXT_CRIT;
        ctx.fillText("> AVOID RED VIRUSES", pad, y);
        y += 25;
        ctx.fillStyle = MAZE_COLORS.TEXT_WARN;
        ctx.fillText("> HUNTER SPAWNS IN 5s", pad, y);

        // Hunter Timer (Only visible when playing and waiting for spawn)
        if (this.gameState === "PLAYING" && !this.virus2) {
             y += 40;
             let timeLeft = Math.max(0, this.virus2SpawnTime - ((Date.now() - this.roundStartTime) / 1000));
             ctx.fillStyle = MAZE_COLORS.TEXT_WARN;
             ctx.font = "bold 18px 'Courier New'";
             ctx.fillText(`HUNTER SPAWN: ${timeLeft.toFixed(1)}s`, pad, y);
        }
    }
    
    movePlayer(dx, dy) {
        if (this.gameOver || this.gameState !== "PLAYING") return;

        const speed = 2.0;
        
        const newX = this.maze.playerPos[0] + dx * speed;
        const newY = this.maze.playerPos[1] + dy * speed;

        const gridX = Math.floor(newX / MAZE_CELL_SIZE);
        const gridY = Math.floor(newY / MAZE_CELL_SIZE);

        if (gridX >= 0 && gridX < this.maze.width && gridY >= 0 && gridY < this.maze.height) {
            if (this.maze.grid[gridY][gridX] === 0) {
                // Collision check with walls (corner checking)
                const corners = [
                    [newX - 10, newY - 10], [newX + 10, newY - 10],
                    [newX - 10, newY + 10], [newX + 10, newY + 10]
                ];

                let valid = true;
                for (let [cx, cy] of corners) {
                    const cgX = Math.floor(cx / MAZE_CELL_SIZE);
                    const cgY = Math.floor(cy / MAZE_CELL_SIZE);
                    if (cgX >= 0 && cgX < this.maze.width && cgY >= 0 && cgY < this.maze.height) {
                        if (this.maze.grid[cgY][cgX] === 1) {
                            valid = false;
                            break;
                        }
                    }
                }

                if (valid) {
                    this.maze.playerPos = [newX, newY];
                }
            }
        }
    }
}

// Export classes and functions
window.MazeGame = MazeGame;
window.randomChoice = randomChoice;
window.MAZE_COLORS = MAZE_COLORS;
window.MAZE_CELL_SIZE = MAZE_CELL_SIZE;

// Function to set dimensions (Modified for Sidebar)
window.setMazeDimensions = function(width, height) {
    MAZE_WIDTH = width;
    MAZE_HEIGHT = height;
    
    // Calculate Grid Size based on remaining space to the right
    const availableWidth = MAZE_WIDTH - SIDEBAR_WIDTH - 40; // 40px buffer
    const availableHeight = MAZE_HEIGHT - 40; // 40px buffer
    
    MAZE_GRID_WIDTH = Math.floor(availableWidth / MAZE_CELL_SIZE);
    MAZE_GRID_HEIGHT = Math.floor(availableHeight / MAZE_CELL_SIZE);
    
    // Minimum size safety
    MAZE_GRID_WIDTH = Math.max(10, MAZE_GRID_WIDTH);
    MAZE_GRID_HEIGHT = Math.max(10, MAZE_GRID_HEIGHT);
};