import { START_DATE, PUZZLES, PRACTICE } from './puzzles.js';
import { MAX_CHECKS, DAY_MS, copy, newState, dayIndex, tokens, words, complete, move, undo, reset, check, restore, solve, stats, shareText } from './engine.js';

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
let selection = null;
const currentPuzzle = () => practicing ? PRACTICE : dailyPuzzle;
const currentState = () => practicing ? practiceState : dailyState;

function warnStorage() {
  if (storageOK || $('.storage-warning')) return;
  const warning = document.createElement('p');
  warning.className = 'storage-warning';
  warning.textContent = 'Browser storage is unavailable. You can still play, but your progress will not survive a refresh.';
  $('main').append(warning);
}

function persist() {
  if (practicing || !dailyPuzzle) return;
  const latest = readStore();
  latest.daily[dailyPuzzle.id] = copy(dailyState);
  if (dailyState.status !== 'playing' && !latest.results[today]) latest.results[today] = { status: dailyState.status, checks: dailyState.checks.length };
  data = memory = latest;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { storageOK = false; }
  warnStorage();
}

function announce(message) { $('#message').textContent = message; }
function focusKey(key) { document.querySelector(`[data-focus="${key}"]`)?.focus({ preventScroll: true }); }

function render() {
  const puzzle = currentPuzzle(), state = currentState();
  const active = document.activeElement?.dataset?.focus;
  $('#edition').textContent = practicing ? 'THE PRACTICE RELAY' : `DAILY RELAY ${dailyPuzzle ? `Nº ${String(dailyPuzzle.id).padStart(3, '0')}` : ''}`;
  $('#puzzle-date').textContent = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date()).toUpperCase();
  $('#practice-banner').hidden = !practicing;
  $('#game').hidden = !puzzle;
  $('#unavailable').hidden = Boolean(puzzle);
  if (!puzzle) {
    $('#unavailable-text').textContent = today < 0 ? `The first relay arrives on ${START_DATE} at midnight UTC. In the meantime, try a practice round.` : 'You’ve reached the end of our scheduled relays. More puzzles can be added soon. The practice relay is always here.';
    return;
  }
  $('#puzzle-label').textContent = practicing ? 'YOUR PRACTICE BOARD' : `TODAY’S PUZZLE / ${String(puzzle.id).padStart(3, '0')}`;
  const ended = state.status !== 'playing';
  const signature = words(puzzle, state.board).join('|');
  const feedback = state.checks.find(c => c.signature === signature);
  $('#board').innerHTML = puzzle.starts.map((start, row) => {
    const outgoing = state.board[row];
    const rowTokens = tokens(puzzle, state.board, row);
    const tileHTML = rowTokens.map(token => {
      const selected = token.received ? selection?.row === row - 1 && selection.index === state.board[row - 1]?.index : selection?.row === row && selection.index === token.index;
      const interactive = !ended && (token.received || row < 3);
      const cls = `tile${token.received ? ' received' : ''}${selected ? ' selected' : ''}`;
      if (!interactive) return `<span class="${cls}" aria-label="${token.letter}${token.received ? ', received' : ''}">${token.letter}</span>`;
      const focus = token.received ? `received-${row}` : `letter-${row}-${token.index}`;
      return `<button class="${cls}" data-action="${token.received ? 'received' : 'letter'}" data-row="${row}" data-index="${token.index}" data-focus="${focus}" aria-pressed="${Boolean(selected)}" aria-label="${token.received ? `Reposition received ${token.letter} in row ${row + 1}` : `Send ${token.letter}, letter ${token.index + 1} of ${start}, to row ${row + 2}`}">${token.letter}</button>`;
    }).join('');
    let slots = '';
    if (selection && selection.row + 1 === row) {
      const survivors = [...start].map((letter, index) => ({ letter, index })).filter(t => outgoing?.index !== t.index);
      const positions = [...survivors.map(t => t.index), start.length];
      slots = `<div class="insertion"><p>Place <strong>${puzzle.starts[selection.row][selection.index]}</strong> in row ${row + 1}</p><div class="slot-line">${positions.map((gap, slot) => {
        const label = slot === 0 ? 'first' : slot === positions.length - 1 ? 'last' : `after ${survivors[slot - 1].letter}`;
        return `<button class="slot" data-action="slot" data-gap="${gap}" data-focus="slot-${row}-${gap}" aria-label="Insert ${puzzle.starts[selection.row][selection.index]} ${label}, position ${slot + 1}">+<small>${label}</small></button>`;
      }).join('')}</div></div>`;
    }
    return `<section class="puzzle-row${feedback?.correct[row] ? ' matched' : ''}" aria-label="Row ${row + 1}: ${esc(puzzle.clues[row])}">
      <div class="row-word"><div class="row-meta"><span class="row-number">0${row + 1}</span><span class="starting-word">${start}</span>${outgoing ? ended ? `<span class="starting-word">· ${start[outgoing.index]} sent</span>` : `<button class="sent-edit${selection?.row === row ? ' selected' : ''}" data-action="letter" data-row="${row}" data-index="${outgoing.index}" data-focus="sent-${row}" aria-label="Reposition ${start[outgoing.index]} sent from row ${row + 1}">${start[outgoing.index]} sent · edit</button>` : ''}</div><div class="tile-line">${tileHTML}</div></div>
      <div class="clue-block"><span class="clue-label">MAKE IT MEAN</span><p class="clue">${esc(puzzle.clues[row])}</p>${feedback ? `<span class="row-status${feedback.correct[row] ? ' correct' : ''}">${feedback.correct[row] ? '✓ Clue matched' : '○ Not quite yet'}</span>` : ''}</div>
      ${slots}${row < 3 ? `<span class="flow${outgoing ? ' done' : ''}" aria-hidden="true">↓</span>` : ''}</section>`;
  }).join('');
  $('#undo').disabled = ended || !state.undo.length;
  $('#reset').disabled = ended || state.board.every(m => !m);
  $('#check').disabled = ended || !complete(state);
  $('#check').innerHTML = ended ? state.status === 'won' ? 'Relay complete <span aria-hidden="true">✓</span>' : 'Relay finished' : 'Check relay <span aria-hidden="true">✓</span>';
  $('#checks-label').textContent = `${state.checks.length} of ${MAX_CHECKS} checks used`;
  $('#check-dots').innerHTML = Array.from({ length: 6 }, (_, i) => `<span class="check-dot${i < state.checks.length ? ' used' : ''}"></span>`).join('');
  $('#instruction').textContent = ended ? 'Four words. One handoff. See you for the next relay.' : selection ? `Choose a + slot in row ${selection.row + 2}. Escape cancels.` : complete(state) ? 'All letters delivered. Ready to check your relay?' : 'Select a letter. Find its next home.';
  renderResult(puzzle, state);
  if (active) focusKey(active);
}

