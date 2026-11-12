const svgNS = "http://www.w3.org/2000/svg";
const ticksG = document.getElementById('ticks');
const numsG = document.getElementById('numbers');
const cx = 100, cy = 100, r = 96;

for (let i = 0; i < 60; i++) {
  const angle = (i * 6) * Math.PI / 180;
  const isMajor = i % 5 === 0;
  const rOuter = r - 2;
  const rInner = isMajor ? r - 13 : r - 6;
  const x1 = cx + rOuter * Math.sin(angle);
  const y1 = cy - rOuter * Math.cos(angle);
  const x2 = cx + rInner * Math.sin(angle);
  const y2 = cy - rInner * Math.cos(angle);
  const line = document.createElementNS(svgNS, 'line');
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  line.setAttribute('class', isMajor ? 'tick-major' : 'tick-minor');
  ticksG.appendChild(line);
}

for (let n = 1; n <= 12; n++) {
  const angle = (n * 30) * Math.PI / 180;
  const rNum = r - 23;
  const x = cx + rNum * Math.sin(angle);
  const y = cy - rNum * Math.cos(angle);
  const text = document.createElementNS(svgNS, 'text');
  text.setAttribute('x', x);
  text.setAttribute('y', y);
  text.setAttribute('class', 'num');
  text.textContent = String(n);
  numsG.appendChild(text);
}

const faceEl = document.getElementById('face');
const pinEl = document.getElementById('pin');
const hourHand = document.getElementById('hourHand');
const minHand = document.getElementById('minHand');
const secHand = document.getElementById('secHand');
const clockEl = document.getElementById('clock');
const startInput = document.getElementById('startInput');
const endInput = document.getElementById('endInput');
const actionBtn = document.getElementById('actionBtn');
const soundToggle = document.getElementById('soundToggle');
const testSoundBtn = document.getElementById('testSoundBtn');
const periodBtns = Array.from(document.querySelectorAll('.period-btn'));
const numTexts = numsG.querySelectorAll('text');

function pad(n) { return String(n).padStart(2, '0'); }

const nowDefault = new Date();
startInput.value = `${pad(nowDefault.getHours())}:${pad(nowDefault.getMinutes())}`;
const endDefault = new Date(nowDefault.getTime() + 60 * 60 * 1000);
endInput.value = `${pad(endDefault.getHours())}:${pad(endDefault.getMinutes())}`;

// ---- audio (separate mp3 files under audio/) ----
const AUDIO_DATA = {
  p1_warn:   "audio/p1_warn.mp3",
  p1_end:    "audio/p1_end.mp3",
  p2_warn:   "audio/p2_warn.mp3",
  p2_end:    "audio/p2_end.mp3",
  p3_warn:   "audio/p3_warn.mp3",
  p3_end:    "audio/p3_end.mp3",
  p4h_warn:  "audio/p4h_warn.mp3",
  p4h_end:   "audio/p4h_end.mp3",
  p4e1_warn: "audio/p4e1_warn.mp3",
  p4e1_end:  "audio/p4e1_end.mp3",
  p4e2_warn: "audio/p4e2_warn.mp3",
  p4e2_end:  "audio/p4e2_end.mp3"
};
const audioEls = {};
Object.keys(AUDIO_DATA).forEach(k => {
  const a = new Audio(AUDIO_DATA[k]);
  a.preload = 'auto';
  audioEls[k] = a;
});

const PERIOD_CONFIG = {
  p1:   { warnThreshold: 15, warnOffset: 10, warnAudio: audioEls.p1_warn,   endAudio: audioEls.p1_end },
  p2:   { warnThreshold: 15, warnOffset: 10, warnAudio: audioEls.p2_warn,   endAudio: audioEls.p2_end },
  p3:   { warnThreshold: 15, warnOffset: 10, warnAudio: audioEls.p3_warn,   endAudio: audioEls.p3_end },
  p4h:  { warnThreshold: 10, warnOffset: 5,  warnAudio: audioEls.p4h_warn,  endAudio: audioEls.p4h_end },
  p4e1: { warnThreshold: 10, warnOffset: 5,  warnAudio: audioEls.p4e1_warn, endAudio: audioEls.p4e1_end },
  p4e2: { warnThreshold: 10, warnOffset: 5,  warnAudio: audioEls.p4e2_warn, endAudio: audioEls.p4e2_end }
};

