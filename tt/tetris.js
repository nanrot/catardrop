// [min, max] 범위의 무작위 정수 얻기
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 난이도 버튼으로 시작
function startGame(difficulty) {
    if (difficulties[difficulty]) {
        currentDifficulty = difficulty;
        dropSpeed = difficulties[currentDifficulty];
    }
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    init();
}

// 난이도 설정
const difficulties = {
    Easy: 40,
    Normal: 30,
    Hard: 20,
    Lunatic: 10
};
let currentDifficulty = "Normal"; // 기본값
let dropSpeed = difficulties[currentDifficulty];

// 난이도 선택 (게임 시작 시)
function chooseDifficulty() {
    const choice = prompt("난이도를 선택하세요: Easy / Normal / Hard / Lunatic", "Normal");
    if (choice && difficulties[choice]) {
        currentDifficulty = choice;
        dropSpeed = difficulties[currentDifficulty];
    }
}

// 효과음 로딩 (줄 삭제)
const clearSound = new Audio("SE/clear.wav");
clearSound.volume = 0.4; // 필요시 조절

// 새로운 도형 시퀀스 생성
function generateSequence() {
    const sequence = ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'W'];
    while (sequence.length) {
        const rand = getRandomInt(0, sequence.length - 1);
        const name = sequence.splice(rand, 1)[0];
        tetrominoSequence.push(name);
    }
}

// 시퀀스에서 다음 도형 가져오기
function getNextTetromino() {
    while (tetrominoSequence.length < 4) {
        generateSequence();
    }
    const name = tetrominoSequence.pop();
    const matrix = tetrominos[name];

    const col = playfield[0].length / 2 - Math.ceil(matrix[0].length / 2);
    const row = name === 'I' ? -1 : -2;

    return {
        name: name,
        matrix: matrix,
        row: row,
        col: col
    };
}

// N x N 행렬을 90도 시계 방향으로 회전
function rotate(matrix) {
    const N = matrix.length - 1;
    const result = matrix.map((row, i) =>
        row.map((val, j) => matrix[N - j][i])
    );
    return result;
}

// N x N 행렬을 90도 반시계 방향으로 회전
function rotateCounterClockwise(matrix) {
    const rotated1 = rotate(matrix);
    const rotated2 = rotate(rotated1);
    return rotate(rotated2);
}

// 새로운 위치와 매트릭스가 유효한지 확인
function isValidMove(matrix, cellRow, cellCol) {
    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            if (matrix[row][col] && (
                cellCol + col < 0 ||
                cellCol + col >= playfield[0].length ||
                cellRow + row >= playfield.length ||
                playfield[cellRow + row][cellCol + col])
            ) {
                return false;
            }
        }
    }
    return true;
}

const particles = [];

function spawnParticlesForClearedLines(rows) {
    rows.forEach(rowIdx => {
        for (let col = 0; col < 10; col++) {
            const name = playfield[rowIdx][col];
            if (!name) continue;
            const baseX = col * grid + grid / 2;
            const baseY = rowIdx * grid + grid / 2;
            const color = colors[name] || 'white';

            const count = getRandomInt(5, 9);
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.5 + Math.random() * 3.5;
                particles.push({
                    x: baseX,
                    y: baseY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1.0,
                    gravity: 0.08,
                    life: 35 + Math.floor(Math.random() * 20),
                    alpha: 1,
                    size: 2 + Math.random() * 2,
                    color
                });
            }
        }
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 1;
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.alpha = Math.max(0, p.life / 40);
    }
}