function renderResult(puzzle, state) {
  const result = $('#result');
  result.hidden = state.status === 'playing';
  if (result.hidden) { result.innerHTML = ''; return; }
  const won = state.status === 'won';
  const solution = solve(puzzle)[0];
  result.innerHTML = `<span class="eyebrow">${won ? 'A BEAUTIFUL HANDOFF' : 'THE FINISH LINE'}</span><h2 id="result-title">${won ? 'Everything in its place.' : 'Every relay teaches you something.'}</h2><p>${won ? `You connected all four words in <strong>${state.checks.length} ${state.checks.length === 1 ? 'check' : 'checks'}</strong>.` : 'Six checks used. Here’s how this relay comes together.'}</p><div class="solution-words" aria-label="Solution words">${puzzle.answers.map(a => `<span>${a}</span>`).join('')}</div>
    ${!won ? `<ol class="transfer-summary">${solution.map((m, row) => `<li><strong>${puzzle.starts[row][m.index]}</strong> from ${puzzle.starts[row]} to ${puzzle.starts[row + 1]} → ${puzzle.answers[row + 1]}</li>`).join('')}</ol>` : ''}
    <button class="primary-button" id="share-result">Share result <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="5" cy="10" r="2"/><circle cx="15" cy="4" r="2"/><circle cx="15" cy="16" r="2"/><path d="m7 9 6-4M7 11l6 4"/></svg></button>
    ${practicing ? '<button class="text-button" id="replay-practice">Play practice again</button>' : '<p>Next daily relay<span id="countdown" class="countdown"></span><span id="next-note"></span></p>'}`;
  $('#share-result').addEventListener('click', share);
  $('#replay-practice')?.addEventListener('click', () => { practiceState = newState(); selection = null; announce('A fresh practice board.'); render(); $('#board').focus({ preventScroll: true }); });
  updateCountdown();
}