// 수능 시간표 (사이드바 표와 동일)
const PERIOD_TIMES = {
  p1:   { start: '08:40', end: '10:00' },
  p2:   { start: '10:30', end: '12:10' },
  p3:   { start: '13:10', end: '14:20' },
  p4h:  { start: '14:50', end: '15:20' },
  p4e1: { start: '15:35', end: '16:05' },
  p4e2: { start: '16:07', end: '16:37' }
};

// ---- 영어 듣기 mp3 (기기에서 고른 파일을 지정 시각에 재생) ----
const listeningRow = document.getElementById('listeningRow');
const listeningFile = document.getElementById('listeningFile');
const listeningName = document.getElementById('listeningName');
const listeningTime = document.getElementById('listeningTime');
const listeningTestBtn = document.getElementById('listeningTestBtn');
const listeningAudio = new Audio();
listeningAudio.preload = 'auto';
let listeningUrl = null;
let listeningPlayed = false;

listeningFile.addEventListener('change', () => {
  const f = listeningFile.files && listeningFile.files[0];
  if (!f) return;
  if (listeningUrl) URL.revokeObjectURL(listeningUrl);
  listeningUrl = URL.createObjectURL(f);
  listeningAudio.src = listeningUrl;
  listeningName.textContent = f.name;
});

listeningTestBtn.addEventListener('click', () => {
  if (!listeningUrl) return;
  if (listeningAudio.paused) {
    listeningAudio.currentTime = 0;
    listeningAudio.play().catch(() => {});
  } else {
    listeningAudio.pause();
  }
});

function stopListening() {
  listeningAudio.pause();
  try { listeningAudio.currentTime = 0; } catch (e) {}
}

let soundOn = false;
let selectedPeriod = null;

soundToggle.addEventListener('change', () => {
  soundOn = soundToggle.checked;
});

testSoundBtn.addEventListener('click', () => {
  playSound(audioEls.p1_warn);
});

periodBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    periodBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedPeriod = btn.dataset.period;
    listeningRow.hidden = selectedPeriod !== 'p3';

    // 소리가 켜져 있든 꺼져 있든, 교시 버튼을 누르면 시험 시각표에 맞춰
    // 시작/종료 시각을 바꿔준다. 이후에도 직접 수정 가능하다.
    const times = PERIOD_TIMES[selectedPeriod];
    if (times && !running) {
      startInput.value = times.start;
      endInput.value = times.end;
      renderStatic();
    }
  });
});

function unlockAudio() {
  Object.values(audioEls).forEach(a => {
    const wasMuted = a.muted;
    a.muted = true;
    const p = a.play();
    if (p && p.then) {
      p.then(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = wasMuted;
      }).catch(() => { a.muted = wasMuted; });
    } else {
      a.muted = wasMuted;
    }
  });
}