function drawParticles(ctx) {
    for (const p of particles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// 도형를 게임 판에 고정
function placeTetromino() {
    for (let row = 0; row < tetromino.matrix.length; row++) {
        for (let col = 0; col < tetromino.matrix[row].length; col++) {
            if (tetromino.matrix[row][col]) {
                if (tetromino.row + row < 0) {
                    return showGameOver();
                }
                playfield[tetromino.row + row][tetromino.col + col] = tetromino.name;
            }
        }
    }

    linesToClear = [];
    for (let row = playfield.length - 1; row >= 0; row--) {
        if (playfield[row].every(cell => !!cell)) {
            linesToClear.push(row);
        }
    }

    // 줄이 제거되면 아래 줄을 위로 올림
    if (linesToClear.length > 0) {
        isAnimating = true;
        flashTimer = Date.now();
        try { clearSound.currentTime = 0; clearSound.play(); } catch (e) {}
        spawnParticlesForClearedLines(linesToClear);
    } else {
        tetromino = getNextTetromino();
        isLocked = false;
        drawNextTetrominoes();
    }
}

// 점수 표시 업데이트
function updateScore() {
    scoreElement.innerText = score;
}

// 게임 오버 화면 표시
function showGameOver() {
    bgm.pause();
    bgm.currentTime = 0;

    cancelAnimationFrame(rAF);
    gameOver = true;
    isPaused = true;

    const currentHighest = localStorage.getItem('highestScore') || 0;
    if (score > currentHighest) {
        localStorage.setItem('highestScore', score);
    }

    document.getElementById('final-score').innerText = score;
    document.getElementById('highest-score').innerText = localStorage.getItem('highestScore') || 0;
    document.getElementById('game-over-screen').style.display = 'block';
}

const canvas = document.getElementById('game');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const grid = 32;
const tetrominoSequence = [];
let score = 0;

let isAnimating = false;
let linesToClear = [];
let flashTimer = 0;
const flashDuration = 100;
const totalFlashes = 3;

const bgm = document.getElementById('bgm');
bgm.volume = 0.01;
bgm.loop = true;

bgm.addEventListener('ended', () => {
    const options = Array.from(bgmSelect.options);
    const currentIndex = options.findIndex(opt => opt.value === bgmSelect.value);
    const nextIndex = (currentIndex + 1) % options.length;

    bgmSelect.value = options[nextIndex].value;
    bgm.src = bgmSelect.value;
    bgm.play().catch(e => console.error("Auto play next BGM failed:", e));
});

const settingsButton = document.getElementById('settings-button');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsCloseButton = document.getElementById('settings-close-button');
const volumeSlider = document.getElementById('volume-slider');
const bgmSelect = document.getElementById('bgm-select');
const volumeNumber = document.getElementById('volume-number');

let isPaused = false;
let isGameStarted = false;

function updateVolume(value) {
    let volume = parseFloat(value);
    if (isNaN(volume) || volume < 0) volume = 0;
    if (volume > 1) volume = 1;

    bgm.volume = volume;
    volumeSlider.value = volume;
    volumeNumber.value = volume.toFixed(2);
}

volumeSlider.addEventListener('input', (e) => {
    updateVolume(e.target.value);
});

volumeNumber.addEventListener('input', (e) => {
    updateVolume(e.target.value);
});

settingsButton.addEventListener('click', () => {
    isPaused = true;
    settingsOverlay.style.display = 'flex';
    updateVolume(bgm.volume);
    bgm.pause();
});

settingsCloseButton.addEventListener('click', () => {
    isPaused = false;
    settingsOverlay.style.display = 'none';

    if (isGameStarted) {
        bgm.play().catch(err => console.error("BGM play failed after settings close:", err));
    }
    rAF = requestAnimationFrame(loop);
});

bgmSelect.addEventListener('change', (e) => {
    bgm.src = e.target.value; // ✅ 경로 중복 제거
    bgm.load();
    if (isGameStarted && !isPaused) {
        bgm.play().catch(err => console.error("BGM change and play failed:", err));
    }
});

function init() {
    chooseDifficulty();

    score = 0;
    isGameStarted = true;
    gameOver = false;
    isPaused = false;
    tetrominoSequence.length = 0;
    playfield.forEach(row => row.fill(0));
    particles.length = 0;

    tetromino = getNextTetromino();

    updateScore();
    drawNextTetrominoes();

    bgm.play().catch(e => {
        console.error("Autoplay failed:", e);
    });
    rAF = requestAnimationFrame(loop);
}

const playfield = [];
for (let row = -2; row < 20; row++) {
    playfield[row] = [];
    for (let col = 0; col < 10; col++) {
        playfield[row][col] = 0;
    }
}

const tetrominos = {
    'I': [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    'J': [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    'L': [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
    ],
    'O': [
        [1, 1],
        [1, 1],
    ],
    'S': [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
    ],
    'Z': [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
    ],
    'T': [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    'W': [
        [0, 0, 1, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ]
};

const colors = {
    'I': 'cyan',
    'O': 'yellow',
    'T': 'purple',
    'S': 'green',
    'Z': 'red',
    'J': 'blue',
    'L': 'orange',
    'W': 'pink'
};

const nextCanvases = [
    document.getElementById('next-1'),
    document.getElementById('next-2'),
    document.getElementById('next-3')
];
const nextCanvasContexts = nextCanvases.map(canvas => canvas.getContext('2d'));
const nextGrid = 32;

function drawMatrix(context, matrix, pieceName, scale) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.fillStyle = colors[pieceName];

    let minRow = matrix.length;
    let maxRow = 0;
    let minCol = matrix[0].length;
    let maxCol = 0;

    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            if (matrix[row][col]) {
                minRow = Math.min(minRow, row);
                maxRow = Math.max(maxRow, row);
                minCol = Math.min(minCol, col);
                maxCol = Math.max(maxCol, col);
            }
        }
    }

    const blockWidth = (maxCol - minCol + 1) * scale;
    const blockHeight = (maxRow - minRow + 1) * scale;

    const offsetX = (context.canvas.width - blockWidth) / 2;
    const offsetY = (context.canvas.height - blockHeight) / 2;

    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            if (matrix[row][col]) {
                context.fillRect(
                    offsetX + (col - minCol) * scale,
                    offsetY + (row - minRow) * scale,
                    scale - 1,
                    scale - 1
                );
            }
        }
    }
}

function drawNextTetrominoes() {
    for (let i = 0; i < 3; i++) {
        const nextPieceName = tetrominoSequence[tetrominoSequence.length - 1 - i];
        if (nextPieceName) {
            const nextMatrix = tetrominos[nextPieceName];
            drawMatrix(nextCanvasContexts[i], nextMatrix, nextPieceName, nextGrid);
        } else {
            nextCanvasContexts[i].clearRect(0, 0, nextCanvases[i].width, nextCanvases[i].height);
        }
    }
}

let count = 0;
let tetromino = null; // 초기화 함수에서 설정
let rAF = null;
let gameOver = false;

let lastDropTime = 0;
const lockDelay = 500;
let isLocked = false;

function loop() {
    if (gameOver || isPaused) {
        return;
    }

    rAF = requestAnimationFrame(loop);

    if (isAnimating) {
        const elapsed = Date.now() - flashTimer;
        const numFlashes = Math.floor(elapsed / (flashDuration * 2));
        const isFlashingOn = (Math.floor(elapsed / flashDuration) % 2) === 0;

        if (numFlashes >= totalFlashes) {
            let clearedCount = linesToClear.length;

            const newPlayfield = playfield.filter((_, row) => !linesToClear.includes(row));
            for (let i = 0; i < clearedCount; i++) {
                newPlayfield.unshift(new Array(10).fill(0));
            }

            playfield.length = 0;
            playfield.push(...newPlayfield);

            let points = 0;
            switch (clearedCount) {
                case 1: points = 100; break;
                case 2: points = 300; break;
                case 3: points = 500; break;
                case 4: points = 800; break;
            }
            score += points;
            updateScore();

            isAnimating = false;
            linesToClear = [];
            tetromino = getNextTetromino();
            isLocked = false;
            drawNextTetrominoes();
        }

        // 보드 그리기 + 플래시
        context.clearRect(0, 0, canvas.width, canvas.height);
        for (let row = 0; row < 20; row++) {
            for (let col = 0; col < 10; col++) {
                const name = playfield[row][col];
                if (name) {
                    if (linesToClear.includes(row)) {
                        if (isFlashingOn) {
                            context.fillStyle = 'white';
                            context.fillRect(col * grid, row * grid, grid - 1, grid - 1);
                        }
                    } else {
                        context.fillStyle = colors[name];
                        context.fillRect(col * grid, row * grid, grid - 1, grid - 1);
                    }
                }
            }
        }
        updateParticles();
        drawParticles(context);

        return;
    }

    // 일반 루프
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < 20; row++) {
        for (let col = 0; col < 10; col++) {
            if (playfield[row][col]) {
                const name = playfield[row][col];
                context.fillStyle = colors[name];
                context.fillRect(col * grid, row * grid, grid - 1, grid - 1);
            }
        }
    }

    // 파티클은 일반 루프에서도 자연 소멸되도록 업데이트/그리기
    updateParticles();
    drawParticles(context);

    if (tetromino) {
        if (++count > dropSpeed) {
            tetromino.row++;
            count = 0;

            if (!isValidMove(tetromino.matrix, tetromino.row, tetromino.col)) {
                tetromino.row--;
                if (!isLocked) {
                    lastDropTime = Date.now();
                    isLocked = true;
                }
            } else {
                isLocked = false;
            }
        }

        if (isLocked && Date.now() - lastDropTime > lockDelay) {
            placeTetromino();
        }

        context.fillStyle = colors[tetromino.name];
        for (let row = 0; row < tetromino.matrix.length; row++) {
            for (let col = 0; col < tetromino.matrix[row].length; col++) {
                if (tetromino.matrix[row][col]) {
                    context.fillRect((tetromino.col + col) * grid, (tetromino.row + row) * grid, grid - 1, grid - 1);
                }
            }
        }
    }
}

