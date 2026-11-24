import { clamp, stepFloat, tiltVector } from './pool-physics.js';

export function installPool() {
  const root = document.documentElement, scene = document.getElementById('pool-scene');
  const pal = document.getElementById('pool-pal'), squish = pal.querySelector('.pal-squish');
  const tiltButton = document.getElementById('pool-tilt'), motionButton = document.getElementById('pool-motion');
  const status = document.getElementById('pool-status'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const icon = document.querySelector('link[rel="icon"]'), classicIcon = icon.href;
  let motion = !reduced.matches, visible = true, raf = 0, last = 0, elapsed = 0;
  let tilt = false, permissionPending = false, neutral = null, gravity = { x: 0, y: 0 }, sensorTimer = 0;
  let drag = null, suppressClick = false, squishAnimation, lastBump = 0;
  let bounds = { width: 0, height: 0 }, state = { x: 0, y: 0, vx: 28, vy: 12 }, placed = false;
  const poolActive = () => root.dataset.theme === 'pool';
  const moving = () => motion && !reduced.matches && poolActive() && visible && !document.hidden;
  function paint() {
    pal.style.transform = `translate3d(${state.x}px,${state.y}px,0) rotate(${motion && !reduced.matches ? clamp(state.vx / 18, -9, 9) : 0}deg)`;
  }
  function resize() {
    if (!scene.clientWidth) return;
    bounds = { width: Math.max(0, scene.clientWidth - pal.offsetWidth - 16), height: Math.max(0, scene.clientHeight - pal.offsetHeight - 16) };
    if (!placed) { home(); placed = true; }
    state.x = clamp(state.x, 0, bounds.width); state.y = clamp(state.y, 0, bounds.height); paint();
  }
  function home() {
    const lounge = document.querySelector('.pool-lounge').getBoundingClientRect();
    const startY = lounge.top >= 0 && lounge.top < scene.clientHeight - pal.offsetHeight ? lounge.top : 75;
    state.x = scene.clientWidth < 720 ? bounds.width * .62 : Math.min(bounds.width, scene.clientWidth / 2 + 330);
    state.y = clamp(startY, 0, bounds.height);
    state.vx = 22; state.vy = 8;
    paint();
  }
  function splash() {
    if (!moving()) return;
    const ripple = document.createElement('span'); ripple.className = 'pool-ripple';
    ripple.style.left = `${state.x + pal.offsetWidth / 2 + 8}px`; ripple.style.top = `${state.y + pal.offsetHeight / 2 + 8}px`;
    scene.append(ripple); ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    setTimeout(() => ripple.remove(), 1200);
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
    if (reduced.matches && root.dataset.poolMotion !== 'off') { motion = false; stopTilt(); syncMotion(); return; }
    if (!moving()) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, .035) : 1 / 60; last = now; elapsed += dt;
    if (!drag) {
      const drift = tilt && neutral ? gravity : { x: Math.sin(elapsed * .47) * .18, y: Math.cos(elapsed * .61) * .13 };
      state = stepFloat(state, drift, bounds, dt);
      if (state.impact > 18 && now - lastBump > 170) { bump(state.hitX ? 'x' : 'y', state.impact / 900); lastBump = now; }
      paint();
    }
    raf = requestAnimationFrame(tick);
  }
  function syncMotion() {
    root.dataset.poolMotion = motion && !reduced.matches ? 'on' : 'off';
    motionButton.textContent = motion && !reduced.matches ? 'Pause water' : 'Resume water';
    motionButton.setAttribute('aria-pressed', String(motion && !reduced.matches));
    motionButton.disabled = reduced.matches;
    tiltButton.disabled = reduced.matches || permissionPending;
    if (reduced.matches) status.textContent = 'Reduced motion is on';
    cancelAnimationFrame(raf); raf = 0; last = 0;
    if (moving()) raf = requestAnimationFrame(tick);
    else { squishAnimation?.cancel(); paint(); }
  }
  function stopTilt(message) {
    tilt = false; neutral = null; gravity = { x: 0, y: 0 }; clearTimeout(sensorTimer);
    window.removeEventListener('deviceorientation', orientation);
    tiltButton.textContent = 'Tilt pool'; tiltButton.setAttribute('aria-pressed', 'false');
    if (message) status.textContent = message;
  }
  function orientation(event) {
    if (!tilt || !poolActive() || ![event.beta, event.gamma].every(Number.isFinite)) return;
    if (!neutral) { neutral = { beta: event.beta, gamma: event.gamma }; clearTimeout(sensorTimer); status.textContent = 'Tilt your phone to float'; }
    gravity = tiltVector(event.beta, event.gamma, neutral, screen.orientation?.angle ?? window.orientation ?? 0);
  }
  tiltButton.addEventListener('click', async () => {
    if (tilt) { stopTilt('Just floating'); return; }
    if (permissionPending || reduced.matches) return;
    if (!window.isSecureContext || !window.DeviceOrientationEvent) { status.textContent = 'No tilt here. Drag or tap your pal'; return; }
    permissionPending = true; tiltButton.disabled = true;
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function' && await DeviceOrientationEvent.requestPermission() !== 'granted') { status.textContent = 'Tilt not enabled. You can still drag your pal'; return; }
      if (!poolActive() || reduced.matches) return;
      tilt = true; motion = true; neutral = null;
      tiltButton.textContent = 'Tilt off'; tiltButton.setAttribute('aria-pressed', 'true');
      status.textContent = 'Hold comfortably to center the floaty';
      window.addEventListener('deviceorientation', orientation, { passive: true });
      sensorTimer = setTimeout(() => { if (!neutral) stopTilt('No tilt signal. Try dragging your pal'); }, 4000);
    } catch { status.textContent = 'Tilt unavailable. Drag or tap your pal'; }
    finally { permissionPending = false; syncMotion(); }
  });
  motionButton.addEventListener('click', () => { motion = !motion; if (!motion) stopTilt('Pool paused'); else status.textContent = 'Just floating'; syncMotion(); });
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
  pal.addEventListener('click', () => { if (suppressClick || !moving()) return; state.vx = state.x > bounds.width / 2 ? -170 : 170; state.vy = state.y > bounds.height / 2 ? -100 : 100; bump('y'); });
  pal.addEventListener('keydown', event => { if (!moving()) return; const keys = { ArrowLeft: [-150, 0], ArrowRight: [150, 0], ArrowUp: [0, -150], ArrowDown: [0, 150] }; if (keys[event.key]) { event.preventDefault(); [state.vx, state.vy] = keys[event.key]; splash(); } });
  function setTheme(theme) {
    root.dataset.theme = theme === 'classic' ? 'classic' : 'pool';
    try { localStorage.setItem('letter-relay:theme', root.dataset.theme); } catch { /* Theme selection still works for this visit. */ }
    document.querySelectorAll('[data-set-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.setTheme === root.dataset.theme)));
    document.querySelector('meta[name="theme-color"]').content = poolActive() ? '#05b4c9' : '#f3edff';
    icon.href = poolActive() ? './assets/pool-icon.svg' : classicIcon;
    if (!poolActive()) { endDrag(); stopTilt(); }
    resize(); syncMotion();
  }
  document.querySelectorAll('[data-set-theme]').forEach(button => button.addEventListener('click', () => setTheme(button.dataset.setTheme)));
  document.getElementById('pool-recall').addEventListener('click', () => { endDrag(); resize(); home(); splash(); status.textContent = 'There you are'; });
  new ResizeObserver(resize).observe(scene);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncMotion(); }).observe(scene);
  document.addEventListener('visibilitychange', () => { if (document.hidden) endDrag(); syncMotion(); });
  window.addEventListener('blur', () => endDrag());
  screen.orientation?.addEventListener('change', () => { neutral = null; gravity = { x: 0, y: 0 }; });
  reduced.addEventListener('change', () => { motion = !reduced.matches; if (!motion) stopTilt(); syncMotion(); });
  let previousStatus = document.getElementById('game').dataset.status;
  new MutationObserver(() => {
    const next = document.getElementById('game').dataset.status;
    if (next === 'won' && previousStatus === 'playing' && moving()) { state.vx = -180; state.vy = -100; bump('y', .2); status.textContent = 'A victory lap for your pool pal'; }
    previousStatus = next;
  }).observe(document.getElementById('game'), { attributes: true, attributeFilter: ['data-status'] });
  setTheme(root.dataset.theme); resize();
}
