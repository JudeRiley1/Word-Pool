export const MAX_CHECKS = 3;
export const checkLimit = () => MAX_CHECKS;
export const wrongChecks = state => state.checks.filter(c => !c.correct.every(Boolean)).length;
export const livesRemaining = state => Math.max(0, MAX_CHECKS - wrongChecks(state));
export const score = state => state.status === 'won' ? livesRemaining(state) : 0;
export const DAY_MS = 86400000;
export const copy = value => JSON.parse(JSON.stringify(value));
export const emptyBoard = () => [null, null, null];
export const newState = () => ({ rulesVersion: 2, board: emptyBoard(), undo: [], checks: [], feedbackBoard: null, status: 'playing' });

export function dayIndex(startDate, now = Date.now()) {
  return Math.floor((now - Date.parse(`${startDate}T00:00:00Z`)) / DAY_MS);
}

// A gap is anchored to the ORIGINAL destination word. Removing an original
// letter never removes, transfers, or reorders an incoming letter.
export function tokens(puzzle, board, row) {
  const result = [];
  const incoming = row > 0 ? board[row - 1] : null;
  const outgoing = row < 3 ? board[row] : null;
  for (let i = 0; i <= puzzle.starts[row].length; i++) {
    if (incoming && incoming.gap === i) {
      result.push({ letter: puzzle.starts[row - 1][incoming.index], received: true, index: -1 });
    }
    if (i < puzzle.starts[row].length && outgoing?.index !== i) {
      result.push({ letter: puzzle.starts[row][i], received: false, index: i });
    }
  }
  return result;
}

export const words = (puzzle, board) => puzzle.starts.map((_, row) => tokens(puzzle, board, row).map(t => t.letter).join(''));
export const complete = state => state.board.every(Boolean);

// Match exact positions first, then spend each remaining answer letter once.
export function letterFeedback(word, answer) {
  const colors = [...word].map((letter, i) => letter === answer[i] ? 'correct' : 'absent');
  const remaining = new Map();
  [...answer].forEach((letter, i) => { if (colors[i] !== 'correct') remaining.set(letter, (remaining.get(letter) || 0) + 1); });
  [...word].forEach((letter, i) => {
    if (colors[i] !== 'correct' && remaining.get(letter) > 0) {
      colors[i] = 'present'; remaining.set(letter, remaining.get(letter) - 1);
    }
  });
  return colors;
}

// Feedback belongs to a physical tile and its last tested position, not to a
// letter value: repeated letters may have different results.
export function tileFeedback(puzzle, state) {
  const board = state.feedbackBoard;
  if (!board) return {};
  const feedback = {};
  puzzle.starts.forEach((_, row) => {
    const rowTokens = tokens(puzzle, board, row);
    const colors = letterFeedback(rowTokens.map(t => t.letter).join(''), puzzle.answers[row]);
    rowTokens.forEach((token, position) => {
      const key = token.received ? `${row - 1}-${board[row - 1].index}` : `${row}-${token.index}`;
      feedback[key] = { color: colors[position], row, position };
    });
  });
  return feedback;
}

export function nextAttempt(state) {
  if (state.status !== 'playing' || !complete(state) || !state.feedbackBoard) return false;
  state.board = emptyBoard();
  state.undo = [];
  return true;
}

export function validBoard(puzzle, board) {
  return Array.isArray(board) && board.length === 3 && board.every((m, row) => m === null || (
    m && Number.isInteger(m.index) && m.index >= 0 && m.index < puzzle.starts[row].length &&
    Number.isInteger(m.gap) && m.gap >= 0 && m.gap <= puzzle.starts[row + 1].length
  ));
}

export function move(puzzle, state, row, index, gap) {
  if (state.status !== 'playing' || !Number.isInteger(row) || row < 0 || row > 2) return false;
  const next = copy(state.board);
  next[row] = { index, gap };
  if (!validBoard(puzzle, next) || JSON.stringify(next) === JSON.stringify(state.board)) return false;
  state.undo.push(copy(state.board));
  state.undo = state.undo.slice(-100);
  state.board = next;
  return true;
}

export function recall(state, row, index) {
  if (state.status !== 'playing' || !Number.isInteger(row) || row < 0 || row > 2 || !state.board[row] || state.board[row].index !== index) return false;
  state.undo.push(copy(state.board));
  state.undo = state.undo.slice(-100);
  state.board[row] = null;
  return true;
}

export function undo(state) {
  if (state.status !== 'playing' || !state.undo.length) return false;
  state.board = state.undo.pop();
  return true;
}

export function reset(state) {
  if (state.status !== 'playing' || state.board.every(m => !m)) return false;
  state.undo.push(copy(state.board));
  state.board = emptyBoard();
  return true;
}

