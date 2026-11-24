const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function captureTiles(root = document) {
  return new Map([...root.querySelectorAll('[data-tile-key]')].map(el => [el.dataset.tileKey, el.getBoundingClientRect()]));
}

export function animateHandoff(before, movingKey, root = document) {
  if (reducedMotion()) return;
  root.querySelectorAll('[data-tile-key]').forEach(tile => {
    const old = before.get(tile.dataset.tileKey);
    if (!old) return;
    const dest = tile.getBoundingClientRect();
    if (tile.dataset.tileKey === movingKey) {
      const ghost = tile.cloneNode(true);
      ghost.removeAttribute('data-tile-key');
      ghost.removeAttribute('id');
      ghost.setAttribute('aria-hidden', 'true');
      ghost.tabIndex = -1;
      ghost.className = `tile flying-tile ${[...tile.classList].find(name => name.startsWith('letter-')) || ''}`;
      Object.assign(ghost.style, { left: `${old.left}px`, top: `${old.top}px`, width: `${dest.width}px`, height: `${dest.height}px` });
      (root instanceof HTMLDialogElement ? root : document.body).append(ghost);
      tile.style.visibility = 'hidden';
      const animation = ghost.animate([
        { transform: 'translate(0, 0) rotate(-5deg)' },
        { transform: `translate(${dest.left - old.left}px, ${dest.top - old.top}px) rotate(0)` }
      ], { duration: 330, easing: 'cubic-bezier(.25,.8,.25,1)', fill: 'forwards' });
      animation.finished.catch(() => {}).finally(() => {
        ghost.remove(); tile.style.visibility = '';
        if (tile.isConnected) {
          tile.animate([{ transform: 'scale(1.12,.9)' }, { transform: 'scale(.97,1.04)' }, { transform: 'scale(1)' }], { duration: 220 });
          if (tile.classList.contains('received') && document.documentElement.dataset.theme === 'pool' && !reducedMotion()) {
            const splash = document.createElement('span');
            splash.className = 'tile-splash'; splash.setAttribute('aria-hidden', 'true'); tile.append(splash);
            setTimeout(() => splash.remove(), 550);
          }
        }
      });
    } else {
      tile.animate([{ transform: `translate(${old.left - dest.left}px, ${old.top - dest.top}px)` }, { transform: 'translate(0,0)' }], { duration: 280, easing: 'ease-out' });
    }
  });
}

export { playSound } from './audio.js';

export function installDrag(board, { enabled, begin, target, drop, cancel }) {
  let pending, ghost, hovered, frame, blockClickUntil = 0;
  const clear = () => {
    cancelAnimationFrame(frame);
    ghost?.remove();
    ghost = hovered = null;
    if (pending && board.hasPointerCapture(pending.id)) board.releasePointerCapture(pending.id);
    pending = null;
    board.classList.remove('dragging');
  };
  const hit = () => {
    hovered = target(pending.x, pending.y);
  };
  const tick = () => {
    if (!ghost || !pending) return;
    const edge = 65;
    if (pending.y < edge) window.scrollBy(0, -9);
    else if (pending.y > innerHeight - edge) window.scrollBy(0, 9);
    hit(); frame = requestAnimationFrame(tick);
  };
  board.addEventListener('pointerdown', event => {
    const tile = event.target.closest('button.tile');
    if (!enabled() || !tile || event.button !== 0 || !event.isPrimary) return;
    if (document.activeElement === board) board.blur();
    pending = { id: event.pointerId, tile, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY };
    board.setPointerCapture(event.pointerId);
  });
  window.addEventListener('pointermove', event => {
    if (!pending || pending.id !== event.pointerId) return;
    pending.x = event.clientX; pending.y = event.clientY;
    if (!ghost && Math.hypot(pending.x - pending.startX, pending.y - pending.startY) < 9) return;
    if (!ghost) {
      const label = pending.tile.textContent;
      const feedbackClass = [...pending.tile.classList].find(name => name.startsWith('letter-')) || '';
      begin(pending.tile);
      ghost = document.createElement('div'); ghost.className = `tile drag-ghost ${feedbackClass}`;
      ghost.textContent = label; ghost.setAttribute('aria-hidden', 'true');
      (board.closest('dialog') || document.body).append(ghost); board.classList.add('dragging');
      frame = requestAnimationFrame(tick);
    }
    ghost.style.left = `${pending.x - 22}px`; ghost.style.top = `${pending.y - (event.pointerType === 'touch' ? 64 : 30)}px`;
    hit(); event.preventDefault();
  }, { passive: false });
  window.addEventListener('pointerup', event => {
    if (!pending || pending.id !== event.pointerId) return;
    if (!ghost) { clear(); return; }
    hit();
    const gap = hovered;
    const rect = ghost.getBoundingClientRect();
    blockClickUntil = performance.now() + 500;
    clear();
    if (gap !== null && gap !== undefined) drop(gap, rect); else cancel();
  });
  const abort = () => { const active = Boolean(ghost); clear(); if (active) { blockClickUntil = performance.now() + 500; cancel(); } };
  window.addEventListener('pointercancel', abort);
  board.addEventListener('lostpointercapture', () => { if (pending) abort(); });
  window.addEventListener('blur', abort);
  document.addEventListener('visibilitychange', () => { if (document.hidden) abort(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') abort(); });
  board.addEventListener('click', event => {
    if (performance.now() < blockClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
}
