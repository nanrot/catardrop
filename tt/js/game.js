const grid = 32;

// 안전한 낙하속도 접근자 (다른 파일 전역에 의존)
function getDropSpeed() {
  if (typeof window !== 'undefined' && typeof window.dropSpeed === 'number') {
    return window.dropSpeed;
  }
  return 30; // 기본값 (Normal)
}

// 플레이필드
const playfield = [];
for (let row = -2; row < 20; row++) {
  playfield[row] = [];
  for (let col = 0; col < 10; col++) playfield[row][col] = 0;
}

// 테트로미노 & 색상
const tetrominos = {
  'I': [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  'J': [[1,0,0],[1,1,1],[0,0,0]],
  'L': [[0,0,1],[1,1,1],[0,0,0]],
  'O': [[1,1],[1,1]],
  'S': [[0,1,1],[1,1,0],[0,0,0]],
  'Z': [[1,1,0],[0,1,1],[0,0,0]],
  'T': [[0,1,0],[1,1,1],[0,0,0]],
  'W': [[0,0,1,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]]
};
const colors = { 'I':'cyan','O':'yellow','T':'purple','S':'green','Z':'red','J':'blue','L':'orange','W':'pink' };

// 상태
let tetromino = null;
let count = 0;
let isLocked = false;
let lastDropTime = 0;
let lockDelay = 500;

// 시퀀스
const tetrominoSequence = [];
function getRandomInt(min, max) { min=Math.ceil(min); max=Math.floor(max); return Math.floor(Math.random()*(max-min+1))+min; }
function generateSequence() {
  const seq = ['I','J','L','O','S','T','Z','W'];
  while (seq.length) tetrominoSequence.push(seq.splice(getRandomInt(0, seq.length-1),1)[0]);
}
function getNextTetromino() {
  while (tetrominoSequence.length < 4) generateSequence();
  const name = tetrominoSequence.shift();
  const matrix = tetrominos[name];
  const col = (playfield[0].length / 2) - Math.ceil(matrix[0].length / 2);
  const row = name === 'I' ? -1 : -2;
  return { name, matrix, row, col };
}

// 회전
function rotate(m){ const N=m.length-1; return m.map((row,i)=>row.map((_,j)=>m[N-j][i])); }
function rotateCounterClockwise(m){ return rotate(rotate(rotate(m))); }

// 이동검사
function isValidMove(matrix, cellRow, cellCol) {
  for (let r=0;r<matrix.length;r++){
    for (let c=0;c<matrix[r].length;c++){
      if (!matrix[r][c]) continue;
      const nr = cellRow + r, nc = cellCol + c;
      if (nc<0 || nc>=playfield[0].length || nr>=playfield.length || playfield[nr][nc]) return false;
    }
  }
  return true;
}

// 고스트
function getGhostPosition(matrix, row, col) { while (isValidMove(matrix, row+1, col)) row++; return row; }

// 점수 표시
function updateScore(){ document.getElementById('score').textContent = score; }

// 파티클
const particles = [];
function spawnParticlesForClearedLines(rows){
  rows.forEach(rowIdx=>{
    for (let col=0; col<10; col++){
      const name = playfield[rowIdx][col];
      if (!name) continue;
      const baseX = col*grid + grid/2, baseY = rowIdx*grid + grid/2;
      const color = colors[name] || 'white';
      const cnt = getRandomInt(5,9);
      for (let i=0;i<cnt;i++){
        const angle=Math.random()*Math.PI*2, speed=1.5+Math.random()*3.5;
        particles.push({ x:baseX,y:baseY, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-1, gravity:0.08, life:35+Math.floor(Math.random()*20), alpha:1, size:2+Math.random()*2, color });
      }
    }
  });
}
function updateParticles(){
  for (let i=particles.length-1; i>=0; i--){
    const p=particles[i];
    p.life-=1; if (p.life<=0){ particles.splice(i,1); continue; }
    p.x+=p.vx; p.y+=p.vy; p.vy+=p.gravity; p.alpha=Math.max(0,p.life/40);
  }
}
function drawParticles(ctx){
  for (const p of particles){ ctx.globalAlpha=p.alpha; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); }
  ctx.globalAlpha=1;
}

// 블럭 배치
function placeTetromino(){
  for (let r=0;r<tetromino.matrix.length;r++){
    for (let c=0;c<tetromino.matrix[r].length;c++){
      if (!tetromino.matrix[r][c]) continue;
      if (tetromino.row + r < 0) return showGameOver();
      playfield[tetromino.row+r][tetromino.col+c] = tetromino.name;
    }
  }

  // 라인 체크
  let lines=[];
  for (let r=playfield.length-1;r>=0;){
    if (playfield[r].every(cell=>!!cell)){
      lines.push(r);
      playfield.splice(r,1);
      playfield.unshift(Array(10).fill(0));
    } else r--;
  }

  // 점수 (원본 규칙)
  if (lines.length){
    let points=0;
    switch(lines.length){ case 1: points=100; break; case 2: points=300; break; case 3: points=500; break; case 4: points=800; break; }
    score+=points; updateScore();
    document.dispatchEvent(new Event("lineClear"));
    spawnParticlesForClearedLines(lines);
  }

  tetromino = getNextTetromino();
  drawNextPieces();
}

