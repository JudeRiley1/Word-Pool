import { START_DATE, PUZZLES, PRACTICE, BONUSES, CHALLENGES } from './puzzles.js';
import { livesRemaining, score, DAY_MS, newState, dayIndex, tokens, words, complete, move, recall, undo, reset, check, restore, solve, stats, shareText, letterFeedback } from './engine.js';
import { deliverShare } from './sharing.js';
import { puzzleDate, resolvePuzzleLink, puzzleLink, postcard, saveProgress, insertionGap } from './progression.js';
import { captureTiles, animateHandoff, playSound, installDrag } from './effects.js';
import { installTutorial } from './tutorial.js';
import { installPool } from './pool.js';

installPool();

const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STORAGE_KEY = 'letter-relay:v1';
let storageOK = true;
let memory = { version: 1, daily: {}, results: {} };
function readStore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data?.version === 1 && data.daily && typeof data.daily === 'object' && data.results && typeof data.results === 'object') return data;
  } catch { storageOK = false; }
  return memory;
}
let data = readStore();
let today = dayIndex(START_DATE);
let dailyPuzzle = PUZZLES[today];
let dailyState = dailyPuzzle ? restore(dailyPuzzle, data.daily[dailyPuzzle.id]) : null;
let practiceState = newState();
let practicing = false;
let archivePuzzle = null;
let archiveState = null;
let archiveIndex = null;
let collectionWeek = Math.floor(Math.max(0, today) / 7);
let preferences;
try { preferences = JSON.parse(localStorage.getItem('letter-relay:preferences')) || {}; } catch { preferences = {}; }
if (typeof preferences !== 'object' || Array.isArray(preferences)) preferences = {};
preferences.sound = true;
let revealing = false;
let revealTimer;
let selection = null;
let keyboardGap = 0;
const currentPuzzle = () => practicing ? PRACTICE : archivePuzzle || dailyPuzzle;
const currentState = () => practicing ? practiceState : archivePuzzle ? archiveState : dailyState;
const dateLabel = date => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);

function savePreferences() {
  try { localStorage.setItem('letter-relay:preferences', JSON.stringify(preferences)); } catch { storageOK = false; warnStorage(); }
}

function warnStorage() {
  if (storageOK || $('.storage-warning')) return;
  const warning = document.createElement('p');
  warning.className = 'storage-warning';
  warning.textContent = 'Browser storage is unavailable. You can still play, but your progress will not survive a refresh.';
  $('main').append(warning);
}

function persist() {
  if (practicing || !currentPuzzle()) return;
  data = memory = saveProgress(readStore(), currentPuzzle(), currentState(), today, Boolean(archivePuzzle));
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { storageOK = false; }
  warnStorage();
}

function announce(message) { $('#message').textContent = message; }
function focusKey(key) { document.querySelector(`[data-focus="${key}"]`)?.focus({ preventScroll: true }); }

