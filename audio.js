// Original poolside loop and water effects, synthesized locally with no downloads.
let context, musicBus, timer, noise, unlocked = false;
let musicOn = true, nextBeat = 0, step = 0;
const voices = new Set();
const eighth = 60 / 84 / 2;
const melody = [
  78,null,81,78,null,76,74,null, 73,null,76,78,null,81,76,null,
  78,null,74,73,null,71,74,null, 78,null,81,78,76,null,74,null,
  74,null,78,81,null,83,81,null, 78,null,76,74,null,71,74,null,
  76,null,73,76,81,null,78,null, 76,null,73,null,69,null,null,null
];
const chords = [[50,57,61,66],[47,54,57,62],[43,50,54,59],[45,52,57,61]];
const hz = note => 440 * 2 ** ((note - 69) / 12);

function getContext() {
  if (!context) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    context = new Audio();
    musicBus = context.createGain(); musicBus.gain.value = musicOn ? .18 : 0;
    musicBus.connect(context.destination);
    noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  }
  return context;
}

function track(source, music, cleanup) {
  if (music) voices.add(source);
  source.onended = () => { voices.delete(source); source.disconnect(); cleanup(); };
}

function note(midi, time, length, volume, bus, music = false, type = 'sine') {
  const oscillator = context.createOscillator(), gain = context.createGain();
  oscillator.type = type; oscillator.frequency.value = hz(midi);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(volume, time + .012);
  gain.gain.exponentialRampToValueAtTime(.0001, time + length);
  oscillator.connect(gain); gain.connect(bus);
  track(oscillator, music, () => gain.disconnect());
  oscillator.start(time); oscillator.stop(time + length + .02);
}

function water(time, length, volume, bus, music = false, frequency = 1100) {
  const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
  source.buffer = noise; filter.type = 'bandpass'; filter.Q.value = .6;
  filter.frequency.setValueAtTime(frequency, time);
  filter.frequency.exponentialRampToValueAtTime(frequency * .35, time + length);
  gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(volume, time + .018);
  gain.gain.exponentialRampToValueAtTime(.0001, time + length);
  source.connect(filter); filter.connect(gain); gain.connect(bus);
  track(source, music, () => { filter.disconnect(); gain.disconnect(); });
  source.start(time, Math.random() * .4); source.stop(time + length + .02);
}

function schedule() {
  if (!musicOn || context?.state !== 'running' || document.hidden) return;
  while (nextBeat < context.currentTime + .18) {
    const chord = chords[Math.floor(step / 16)], beat = step % 8;
    if (beat === 0 || beat === 4) note(chord[0] - 12, nextBeat, .8, .15, musicBus, true);
    if (beat === 0 || beat === 3 || beat === 6) {
      chord.slice(1).forEach((pitch, i) => note(pitch + 12, nextBeat + i * .015, .65, .045, musicBus, true, 'triangle'));
    }
    if (melody[step] !== null) {
      note(melody[step], nextBeat, .72, .13, musicBus, true);
      note(melody[step] + 12, nextBeat, .22, .018, musicBus, true);
    }
    water(nextBeat, .06, beat % 2 ? .026 : .014, musicBus, true, 6500);
    nextBeat += eighth; step = (step + 1) % melody.length;
  }
}

function stopMusic() {
  clearInterval(timer); timer = null;
  for (const voice of voices) { try { voice.stop(); } catch { /* Already ended. */ } }
  voices.clear();
}

function startMusic() {
  if (timer || !musicOn || !unlocked || document.hidden || context?.state !== 'running') return;
  nextBeat = context.currentTime + .06; step = 0;
  schedule(); timer = setInterval(schedule, 100);
}

async function unlock() {
  try {
    const audio = getContext(); if (!audio) return;
    await audio.resume(); unlocked = audio.state === 'running'; startMusic();
  } catch { /* Retry on the next gesture if the browser blocks playback. */ }
}

export function playSound(enabled, kind = 'move') {
  if (!enabled || document.hidden) return;
  try {
    const audio = getContext(); if (!audio) return;
    void unlock();
    const time = audio.currentTime + .015, win = kind === true || kind === 'win';
    water(time, win ? .65 : .3, win ? .23 : .16, audio.destination);
    // Small falling bubbles give the noise a recognizable watery finish.
    for (let i = 0; i < (win ? 5 : 2); i++) {
      const oscillator = audio.createOscillator(), gain = audio.createGain(), at = time + .04 + i * .065;
      oscillator.frequency.setValueAtTime(650 + i * 95, at);
      oscillator.frequency.exponentialRampToValueAtTime(180 + i * 35, at + .1);
      gain.gain.setValueAtTime(.025, at); gain.gain.exponentialRampToValueAtTime(.0001, at + .13);
      oscillator.connect(gain); gain.connect(audio.destination);
      track(oscillator, false, () => gain.disconnect()); oscillator.start(at); oscillator.stop(at + .14);
    }
    if (win) [74,78,81,86].forEach((pitch, i) => note(pitch, time + .15 + i * .12, .65, .045, audio.destination));
    if (kind === 'lost') [66,62].forEach((pitch, i) => note(pitch, time + .1 + i * .18, .5, .025, audio.destination));
  } catch { /* Audio remains optional on unsupported browsers. */ }
}

export function installAudio() {
  const button = document.getElementById('music-toggle');
  try { musicOn = localStorage.getItem('word-pool:music') !== 'off'; } catch { /* Defaults on. */ }
  const update = () => {
    button.setAttribute('aria-pressed', String(musicOn));
    button.setAttribute('aria-label', musicOn ? 'Mute background music' : 'Play background music');
    button.title = musicOn ? 'Music on' : 'Music off';
  };
  update();
  button.addEventListener('click', () => {
    musicOn = !musicOn;
    try { localStorage.setItem('word-pool:music', musicOn ? 'on' : 'off'); } catch { /* Session preference still works. */ }
    if (musicBus) musicBus.gain.setTargetAtTime(musicOn ? .18 : 0, context.currentTime, .05);
    if (musicOn) void unlock(); else stopMusic();
    update();
  });
  const gesture = event => { if (!event.target.closest?.('#music-toggle')) void unlock(); };
  document.addEventListener('pointerdown', gesture, { passive: true });
  document.addEventListener('keydown', gesture);
  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    if (document.hidden) { stopMusic(); void context.suspend().catch(() => {}); }
    else if (unlocked) void unlock();
  });
}