// 게임오버
function showGameOver(){
  cancelAnimationFrame(rAF);
  gameOver=true;
  document.getElementById('final-score').textContent = score;
  let hs = localStorage.getItem("highestScore") || 0;
  if (score > hs){ hs=score; localStorage.setItem("highestScore", hs); }
  document.getElementById('highest-score').textContent = hs;
  document.getElementById('game-over-screen').style.display='flex';
  document.dispatchEvent(new Event("gameOver"));
}

// 루프
function loop(){
  if (gameOver || isPaused) return;
  rAF = requestAnimationFrame(loop);

  context.clearRect(0,0,canvas.width,canvas.height);

  // 기존 블럭
  for (let row=0; row<20; row++){
    for (let col=0; col<10; col++){
      const v = playfield[row][col]; if (!v) continue;
      context.fillStyle = colors[v];
      context.fillRect(col*grid, row*grid, grid-1, grid-1);
    }
  }

  updateParticles(); drawParticles(context);

  if (tetromino){
    // 낙하
    if (++count > getDropSpeed()){
      tetromino.row++; count=0;
      if (!isValidMove(tetromino.matrix, tetromino.row, tetromino.col)){
        tetromino.row--;
        if (!isLocked){ lastDropTime=Date.now(); isLocked=true; }
      } else isLocked=false;
    }

    if (isLocked && Date.now()-lastDropTime > lockDelay) placeTetromino();

    // 고스트
    const ghostRow = getGhostPosition(tetromino.matrix, tetromino.row, tetromino.col);
    context.fillStyle = colors[tetromino.name]; context.globalAlpha=0.3;
    for (let r=0;r<tetromino.matrix.length;r++){
      for (let c=0;c<tetromino.matrix[r].length;c++){
        if (tetromino.matrix[r][c]) context.fillRect((tetromino.col+c)*grid, (ghostRow+r)*grid, grid-1, grid-1);
      }
    }
    context.globalAlpha=1;

    // 실제 블럭
    context.fillStyle = colors[tetromino.name];
    for (let r=0;r<tetromino.matrix.length;r++){
      for (let c=0;c<tetromino.matrix[r].length;c++){
        if (tetromino.matrix[r][c]) context.fillRect((tetromino.col+c)*grid, (tetromino.row+r)*grid, grid-1, grid-1);
      }
    }
  }
}

// 미리보기
function drawNextPieces(){
  ['next-1','next-2','next-3'].forEach((id,i)=>{
    const c=document.getElementById(id); const ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);
    const name=tetrominoSequence[i]; if (!name) return;
    const m=tetrominos[name]; ctx.fillStyle=colors[name];
    m.forEach((row,r)=>row.forEach((cell,cc)=>{ if(cell) ctx.fillRect(cc*32, r*32, 30, 30); }));
  });
}

// 입력
document.addEventListener('keydown', handleKeyPress);
function handleKeyPress(e){
  if (!isGameStarted || gameOver || isPaused) return;

  switch(e.code){
    case 'ArrowLeft':
      if (isValidMove(tetromino.matrix, tetromino.row, tetromino.col-1)) tetromino.col--;
      break;
    case 'ArrowRight':
      if (isValidMove(tetromino.matrix, tetromino.row, tetromino.col+1)) tetromino.col++;
      break;
    case 'ArrowDown':
      if (isValidMove(tetromino.matrix, tetromino.row+1, tetromino.col)) tetromino.row++;
      break;
    case 'ArrowUp': {
      const r = rotate(tetromino.matrix);
      if (isValidMove(r, tetromino.row, tetromino.col)) tetromino.matrix = r;
      break;
    }
    case 'KeyZ': {
      const ccw = rotateCounterClockwise(tetromino.matrix);
      if (isValidMove(ccw, tetromino.row, tetromino.col)) tetromino.matrix = ccw;
      break;
    }
    case 'Space':
      while (isValidMove(tetromino.matrix, tetromino.row+1, tetromino.col)) tetromino.row++;
      placeTetromino();
      break;
    case 'KeyP':
      isPaused = !isPaused;
      if (!isPaused) rAF = requestAnimationFrame(loop);
      break;
  }
}

// 초기화
function initGame(){
  score = 0; updateScore();
  tetromino = getNextTetromino();
  gameOver = false; isPaused = false;
  particles.length = 0;
  drawNextPieces();
  rAF = requestAnimationFrame(loop);
  document.dispatchEvent(new Event("gameStart"));
}