document.addEventListener('keydown', function (e) {
    if (!isGameStarted || gameOver || isAnimating || isPaused) return;

    if (e.which === 37 || e.which === 39) {
        const col = e.which === 37 ? tetromino.col - 1 : tetromino.col + 1;
        if (isValidMove(tetromino.matrix, tetromino.row, col)) {
            tetromino.col = col;
            isLocked = false;
        }
    }

    if (e.which === 38 || e.which === 90) {
        const matrix = rotate(tetromino.matrix);
        if (isValidMove(matrix, tetromino.row, tetromino.col)) {
            tetromino.matrix = matrix;
            isLocked = false;
        }
    }

    if (e.which === 88) {
        const matrix = rotateCounterClockwise(tetromino.matrix);
        if (isValidMove(matrix, tetromino.row, tetromino.col)) {
            tetromino.matrix = matrix;
            isLocked = false;
        }
    }

    if (e.which === 40) {
        const row = tetromino.row + 1;
        if (!isValidMove(tetromino.matrix, row, tetromino.col)) {
            tetromino.row = row - 1;
            if (!isLocked) {
                placeTetromino();
            }
            return;
        }
        tetromino.row = row;
    }

    if (e.which === 32) {
        while (isValidMove(tetromino.matrix, tetromino.row + 1, tetromino.col)) {
            tetromino.row++;
        }
        placeTetromino();
    }
});

init();