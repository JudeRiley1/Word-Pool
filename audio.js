// Water effects and licensed beach music; see assets/audio/CREDITS.txt.
const asset = name => new URL(`./assets/audio/${name}`, import.meta.url).href;
let context, music, soundOn = true, updateButton = () => {};
let effectsLoading, buffers, moveCount = 0, playbackVersion = 0;
const activeSplashes = new Set();

function stopEffects() {
  // Invalidate pending decodes as well as active and scheduled splashes.
  playbackVersion++;
  for (const source of activeSplashes) { try { source.stop(); } catch { /* Already stopped. */ } }
  activeSplashes.clear();
}

function getContext() {
  if (!context) {
    // Keep effects in the same playback session as music on supported phones.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* Optional API. */ }
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio) context = new Audio();
  }
  return context;
}

function loadEffects() {
  if (effectsLoading) return effectsLoading;
  const audio = getContext();
  if (!audio) return Promise.resolve(null);
  effectsLoading = Promise.all(['water-plop.mp3', 'water-splash.mp3'].map(async name => {
    const response = await fetch(asset(name));
    if (!response.ok) throw new Error('Splash unavailable');
    return audio.decodeAudioData(await response.arrayBuffer());
  })).then(result => (buffers = result)).catch(() => { effectsLoading = null; return null; });
  return effectsLoading;
}

function startMusic() {
  if (!music || !soundOn || document.hidden) return;
  // Call play directly inside gestures, without awaiting network or decoding.
  // Browsers that permit autoplay start on load; others retry on the first tap.
  music.play().then(() => {
    if (!soundOn || document.hidden) music.pause();
  }).catch(() => { /* Retry on the next gesture if autoplay is blocked. */ });
}

function unlock() {
  if (!soundOn || document.hidden) return;
  try {
    const audio = getContext();
    const resumed = audio && audio.state !== 'running' ? audio.resume().catch(() => {}) : undefined;
    void loadEffects();
    startMusic();
    return resumed;
  } catch { /* Gameplay still works when audio is unavailable. */ }
}

function splash(buffer, volume, rate, delay = 0) {
  const source = context.createBufferSource(), gain = context.createGain();
  source.buffer = buffer; source.playbackRate.value = rate; gain.gain.value = volume;
  source.connect(gain); gain.connect(context.destination); activeSplashes.add(source);
  source.onended = () => { activeSplashes.delete(source); source.disconnect(); gain.disconnect(); };
  source.start(context.currentTime + delay);
}

export function playSound(enabled, kind = 'move') {
  if (!enabled || !soundOn || document.hidden) return;
  const requestedAt = performance.now();
  const version = playbackVersion;
  const resumed = unlock();
  const play = sounds => {
    if (!sounds || !soundOn || version !== playbackVersion || document.hidden || context?.state !== 'running' || performance.now() - requestedAt > 500) return;
    try {
      if (kind === true || kind === 'win') {
        splash(sounds[1], .8, 1);
        splash(sounds[0], .45, 1.12, .18);
      } else if (kind === 'check' || kind === 'lost') {
        splash(sounds[1], .42, .96);
      } else {
        const rates = [1, 1.06, .97];
        splash(sounds[0], .68, rates[moveCount++ % rates.length]);
      }
    } catch { /* Optional audio must never interrupt a move. */ }
  };
  if (buffers && context?.state === 'running') play(buffers);
  else void Promise.all([resumed, loadEffects()]).then(([, sounds]) => play(sounds));
}

export function installAudio() {
  const button = document.getElementById('music-toggle');
  try {
    // Carry the existing music mute preference over to the unified control.
    soundOn = (localStorage.getItem('word-pool:sound') ?? localStorage.getItem('word-pool:music')) !== 'off';
  } catch { /* Defaults on. */ }
  music = new Audio(asset('beachfront-celebration.mp3'));
  music.id = 'pool-music'; music.hidden = true; music.setAttribute('aria-hidden', 'true');
  music.preload = 'auto'; music.loop = true; music.autoplay = soundOn; music.muted = !soundOn;
  // The file itself is mixed quietly, including on iPhones that ignore volume.
  music.volume = 1; document.body.append(music);
  updateButton = () => {
    button.setAttribute('aria-pressed', String(soundOn));
    button.setAttribute('aria-label', soundOn ? 'Mute all sound' : 'Unmute all sound');
    button.title = soundOn ? 'Sound on' : 'Sound off';
  };
  updateButton();
  const toggleSound = () => {
    soundOn = !soundOn;
    music.muted = !soundOn;
    try { localStorage.setItem('word-pool:sound', soundOn ? 'on' : 'off'); } catch { /* Keep session preference. */ }
    if (soundOn) unlock(); else { music.pause(); stopEffects(); }
    updateButton();
  };
  let touchToggleAt = -Infinity;
  button.addEventListener('pointerup', event => {
    if (!['touch', 'pen'].includes(event.pointerType) || !event.isPrimary || event.button !== 0) return;
    touchToggleAt = performance.now();
    toggleSound();
  });
  button.addEventListener('click', event => {
    // A touch can also synthesize a click. Keyboard/assistive clicks still work.
    if (event.detail !== 0 && performance.now() - touchToggleAt < 750) return;
    toggleSound();
  });
  const gesture = event => { if (!event.target.closest?.('#music-toggle')) unlock(); };
  // Touch activation can arrive on release, and dragging suppresses clicks.
  // Capture the release before the board handles a drop or stops propagation.
  for (const event of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
    document.addEventListener(event, gesture, { passive: true, capture: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      music.pause();
      stopEffects();
      if (context) void context.suspend().catch(() => {});
    } else unlock();
  });
  window.addEventListener('pagehide', () => { music.pause(); stopEffects(); });
  window.addEventListener('pageshow', startMusic);
  void loadEffects();
  startMusic();
}