function render() {
  const puzzle = currentPuzzle(), state = currentState();
  const active = document.activeElement?.dataset?.focus;
  $('#edition').textContent = practicing ? 'PRACTICE' : puzzle?.kind === 'hard' ? 'DAILY CHALLENGE' : archivePuzzle ? 'FROM THE ARCHIVE' : 'YOUR DAILY WORD PUZZLE';
  $('#puzzle-date').textContent = archivePuzzle && archiveIndex === null ? 'BONUS COLLECTION' : dateLabel(puzzleDate(START_DATE, archivePuzzle ? archiveIndex : today)).toUpperCase();
  $('#practice-banner').hidden = !practicing && !archivePuzzle;
  $('#mode-label').textContent = practicing ? 'Practice relay' : archivePuzzle?.title || `Archive relay #${puzzle?.id}`;
  $('#mode-note').textContent = puzzle?.kind === 'hard' ? 'Longer words · Three lives · Separate stats' : 'Separate from your daily stats';
  $('#theme-label').textContent = puzzle?.theme ? `${puzzle.theme} edition` : '';
  $('#theme-label').hidden = !puzzle?.theme;
  renderPostcard();
  $('#game').hidden = !puzzle;
  $('#unavailable').hidden = Boolean(puzzle);
  if (!puzzle) {
    $('#unavailable-text').textContent = today < 0 ? `The first relay arrives on ${START_DATE} at midnight UTC. In the meantime, try a practice round.` : 'You’ve reached the end of our scheduled relays. More puzzles can be added soon. The practice relay is always here.';
    return;
  }
  $('#puzzle-label').textContent = practicing ? 'PRACTICE' : puzzle.kind === 'hard' ? `HARD #${String(archiveIndex + 1).padStart(3, '0')}` : puzzle.title ? `BONUS ${String(puzzle.id).split('-').at(-1).padStart(2, '0')}` : `${archivePuzzle ? 'RELAY' : 'TODAY'} #${String(puzzle.id).padStart(3, '0')}`;
  $('#difficulty').textContent = puzzle.difficulty || 'Steady';
  $('#delivery-progress').textContent = `${state.board.filter(Boolean).length} / 3 delivered`;
  const ended = state.status !== 'playing';
  $('#game').dataset.status = state.status;
  $('#board').classList.add('drag-enabled');
  const signature = words(puzzle, state.board).join('|');
  const feedback = state.checks.find(c => c.signature === signature);
  $('#board').innerHTML = puzzle.starts.map((start, row) => {
    const outgoing = state.board[row];
    const receiving = selection && selection.row + 1 === row;
    const returning = selection?.received && selection.row === row;
    const rowTokens = tokens(puzzle, state.board, row).filter(t => !(receiving && t.received));
    const colors = feedback && !selection ? letterFeedback(rowTokens.map(t => t.letter).join(''), puzzle.answers[row]) : null;
    const tileHTML = rowTokens.map((token, position) => {
      const selected = token.received ? selection?.row === row - 1 && selection.index === state.board[row - 1]?.index : selection?.row === row && selection.index === token.index;
      const interactive = !ended && (token.received || row < 3);
      const cls = `tile${token.received ? ' received' : ''}${selected ? ' selected' : ''}${colors ? ` letter-${colors[position]}` : ''}`;
      const feedbackLabel = colors ? `, ${colors[position] === 'correct' ? 'right letter and spot' : colors[position] === 'present' ? 'right letter, wrong spot' : 'letter not needed'}` : '';
      const tileKey = token.received ? `${row - 1}-${state.board[row - 1].index}` : `${row}-${token.index}`;
      if (!interactive) return `<span class="${cls}" data-tile-key="${tileKey}" data-original-index="${token.index}" aria-label="${token.letter}${token.received ? ', received' : ''}${feedbackLabel}">${token.letter}</span>`;
      const focus = token.received ? `received-${row}` : `letter-${row}-${token.index}`;
      return `<button class="${cls}" data-tile-key="${tileKey}" data-original-index="${token.index}" data-action="${token.received ? 'received' : 'letter'}" data-row="${row}" data-index="${token.index}" data-focus="${focus}" aria-pressed="${Boolean(selected)}" aria-label="${token.received ? `Reposition or return received ${token.letter} in row ${row + 1}` : `Drag ${token.letter}, letter ${token.index + 1} of ${start}, to row ${row + 2}`}${feedbackLabel}">${token.letter}</button>`;
    }).join('');
    return `<section data-board-row="${row}" class="puzzle-row${feedback?.correct[row] ? ' matched' : ''}${receiving || returning ? ' drop-row' : ''}${returning ? ' return-row' : ''}${revealing ? ' checking' : ''}" style="--reveal-delay:${row * 140}ms" aria-label="Row ${row + 1}: ${esc(puzzle.clues[row])}">
      <div class="row-heading"><span class="row-number" aria-hidden="true">${row + 1}</span><div class="clue-block"><p class="clue">${esc(puzzle.clues[row])}</p>${feedback ? `<span class="row-status${feedback.correct[row] ? ' correct' : ''}">${feedback.correct[row] ? '✓ Clue matched!' : '○ Try another delivery'}</span>` : ''}</div></div>
      <div class="row-word"><div class="tile-line">${tileHTML}${receiving || returning ? '<span class="drop-marker" hidden aria-hidden="true"></span>' : ''}</div><div class="row-meta"><span class="starting-word">From ${start}</span>${outgoing ? `<span class="starting-word">· ${start[outgoing.index]} sent</span>` : ''}</div>${receiving || returning ? `<p class="drop-preview">${returning ? `Return ${start[selection.index]} to its original spot` : `Drop ${puzzle.starts[selection.row][selection.index]} into this word`}</p>` : ''}</div></section>`;
  }).join('');
  $('#undo').disabled = ended || revealing || !state.undo.length;
  $('#reset').disabled = ended || revealing || state.board.every(m => !m);
  $('#check').disabled = ended || revealing || !complete(state);
  $('#check').textContent = ended ? state.status === 'won' ? 'Puzzle complete' : 'Puzzle finished' : 'Check words';
  const remaining = livesRemaining(state);
  $('#checks-label').innerHTML = state.rulesVersion === 1 && ended ? 'Previous rules' : `<span class="life-hearts" aria-hidden="true">${'&#9829;'.repeat(remaining)}<span class="spent-lives">${'&#9829;'.repeat(3 - remaining)}</span></span><span class="life-label">${remaining} ${remaining === 1 ? 'life' : 'lives'}</span>`;
  $('#checks-label').setAttribute('aria-label', state.rulesVersion === 1 && ended ? 'Completed under previous rules' : `${remaining} of 3 lives left`);
  $('#instruction').textContent = ended ? 'All done for this round' : selection?.keyboard ? `Left / Right to choose a spot, Enter to drop${selection.received ? ', Backspace to return' : ''}, Esc to cancel` : selection?.received ? `Move within row ${selection.row + 2}, or return to row ${selection.row + 1}` : selection ? `Drag into row ${selection.row + 2} and release at the marker` : complete(state) ? 'Ready to check your words?' : 'Drag letters into the next word';
  renderResult(puzzle, state);
  if (active) focusKey(active);
}

