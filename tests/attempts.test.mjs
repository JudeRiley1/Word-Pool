import test from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE, PUZZLES } from '../puzzles.js';
import { newState, move, check, nextAttempt, tileFeedback, livesRemaining, words, restore, solve, undo, reset } from '../engine.js';

function wrong(state, gap = 0) {
  move(PRACTICE, state, 0, 0, gap);
  move(PRACTICE, state, 1, 1, 0);
  move(PRACTICE, state, 2, 1, 0);
  return check(PRACTICE, state);
}

test('a fresh attempt restores starting words while keeping checked tile identities and spent lives', () => {
  const state = newState();
  assert.equal(wrong(state).kind, 'playing');
  const feedback = tileFeedback(PRACTICE, state);
  const submitted = structuredClone(state.board);
  assert.equal(Object.keys(feedback).length, PRACTICE.starts.join('').length);
  assert.equal(feedback['0-0'].row, 1, 'The transferred G was tested in the second row');
  assert.ok(nextAttempt(state));
  assert.deepEqual(words(PRACTICE, state.board), PRACTICE.starts);
  assert.deepEqual(state.feedbackBoard, submitted);
  assert.deepEqual(tileFeedback(PRACTICE, state), feedback);
  assert.equal(livesRemaining(state), 2);
  assert.equal(state.checks.length, 1);
  assert.equal(undo(state), false, 'Undo cannot bring back a spent attempt');
  assert.deepEqual(restore(PRACTICE, JSON.parse(JSON.stringify(state))), state);
});

test('moving, returning and resetting tiles never recomputes unchecked feedback', () => {
  const state = newState();
  wrong(state); nextAttempt(state);
  const before = tileFeedback(PRACTICE, state);
  move(PRACTICE, state, 0, 2, 1);
  assert.deepEqual(tileFeedback(PRACTICE, state), before);
  reset(state);
  assert.deepEqual(tileFeedback(PRACTICE, state), before);
  undo(state);
  assert.deepEqual(tileFeedback(PRACTICE, state), before);
});

test('repeated letters keep separate feedback when they return home', () => {
  const puzzle = { starts: ['ABA', 'CA', 'DA', 'EA'], answers: ['BA', 'ACA', 'DA', 'EA'] };
  const state = newState();
  move(puzzle, state, 0, 2, 0);
  move(puzzle, state, 1, 1, 0);
  move(puzzle, state, 2, 1, 0);
  check(puzzle, state);
  const before = tileFeedback(puzzle, state);
  assert.equal(before['0-0'].color, 'present');
  assert.equal(before['0-2'].color, 'correct');
  assert.ok(nextAttempt(state));
  assert.deepEqual(tileFeedback(puzzle, state), before);
  assert.deepEqual(restore(puzzle, state), state);
});

test('a repeated guess resets for free and updates the last-reviewed tile mapping', () => {
  const state = newState();
  wrong(state); nextAttempt(state);
  assert.equal(wrong(state).kind, 'duplicate');
  assert.ok(nextAttempt(state));
  assert.equal(livesRemaining(state), 2);
  assert.equal(state.checks.length, 1);
  assert.deepEqual(words(PRACTICE, state.board), PRACTICE.starts);
});

test('wins and the last losing guess remain on the board', () => {
  const won = newState(); won.board = solve(PUZZLES[0])[0];
  check(PUZZLES[0], won);
  assert.equal(nextAttempt(won), false);
  assert.deepEqual(words(PUZZLES[0], won.board), PUZZLES[0].answers);
  const lost = newState();
  for (const gap of [0, 1, 3]) { wrong(lost, gap); nextAttempt(lost); }
  assert.equal(lost.status, 'lost');
  assert.equal(nextAttempt(lost), false);
  assert.equal(words(PRACTICE, lost.board).join('|'), lost.checks.at(-1).signature);
  assert.deepEqual(restore(PRACTICE, lost), lost);
});

test('legacy saves remain playable and invalid feedback cannot reveal unchecked answers', () => {
  const state = newState(); wrong(state);
  delete state.feedbackBoard;
  const legacy = restore(PRACTICE, state);
  assert.deepEqual(legacy.board, state.board);
  assert.equal(legacy.feedbackBoard, null);
  assert.equal(livesRemaining(legacy), 2);
  for (const board of [[], [null,null,null], solve(PRACTICE)[0], [{index:99,gap:0},null,null]]) {
    const restored = restore(PRACTICE, { ...state, feedbackBoard: board });
    assert.equal(restored.feedbackBoard, null);
    assert.equal(restored.checks.length, 1, 'Ignore only invalid optional feedback');
  }
});
