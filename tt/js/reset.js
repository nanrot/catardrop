const canvas = document.getElementById('game');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

let score = 0;
let isPaused = false;
let isGameStarted = false;
let gameOver = false;
let rAF = null;

window.addEventListener('DOMContentLoaded', () => {
  if (typeof initDifficulty === 'function') {
    initDifficulty();
  } else {
    console.error('[reset.js] initDifficulty()가 없습니다. diffi.js 로드 순서를 확인하세요.');
  }

  if (typeof initSettings === 'function') {
    initSettings();
  } else {
    console.error('[reset.js] initSettings()가 없습니다. set.js 로드 순서를 확인하세요.');
  }
});

function resetGameState() {
  score = 0; isPaused = false; isGameStarted = false; gameOver = false; rAF = null;
  if (scoreElement) scoreElement.textContent = '0';
  if (context && canvas) context.clearRect(0,0,canvas.width,canvas.height);
  console.log('[reset.js] 게임 상태 리셋 완료');
}