function renderResult(puzzle, state) {
  const result = $('#result');
  result.hidden = state.status === 'playing';
  if (result.hidden) { result.innerHTML = ''; return; }
  const won = state.status === 'won';
  const solution = solve(puzzle)[0];
  result.classList.toggle('reveal-result', revealing);
  const challengeDay = archivePuzzle ? archiveIndex : today;
  const nextChallenge = !practicing && puzzle.kind !== 'hard' && challengeDay !== null ? CHALLENGES[challengeDay] : null;
  const hardSaved = nextChallenge && data.archive?.[nextChallenge.id];
  result.innerHTML = `${won ? '<div class="delivery-stamp">Delivered</div>' : ''}<h2 id="result-title">${won ? 'You solved it!' : 'See the solution'}</h2><div class="finish-stats"><span><strong>${state.rulesVersion === 1 ? state.checks.length : `${score(state)}/3`}</strong> ${state.rulesVersion === 1 ? 'checks under previous rules' : 'score'}</span>${!practicing && !archivePuzzle ? `<span><strong>${stats(data.results, today).current}</strong> day streak</span>` : '<span>Daily streak<br>stays unchanged</span>'}</div><div class="share-preview" aria-label="Your spoiler-free result">${state.checks[0].correct.map((_, row) => `<div>${state.checks.map(c => `<span class="share-cell ${c.correct[row] ? 'hit' : 'miss'}" aria-label="${c.correct[row] ? 'Matched' : 'Unmatched'}"></span>`).join('')}</div>`).join('')}</div><div class="solution-words" aria-label="Solution words">${puzzle.answers.map(a => `<span>${a}</span>`).join('')}</div>
    ${!won ? `<ol class="transfer-summary">${solution.map((m, row) => `<li><strong>${puzzle.starts[row][m.index]}</strong> from ${puzzle.starts[row]} to ${puzzle.starts[row + 1]} → ${puzzle.answers[row + 1]}</li>`).join('')}</ol>` : ''}
    <button class="primary-button" id="share-result">Share result <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="5" cy="10" r="2"/><circle cx="15" cy="4" r="2"/><circle cx="15" cy="16" r="2"/><path d="m7 9 6-4M7 11l6 4"/></svg></button>
    ${nextChallenge ? `<div class="hard-invite"><h3>Up for a harder relay?</h3><p>Longer words, three lives, a new puzzle</p><button class="primary-button challenge-button" id="try-hard">${hardSaved ? hardSaved.status === 'playing' ? 'Continue the hard relay' : 'View hard relay result' : challengeDay === today ? 'Try today’s hard relay' : 'Try the hard relay'}</button><small>Your daily streak is safe</small></div>` : ''}
    ${practicing ? '<button class="text-button" id="replay-practice">Play practice again</button>' : archivePuzzle ? '<button class="text-button" id="more-archive">Choose another relay</button>' : '<p class="earned-note">Today’s visit is on your Pool Pass</p><button class="text-button" id="more-archive">Play the archive</button><p>Next daily relay<span id="countdown" class="countdown"></span><span id="next-note"></span></p>'}`;
  $('#share-result').addEventListener('click', share);
  $('#try-hard')?.addEventListener('click', () => openPuzzle(nextChallenge, challengeDay));
  $('#more-archive')?.addEventListener('click', openArchive);
  $('#replay-practice')?.addEventListener('click', () => { practiceState = newState(); selection = null; announce('A fresh practice board.'); render(); $('#board').focus({ preventScroll: true }); });
  updateCountdown();
}