$('#board').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || currentState().status !== 'playing') return;
  const puzzle = currentPuzzle(), state = currentState();
  const action = button.dataset.action;
  if (action === 'letter' || action === 'received') {
    const row = Number(button.dataset.row) - (action === 'received' ? 1 : 0);
    const index = action === 'received' ? state.board[row].index : Number(button.dataset.index);
    selection = selection?.row === row && selection.index === index ? null : { row, index };
    announce('');
    render();
    if (selection && event.detail === 0) $('.slot')?.focus({ preventScroll: true });
    return;
  }
  if (action === 'slot' && selection) {
    const from = selection.row;
    const letter = puzzle.starts[from][selection.index];
    const changed = move(puzzle, state, from, selection.index, Number(button.dataset.gap));
    selection = null;
    if (changed) persist();
    render();
    announce(`${letter} passed to row ${from + 2}.`);
    if (event.detail === 0) focusKey(`received-${from + 1}`);
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && selection && !$('dialog[open]')) {
    const { row, index } = selection;
    selection = null;
    render();
    focusKey(stateHasOutgoing(row, index) ? `sent-${row}` : `letter-${row}-${index}`);
    announce('Selection cancelled.');
  }
});
function stateHasOutgoing(row, index) { return currentState().board[row]?.index === index; }

$('#undo').addEventListener('click', () => {
  if (undo(currentState())) { selection = null; persist(); render(); announce('Last move undone. Checks already used are kept.'); }
});
$('#reset').addEventListener('click', () => {
  if (reset(currentState())) { selection = null; persist(); render(); announce('Board reset. Checks already used are kept.'); }
});
$('#check').addEventListener('click', () => {
  selection = null;
  const outcome = check(currentPuzzle(), currentState());
  if (outcome.kind === 'duplicate') { announce('You’ve already checked this arrangement. No check used. Try a different handoff.'); return; }
  if (outcome.kind === 'incomplete') return;
  persist();
  render();
  announce(outcome.kind === 'won' ? 'Relay complete! All four clues matched.' : outcome.kind === 'lost' ? 'All six checks used. The solution is shown below.' : `${outcome.correct.filter(Boolean).length} of 4 clues matched. Keep going—you can change any transfer.`);
  if (currentState().status !== 'playing') $('#share-result').focus({ preventScroll: false });
});

function openDialog(id) { $(id).showModal(); }
$('#help-button').addEventListener('click', () => openDialog('#help-dialog'));
$('#stats-button').addEventListener('click', () => { renderStats(); openDialog('#stats-dialog'); });
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
}));

function startPractice() {
  $('#help-dialog').close();
  practicing = true;
  selection = null;
  announce('Practice is separate from your daily progress.');
  render();
  $('#board').focus({ preventScroll: false });
}
$('#practice-button').addEventListener('click', startPractice);
$('#unavailable-practice').addEventListener('click', startPractice);
$('#exit-practice').addEventListener('click', () => {
  practicing = false;
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
  $('#stats-content').innerHTML = `<div class="stats-grid">${[[s.played, 'Played'], [s.wins, 'Won'], [s.played ? `${Math.round(s.wins / s.played * 100)}%` : '—', 'Win rate'], [s.current, 'Current streak'], [s.best, 'Best streak']].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('')}</div><h3 class="eyebrow">CHECKS TO THE FINISH</h3><div class="histogram">${s.distribution.map((n, i) => `<div class="bar-row" aria-label="${i + 1} checks: ${n} wins"><span>${i + 1}</span><div class="bar-track"><div class="bar${n ? '' : ' empty'}" style="width:${Math.max(8, n / top * 100)}%">${n}</div></div></div>`).join('')}</div>${s.played ? '' : '<p class="dialog-fineprint">Your first daily relay starts the story.</p>'}`;
}

async function share() {
  const url = new URL('./', window.location.href).href;
  let text = shareText(currentPuzzle(), currentState(), url);
  if (practicing) text = text.replace('#practice', '· Practice');
  if (navigator.share) {
    try { await navigator.share({ text }); announce('Result shared. A good handoff.'); return; }
    catch (error) { if (error.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    announce('Result copied. Ready to pass it on.');
  } catch {
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
  dailyPuzzle = PUZZLES[today];
  data = readStore();
  dailyState = dailyPuzzle ? restore(dailyPuzzle, data.daily[dailyPuzzle.id]) : null;
  if (!practicing) {
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
  if (!practicing) { selection = null; render(); announce('Daily progress updated from another tab.'); }
  if ($('#stats-dialog').open) renderStats();
});

if (dailyState?.status !== 'playing') persist();
render();
warnStorage();
