/**
 * Garden Defense - Core Game Engine
 */

class Game {
    constructor() {
        this.gameCanvas = document.getElementById('game-canvas');
        this.ctx = this.gameCanvas.getContext('2d');
        this.gestureCanvas = document.getElementById('gesture-canvas');
        this.gestureCtx = this.gestureCanvas.getContext('2d');

        this.ctx.imageSmoothingEnabled = false;

        this.score = 0;
        this.health = 100;
        this.isGameOver = false;
        this.isStarted = false;
        this.isPaused = false;

        this.enemies = [];
        this.particles = [];
        this.shots = [];
        this.gardener = { x: 0, y: 0 };
        this.garden = { x: 0, y: 0, health: 100, hurtTimer: 0 };
        this.keys = {};

        // Progression Stats
        this.maxLevelReached = 1;
        this.currentLevel = 1;
        this.totalLevels = 10;
        this.isLevelComplete = false;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // UI Event Listeners
        const startBtn = document.getElementById('start-btn');
        if (startBtn) startBtn.addEventListener('click', () => this.handleStartClick());

        const tutNextBtn = document.getElementById('tut-next-btn');
        if (tutNextBtn) tutNextBtn.addEventListener('click', () => this.showLevelMapFromTutorial());

        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) restartBtn.addEventListener('click', () => this.resetGame());

        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());

        const resumeBtn = document.getElementById('resume-btn');
        if (resumeBtn) resumeBtn.addEventListener('click', () => this.togglePause());

        const exitBtn = document.getElementById('exit-btn');
        if (exitBtn) exitBtn.addEventListener('click', () => location.reload());

        const restartPauseBtn = document.getElementById('restart-from-pause-btn');
        if (restartPauseBtn) {
            restartPauseBtn.addEventListener('click', () => {
                this.togglePause();
                this.resetGame();
            });
        }

        const restartAllBtn = document.getElementById('restart-all-btn');
        if (restartAllBtn) restartAllBtn.addEventListener('click', () => location.reload());

        // Interaction Listeners
        this.gestureCanvas.addEventListener('mousedown', (e) => {
            if (this.isPaused || !this.isStarted) return;
            this.shoot(e.clientX, e.clientY);
        });

        this.gestureCanvas.addEventListener('touchstart', (e) => {
            if (this.isPaused || !this.isStarted) return;
            const touch = e.touches[0];
            this.shoot(touch.clientX, touch.clientY);
            e.preventDefault();
        });

        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            this.keys[e.code] = false;
        });

        // Load Assets
        this.assets = {
            background: new Image(),
            ladybug: new Image()
        };
        this.assets.background.src = 'assets/garden_background.png';
        this.assets.ladybug.src = 'assets/ladybug.png';

        this.scatterDecorativeFlowers();
        this.gameLoop();
    }

    scatterDecorativeFlowers() {
        const container = document.getElementById('decorative-flowers');
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < 20; i++) {
            const f = document.createElement('div');
            f.className = 'dec-flower';
            f.style.left = Math.random() * 100 + 'vw';
            f.style.top = Math.random() * 100 + 'vh';
            f.style.background = `url('assets/flower_pack.png')`;
            f.style.backgroundSize = '600% 100%';
            f.style.backgroundPosition = `${Math.floor(Math.random() * 6) * 20}% 0%`;
            f.style.animationDelay = Math.random() * 5 + 's';
            f.style.transform = `scale(${0.5 + Math.random()})`;
            container.appendChild(f);
        }
    }

    resize() {
        this.gameCanvas.width = window.innerWidth;
        this.gameCanvas.height = window.innerHeight;
        this.gestureCanvas.width = window.innerWidth;
        this.gestureCanvas.height = window.innerHeight;

        this.gardener.x = this.gameCanvas.width / 2;
        this.gardener.y = this.gameCanvas.height / 2;
        this.garden.x = this.gameCanvas.width / 2;
        this.garden.y = this.gameCanvas.height / 2;
    }

    handleStartClick() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('tutorial-screen').classList.remove('hidden');
    }

    showLevelMapFromTutorial() {
        document.getElementById('tutorial-screen').classList.add('hidden');
        this.renderLevelMap();
        document.getElementById('level-map-screen').classList.remove('hidden');
    }

    renderLevelMap() {
        const grid = document.getElementById('level-grid');
        grid.innerHTML = '';
        for (let i = 1; i <= this.totalLevels; i++) {
            const node = document.createElement('div');
            node.className = 'level-node';
            if (i > this.maxLevelReached) node.classList.add('locked');
            if (i < this.maxLevelReached) node.classList.add('completed');
            if (i === this.maxLevelReached) node.classList.add('current');

            node.textContent = i;
            if (i <= this.maxLevelReached) {
                node.onclick = () => this.startSpecificLevel(i);
            }
            grid.appendChild(node);
        }
    }

    startSpecificLevel(lvl) {
        this.currentLevel = lvl;
        document.getElementById('level-map-screen').classList.add('hidden');
        this.startGame();
    }

    togglePause() {
        if (!this.isStarted || this.isGameOver) return;
        this.isPaused = !this.isPaused;
        const pauseScreen = document.getElementById('pause-screen');
        if (this.isPaused) {
            pauseScreen.classList.remove('hidden');
        } else {
            pauseScreen.classList.add('hidden');
        }
    }

    startGame() {
        this.isStarted = true;
        this.isGameOver = false;
        this.isPaused = false;
        this.isLevelComplete = false;
        this.health = 100;
        this.score = 0;
        this.level = this.currentLevel;
        this.enemiesKilled = 0;
        this.targetKills = 5 + (this.level * 5); // Level 1=10, Level 10=55

        this.enemies = [];
        this.particles = [];
        this.shots = [];

        // Reset Positions
        this.gardener.x = this.gameCanvas.width / 2;
        this.gardener.y = this.gameCanvas.height / 2 + 100;
        this.garden.x = this.gameCanvas.width / 2;
        this.garden.y = this.gameCanvas.height / 2;

        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('level-map-screen').classList.add('hidden');
        document.getElementById('level-complete').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('game-clear').classList.add('hidden');

        this.updateUI();
        this.spawnEnemy();
    }

    resetGame() {
        this.startGame();
    }

    updateUI() {
        document.getElementById('score').innerHTML = `<span>PONTOS:</span> ${this.score}`;
        document.getElementById('health-bar').style.width = `${this.health}%`;

        // Progress Bar
        const progress = (this.enemiesKilled / this.targetKills) * 100;
        const progressBar = document.getElementById('level-progress');
        if (progressBar) progressBar.style.width = `${Math.min(100, progress)}%`;

        document.getElementById('current-level').textContent = `Nível ${this.level}`;
    }

    showMessage(text) {
        const msg = document.getElementById('message-display');
        msg.textContent = text;
        msg.classList.add('show');
        setTimeout(() => msg.classList.remove('show'), 2000);
    }

    shoot(targetX, targetY) {
        if (!this.isStarted || this.isGameOver || this.isPaused) return;

        // Visual do tiro
        this.shots.push({
            x: this.gardener.x,
            y: this.gardener.y - 20, // Shoot from upper body
            tx: targetX,
            ty: targetY,
            life: 1.0
        });

        // Detecção de acerto
        let hitFound = false;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const dx = targetX - e.x;
            const dy = targetY - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 50) { // Slightly bigger hit area for convenience
                this.createExplosion(e.x, e.y, e.pollenColor);
                this.enemies.splice(i, 1);
                this.score += 20;
                this.enemiesKilled++;
                hitFound = true;

                if (this.enemiesKilled >= this.targetKills) {
                    this.levelComplete();
                }
            }
        }

        if (hitFound) {
            this.updateUI();
        }
    }

    levelComplete() {
        if (this.isLevelComplete) return;
        this.isLevelComplete = true;

        if (this.level === this.totalLevels) {
            document.getElementById('game-clear').classList.remove('hidden');
        } else {
            if (this.level === this.maxLevelReached) this.maxLevelReached++;
            document.getElementById('level-complete').classList.remove('hidden');

            const medals = ['🥇', '🥈', '🥉', '🏆', '💎', '🌟', '🌙', '🔥', '👑', '🌈'];
            const medal = medals[this.level - 1];
            document.getElementById('medal-container').innerHTML = `<div class="medal">${medal}</div>`;

            const mapBtn = document.getElementById('show-map-btn');
            mapBtn.onclick = () => {
                document.getElementById('level-complete').classList.add('hidden');
                this.renderLevelMap();
                document.getElementById('level-map-screen').classList.remove('hidden');
            };
        }
    }

    spawnEnemy() {
        if (!this.isStarted || this.isGameOver || this.isPaused || this.isLevelComplete) return;

        const types = [
            { type: 'ant', speed: 1.6, color: '#333', pollen: '#ffeb3b', weight: 40 },
            { type: 'wasp', speed: 2.4, color: '#fdd835', pollen: '#ff9800', weight: 20 },
            { type: 'beetle', speed: 0.8, color: '#2e7d32', pollen: '#4caf50', weight: 15 },
            { type: 'spider', speed: 1.3, color: '#5d4037', pollen: '#f44336', weight: 15 },
            { type: 'grasshopper', speed: 3.2, color: '#76ff03', pollen: '#cddc39', weight: 10 }
        ];

        const availableTypes = types.filter((t, idx) => idx < this.level + 1);
        const totalWeight = availableTypes.reduce((sum, t) => sum + t.weight, 0);
        let rand = Math.random() * totalWeight;
        let selectedType = availableTypes[0];
        for (const t of availableTypes) {
            if (rand < t.weight) {
                selectedType = t;
                break;
            }
            rand -= t.weight;
        }

        const side = Math.floor(Math.random() * 4);
        const offset = 100;
        let x, y;
        if (side === 0) { x = Math.random() * this.gameCanvas.width; y = -offset; }
        else if (side === 1) { x = this.gameCanvas.width + offset; y = Math.random() * this.gameCanvas.height; }
        else if (side === 2) { x = Math.random() * this.gameCanvas.width; y = this.gameCanvas.height + offset; }
        else { x = -offset; y = Math.random() * this.gameCanvas.height; }

        this.enemies.push({
            ...selectedType,
            x, y,
            pollenColor: selectedType.pollen,
            oscillation: Math.random() * Math.PI * 2,
            spawnTime: Date.now()
        });

        const nextSpawnDelay = Math.max(500, 2000 - (this.level * 300));
        setTimeout(() => this.spawnEnemy(), nextSpawnDelay);
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x, y,
                color,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                size: 2 + Math.random() * 4
            });
        }
    }

    update() {
        if (!this.isStarted || this.isGameOver || this.isPaused || this.isLevelComplete) return;

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const dx = this.garden.x - e.x;
            const dy = this.garden.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            e.angle = Math.atan2(dy, dx) + Math.PI / 2;
            e.animFrame = Math.floor(Date.now() / 200) % 2 === 0 ? 1 : 2;
            e.scale = 1 + Math.sin(Date.now() / 300) * 0.05;

            if (dist < 50) {
                this.health -= 5;
                this.garden.hurtTimer = 10; // 10 frames of red
                this.enemies.splice(i, 1);
                this.updateUI();
                if (this.health <= 0) this.gameOver();
                continue;
            }

            const vx = (dx / dist) * e.speed;
            const vy = (dy / dist) * e.speed;
            e.x += vx;
            e.y += vy;
        }

        // Update shots
        for (let i = this.shots.length - 1; i >= 0; i--) {
            this.shots[i].life -= 0.15;
            if (this.shots[i].life <= 0) this.shots.splice(i, 1);
        }

        // Update gardener movement (Keyboard)
        const moveSpeed = 6;
        if (this.keys['w'] || this.keys['arrowup']) this.gardener.y -= moveSpeed;
        if (this.keys['s'] || this.keys['arrowdown']) this.gardener.y += moveSpeed;
        if (this.keys['a'] || this.keys['arrowleft']) this.gardener.x -= moveSpeed;
        if (this.keys['d'] || this.keys['arrowright']) this.gardener.x += moveSpeed;

        // Bounds check
        this.gardener.x = Math.max(40, Math.min(this.gameCanvas.width - 40, this.gardener.x));
        this.gardener.y = Math.max(40, Math.min(this.gameCanvas.height - 40, this.gardener.y));

        if (this.garden.hurtTimer > 0) this.garden.hurtTimer--;

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    drawFrame() {
        this.ctx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

        // Draw Garden/Plants
        this.drawPlants(this.garden.x, this.garden.y);

        // Draw Gardener
        this.drawGardener(this.gardener.x, this.gardener.y);

        // Draw Shots
        this.shots.forEach(s => {
            this.ctx.save();
            this.ctx.globalAlpha = s.life;
            this.ctx.strokeStyle = '#fff59d';
            this.ctx.lineWidth = 4 * s.life;
            this.ctx.beginPath();
            this.ctx.moveTo(s.x, s.y);
            this.ctx.lineTo(s.tx, s.ty);
            this.ctx.stroke();
            this.ctx.restore();
        });

        // Draw enemies
        this.enemies.forEach(e => {
            this.ctx.save();
            this.ctx.translate(e.x, e.y);
            this.ctx.rotate(e.angle || 0);
            this.ctx.scale(e.scale || 1, e.scale || 1);
            this.drawPixelEnemy(e.type, e.animFrame, e.color);
            this.ctx.restore();
        });

        // Draw particles
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        this.ctx.globalAlpha = 1.0;
    }

    drawGardener(x, y) {
        const time = Date.now() / 200;
        const isWalking = (this.keys['w'] || this.keys['s'] || this.keys['a'] || this.keys['d'] || this.keys['arrowup'] || this.keys['arrowdown'] || this.keys['arrowleft'] || this.keys['arrowright']);
        const bounce = isWalking ? Math.sin(time) * 4 : 0;

        this.ctx.save();
        this.ctx.translate(x, y + bounce);

        // Sombra
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 42, 18, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 1. Cabelo (Brown)
        this.ctx.fillStyle = '#b74b28';
        this.ctx.fillRect(-20, -40, 40, 24);
        this.ctx.fillRect(-22, -28, 6, 16);
        this.ctx.fillRect(16, -28, 6, 16);
        this.ctx.fillRect(-16, -42, 32, 6);

        // 2. Rosto (Skin)
        this.ctx.fillStyle = '#ffcd94';
        this.ctx.fillRect(-14, -34, 28, 28);

        // 3. Olhos
        this.ctx.fillStyle = '#4a2c1d';
        this.ctx.fillRect(-8, -22, 4, 6);
        this.ctx.fillRect(4, -22, 4, 6);

        // 4. Boca
        this.ctx.fillStyle = '#e57373';
        this.ctx.fillRect(-2, -10, 4, 2);

        // 5. Vestido (Green Checkered)
        this.ctx.fillStyle = '#2e7d32';
        this.ctx.fillRect(-12, -6, 24, 10);

        this.ctx.beginPath();
        this.ctx.moveTo(-12, 4);
        this.ctx.lineTo(-24, 30);
        this.ctx.lineTo(24, 30);
        this.ctx.lineTo(12, 4);
        this.ctx.fill();

        this.ctx.fillStyle = '#4caf50';
        for (let py = 4; py < 30; py += 6) {
            for (let px = -18; px < 18; px += 6) {
                if ((px + py) % 12 === 0) {
                    this.ctx.fillRect(px, py, 4, 4);
                }
            }
        }

        // 6. Chapéu de Palha (Straw Hat)
        this.ctx.fillStyle = '#fdd835'; // Straw color
        this.ctx.fillRect(-28, -48, 56, 10); // Brim
        this.ctx.fillRect(-18, -60, 36, 12); // Top
        this.ctx.fillStyle = '#f9a825'; // Ribbon
        this.ctx.fillRect(-18, -52, 36, 4);

        // 7. Pernas/Pés
        this.ctx.fillStyle = '#1b5e20';
        const legMove = isWalking ? Math.sin(time) * 4 : 0;
        this.ctx.fillRect(-10, 30, 8, 8 + legMove);
        this.ctx.fillRect(2, 30, 8, 8 - legMove);

        this.ctx.restore();
    }

    drawPlants(x, y) {
        this.ctx.save();
        this.ctx.translate(x, y);

        // Damage effect
        if (this.garden.hurtTimer > 0) {
            this.ctx.shadowBlur = 40;
            this.ctx.shadowColor = 'red';
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 80, 0, Math.PI * 2);
            this.ctx.fill();
        }

        const drawFlower = (fx, fy, c1, c2, scale = 1) => {
            this.ctx.save();
            this.ctx.translate(fx, fy);
            this.ctx.scale(scale, scale);
            // Stem
            this.ctx.fillStyle = '#2e7d32';
            this.ctx.fillRect(-2, 0, 4, 15);
            // Petals
            this.ctx.fillStyle = c1;
            this.ctx.fillRect(-8, -10, 16, 16);
            this.ctx.fillStyle = c2;
            this.ctx.fillRect(-2, -6, 4, 4);
            this.ctx.restore();
        };

        const colors = ['#f06292', '#ba68c8', '#4fc3f7', '#fff176', '#ff8a65', '#aed581'];

        // Base Flowers (3)
        drawFlower(-30, 10, colors[0], '#fff');
        drawFlower(10, -20, colors[1], '#fff');
        drawFlower(25, 15, colors[2], '#fff');

        // Extra Flowers based on Level (Max 10 levels)
        for (let i = 1; i < this.level; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const dist = 50 + (i * 5);
            const fx = Math.cos(angle) * dist;
            const fy = Math.sin(angle) * dist;
            drawFlower(fx, fy, colors[i % colors.length], '#fff', 0.8);
        }

        this.ctx.restore();
    }

    drawPixelEnemy(type, frame, color) {
        const s = 4;
        this.ctx.fillStyle = color;
        if (type === 'ant') {
            this.ctx.fillRect(-2 * s, -4 * s, 4 * s, 3 * s);
            this.ctx.fillRect(-3 * s, -s, 6 * s, 4 * s);
            this.ctx.fillRect(-2 * s, 3 * s, 4 * s, 5 * s);
            const move = frame === 1 ? s : -s;
            this.ctx.fillRect(-5 * s, -s + move, s, 2 * s);
            this.ctx.fillRect(4 * s, -s - move, s, 2 * s);
        } else if (type === 'wasp') {
            this.ctx.fillStyle = '#fdd835';
            this.ctx.fillRect(-3 * s, -2 * s, 6 * s, 8 * s);
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(-3 * s, 0, 6 * s, 2 * s);
            this.ctx.fillRect(-3 * s, 4 * s, 6 * s, 2 * s);
            this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
            const wAnim = Math.sin(Date.now() / 50) * 10;
            this.ctx.fillRect(-8 * s, -3 * s, 5 * s, 4 * s + wAnim);
            this.ctx.fillRect(3 * s, -3 * s, 5 * s, 4 * s + wAnim);
        } else {
            this.ctx.fillRect(-15, -15, 30, 30);
            this.ctx.fillStyle = '#ff1744';
            this.ctx.fillRect(-10, -10, 5, 5);
            this.ctx.fillRect(5, -10, 5, 5);
        }
    }


    gameOver() {
        this.isGameOver = true;
        document.getElementById('final-score').textContent = `PONTUAÇÃO: ${this.score}`;
        document.getElementById('game-over').classList.remove('hidden');
    }

    gameLoop() {
        this.update();
        this.drawFrame();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game instance
window.onload = () => {
    window.gameInstance = new Game();
};
