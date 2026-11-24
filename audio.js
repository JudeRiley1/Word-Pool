// Recorded water and licensed beach music; see assets/audio/CREDITS.txt.
const asset = name => new URL(`./assets/audio/${name}`, import.meta.url).href;
let context, music, musicOn = true, blocked = false, updateButton = () => {};
let effectsLoading, buffers, moveCount = 0;
const activeSplashes = new Set();

function getContext() {
  if (!context) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio) context = new Audio();
  }
  return context;
}

function loadEffects() {
  if (effectsLoading) return effectsLoading;
  const audio = getContext();
  if (!audio) return Promise.resolve(null);
  effectsLoading = Promise.all(['splash-soft.mp3', 'splash-full.mp3'].map(async name => {
    const response = await fetch(asset(name));
    if (!response.ok) throw new Error('Splash unavailable');
    return audio.decodeAudioData(await response.arrayBuffer());
  })).then(result => (buffers = result)).catch(() => { effectsLoading = null; return null; });
  return effectsLoading;
}

function startMusic() {
  if (!music || !musicOn || document.hidden) return;
  // Call play directly inside gestures, without awaiting network or decoding.
  // Browsers that permit autoplay start on load; others retry on the first tap.
  music.play().then(() => {
    blocked = false;
    if (!musicOn || document.hidden) music.pause();
    updateButton();
  }).catch(error => {
    if (error.name === 'NotAllowedError') blocked = true;
    updateButton();
  });
}

function unlock() {
  try {
    const audio = getContext();
    if (audio && audio.state !== 'running') void audio.resume().catch(() => {});
    void loadEffects();
    startMusic();
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
  if (!enabled || document.hidden) return;
  const requestedAt = performance.now();
  unlock();
  const play = sounds => {
    if (!sounds || document.hidden || context?.state !== 'running' || performance.now() - requestedAt > 500) return;
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
  if (buffers) play(buffers); else void loadEffects().then(play);
}

export function installAudio() {
  const button = document.getElementById('music-toggle');
  try { musicOn = localStorage.getItem('word-pool:music') !== 'off'; } catch { /* Defaults on. */ }
  music = new Audio(asset('beachfront-celebration.mp3'));
  music.id = 'pool-music'; music.hidden = true; music.setAttribute('aria-hidden', 'true');
  music.preload = 'auto'; music.loop = true; music.autoplay = musicOn;
  // The file itself is mixed quietly, including on iPhones that ignore volume.
  music.volume = 1; document.body.append(music);
  updateButton = () => {
    const playing = musicOn && !blocked;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? 'Mute background music' : 'Play background music');
    button.title = blocked && musicOn ? 'Tap to start music' : musicOn ? 'Music on' : 'Music off';
  };
  updateButton();
  button.addEventListener('click', () => {
    if (blocked && musicOn) { unlock(); return; }
    musicOn = !musicOn; blocked = false;
    try { localStorage.setItem('word-pool:music', musicOn ? 'on' : 'off'); } catch { /* Keep session preference. */ }
    if (musicOn) unlock(); else music.pause();
    updateButton();
  });
  const gesture = event => { if (!event.target.closest?.('#music-toggle')) unlock(); };
  document.addEventListener('pointerdown', gesture, { passive: true });
  document.addEventListener('touchend', gesture, { passive: true });
  document.addEventListener('click', gesture);
  document.addEventListener('keydown', gesture);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      music.pause();
      for (const source of activeSplashes) { try { source.stop(); } catch { /* Already stopped. */ } }
      if (context) void context.suspend().catch(() => {});
    } else unlock();
  });
  window.addEventListener('pagehide', () => music.pause());
  window.addEventListener('pageshow', startMusic);
  void loadEffects();
  startMusic();
}
