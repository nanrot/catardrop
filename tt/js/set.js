const settingsButton = document.getElementById('settings-button');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsCloseButton = document.getElementById('settings-close-button');
const volumeSlider = document.getElementById('volume-slider');
const volumeNumber = document.getElementById('volume-number');
const bgmSelect = document.getElementById('bgm-select');
const bgm = document.getElementById('bgm');

// 효과음
let clearSE = new Audio("BGM/clear.mp3");
clearSE.volume = 0.1;

function initSettings() {
  if (bgm) {
    bgm.volume = 0.01;
    bgm.loop = false;
  }

  // 설정 열기 버튼
  settingsButton.addEventListener('click', () => {
    isPaused = true;
    settingsOverlay.style.display = 'flex';
    if (bgm) bgm.pause();
  });

  // 설정 닫기 버튼
  settingsCloseButton.addEventListener('click', () => {
    isPaused = false;
    settingsOverlay.style.display = 'none';
    if (isGameStarted && bgm) bgm.play().catch(() => {});
    rAF = requestAnimationFrame(loop);
  });

  // 볼륨 슬라이더/숫자 입력
  volumeSlider.addEventListener('input', e => updateVolume(e.target.value));
  volumeNumber.addEventListener('input', e => updateVolume(e.target.value));

  // BGM 선택
  bgmSelect.addEventListener('change', e => {
    if (!bgm) return;
    bgm.src = e.target.value;
    bgm.load();
    if (isGameStarted && !isPaused) bgm.play().catch(() => {});
  });

  // BGM 자동 다음 곡 전환
  if (bgm) {
    bgm.addEventListener('ended', () => {
      const opts = Array.from(bgmSelect.options);
      const idx = opts.findIndex(o => o.value === bgmSelect.value);
      const nextIdx = (idx + 1) % opts.length;
      bgmSelect.value = opts[nextIdx].value;
      bgm.src = bgmSelect.value;
      bgm.play().catch(() => {});
    });
  }
}

function updateVolume(value) {
  let v = parseFloat(value);
  if (isNaN(v) || v < 0) v = 0;
  if (v > 1) v = 1;
  if (bgm) bgm.volume = v;
  volumeSlider.value = v;
  volumeNumber.value = v.toFixed(2);
}

// 이벤트 기반 음악/효과음 제어
// 게임 시작 시 BGM 재생
document.addEventListener("gameStart", () => {
  if (bgm) {
    bgm.currentTime = 0;
    bgm.play().catch(() => {});
  }
});

// 라인 클리어 효과음
document.addEventListener("lineClear", () => {
  if (clearSE) {
    clearSE.currentTime = 0;
    clearSE.play().catch(() => {});
  }
});

// 게임 오버 시 BGM 정지
document.addEventListener("gameOver", () => {
  if (bgm) {
    bgm.pause();
  }
});