function placeLetter(gap, dragRect) {
  if (!selection) return;
  const puzzle = currentPuzzle(), state = currentState();
  const { row, index } = selection;
  const key = `${row}-${index}`;
  const before = captureTiles($('#board'));
  if (dragRect) before.set(key, dragRect);
  const changed = move(puzzle, state, row, index, gap);
  selection = null;
  if (changed) persist();
  render();
  if (changed) { animateHandoff(before, key); playSound(preferences.sound); }
  announce(`${puzzle.starts[row][index]} passed to row ${row + 2}`);
  return row;
}

function returnLetter(dragRect) {
  if (!selection?.received) return;
  const { row, index } = selection;
  const before = captureTiles($('#board')), key = `${row}-${index}`;
  if (dragRect) before.set(key, dragRect);
  const changed = recall(currentState(), row, index);
  selection = null;
  if (changed) persist();
  render();
  if (changed) { animateHandoff(before, key); playSound(preferences.sound); }
  announce(`${currentPuzzle().starts[row][index]} returned to its original spot in row ${row + 1}`);
  focusKey(`letter-${row}-${index}`);
}

function showReturnTarget() {
  const { row, index } = selection;
  const element = $(`[data-board-row="${row}"]`), line = element.querySelector('.tile-line');
  const preview = currentState().board.map(m => m && { ...m });
  preview[row] = null;
  const restored = tokens(currentPuzzle(), preview, row);
  const position = restored.findIndex(t => !t.received && t.index === index);
  const next = restored[position + 1];
  const nextKey = next && (next.received ? `${row - 1}-${preview[row - 1].index}` : `${row}-${next.index}`);
  const nextTile = nextKey && line.querySelector(`[data-tile-key="${nextKey}"]`);
  const endTile = [...line.querySelectorAll('.tile')].at(-1);
  const left = nextTile ? nextTile.getBoundingClientRect().left - 5 : endTile.getBoundingClientRect().right + 3;
  const rect = line.getBoundingClientRect(), marker = line.querySelector('.drop-marker');
  marker.style.left = `${Math.max(1, Math.min(rect.width - 5, left - rect.left))}px`;
  marker.hidden = false; element.classList.add('is-over');
  element.querySelector('.drop-preview').textContent = `Return ${currentPuzzle().starts[row][index]}: ${words(currentPuzzle(), preview)[row]}`;
}

