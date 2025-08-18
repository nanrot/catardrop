const canvas = document.getElementById('game');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

const settingsButton = document.getElementById('settings-button');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsCloseButton = document.getElementById('settings-close-button');
const volumeSlider = document.getElementById('volume-slider');
const volumeNumber = document.getElementById('volume-number');
const bgmSelect = document.getElementById('bgm-select');
const bgm = document.getElementById('bgm');

const grid = 32;
const tetrominoSequence = [];
const nextCanvases = [
  document.getElementById('next-1'),
  document.getElementById('next-2'),
  document.getElementById('next-3')
];
const nextCtxs = nextCanvases.map(c => c.getContext('2d'));
const nextGrid = 32;

let score = 0;
let count = 0;
let tetromino = null;
let rAF = null;
let gameOver = false;

let isPaused = false;
let isGameStarted = false;

// 잠김/낙하 속도
const lockDelay = 500;
let isLocked = false;
let lastDropTime = 0;

// 라인 제거 연출
let isAnimating = false;
let linesToClear = [];
let flashTimer = 0;
const flashDuration = 100;
const totalFlashes = 3;

// 난이도
const difficulties = { Easy: 40, Normal: 30, Hard: 20, Lunatic: 10 };
let currentDifficulty = 'Normal';
let dropSpeed = difficulties[currentDifficulty];

// 사운드
if (bgm) {
  bgm.volume = 0.01; // 초기 볼륨
  bgm.loop = true;
}
const clearSound = new Audio("SE/clear.wav");
clearSound.volume = 0.4;

const tetrominos = {
  'I': [
    [0,0,0,0],
    [1,1,1,1],
    [0,0,0,0],
    [0,0,0,0]
  ],
  'J': [
    [1,0,0],
    [1,1,1],
    [0,0,0],
  ],
  'L': [
    [0,0,1],
    [1,1,1],
    [0,0,0],
  ],
  'O': [
    [1,1],
    [1,1],
  ],
  'S': [
    [0,1,1],
    [1,1,0],
    [0,0,0],
  ],
  'Z': [
    [1,1,0],
    [0,1,1],
    [0,0,0],
  ],
  'T': [
    [0,1,0],
    [1,1,1],
    [0,0,0],
  ],
  'W': [
    [0,0,1,0],
    [1,1,1,1],
    [0,0,0,0],
    [0,0,0,0]
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

const playfield = [];
for (let row = -2; row < 20; row++) {
  playfield[row] = [];
  for (let col = 0; col < 10; col++) {
    playfield[row][col] = 0;
  }
}

function getRandomInt(min, max) {
  min = Math.ceil(min); max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateScore() {
  scoreElement.textContent = score;
}

function rotate(matrix) {
  const N = matrix.length - 1;
  return matrix.map((row, i) => row.map((_, j) => matrix[N - j][i]));
}
function rotateCounterClockwise(matrix) {
  return rotate(rotate(rotate(matrix)));
}

function isValidMove(matrix, cellRow, cellCol) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const nr = cellRow + r;
      const nc = cellCol + c;
      if (
        nc < 0 ||
        nc >= playfield[0].length ||
        nr >= playfield.length ||
        playfield[nr][nc]
      ) return false;
    }
  }
  return true;
}

// 다음 블럭 스폰
function generateSequence() {
  const seq = ['I','J','L','O','S','T','Z','W'];
  while (seq.length) {
    const idx = getRandomInt(0, seq.length - 1);
    tetrominoSequence.push(seq.splice(idx, 1)[0]);
  }
}
function getNextTetromino() {
  while (tetrominoSequence.length < 4) generateSequence();
  const name = tetrominoSequence.shift();
  const matrix = tetrominos[name];
  const col = (playfield[0].length / 2) - Math.ceil(matrix[0].length / 2);
  const row = name === 'I' ? -1 : -2;
  return { name, matrix, row, col };
}
function drawNextTetrominoes() {
  for (let i = 0; i < 3; i++) {
    const nm = tetrominoSequence[i];
    if (!nm) {
      nextCtxs[i].clearRect(0, 0, nextCanvases[i].width, nextCanvases[i].height);
      continue;
    }
    drawMatrix(nextCtxs[i], tetrominos[nm], nm, nextGrid);
  }
}

function drawMatrix(ctx, matrix, pieceName, scale) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = colors[pieceName];

  let minR = matrix.length, maxR = 0, minC = matrix[0].length, maxC = 0;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c]) {
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
      }
    }
  }
  const bw = (maxC - minC + 1) * scale;
  const bh = (maxR - minR + 1) * scale;
  const ox = (ctx.canvas.width - bw) / 2;
  const oy = (ctx.canvas.height - bh) / 2;

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(
          ox + (c - minC) * scale,
          oy + (r - minR) * scale,
          scale - 1, scale - 1
        );
      }
    }
  }
}

