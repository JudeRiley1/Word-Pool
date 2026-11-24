import test from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE } from '../puzzles.js';
import { newState, move, recall, undo, words, tokens, check, restore, solve, copy, complete } from '../engine.js';

test('returning a received letter cancels only its transfer and restores original order', () => {
  const state = newState();
  move(PRACTICE, state, 0, 0, 0);
  move(PRACTICE, state, 1, 0, 0);
  move(PRACTICE, state, 2, 0, 0);
  const before = copy(state.board);
  assert.ok(recall(state, 1, 0));
  assert.deepEqual(words(PRACTICE, state.board), ['LASS','GRAIN','OW','CRATE']);
  assert.deepEqual(state.board, [before[0],null,before[2]]);
  assert.equal(complete(state), false);
  assert.ok(undo(state));
  assert.deepEqual(state.board, before);
});

test('return keeps spent checks and survives refresh; undo restores the transfer', () => {
  const state = newState();
  for (let row=0; row<3; row++) move(PRACTICE,state,row,1,0);
  check(PRACTICE,state);
  const before = copy(state), checks = copy(state.checks);
  assert.ok(recall(state,0,1));
  assert.deepEqual(state.checks,checks);
  assert.deepEqual(restore(PRACTICE,JSON.parse(JSON.stringify(state))),state);
  assert.ok(undo(state));
  assert.deepEqual(state,before);
});

test('return restores the exact repeated letter identity', () => {
  const state = newState();
  move(PRACTICE,state,0,3,2);
  assert.equal(recall(state,0,4),false);
  assert.ok(recall(state,0,3));
  assert.deepEqual(tokens(PRACTICE,state.board,0).map(t=>t.index),[0,1,2,3,4]);
  assert.equal(words(PRACTICE,state.board)[0],'GLASS');
});

test('empty, invalid and completed transfers cannot be recalled', () => {
  const state = newState();
  for (const row of [-1,3,undefined,1.5]) assert.equal(recall(state,row,0),false);
  assert.equal(recall(state,0,0),false);
  state.board = solve(PRACTICE)[0]; check(PRACTICE,state);
  const before = copy(state);
  assert.equal(recall(state,0,state.board[0].index),false);
  assert.deepEqual(state,before);
});
