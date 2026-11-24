import { DAY_MS } from './engine.js';

export function puzzleDate(start, index) {
  return new Date(Date.parse(`${start}T00:00:00Z`) + index * DAY_MS);
}

// Original indices keep insertion stable even after a destination letter leaves.
export function insertionGap(positions, x, length) {
  return positions.find(position => x < position.center)?.index ?? length;
}

// Shared links never unlock a future daily puzzle.
export function resolvePuzzleLink(search, puzzles, bonuses, today, challenges = []) {
  const id = new URLSearchParams(search).get('puzzle');
  if (!id) return null;
  const hardIndex = challenges.findIndex(p => String(p.id) === id);
  if (hardIndex >= 0) return hardIndex <= today ? { puzzle: challenges[hardIndex], index: hardIndex } : null;
  const bonus = bonuses.find(p => String(p.id) === id);
  if (bonus) return { puzzle: bonus, index: null };
  const index = puzzles.findIndex(p => String(p.id) === id);
  return index >= 0 && index <= today ? { puzzle: puzzles[index], index } : null;
}

export function puzzleLink(href, id) {
  const url = new URL(href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('puzzle', id);
  return url.href;
}

export function postcard(results, today, week = Math.floor(Math.max(0, today) / 7)) {
  const start = Math.max(0, week) * 7;
  return Array.from({ length: 7 }, (_, n) => {
    const day = start + n;
    const result = results[day];
    return { day, earned: day <= today && ['won', 'lost'].includes(result?.status), future: day > today };
  });
}

export function saveProgress(store, puzzle, state, today, archive = false) {
  const next = structuredClone(store);
  if (archive) {
    next.archive ??= {};
    next.archive[puzzle.id] = structuredClone(state);
  } else {
    next.daily[puzzle.id] = structuredClone(state);
    if (state.status !== 'playing' && !next.results[today]) {
      next.results[today] = { status: state.status, checks: state.checks.length };
    }
  }
  return next;
}