function showDropGap(gap) {
  const row = $(`[data-board-row="${selection.row + 1}"]`);
  const line = row.querySelector('.tile-line'), marker = row.querySelector('.drop-marker');
  const tiles = [...line.querySelectorAll('.tile')];
  const next = tiles.find(tile => Number(tile.dataset.originalIndex) === gap);
  const lineRect = line.getBoundingClientRect();
  const left = next ? next.getBoundingClientRect().left - 5 : tiles.at(-1).getBoundingClientRect().right + 3;
  marker.style.left = `${Math.max(1, Math.min(lineRect.width - 5, left - lineRect.left))}px`;
  marker.hidden = false; row.classList.add('is-over');
  const board = currentState().board.map(m => m && { ...m });
  board[selection.row] = { index: selection.index, gap };
  row.querySelector('.drop-preview').textContent = `New word: ${words(currentPuzzle(), board)[selection.row + 1]}`;
}

installDrag($('#board'), {
  enabled: () => currentState()?.status === 'playing' && !revealing,
  begin: button => {
    const row = Number(button.dataset.row) - (button.dataset.action === 'received' ? 1 : 0);
    selection = { row, index: button.dataset.action === 'received' ? currentState().board[row].index : Number(button.dataset.index), received: button.dataset.action === 'received' };
    announce(''); render();
  },
  target: (x, y) => {
    if (!selection) return null;
    for (const element of document.querySelectorAll('.drop-row')) {
      element.classList.remove('is-over'); element.querySelector('.drop-marker').hidden = true;
    }
    if (selection.received) {
      const origin = $(`[data-board-row="${selection.row}"]`), bounds = origin.getBoundingClientRect();
      origin.querySelector('.drop-preview').textContent = `Return ${currentPuzzle().starts[selection.row][selection.index]} to its original spot`;
      if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) {
        showReturnTarget(); return 'return';
      }
    }
    const row = $(`[data-board-row="${selection.row + 1}"]`), rect = row.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      row.classList.remove('is-over'); row.querySelector('.drop-marker').hidden = true;
      row.querySelector('.drop-preview').textContent = `Drop ${currentPuzzle().starts[selection.row][selection.index]} into this word`;
      return null;
    }
    const positions = [...row.querySelectorAll('.tile')].map(tile => {
      const box = tile.getBoundingClientRect();
      return { index: Number(tile.dataset.originalIndex), center: box.left + box.width / 2 };
    });
    const gap = insertionGap(positions, x, currentPuzzle().starts[selection.row + 1].length);
    showDropGap(gap); return gap;
  },
  drop: (target, rect) => target === 'return' ? returnLetter(rect) : placeLetter(target, rect),
  cancel: () => { selection = null; render(); announce('Drag cancelled; your board is unchanged'); }
});

$('#board').addEventListener('click', event => {
  // Pointer users drag directly; Enter/Space provides the keyboard equivalent.
  if (event.detail !== 0) return;
  const button = event.target.closest('button[data-action]');
  if (!button || currentState().status !== 'playing' || revealing) return;
  const puzzle = currentPuzzle(), state = currentState();
  const action = button.dataset.action;
  if (action === 'letter' || action === 'received') {
    const row = Number(button.dataset.row) - (action === 'received' ? 1 : 0);
    const index = action === 'received' ? state.board[row].index : Number(button.dataset.index);
    selection = { row, index, keyboard: true, received: action === 'received' };
    announce('');
    render();
    keyboardGap = tokens(puzzle, state.board, row + 1).find(t => !t.received)?.index ?? 0;
    showDropGap(keyboardGap); $('#board').focus({ preventScroll: true });
    return;
  }
});