function playSound(a) {
  if (!a) return;
  try {
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch (e) {}
}

// ---- screen wake lock (keeps the display from sleeping while running) ----
let wakeLock = null;

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) {
    // ignored: e.g. low battery or not allowed - clock still works, screen just may sleep
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

// iOS/Android release the lock when the tab is backgrounded; re-acquire it
// automatically when the user comes back while the clock is still running.
document.addEventListener('visibilitychange', () => {
  if (running && document.visibilityState === 'visible' && !wakeLock) {
    requestWakeLock();
  }
});

// ---- alarm (wild color) state ----
let alarmOn = false;
let colorTimer = null;
let hue = 0;

function enterAlarm() {
  if (alarmOn) return;
  alarmOn = true;
  clockEl.classList.add('alarm');
  colorTimer = setInterval(() => {
    hue = (hue + 12) % 360;
    faceEl.style.fill = `hsl(${hue}, 92%, 88%)`;
    faceEl.style.stroke = `hsl(${(hue + 180) % 360}, 90%, 38%)`;
    hourHand.style.stroke = `hsl(${(hue + 240) % 360}, 100%, 42%)`;
    minHand.style.stroke = `hsl(${(hue + 120) % 360}, 100%, 45%)`;
    secHand.style.stroke = `hsl(${(hue + 60) % 360}, 100%, 50%)`;
    pinEl.style.fill = `hsl(${(hue + 300) % 360}, 100%, 38%)`;
    numTexts.forEach((t, idx) => {
      t.style.fill = `hsl(${(hue + idx * 20) % 360}, 100%, 42%)`;
    });
    clockEl.style.filter =
      `drop-shadow(0 0 18px hsl(${hue},100%,55%)) drop-shadow(0 0 38px hsl(${(hue + 180) % 360},100%,55%))`;
  }, 80);
}

function exitAlarm() {
  if (!alarmOn) return;
  alarmOn = false;
  clockEl.classList.remove('alarm');
  clearInterval(colorTimer);
  faceEl.style.fill = '';
  faceEl.style.stroke = '';
  hourHand.style.stroke = '';
  minHand.style.stroke = '';
  secHand.style.stroke = '';
  pinEl.style.fill = '';
  numTexts.forEach(t => t.style.fill = '');
  clockEl.style.filter = '';
}

function setHands(h, m, s) {
  const secAngle = s * 6;
  const minAngle = m * 6 + s * 0.1;
  const hourAngle = (h % 12) * 30 + m * 0.5;
  hourHand.setAttribute('transform', `rotate(${hourAngle} ${cx} ${cy})`);
  minHand.setAttribute('transform', `rotate(${minAngle} ${cx} ${cy})`);
  secHand.setAttribute('transform', `rotate(${secAngle} ${cx} ${cy})`);
}

function renderStatic() {
  if (!startInput.value) { setHands(0, 0, 0); return; }
  const [h, m] = startInput.value.split(':').map(Number);
  setHands(h, m, 0);
}

function parseTimeToday(value) {
  const [h, m] = value.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

let running = false;
let virtualStartMs = 0;
let virtualEndMs = 0;
let realStartTimestamp = 0;
let warnPlayed = false;

function startClock() {
  if (!startInput.value || !endInput.value) return;
  virtualStartMs = parseTimeToday(startInput.value);
  let endMs = parseTimeToday(endInput.value);
  if (endMs <= virtualStartMs) endMs += 24 * 60 * 60 * 1000;
  virtualEndMs = endMs;
  realStartTimestamp = Date.now();
  running = true;
  warnPlayed = false;
  // 시작 시점에 이미 듣기 시각이 지났으면 재생하지 않음
  listeningPlayed = !!listeningTime.value && parseTimeToday(listeningTime.value) <= virtualStartMs;
  startInput.disabled = true;
  endInput.disabled = true;
  soundToggle.disabled = true;
  testSoundBtn.disabled = true;
  periodBtns.forEach(b => b.disabled = true);
  actionBtn.textContent = '초기화';
  document.body.classList.add('running');
  if (soundOn) unlockAudio();
  if (selectedPeriod === 'p3' && listeningUrl) {
    // 사용자 클릭 시점에 오디오를 한 번 풀어둬야 나중에 자동 재생이 막히지 않음
    listeningAudio.muted = true;
    const p = listeningAudio.play();
    const restore = () => { listeningAudio.pause(); listeningAudio.currentTime = 0; listeningAudio.muted = false; };
    if (p && p.then) p.then(restore).catch(() => { listeningAudio.muted = false; });
    else restore();
  }
  requestWakeLock();
}

function resetClock() {
  running = false;
  stopListening();
  exitAlarm();
  startInput.disabled = false;
  endInput.disabled = false;
  soundToggle.disabled = false;
  testSoundBtn.disabled = false;
  periodBtns.forEach(b => b.disabled = false);
  actionBtn.textContent = '시작';
  document.body.classList.remove('running');
  renderStatic();
  releaseWakeLock();
}

actionBtn.addEventListener('click', () => {
  if (running) resetClock();
  else startClock();
});

startInput.addEventListener('input', () => {
  if (!running) renderStatic();
});

function tick() {
  if (!running) return;
  const virtualMs = virtualStartMs + (Date.now() - realStartTimestamp);
  const vd = new Date(virtualMs);
  setHands(vd.getHours(), vd.getMinutes(), vd.getSeconds());

  if (soundOn && selectedPeriod) {
    const cfg = PERIOD_CONFIG[selectedPeriod];
    const durationMin = (virtualEndMs - virtualStartMs) / 60000;
    if (!warnPlayed && durationMin >= cfg.warnThreshold) {
      const warnTriggerMs = virtualEndMs - cfg.warnOffset * 60000;
      if (virtualMs >= warnTriggerMs) {
        playSound(cfg.warnAudio);
        warnPlayed = true;
      }
    }
  }

  if (selectedPeriod === 'p3' && listeningUrl && !listeningPlayed && listeningTime.value
      && virtualMs >= parseTimeToday(listeningTime.value)) {
    listeningPlayed = true;
    listeningAudio.currentTime = 0;
    listeningAudio.play().catch(() => {});
  }

  if (virtualMs >= virtualEndMs) {
    if (!alarmOn && soundOn && selectedPeriod) {
      playSound(PERIOD_CONFIG[selectedPeriod].endAudio);
    }
    enterAlarm();
  }
}

renderStatic();
setInterval(tick, 250);