// 고스트 피스 계산
function getGhostPosition(matrix, row, col) {
  while (isValidMove(matrix, row + 1, col)) {
    row++;
  }
  return row;
}

if (tetromino) {
  // 고스트 피스 위치 계산
  const ghostRow = getGhostPosition(tetromino.matrix, tetromino.row, tetromino.col);

  // 고스트 피스 그리기 (투명도 낮게)
  context.fillStyle = colors[tetromino.name];
  context.globalAlpha = 0.3; // 반투명
  for (let row = 0; row < tetromino.matrix.length; row++) {
    for (let col = 0; col < tetromino.matrix[row].length; col++) {
      if (tetromino.matrix[row][col]) {
        context.fillRect(
          (tetromino.col + col) * grid,
          (ghostRow + row) * grid,
          grid - 1,
          grid - 1
        );
      }
    }
  }
  context.globalAlpha = 1.0; // 원래대로 복원

  // 실제 테트로미노 그리기
  context.fillStyle = colors[tetromino.name];
  for (let row = 0; row < tetromino.matrix.length; row++) {
    for (let col = 0; col < tetromino.matrix[row].length; col++) {
      if (tetromino.matrix[row][col]) {
        context.fillRect(
          (tetromino.col + col) * grid,
          (tetromino.row + row) * grid,
          grid - 1,
          grid - 1
        );
      }
    }
  }
}

// 파티클
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
          x: baseX, y: baseY,
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
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
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

// 게임 로직
function placeTetromino() {
  for (let r = 0; r < tetromino.matrix.length; r++) {
    for (let c = 0; c < tetromino.matrix[r].length; c++) {
      if (!tetromino.matrix[r][c]) continue;
      if (tetromino.row + r < 0) return showGameOver();
      playfield[tetromino.row + r][tetromino.col + c] = tetromino.name;
    }
  }

  linesToClear = [];
  for (let row = playfield.length - 1; row >= 0; row--) {
    if (playfield[row].every(cell => !!cell)) linesToClear.push(row);
  }

  if (linesToClear.length > 0) {
    isAnimating = true;
    flashTimer = Date.now();
    try { clearSound.currentTime = 0; clearSound.play(); } catch (_) {}
    spawnParticlesForClearedLines(linesToClear);
  } else {
    tetromino = getNextTetromino();
    isLocked = false;
    drawNextTetrominoes();
  }
}

function showGameOver() {
  if (bgm) { bgm.pause(); bgm.currentTime = 0; }
  cancelAnimationFrame(rAF);
  gameOver = true; isPaused = true;

  const currentHighest = Number(localStorage.getItem('highestScore') || 0);
  if (score > currentHighest) localStorage.setItem('highestScore', String(score));

  document.getElementById('final-score').textContent = score;
  document.getElementById('highest-score').textContent = localStorage.getItem('highestScore') || 0;
  document.getElementById('game-over-screen').style.display = 'flex';
}

function loop() {
  if (gameOver || isPaused) return;
  rAF = requestAnimationFrame(loop);

  // 라인 제거 연출
  if (isAnimating) {
    const elapsed = Date.now() - flashTimer;
    const numFlashes = Math.floor(elapsed / (flashDuration * 2));
    const isOn = (Math.floor(elapsed / flashDuration) % 2) === 0;

    if (numFlashes >= totalFlashes) {
      const clearedCount = linesToClear.length;

      const newPlayfield = playfield.filter((_, row) => !linesToClear.includes(row));
      for (let i = 0; i < clearedCount; i++) newPlayfield.unshift(new Array(10).fill(0));

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

    // 보드 그리기 (플래시)
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < 20; row++) {
      for (let col = 0; col < 10; col++) {
        const name = playfield[row][col];
        if (!name) continue;
        if (linesToClear.includes(row)) {
          if (isOn) {
            context.fillStyle = 'white';
            context.fillRect(col * grid, row * grid, grid - 1, grid - 1);
          }
        } else {
          context.fillStyle = colors[name];
          context.fillRect(col * grid, row * grid, grid - 1, grid - 1);
        }
      }
    }
    updateParticles(); drawParticles(context);
    return;
  }

  // 일반 루프
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 10; col++) {
      if (!playfield[row][col]) continue;
      const name = playfield[row][col];
      context.fillStyle = colors[name];
      context.fillRect(col * grid, row * grid, grid - 1, grid - 1);
    }
  }

  updateParticles(); drawParticles(context);

  if (tetromino) {
    if (++count > dropSpeed) {
      tetromino.row++; count = 0;
      if (!isValidMove(tetromino.matrix, tetromino.row, tetromino.col)) {
        tetromino.row--;
        if (!isLocked) { lastDropTime = Date.now(); isLocked = true; }
      } else {
        isLocked = false;
      }
    }

    if (isLocked && Date.now() - lastDropTime > lockDelay) placeTetromino();

    context.fillStyle = colors[tetromino.name];
    for (let r = 0; r < tetromino.matrix.length; r++) {
      for (let c = 0; c < tetromino.matrix[r].length; c++) {
        if (!tetromino.matrix[r][c]) continue;
        context.fillRect((tetromino.col + c) * grid, (tetromino.row + r) * grid, grid - 1, grid - 1);
      }
    }
  }
}

