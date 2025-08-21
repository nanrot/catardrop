window.difficulties = { Easy: 40, Normal: 30, Hard: 20, Lunatic: 10 };
window.currentDifficulty = 'Normal';
window.dropSpeed = window.difficulties[window.currentDifficulty];

// 난이도 UI 초기화
function initDifficulty() {
  const options = document.querySelectorAll('.difficulty-option');
  const buttons = document.querySelectorAll('.difficulty-option button, [data-diff]');

  // hover 시 강조
  buttons.forEach(btn => {
    btn.addEventListener('mouseover', () => {
      options.forEach(opt => opt.classList.remove('active'));
      btn.closest('.difficulty-option')?.classList.add('active');
    });
  });

  // 클릭 시 시작
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault(); // 폼 submit 등 기본동작 차단
      const diff = (btn.dataset.diff || btn.textContent || '').trim();
      startGame(diff);
    });
  });
}

// 난이도 선택 후 시작
function startGame(difficulty) {
  if (window.difficulties[difficulty]) {
    window.currentDifficulty = difficulty;
    window.dropSpeed = window.difficulties[window.currentDifficulty];
  }

  // 화면 전환
  const title = document.getElementById('title-screen');
  const ui = document.getElementById('game-ui');
  if (title) title.style.display = 'none';
  if (ui) ui.style.display = 'block';

  // 전역 시작 플래그
  if (typeof isGameStarted !== 'undefined') isGameStarted = true;

  // 실제 게임 시작
  if (typeof initGame === 'function') {
    initGame();
  } else {
    // 로드 순서 문제 대비: 다음 틱에 한 번 더 시도
    setTimeout(() => {
      if (typeof initGame === 'function') initGame();
      else console.error('[diffi.js] initGame()을 찾을 수 없습니다. game.js 로드 순서를 확인하세요.');
    }, 0);
  }
}

// 전역 노출 (인라인 onclick 호환)
window.startGame = startGame;
window.initDifficulty = initDifficulty;