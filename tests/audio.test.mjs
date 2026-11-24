import test from 'node:test';
import assert from 'node:assert/strict';

const flush = () => new Promise(resolve => setImmediate(resolve));
let moduleId = 0;

async function setup(t, { saved = {}, deferredDecode = false, deferredResume = false, blocked = false, storageFails = false } = {}) {
  const sources = [], decodes = [], resumes = [], media = [], contexts = [];
  const storage = new Map(Object.entries(saved));
  const button = new EventTarget();
  button.attributes = {};
  button.setAttribute = (name, value) => { button.attributes[name] = value; };
  const document = new EventTarget();
  document.hidden = false;
  document.getElementById = () => button;
  document.body = { append() {} };
  class FakeAudio {
    constructor() { this.paused = true; this.plays = 0; media.push(this); }
    setAttribute() {}
    play() {
      this.plays++;
      if (blocked) return Promise.reject(Object.assign(new Error('Autoplay blocked'), { name: 'NotAllowedError' }));
      this.paused = false;
      return Promise.resolve();
    }
    pause() { this.paused = true; }
  }
  class FakeContext {
    constructor() { this.state = deferredResume ? 'suspended' : 'running'; this.currentTime = 0; contexts.push(this); }
    resume() {
      if (deferredResume) return new Promise(resolve => resumes.push(() => { this.state = 'running'; resolve(); }));
      this.state = 'running'; return Promise.resolve();
    }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    decodeAudioData() {
      return deferredDecode ? new Promise(resolve => decodes.push(() => resolve({}))) : Promise.resolve({});
    }
    createGain() { return { gain: {}, connect() {}, disconnect() {} }; }
    createBufferSource() {
      const source = {
        playbackRate: {}, stopped: false,
        connect() {}, disconnect() {},
        start(time) { this.time = time; sources.push(this); },
        stop() { this.stopped = true; this.onended?.(); }
      };
      return source;
    }
  }
  const window = Object.assign(new EventTarget(), { AudioContext: FakeContext });
  const replacements = {
    window, document, Audio: FakeAudio,
    localStorage: {
      getItem(key) { if (storageFails) throw new Error('Unavailable'); return storage.get(key) ?? null; },
      setItem(key, value) { if (storageFails) throw new Error('Unavailable'); storage.set(key, value); }
    },
    fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) })
  };
  const originals = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  t.after(() => {
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const audio = await import(`../audio.js?test=${moduleId++}`);
  audio.installAudio();
  await flush();
  return {
    ...audio, button, document, window, sources, storage, media: media[0], contexts,
    toggle: () => button.dispatchEvent(new Event('click')),
    finishDecode: async () => { decodes.forEach(resolve => resolve()); await flush(); },
    finishResume: async () => { resumes.splice(0).forEach(resolve => resolve()); await flush(); }
  };
}

test('mute immediately stops music, active and scheduled effects, and future game/tutorial effects', async t => {
  const audio = await setup(t);
  audio.playSound(true, 'win');
  assert.equal(audio.sources.length, 2);
  assert.ok(audio.sources[1].time > audio.sources[0].time, 'Win includes a scheduled second sound');
  audio.toggle();
  assert.ok(audio.media.paused && audio.media.muted);
  assert.ok(audio.sources.every(source => source.stopped));
  assert.equal(audio.storage.get('word-pool:sound'), 'off');
  assert.equal(audio.button.attributes['aria-label'], 'Unmute all sound');
  for (const kind of ['move', 'check', 'lost', 'win', true]) audio.playSound(true, kind);
  audio.document.dispatchEvent(new Event('pointerdown'));
  audio.document.dispatchEvent(new Event('keydown'));
  await flush();
  assert.equal(audio.sources.length, 2);
  assert.ok(audio.media.paused);
  audio.toggle();
  audio.playSound(true);
  await flush();
  assert.equal(audio.sources.length, 3);
  assert.ok(!audio.media.paused && !audio.media.muted);
  assert.equal(audio.storage.get('word-pool:sound'), 'on');
  assert.equal(audio.button.attributes['aria-label'], 'Mute all sound');
});

test('muting invalidates pending decodes even if sound is turned back on before loading finishes', async t => {
  const audio = await setup(t, { deferredDecode: true });
  audio.playSound(true, 'win');
  audio.toggle();
  audio.toggle();
  await audio.finishDecode();
  assert.equal(audio.sources.length, 0, 'No stale sounds after unmuting');
  audio.playSound(true);
  assert.equal(audio.sources.length, 1, 'Fresh actions still play');
});

test('a tile drop waits for mobile audio to resume instead of discarding its sound', async t => {
  const audio = await setup(t, { deferredResume: true });
  audio.playSound(true);
  assert.equal(audio.sources.length, 0);
  await audio.finishResume();
  assert.equal(audio.sources.length, 1, 'The first drop plays after audio unlocks');
  audio.contexts[0].state = 'interrupted';
  audio.playSound(true);
  await audio.finishResume();
  assert.equal(audio.sources.length, 2, 'Audio recovers after a phone interruption');
});

test('muting while mobile audio is resuming cancels the pending drop sound', async t => {
  const audio = await setup(t, { deferredResume: true });
  audio.playSound(true);
  audio.toggle();
  await audio.finishResume();
  assert.equal(audio.sources.length, 0);
  assert.ok(audio.media.paused && audio.media.muted);
});

test('saved mute remains silent through interactions, visibility changes and page restoration', async t => {
  const audio = await setup(t, { saved: { 'word-pool:sound': 'off' } });
  assert.equal(audio.media.autoplay, false);
  assert.equal(audio.media.plays, 0);
  audio.playSound(true);
  audio.document.hidden = true;
  audio.document.dispatchEvent(new Event('visibilitychange'));
  audio.document.hidden = false;
  audio.document.dispatchEvent(new Event('visibilitychange'));
  audio.window.dispatchEvent(new Event('pageshow'));
  audio.document.dispatchEvent(new Event('click'));
  await flush();
  assert.equal(audio.media.plays, 0);
  assert.equal(audio.sources.length, 0);
  assert.equal(audio.button.attributes['aria-pressed'], 'false');
});

test('legacy music mute migrates to all audio', async t => {
  const audio = await setup(t, { saved: { 'word-pool:music': 'off' } });
  audio.playSound(true);
  assert.equal(audio.media.plays, 0);
  assert.equal(audio.sources.length, 0);
  audio.toggle();
  assert.equal(audio.storage.get('word-pool:sound'), 'on');
});

test('new sound preference takes precedence over the old music setting', async t => {
  const audio = await setup(t, { saved: { 'word-pool:music': 'off', 'word-pool:sound': 'on' } });
  audio.playSound(true);
  assert.ok(audio.media.plays > 0);
  assert.equal(audio.sources.length, 1);
});

test('the first mute click works even when music autoplay is blocked', async t => {
  const audio = await setup(t, { blocked: true });
  audio.toggle();
  audio.playSound(true);
  await flush();
  assert.equal(audio.storage.get('word-pool:sound'), 'off');
  assert.equal(audio.sources.length, 0);
  assert.ok(audio.media.paused && audio.media.muted);
});

test('touch release toggles sound without a click, and a synthesized click does not toggle twice', async t => {
  const audio = await setup(t);
  const touch = () => audio.button.dispatchEvent(Object.assign(new Event('pointerup'), { pointerType: 'touch', isPrimary: true, button: 0 }));
  const click = detail => audio.button.dispatchEvent(Object.assign(new Event('click'), { detail }));
  touch();
  assert.ok(audio.media.muted);
  click(1);
  assert.ok(audio.media.muted, 'A follow-up click must not unmute');
  touch();
  assert.ok(!audio.media.muted, 'Another touch can unmute immediately');
  click(1);
  assert.ok(!audio.media.muted);
  click(0);
  assert.ok(audio.media.muted, 'Keyboard and assistive activation still work');
});

test('mute works for the session when local storage is unavailable', async t => {
  const audio = await setup(t, { storageFails: true });
  audio.toggle();
  audio.playSound(true);
  assert.ok(audio.media.muted && audio.media.paused);
  assert.equal(audio.sources.length, 0);
});

test('hiding or leaving the page stops effects and cancels pending playback', async t => {
  const audio = await setup(t);
  audio.playSound(true, 'win');
  audio.document.hidden = true;
  audio.document.dispatchEvent(new Event('visibilitychange'));
  assert.ok(audio.media.paused);
  assert.ok(audio.sources.every(source => source.stopped));
  audio.document.hidden = false;
  audio.document.dispatchEvent(new Event('visibilitychange'));
  audio.playSound(true);
  assert.equal(audio.sources.length, 3);
  audio.window.dispatchEvent(new Event('pagehide'));
  assert.ok(audio.media.paused);
  assert.ok(audio.sources.every(source => source.stopped));
});