// 키보드 입력 처리
document.addEventListener('keydown', (e) => {
  if (!isGameStarted || gameOver || isAnimating || isPaused) return;

  // 페이지 스크롤 방지
  if ([32,37,38,39,40].includes(e.which)) e.preventDefault();

  if (e.which === 37 || e.which === 39) {
    const col = (e.which === 37) ? tetromino.col - 1 : tetromino.col + 1;
    if (isValidMove(tetromino.matrix, tetromino.row, col)) {
      tetromino.col = col; isLocked = false;
    }
  }

  if (e.which === 38 || e.which === 90) { // 위쪽 화살표 또는 Z : 시계
    const m = rotate(tetromino.matrix);
    if (isValidMove(m, tetromino.row, tetromino.col)) { tetromino.matrix = m; isLocked = false; }
  }

  if (e.which === 88) { // X : 반시계
    const m = rotateCounterClockwise(tetromino.matrix);
    if (isValidMove(m, tetromino.row, tetromino.col)) { tetromino.matrix = m; isLocked = false; }
  }

  if (e.which === 40) { // 아래 화살표 : 소프트 드롭
    const row = tetromino.row + 1;
    if (!isValidMove(tetromino.matrix, row, tetromino.col)) {
      tetromino.row = row - 1;
      if (!isLocked) placeTetromino();
      return;
    }
    tetromino.row = row;
  }

  if (e.which === 32) { // Space : 하드 드롭
    while (isValidMove(tetromino.matrix, tetromino.row + 1, tetromino.col)) tetromino.row++;
    placeTetromino();
  }
});

// 설정 패널 동기화
function updateVolume(value) {
  let v = parseFloat(value);
  if (isNaN(v) || v < 0) v = 0;
  if (v > 1) v = 1;
  if (bgm) bgm.volume = v;
  volumeSlider.value = v;
  volumeNumber.value = v.toFixed(2);
}

settingsButton.addEventListener('click', () => {
  isPaused = true;
  settingsOverlay.style.display = 'flex';
  updateVolume(bgm ? bgm.volume : volumeSlider.value);
  if (bgm) bgm.pause();
});

settingsCloseButton.addEventListener('click', () => {
  isPaused = false;
  settingsOverlay.style.display = 'none';
  if (isGameStarted && bgm) bgm.play().catch(()=>{});
  rAF = requestAnimationFrame(loop);
});

volumeSlider.addEventListener('input', e => updateVolume(e.target.value));
volumeNumber.addEventListener('input', e => updateVolume(e.target.value));

bgmSelect.addEventListener('change', (e) => {
  if (!bgm) return;
  bgm.src = e.target.value;
  bgm.load();
  if (isGameStarted && !isPaused) {
    bgm.play().catch(()=>{});
  }
});

// 자동으로 다음 트랙으로 넘어가기
if (bgm) {
  bgm.addEventListener('ended', () => {
    const opts = Array.from(bgmSelect.options);
    const idx = opts.findIndex(o => o.value === bgmSelect.value);
    const nextIdx = (idx + 1) % opts.length;
    bgmSelect.value = opts[nextIdx].value;
    bgm.src = bgmSelect.value;
    bgm.play().catch(()=>{});
  });
}

// 시작/초기화
function init() {
  score = 0; isGameStarted = true; gameOver = false; isPaused = false;
  tetrominoSequence.length = 0;
  for (let row = -2; row < 20; row++) for (let col = 0; col < 10; col++) playfield[row][col] = 0;
  particles.length = 0;

  tetromino = getNextTetromino();
  updateScore();
  drawNextTetrominoes();

  if (bgm) bgm.play().catch(()=>{});
  rAF = requestAnimationFrame(loop);
}

// 버튼으로 시작
function startGame(difficulty) {
  if (difficulties[difficulty]) {
    currentDifficulty = difficulty;
    dropSpeed = difficulties[currentDifficulty];
  }
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('game-ui').style.display = 'block';
  init();
}

// (선택) 프롬프트로 시작하고 싶으면 아래를 쓰되, 기본 흐름에서는 사용 X
function chooseDifficulty() {
  const choice = prompt("난이도를 선택하세요: Easy / Normal / Hard / Lunatic", "Normal");
  if (choice && difficulties[choice]) {
    currentDifficulty = choice;
    dropSpeed = difficulties[currentDifficulty];
  }
}
