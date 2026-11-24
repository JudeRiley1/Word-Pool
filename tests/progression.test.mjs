import test from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES, BONUSES, START_DATE } from '../puzzles.js';
import { newState, solve, check, shareText } from '../engine.js';
import { resolvePuzzleLink, puzzleLink, puzzleDate, postcard, saveProgress } from '../progression.js';

test('shared puzzle links resolve only released daily puzzles and bonus puzzles', () => {
  assert.equal(resolvePuzzleLink('?puzzle=1', PUZZLES, BONUSES, 0).index, 0);
  assert.equal(resolvePuzzleLink('?puzzle=2', PUZZLES, BONUSES, 0), null);
  assert.equal(resolvePuzzleLink('?puzzle=1', PUZZLES, BONUSES, -1), null);
  assert.equal(resolvePuzzleLink('?puzzle=NaN', PUZZLES, BONUSES, 20), null);
  assert.equal(resolvePuzzleLink('?puzzle=<script>', PUZZLES, BONUSES, 20), null);
  assert.equal(resolvePuzzleLink('?puzzle=bonus-1', PUZZLES, BONUSES, 0).puzzle, BONUSES[0]);
  assert.equal(resolvePuzzleLink('?puzzle=1', PUZZLES, BONUSES, 5).puzzle, PUZZLES[0]);
});
test('share links keep the project path and replace old parameters and fragments', () => {
  assert.equal(puzzleLink('https://example.org/Letter-Relay/?puzzle=2#board', 'bonus-1'), 'https://example.org/Letter-Relay/?puzzle=bonus-1');
});
test('archive wins never alter daily boards, result ledger or streak stamps', () => {
  const daily = newState(), state = newState();
  state.board = solve(PUZZLES[0])[0]; check(PUZZLES[0], state);
  const store = { version: 1, daily: { 2: daily }, results: {} };
  const saved = saveProgress(store, PUZZLES[0], state, 1, true);
  assert.deepEqual(saved.daily, store.daily);
  assert.deepEqual(saved.results, {});
  assert.equal(saved.archive[1].status, 'won');
  assert.equal(store.archive, undefined);
  assert.equal(postcard(saved.results, 1).filter(s => s.earned).length, 0);
});
test('daily completion adds exactly one result and preserves archive progress', () => {
  const state = newState(); state.board = solve(PUZZLES[0])[0]; check(PUZZLES[0], state);
  const store = { version: 1, daily: {}, results: {}, archive: { 'bonus-1': newState() } };
  const saved = saveProgress(store, PUZZLES[0], state, 0);
  assert.equal(saved.results[0].checks, 1);
  assert.deepEqual(saved.archive, store.archive);
  state.checks.push(state.checks[0]);
  assert.equal(saveProgress(saved, PUZZLES[0], state, 0).results[0].checks, 1);
});
test('stamps reward completed daily puzzles including losses, not future or incomplete games', () => {
  const stamps = postcard({ 0: { status: 'won' }, 1: { status: 'lost' }, 2: { status: 'playing' }, 6: { status: 'won' } }, 3);
  assert.deepEqual(stamps.filter(s => s.earned).map(s => s.day), [0, 1]);
  assert.equal(stamps[4].future, true);
});
test('weekly postcards roll over and past collections remain accessible', () => {
  assert.deepEqual(postcard({}, 7).map(s => s.day), [7,8,9,10,11,12,13]);
  assert.equal(postcard({ 0: { status: 'won' } }, 7, 0)[0].earned, true);
  assert.equal(puzzleDate(START_DATE, 89).toISOString(), '2027-02-21T00:00:00.000Z');
});
test('share grid uses one line per check and four clues per line without revealing words', () => {
  const state = { status: 'won', checks: [{ correct: [true,false,true,false] }, { correct: [true,true,true,true] }] };
  const text = shareText(PUZZLES[0], state, 'https://example.org/?puzzle=1');
  assert.ok(text.includes('\u{1F7E9}\u2b1c\u{1F7E9}\u2b1c\n\u{1F7E9}\u{1F7E9}\u{1F7E9}\u{1F7E9}'));
  for (const word of [...PUZZLES[0].starts, ...PUZZLES[0].answers]) assert.ok(!text.includes(word));
});
