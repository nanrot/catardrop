// [min, max] 범위의 무작위 정수 얻기
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 새로운 도형 시퀀스 생성
function generateSequence() {
    const sequence = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    while (sequence.length) {
        const rand = getRandomInt(0, sequence.length - 1);
        const name = sequence.splice(rand, 1)[0];
        tetrominoSequence.push(name);
    }
}

// 시퀀스에서 다음 도형 가져오기
function getNextTetromino() {
    // 미리보기 블록까지 포함해서 최소 4개 유지
    while (tetrominoSequence.length < 4) {
        generateSequence();
    }
    const name = tetrominoSequence.pop();
    const matrix = tetrominos[name];
    
    // 도형의 시작 위치 계산
    const col = playfield[0].length / 2 - Math.ceil(matrix[0].length / 2);
    const row = name === 'I' ? -1 : -2;

    return {
        name: name,
        matrix: matrix,
        row: row,
        col: col
    };
}

// N x N 행렬을 90도 회전
function rotate(matrix) {
    const N = matrix.length - 1;
    const result = matrix.map((row, i) =>
        row.map((val, j) => matrix[N - j][i])
    );
    return result;
}

// 새로운 위치와 매트릭스가 유효한지 확인
function isValidMove(matrix, cellRow, cellCol) {
    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            if (matrix[row][col] && (
                // 게임 경계를 벗어나는 경우
                cellCol + col < 0 ||
                cellCol + col >= playfield[0].length ||
                cellRow + row >= playfield.length ||
                // 다른 조각과 충돌하는 경우
                playfield[cellRow + row][cellCol + col])
            ) {
                return false;
            }
        }
    }
    return true;
}

// 도형를 게임 판에 고정
function placeTetromino() {
    for (let row = 0; row < tetromino.matrix.length; row++) {
        for (let col = 0; col < tetromino.matrix[row].length; col++) {
            if (tetromino.matrix[row][col]) {
                // 조각이 화면 밖으로 나가면 게임 오버
                if (tetromino.row + row < 0) {
                    return showGameOver();
                }
                playfield[tetromino.row + row][tetromino.col + col] = tetromino.name;
            }
        }
    }

    // 바닥부터 시작하여 라인 삭제 확인
    let linesCleared = 0;
    for (let row = playfield.length - 1; row >= 0; ) {
        if (playfield[row].every(cell => !!cell)) {
            // 해당 라인 위쪽의 모든 라인을 아래로 내림
            for (let r = row; r >= 0; r--) {
                for (let c = 0; c < playfield[r].length; c++) {
                    playfield[r][c] = playfield[r-1][c];
                }
            }
            linesCleared++;
        } else {
            row--;
        }
    }

    // 삭제된 라인 수에 따라 점수 추가
    if (linesCleared > 0) {
        let points = 0;
        switch(linesCleared) {
            case 1: points = 100; break;
            case 2: points = 300; break;
            case 3: points = 500; break;
            case 4: points = 800; break;
        }
        score += points;
        updateScore();
    }

    tetromino = getNextTetromino();
    isLocked = false;
    drawNextTetrominoes();
}

// 점수 표시 업데이트
function updateScore() {
    scoreElement.innerText = score;
}

// 게임 오버 화면 표시
function showGameOver() {
    cancelAnimationFrame(rAF);
    gameOver = true;

    // 최고 점수 확인 및 업데이트
    const currentHighest = localStorage.getItem('highestScore') || 0;
    if (score > currentHighest) {
        localStorage.setItem('highestScore', score);
    }

    // 게임 오버 화면에 점수 표시
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

// 게임 판의 각 셀 상태를 추적하기 위한 2D 배열
const playfield = [];
// 빈 게임 판 초기화
for (let row = -2; row < 20; row++) {
    playfield[row] = [];
    for (let col = 0; col < 10; col++) {
        playfield[row][col] = 0;
    }
}

// 각 도형의 모양 정의
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
    ]
};

// 각 도형의 색상 정의
const colors = {
    'I': 'cyan',
    'O': 'yellow',
    'T': 'purple',
    'S': 'green',
    'Z': 'red',
    'J': 'blue',
    'L': 'orange'
};

// 미리보기 캔버스 설정
const nextCanvases = [
    document.getElementById('next-1'),
    document.getElementById('next-2'),
    document.getElementById('next-3')
];
const nextCanvasContexts = nextCanvases.map(canvas => canvas.getContext('2d'));
const nextGrid = 32;

// 미리보기 블록을 캔버스 중앙에 그리는 함수
function drawMatrix(context, matrix, pieceName, scale) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.fillStyle = colors[pieceName];

    let minRow = matrix.length;
    let maxRow = 0;
    let minCol = matrix[0].length;
    let maxCol = 0;

    // 블록의 실제 크기(가장 작은 직사각형) 계산
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

    // 캔버스 중앙에 블록을 배치하기 위한 오프셋
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
        }
    }
}

let count = 0;
let tetromino = getNextTetromino();
let rAF = null;
let gameOver = false;

let lastDropTime = 0;
const lockDelay = 500;
let isLocked = false;

function loop() {
    if (gameOver) {
        return;
    }

    rAF = requestAnimationFrame(loop);
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

    if (tetromino) {
        if (++count > 35) {
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
    if (gameOver) return;

    if (e.which === 37 || e.which === 39) {
        const col = e.which === 37 ? tetromino.col - 1 : tetromino.col + 1;
        if (isValidMove(tetromino.matrix, tetromino.row, col)) {
            tetromino.col = col;
            isLocked = false;
        }
    }

    if (e.which === 38) {
        const matrix = rotate(tetromino.matrix);
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
});

rAF = requestAnimationFrame(loop);
drawNextTetrominoes();