document.addEventListener('keydown', event => {
  if (selection?.keyboard && selection.received && ['Backspace', 'Delete'].includes(event.key) && !$('dialog[open]')) {
    event.preventDefault(); returnLetter(); return;
  }
  if (selection?.keyboard && ['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key) && !$('dialog[open]')) {
    event.preventDefault();
    if (event.key === 'Enter' || event.key === ' ') { const row = placeLetter(keyboardGap); focusKey(`received-${row + 1}`); return; }
    const positions = tokens(currentPuzzle(), currentState().board, selection.row + 1).filter(t => !t.received).map(t => t.index);
    positions.push(currentPuzzle().starts[selection.row + 1].length);
    keyboardGap = positions[Math.max(0, Math.min(positions.length - 1, positions.indexOf(keyboardGap) + (event.key === 'ArrowLeft' ? -1 : 1)))];
    showDropGap(keyboardGap); return;
  }
  if (event.key === 'Escape' && selection && !$('dialog[open]')) {
    const { row, index } = selection;
    selection = null;
    render();
    focusKey(stateHasOutgoing(row, index) ? `received-${row + 1}` : `letter-${row}-${index}`);
    announce('Selection cancelled.');
  }
});
function stateHasOutgoing(row, index) { return currentState().board[row]?.index === index; }

$('#undo').addEventListener('click', () => {
  if (undo(currentState())) { selection = null; persist(); render(); announce('Last move undone. Lives already lost stay used.'); }
});
$('#reset').addEventListener('click', () => {
  if (reset(currentState())) { selection = null; persist(); render(); announce('Board reset. Lives already lost stay used.'); }
});
$('#check').addEventListener('click', () => {
  selection = null;
  const outcome = check(currentPuzzle(), currentState());
  if (outcome.kind === 'duplicate') { announce('Try a different arrangement; this one was already checked and will not cost another life.'); return; }
  if (outcome.kind === 'incomplete') return;
  persist();
  revealing = true;
  render();
  clearTimeout(revealTimer);
  playSound(preferences.sound, outcome.kind === 'won');
  if (outcome.kind === 'won') {
    $('.post-pal').classList.remove('happy');
    requestAnimationFrame(() => $('.post-pal').classList.add('happy'));
  }
  revealTimer = setTimeout(() => {
    revealing = false;
    document.querySelectorAll('.checking').forEach(row => row.classList.remove('checking'));
    $('#result').classList.remove('reveal-result');
    $('#check').disabled = currentState().status !== 'playing' || !complete(currentState());
    $('#undo').disabled = currentState().status !== 'playing' || !currentState().undo.length;
    $('#reset').disabled = currentState().status !== 'playing' || currentState().board.every(m => !m);
    if (currentState().status !== 'playing') {
      $('#result').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      $('#share-result')?.focus({ preventScroll: true });
    }
  }, 850);
  announce(outcome.kind === 'won' ? 'All four clues matched!' : outcome.kind === 'lost' ? `All three lives used; the solution is shown below.` : `${outcome.correct.filter(Boolean).length} of 4 clues matched. One life lost; ${livesRemaining(currentState())} left.`);
});

function openDialog(id) { $(id).showModal(); }
$('#help-button').addEventListener('click', () => openDialog('#help-dialog'));
$('#stats-button').addEventListener('click', () => { renderStats(); openDialog('#stats-dialog'); });
$('#archive-button').addEventListener('click', openArchive);
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
}));

function startPractice() {
  $('#help-dialog').close();
  practicing = true;
  archivePuzzle = null;
  history.replaceState(null, '', new URL('./', location.href));
  selection = null;
  announce('Practice is separate from your daily progress.');
  render();
  $('#board').focus({ preventScroll: false });
}
$('#practice-button').addEventListener('click', startPractice);
$('#unavailable-practice').addEventListener('click', startPractice);
$('#exit-practice').addEventListener('click', () => {
  practicing = false;
  archivePuzzle = null;
  history.replaceState(null, '', new URL('./', location.href));
  selection = null;
  announce('');
  refreshDay();
  render();
  if (dailyPuzzle) $('#board').focus({ preventScroll: false });
});