export function check(puzzle, state) {
  if (state.status !== 'playing' || !complete(state)) return { kind: 'incomplete' };
  const currentWords = words(puzzle, state.board);
  const signature = currentWords.join('|');
  state.feedbackBoard = copy(state.board);
  const previous = state.checks.find(c => c.signature === signature);
  if (previous) return { kind: 'duplicate', correct: previous.correct };
  const correct = currentWords.map((word, row) => word === puzzle.answers[row]);
  state.checks.push({ signature, correct });
  if (correct.every(Boolean)) state.status = 'won';
  else if (livesRemaining(state) === 0) state.status = 'lost';
  return { kind: state.status, correct };
}

export function restore(puzzle, saved) {
  if (!saved || !validBoard(puzzle, saved.board) || !Array.isArray(saved.checks) || saved.checks.length > (saved.rulesVersion === 2 ? 3 : 6)) return newState();
  const signatures = new Set();
  for (const c of saved.checks) {
    if (typeof c.signature !== 'string' || signatures.has(c.signature) || !Array.isArray(c.correct) || c.correct.length !== 4 || c.correct.some(v => typeof v !== 'boolean')) return newState();
    const submitted = c.signature.split('|');
    if (submitted.length !== 4 || c.correct.some((v, row) => v !== (submitted[row] === puzzle.answers[row]))) return newState();
    signatures.add(c.signature);
  }
  const checks = copy(saved.checks);
  const wonAt = checks.findIndex(c => c.correct.every(Boolean));
  if (wonAt !== -1 && wonAt !== checks.length - 1) return newState();
  const legacyComplete = saved.rulesVersion !== 2 && (wonAt !== -1 || checks.length >= (puzzle.maxChecks ?? 6));
  const status = wonAt !== -1 ? 'won' : legacyComplete || checks.length >= 3 ? 'lost' : 'playing';
  if ((saved.rulesVersion === 2 || legacyComplete) && status !== 'playing' && words(puzzle, saved.board).join('|') !== checks.at(-1).signature) return newState();
  return {
    rulesVersion: saved.rulesVersion !== 2 && status !== 'playing' ? 1 : 2,
    board: copy(saved.board), checks, status,
    feedbackBoard: validBoard(puzzle, saved.feedbackBoard) && saved.feedbackBoard.every(Boolean) && signatures.has(words(puzzle, saved.feedbackBoard).join('|')) ? copy(saved.feedbackBoard) : null,
    undo: Array.isArray(saved.undo) ? saved.undo.filter(b => validBoard(puzzle, b)).slice(-100).map(copy) : []
  };
}

// Enumerate the real transfer rules, preserving original letter identities.
export function solve(puzzle) {
  const results = [];
  const visit = (board, row) => {
    if (row === 3) {
      if (words(puzzle, board)[3] === puzzle.answers[3]) results.push(copy(board));
      return;
    }
    for (let index = 0; index < puzzle.starts[row].length; index++) {
      for (let gap = 0; gap <= puzzle.starts[row + 1].length; gap++) {
        board[row] = { index, gap };
        if (words(puzzle, board)[row] === puzzle.answers[row]) visit(board, row + 1);
      }
    }
    board[row] = null;
  };
  visit(emptyBoard(), 0);
  return results;
}

export function stats(results, today) {
  const entries = Object.entries(results).filter(([day, r]) => Number.isInteger(Number(day)) && Number(day) <= today && ['won', 'lost'].includes(r.status)).sort((a, b) => Number(a[0]) - Number(b[0]));
  const distribution = [0, 0, 0, 0, 0, 0];
  let wins = 0, best = 0, run = 0, previous = -Infinity;
  for (const [key, result] of entries) {
    const day = Number(key);
    if (result.status === 'won') {
      wins++;
      run = day === previous + 1 ? run + 1 : 1;
      best = Math.max(best, run);
      if (result.checks >= 1 && result.checks <= 6) distribution[result.checks - 1]++;
    } else run = 0;
    previous = day;
  }
  const current = previous >= today - 1 ? run : 0;
  return { played: entries.length, wins, current, best, distribution };
}

export function shareText(puzzle, state, url) {
  const label = puzzle.id === 'practice' ? '· Practice' : puzzle.kind === 'hard' ? `· Hard #${String(puzzle.id).split('-').at(-1).padStart(3, '0')}` : puzzle.title ? `· ${puzzle.title}` : `#${String(puzzle.id).padStart(3, '0')}`;
  const won = state.status === 'won';
  const result = state.rulesVersion === 1 ? `${won ? 'Pool cleared' : 'Round finished'} · Previous rules · ${state.checks.length} checks` : `${won ? 'Pool cleared' : 'Out of lives'} · Score: ${score(state)}/3\n${'💙'.repeat(score(state))}${'🤍'.repeat(3 - score(state))}`;
  // Each line is one check, with one square for each of the four clues.
  const grid = state.checks.map(c => c.correct.map(hit => hit ? '🟩' : '⬜').join('')).join('\n');
  return `🌊 Word Pool ${label}\n${result}\n\n${grid}\n\nYour turn to dive in\n${url}`;
}
