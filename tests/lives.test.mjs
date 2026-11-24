import test from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE } from '../puzzles.js';
import { newState, move, check, solve, livesRemaining, score, restore, words, shareText, undo, reset } from '../engine.js';

function wrong(state, gap) {
  move(PRACTICE, state, 1, 1, 0); move(PRACTICE, state, 2, 1, 0); move(PRACTICE, state, 0, 0, gap);
  return check(PRACTICE, state);
}
test('only incorrect distinct checks cost lives; the third check can win with one life', () => {
  const state = newState();
  assert.equal(livesRemaining(state), 3);
  assert.equal(wrong(state, 0).kind, 'playing');
  assert.equal(livesRemaining(state), 2);
  assert.equal(check(PRACTICE, state).kind, 'duplicate');
  assert.equal(livesRemaining(state), 2);
  wrong(state, 1);
  state.board = solve(PRACTICE)[0];
  assert.equal(check(PRACTICE, state).kind, 'won');
  assert.equal(livesRemaining(state), 1); assert.equal(score(state), 1);
  assert.deepEqual(restore(PRACTICE, JSON.parse(JSON.stringify(state))), state);
  assert.match(shareText(PRACTICE, state, 'https://example.org/game'), /Score: 1\/3\n\u{1F499}\u{1F90D}\u{1F90D}/u);
});
test('undo, reset and reload never refund lives; loss scores zero and locks moves', () => {
  const state = newState(); wrong(state, 0); reset(state); undo(state);
  assert.equal(livesRemaining(state), 2);
  assert.equal(livesRemaining(restore(PRACTICE, state)), 2);
  wrong(state, 1); assert.equal(wrong(state, 3).kind, 'lost');
  assert.equal(livesRemaining(state), 0); assert.equal(score(state), 0);
  assert.equal(move(PRACTICE, state, 0, 1, 0), false);
});
test('old unfinished saves keep their moves and spent lives', () => {
  const saved = newState(); wrong(saved, 0); wrong(saved, 1); delete saved.rulesVersion;
  const restored = restore(PRACTICE, saved);
  assert.equal(restored.rulesVersion, 2); assert.equal(restored.status, 'playing');
  assert.equal(livesRemaining(restored), 1); assert.deepEqual(restored.board, saved.board);
});
test('completed games from the former six-check rules retain their result and history', () => {
  const saved = newState(); delete saved.rulesVersion;
  saved.board = [{ index: 0, gap: 0 }, { index: 1, gap: 0 }, { index: 1, gap: 0 }];
  for (const gap of [0, 1, 3, 4]) {
    saved.board[0].gap = gap;
    const submitted = words(PRACTICE, saved.board);
    saved.checks.push({ signature: submitted.join('|'), correct: submitted.map((word, row) => word === PRACTICE.answers[row]) });
  }
  saved.board = solve(PRACTICE)[0];
  saved.checks.push({ signature: PRACTICE.answers.join('|'), correct: [true,true,true,true] }); saved.status = 'won';
  const restored = restore(PRACTICE, saved);
  assert.equal(restored.status, 'won'); assert.equal(restored.rulesVersion, 1); assert.equal(restored.checks.length, 5);
  assert.deepEqual(restore(PRACTICE, restored), restored);
  assert.match(shareText(PRACTICE, restored, 'https://example.org'), /Previous rules · 5 checks/);
});