function renderStats() {
  data = readStore();
  const s = stats(data.results, today);
  const top = Math.max(1, ...s.distribution);
  $('#stats-content').innerHTML = `<div class="stats-grid">${[[s.played, 'Played'], [s.wins, 'Won'], [s.played ? `${Math.round(s.wins / s.played * 100)}%` : '0%', 'Win rate'], [s.current, 'Current streak'], [s.best, 'Best streak']].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('')}</div><h3 class="eyebrow">CHECKS TO THE FINISH</h3><div class="histogram">${s.distribution.map((n, i) => `<div class="bar-row" aria-label="${i + 1} checks: ${n} wins"><span>${i + 1}</span><div class="bar-track"><div class="bar${n ? '' : ' empty'}" style="width:${Math.max(8, n / top * 100)}%">${n}</div></div></div>`).join('')}</div>${s.played ? '' : '<p class="dialog-fineprint">Complete a daily relay to see your stats here.</p>'}`;
}

async function share() {
  const url = practicing ? new URL('./', location.href).href : puzzleLink(location.href, currentPuzzle().id);
  let text = shareText(currentPuzzle(), currentState(), url);
  if (practicing) text = text.replace('#practice', '· Practice');
  const delivery = await deliverShare(text, {
    nativeShare: navigator.share?.bind(navigator),
    copyText: navigator.clipboard?.writeText.bind(navigator.clipboard)
  });
  if (delivery === 'shared') announce('Result shared');
  if (delivery === 'copied') announce('Copied your result and a link to this puzzle');
  if (delivery === 'selectable') {
    $('#share-text').value = text;
    openDialog('#share-dialog');
    $('#share-text').select();
  }
}
$('#select-share').addEventListener('click', () => { $('#share-text').focus(); $('#share-text').select(); $('#share-text').setSelectionRange(0, $('#share-text').value.length); });

function updateCountdown() {
  if (!$('#countdown')) return;
  const remaining = Math.max(0, DAY_MS - Date.now() % DAY_MS);
  const seconds = Math.floor(remaining / 1000);
  $('#countdown').textContent = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
  if (!PUZZLES[today + 1]) {
    $('#countdown').textContent = '';
    $('#next-note').textContent = 'Not scheduled yet. Practice is always available.';
  }
}

function refreshDay() {
  const next = dayIndex(START_DATE);
  if (next === today) return;
  today = next;
  collectionWeek = Math.floor(Math.max(0, today) / 7);
  dailyPuzzle = PUZZLES[today];
  data = readStore();
  dailyState = dailyPuzzle ? restore(dailyPuzzle, data.daily[dailyPuzzle.id]) : null;
  if (!practicing && !archivePuzzle) {
    selection = null;
    render();
    announce(dailyPuzzle ? 'It’s a new UTC day. Your next relay is ready.' : 'No new daily relay is scheduled. Practice is still available.');
  }
}
setInterval(() => { refreshDay(); updateCountdown(); }, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDay(); });
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY) return;
  data = readStore();
  if (dailyPuzzle) dailyState = restore(dailyPuzzle, data.daily[dailyPuzzle.id]);
  if (archivePuzzle) archiveState = restore(archivePuzzle, data.archive?.[archivePuzzle.id]);
  if (!practicing) { selection = null; render(); announce('Progress updated from another tab.'); }
  if ($('#stats-dialog').open) renderStats();
});

