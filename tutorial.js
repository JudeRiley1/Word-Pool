import { captureTiles, animateHandoff, playSound, installDrag } from './effects.js';
import { insertionGap } from './progression.js';

export function installTutorial({ done, sound }) {
  const dialog = document.querySelector('#tutorial-dialog');
  const board = dialog.querySelector('#tutorial-board');
  let step = 0, keyboard = false;
  const render = () => {
    dialog.querySelector('#tutorial-prompt').textContent = [
      'Drag G from GLASS and drop it before RAIN',
      'Move to the marker before R, then release',
      'You made LASS and GRAIN'
    ][step];
    board.innerHTML = `<div class="tutorial-row"><div class="tile-line">${[...'GLASS'].map((l, i) => i === 0 ? step < 2 ? `<button class="tile tutorial-target${step === 1 ? ' selected' : ''}" data-tile-key="g" id="tutorial-g" aria-label="Drag G before RAIN, or press Enter to pick it up">G</button>` : '' : `<span class="tile" data-tile-key="top-${i}">${l}</span>`).join('')}</div></div><div class="tutorial-row${step === 1 ? ' drop-row' : ''}" id="tutorial-destination"><div class="tile-line">${step === 2 ? '<span class="tile received" data-tile-key="g">G</span>' : ''}${[...'RAIN'].map((l, i) => `<span class="tile" data-tile-key="bottom-${i}" data-original-index="${i}">${l}</span>`).join('')}${step === 1 ? '<span class="drop-marker" aria-hidden="true"></span>' : ''}</div></div>`;
    dialog.querySelector('#tutorial-explanation').textContent = step === 2 ? 'Each of the first three rows sends one original letter down. Match all four clues in six checks; colors appear after each check.' : 'The marker shows exactly where your letter will land';
    dialog.querySelector('#tutorial-play').hidden = step < 2;
    dialog.querySelector('#tutorial-skip').textContent = step < 2 ? 'Skip to puzzle' : 'Close tutorial';
    if (step === 1) {
      const line = board.querySelector('#tutorial-destination .tile-line');
      const left = line.querySelector('.tile').getBoundingClientRect().left - line.getBoundingClientRect().left - 5;
      line.querySelector('.drop-marker').style.left = `${left}px`;
    }
  };
  const complete = rect => {
    const before = captureTiles(board);
    if (rect) before.set('g', rect);
    step = 2; keyboard = false; render(); animateHandoff(before, 'g', dialog); playSound(sound());
    dialog.querySelector('#tutorial-play').focus({ preventScroll: true });
  };
  installDrag(board, {
    enabled: () => step < 2,
    begin: () => { step = 1; render(); },
    target: (x, y) => {
      const row = board.querySelector('#tutorial-destination'), rect = row.getBoundingClientRect();
      const positions = [...row.querySelectorAll('.tile')].map(tile => {
        const box = tile.getBoundingClientRect(); return { index: Number(tile.dataset.originalIndex), center: box.left + box.width / 2 };
      });
      const valid = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom && insertionGap(positions, x, 4) === 0;
      row.classList.toggle('is-over', valid);
      return valid ? 0 : null;
    },
    drop: (_, rect) => complete(rect),
    cancel: () => { step = 0; render(); }
  });
  board.addEventListener('click', event => {
    if (event.detail === 0 && event.target.closest('#tutorial-g')) {
      step = 1; keyboard = true; render(); board.focus();
      dialog.querySelector('#tutorial-prompt').textContent = 'Press Enter to drop G before RAIN';
    }
  });
  board.addEventListener('keydown', event => {
    if (keyboard && ['Enter', ' '].includes(event.key)) { event.preventDefault(); complete(); }
  });
  const close = () => { done(); dialog.close(); document.querySelector('#board').focus({ preventScroll: true }); };
  dialog.querySelector('#tutorial-skip').addEventListener('click', close);
  dialog.querySelector('#tutorial-play').addEventListener('click', close);
  dialog.addEventListener('cancel', done);
  return { open: () => { step = 0; keyboard = false; render(); dialog.showModal(); dialog.querySelector('#tutorial-g').focus({ preventScroll: true }); } };
}
