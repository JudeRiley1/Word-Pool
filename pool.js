import { clamp, stepFloat, tiltVector, wakeShape } from './pool-physics.js';

export function installPool() {
  const root = document.documentElement, scene = document.getElementById('pool-scene');
  const pal = document.getElementById('pool-pal'), squish = pal.querySelector('.pal-squish');
  const lounge = document.querySelector('.pool-lounge');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const touchPhone = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const motionHint = document.getElementById('motion-hint');
  const hint = text => {
    if (motionHint.textContent === text) return;
    motionHint.textContent = text; motionHint.hidden = !text; requestAnimationFrame(resize);
  };
  let sensorTimeout;
  const wake = document.createElement('div'); wake.className = 'swim-wake'; wake.setAttribute('aria-hidden', 'true');
  scene.prepend(wake);
  let rippleIndex = 0;
  const ripplePaths = [
    ['M58 16C35 10 18 27 21 45', 'M23 61C28 80 48 86 67 78'],
    ['M49 14C28 17 18 32 23 49', 'M25 64C38 82 57 81 70 73'],
    ['M62 20C42 9 22 22 20 39', 'M19 55C23 74 40 85 60 81']
  ];
  const rippleArt = () => `<svg viewBox="0 0 100 100" aria-hidden="true">${ripplePaths[rippleIndex++ % ripplePaths.length].map(d => `<path d="${d}"/>`).join('')}</svg>`;
  let motion = !reduced.matches, visible = true, raf = 0, last = 0, elapsed = 0;
  let sensors = false, permissionPending = false, askedPermission = false, neutral = null, calibratingUntil = 0, sensorAt = 0;
  let targetGravity = { x: 0, y: 0 }, smoothGravity = { x: 0, y: 0 }, lastTrail = 0;
  let drag = null, suppressClick = false, squishAnimation, lastBump = 0, roaming = false;
  let bounds = { width: 0, height: 0 }, state = { x: 0, y: 0, vx: 28, vy: 12 }, placed = false;
  const moving = () => motion && !reduced.matches && visible && !document.hidden;
  function paint() {
    pal.style.transform = `translate3d(${state.x}px,${state.y}px,0) rotate(${motion && !reduced.matches ? clamp(state.vx / 18, -9, 9) : 0}deg)`;
    const shape = wakeShape(state.vx, state.vy, pal.offsetWidth);
    wake.style.transform = `translate(${state.x + pal.offsetWidth / 2 + 8}px,${state.y + pal.offsetHeight / 2 + 8}px) rotate(${shape.angle}deg)`;
    wake.style.setProperty('--wake-length', `${shape.length}px`);
    wake.style.opacity = moving() ? String(shape.strength * .3) : '0';
    const now = performance.now();
    if (moving() && shape.strength > .15 && now - lastTrail > 270 && scene.querySelectorAll('.wake-trail').length < 10) {
      lastTrail = now;
      const trail = document.createElement('span'); trail.className = 'wake-trail'; trail.setAttribute('aria-hidden', 'true'); trail.innerHTML = rippleArt();
      const radians = shape.angle * Math.PI / 180, offset = pal.offsetWidth * .27;
      trail.style.left = `${state.x + pal.offsetWidth / 2 + 8 - Math.cos(radians) * offset}px`;
      trail.style.top = `${state.y + pal.offsetHeight / 2 + 8 - Math.sin(radians) * offset}px`;
      trail.style.setProperty('--trail-angle', `${shape.angle + Math.sin(rippleIndex * 2.4) * 9}deg`);
      trail.style.setProperty('--trail-size', `${pal.offsetWidth * (.7 + (rippleIndex % 3) * .06)}px`);
      trail.style.setProperty('--trail-strength', String(.12 + shape.strength * .16));
      scene.prepend(trail); setTimeout(() => trail.remove(), 1750);
    }
  }
  function recenter() { neutral = null; targetGravity = smoothGravity = { x: 0, y: 0 }; state.vx = state.vy = 0; calibratingUntil = performance.now() + 450; }
  function orientation(event) {
    if (!moving() || ![event.beta, event.gamma].every(Number.isFinite)) return;
    sensorAt = performance.now();
    if (!neutral) { neutral = { beta: event.beta, gamma: event.gamma }; calibratingUntil = sensorAt + 450; state.vx = state.vy = 0; clearTimeout(sensorTimeout); }
    if (sensorAt < calibratingUntil) {
      const delta = value => ((value + 540) % 360) - 180;
      neutral.beta += delta(event.beta - neutral.beta) * .2; neutral.gamma += delta(event.gamma - neutral.gamma) * .2;
      return;
    }
    hint('');
    targetGravity = tiltVector(event.beta, event.gamma, neutral, screen.orientation?.angle ?? window.orientation ?? 0);
    if (Math.hypot(targetGravity.x, targetGravity.y) > .03) roaming = true;
  }
  function listenToTilt() {
    if (sensors) return;
    sensors = true; recenter(); window.addEventListener('deviceorientation', orientation, { passive: true });
    if (touchPhone) { hint('Hold your phone comfortably for a moment'); sensorTimeout = setTimeout(() => { if (!neutral) hint('No motion signal yet. You can still drag your pal'); }, 3500); }
  }
  async function requestTilt() {
    if (reduced.matches || permissionPending || !window.isSecureContext || !window.DeviceOrientationEvent) return;
    if (sensors) { recenter(); if (touchPhone) hint('Centering around your holding angle'); return; }
    if (askedPermission) return;
    askedPermission = true; permissionPending = true;
    try {
      if (typeof DeviceOrientationEvent.requestPermission !== 'function' || await DeviceOrientationEvent.requestPermission() === 'granted') listenToTilt();
      else hint('Motion not allowed. You can still drag your pal');
    } catch { hint('Motion unavailable. You can still drag your pal'); }
    finally { permissionPending = false; }
  }
  function resize() {
    if (!scene.clientWidth) return;
    bounds = { width: Math.max(0, scene.clientWidth - pal.offsetWidth - 16), height: Math.max(0, scene.clientHeight - pal.offsetHeight - 16) };
    if (!placed || (touchPhone && !roaming && window.scrollY < 1)) { home(); placed = true; }
    state.x = clamp(state.x, 0, bounds.width); state.y = clamp(state.y, 0, bounds.height); paint();
  }
  function home() {
    const water = lounge.getBoundingClientRect(), sceneRect = scene.getBoundingClientRect();
    const phoneLayout = scene.clientWidth < 720;
    // Center in the actual clear water, reserving room beneath for the tilt hint.
    const hintSpace = phoneLayout && !motionHint.hidden ? motionHint.getBoundingClientRect().height + 8 : 0;
    const centeredY = water.top - sceneRect.top + (water.height - hintSpace - pal.offsetHeight) / 2 - 8;
    const startY = phoneLayout ? centeredY : water.top;
    state.x = phoneLayout ? clamp(water.left - sceneRect.left + (water.width - pal.offsetWidth) / 2 - 8, 0, bounds.width) : Math.min(bounds.width, scene.clientWidth / 2 + 330);
    state.y = clamp(startY, 0, bounds.height);
    state.vx = touchPhone ? 0 : 22; state.vy = touchPhone ? 0 : 8;
    paint();
  }
  function splash() {
    if (!moving()) return;
    const ripple = document.createElement('span'); ripple.className = 'pool-ripple'; ripple.setAttribute('aria-hidden', 'true'); ripple.innerHTML = rippleArt();
    ripple.style.setProperty('--trail-size', `${pal.offsetWidth * .85}px`);
    ripple.style.left = `${state.x + pal.offsetWidth / 2 + 8}px`; ripple.style.top = `${state.y + pal.offsetHeight / 2 + 8}px`;
    scene.append(ripple); ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    setTimeout(() => ripple.remove(), 1850);
  }
  function bump(axis = 'x', force = .12) {
    if (!moving()) return;
    squishAnimation?.cancel();
    const amount = clamp(force, .04, .12);
    const sx = axis === 'x' ? 1 - amount : 1 + amount, sy = axis === 'x' ? 1 + amount : 1 - amount;
    squishAnimation = squish.animate([{ transform: 'scale(1)' }, { transform: `scale(${sx},${sy})`, offset: .22 }, { transform: `scale(${2 - sx},${2 - sy})`, offset: .57 }, { transform: 'scale(1)' }], { duration: 510, easing: 'ease-out' });
    splash();
  }
  function tick(now) {
    raf = 0;
    // Some browsers update matches before dispatching the preference change event.
    if (reduced.matches && root.dataset.poolMotion !== 'off') { motion = false; syncMotion(); return; }
    if (!moving()) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, .035) : 1 / 60; last = now; elapsed += dt;
    if (!drag) {
      const hasTilt = sensors && neutral;
      const blend = 1 - Math.exp(-dt / .09);
      smoothGravity = { x: smoothGravity.x + (targetGravity.x - smoothGravity.x) * blend, y: smoothGravity.y + (targetGravity.y - smoothGravity.y) * blend };
      const drift = hasTilt ? smoothGravity : touchPhone ? { x: 0, y: 0 } : { x: Math.sin(elapsed * .47) * .18, y: Math.cos(elapsed * .61) * .13 };
      state = stepFloat(state, drift, bounds, dt);
      if (state.impact > 18 && now - lastBump > 170) { bump(state.hitX ? 'x' : 'y', state.impact / 900); lastBump = now; }
      paint();
    }
    raf = requestAnimationFrame(tick);
  }
  function syncMotion() {
    root.dataset.poolMotion = motion && !reduced.matches ? 'on' : 'off';
    cancelAnimationFrame(raf); raf = 0; last = 0;
    if (moving()) raf = requestAnimationFrame(tick);
    else { squishAnimation?.cancel(); scene.querySelectorAll('.wake-trail').forEach(el => el.remove()); paint(); }
  }
  function endDrag(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const id = drag.id; suppressClick = drag.moved; drag = null;
    if (pal.hasPointerCapture(id)) pal.releasePointerCapture(id);
    pal.classList.remove('is-held');
    if (moving()) bump('y', .1);
    setTimeout(() => { suppressClick = false; }, 0);
  }
  pal.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !motion || reduced.matches) return;
    roaming = true;
    const r = scene.getBoundingClientRect();
    drag = { id: event.pointerId, offsetX: event.clientX - r.left - state.x - 8, offsetY: event.clientY - r.top - state.y - 8, x: event.clientX, y: event.clientY, time: performance.now(), moved: false };
    pal.setPointerCapture(event.pointerId); pal.classList.add('is-held');
  });
  pal.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const r = scene.getBoundingClientRect(), now = performance.now(), dt = Math.max(.008, (now - drag.time) / 1000);
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 2) drag.moved = true;
    state.vx = clamp((event.clientX - drag.x) / dt, -220, 220); state.vy = clamp((event.clientY - drag.y) / dt, -220, 220);
    state.x = clamp(event.clientX - r.left - drag.offsetX - 8, 0, bounds.width); state.y = clamp(event.clientY - r.top - drag.offsetY - 8, 0, bounds.height);
    drag.x = event.clientX; drag.y = event.clientY; drag.time = now; paint();
  });
  pal.addEventListener('pointerup', endDrag); pal.addEventListener('pointercancel', event => { state.vx = state.vy = 0; endDrag(event); });
  pal.addEventListener('lostpointercapture', endDrag);
  pal.addEventListener('click', async () => { if (suppressClick || !moving()) return; await requestTilt(); if (!touchPhone && !neutral) { state.vx = state.x > bounds.width / 2 ? -120 : 120; state.vy = state.y > bounds.height / 2 ? -70 : 70; } bump('y'); });
  pal.addEventListener('keydown', event => { if (!moving()) return; const keys = { ArrowLeft: [-150, 0], ArrowRight: [150, 0], ArrowUp: [0, -150], ArrowDown: [0, 150] }; if (keys[event.key]) { event.preventDefault(); roaming = true; [state.vx, state.vy] = keys[event.key]; splash(); } });
  const layoutObserver = new ResizeObserver(resize);
  [scene, lounge, document.querySelector('.intro'), document.querySelector('.masthead')].forEach(element => layoutObserver.observe(element, { box: 'border-box' }));
  document.fonts.ready.then(resize);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncMotion(); }).observe(scene);
  document.addEventListener('visibilitychange', () => { if (document.hidden) endDrag(); else recenter(); syncMotion(); });
  window.addEventListener('blur', () => endDrag());
  reduced.addEventListener('change', () => { motion = !reduced.matches; syncMotion(); });
  screen.orientation?.addEventListener('change', recenter);
  window.addEventListener('orientationchange', recenter);
  let previousStatus = document.getElementById('game').dataset.status;
  new MutationObserver(() => {
    const next = document.getElementById('game').dataset.status;
    if (next === 'won' && previousStatus === 'playing' && moving()) { roaming = true; state.vx = -180; state.vy = -100; bump('y', .2); }
    previousStatus = next;
  }).observe(document.getElementById('game'), { attributes: true, attributeFilter: ['data-status'] });
  resize(); syncMotion();
  if (window.isSecureContext && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') listenToTilt();
  else if (touchPhone && !reduced.matches) hint('Tap your pal to enable phone tilt');
}