function openArchive() {
  const released = PUZZLES.slice(0, Math.max(0, today + 1));
  const card = (p, index) => {
    const saved = index === today && p.kind !== 'hard' ? data.daily[p.id] : data.archive?.[p.id] || data.daily[p.id];
    const status = saved?.status === 'won' ? 'Solved' : saved?.status === 'lost' ? 'Finished' : saved ? 'In progress' : 'Play';
    return `<button class="archive-card" data-puzzle="${p.id}"><strong>${index === null ? esc(p.title) : p.kind === 'hard' ? `Hard #${String(index + 1).padStart(3, '0')}` : `#${String(p.id).padStart(3, '0')}`}</strong><span>${index === null ? 'Bonus relay' : dateLabel(puzzleDate(START_DATE, index))}</span><small>${index === today && !saved ? 'Today' : status} · ${p.difficulty || 'Steady'}</small></button>`;
  };
  $('#archive-list').innerHTML = `${released.length ? '<h3>Daily relays</h3><div class="archive-grid">' + released.map((p, i) => card(p, i)).reverse().join('') + '</div>' : ''}<h3>Bonus collection</h3><div class="archive-grid">${BONUSES.map(p => card(p, null)).join('')}</div>${released.length ? '<h3>Daily challenges</h3><div class="archive-grid">' + CHALLENGES.slice(0, today + 1).map((p, i) => card(p, i)).reverse().join('') + '</div>' : ''}`;
  openDialog('#archive-dialog');
}

function openPuzzle(puzzle, index) {
  practicing = false; selection = null; revealing = false;
  clearTimeout(revealTimer);
  data = readStore();
  if (index === today && puzzle.kind !== 'hard') {
    archivePuzzle = null;
    dailyState = restore(puzzle, data.daily[puzzle.id]);
  } else {
    archivePuzzle = puzzle; archiveIndex = index;
    archiveState = restore(puzzle, data.archive?.[puzzle.id] || data.daily[puzzle.id]);
  }
  history.replaceState(null, '', puzzleLink(location.href, puzzle.id));
  $('#archive-dialog').close();
  announce(''); render(); $('#board').focus({ preventScroll: false });
}

$('#archive-list').addEventListener('click', event => {
  const button = event.target.closest('[data-puzzle]');
  if (!button) return;
  const route = resolvePuzzleLink(`?puzzle=${button.dataset.puzzle}`, PUZZLES, BONUSES, today, CHALLENGES);
  if (route) openPuzzle(route.puzzle, route.index);
});

function renderPostcard() {
  const stamps = postcard(data.results, today, collectionWeek);
  $('#postcard-dates').textContent = `${dateLabel(puzzleDate(START_DATE, stamps[0].day))} to ${dateLabel(puzzleDate(START_DATE, stamps[6].day))}`;
  $('#stamp-count').textContent = `${stamps.filter(s => s.earned).length} of 7 visits`;
  $('#stamps').innerHTML = stamps.map(s => `<div class="postage ${s.earned ? 'earned' : ''}${s.day === today ? ' today' : ''}" aria-label="${dateLabel(puzzleDate(START_DATE, s.day))}: ${s.earned ? 'visit earned' : s.future ? 'upcoming' : 'not collected'}"><span aria-hidden="true">${s.earned ? '&#10003;' : String(puzzleDate(START_DATE, s.day).getUTCDate())}</span><small>${new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(puzzleDate(START_DATE, s.day))}</small></div>`).join('');
  $('#previous-week').disabled = collectionWeek === 0;
  $('#next-week').disabled = collectionWeek >= Math.floor(Math.max(0, today) / 7);
}
$('#previous-week').addEventListener('click', () => { collectionWeek--; renderPostcard(); });
$('#next-week').addEventListener('click', () => { collectionWeek++; renderPostcard(); });

const tutorial = installTutorial({
  done: () => { preferences.tutorial = true; savePreferences(); },
  sound: () => preferences.sound
});
$('#tutorial-button').addEventListener('click', () => { $('#help-dialog').close(); tutorial.open(); });

if (dailyState && dailyState.status !== 'playing') persist();
const linked = resolvePuzzleLink(location.search, PUZZLES, BONUSES, today, CHALLENGES);
if (linked) openPuzzle(linked.puzzle, linked.index);
render();
warnStorage();
if (!preferences.tutorial && !Object.keys(data.daily).length && !Object.keys(data.archive || {}).length) tutorial.open();
