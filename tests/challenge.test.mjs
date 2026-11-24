import test from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES, CHALLENGES, BONUSES } from '../puzzles.js';
import { newState, move, solve, check, restore, shareText, checkLimit } from '../engine.js';
import { resolvePuzzleLink, saveProgress } from '../progression.js';

test('hard relay ends after three distinct incorrect checks and restores that loss', () => {
  const puzzle = CHALLENGES[0], solution = solve(puzzle)[0], state = newState();
  for (const row of [1,2]) move(puzzle,state,row,solution[row].index,solution[row].gap);
  for (let gap = 0; gap < 3; gap++) {
    move(puzzle,state,0,(solution[0].index+1)%puzzle.starts[0].length,gap);
    assert.equal(check(puzzle,state).kind, gap === 2 ? 'lost' : 'playing');
  }
  assert.equal(state.checks.length,3);
  assert.deepEqual(restore(puzzle,JSON.parse(JSON.stringify(state))),state);
  assert.match(shareText(puzzle,state,'https://example.org/?puzzle=hard-1'), /Score: 0\/3/);
  assert.equal(checkLimit(PUZZLES[0]),3);
});
test('today and past hard links work, future hard relays remain locked', () => {
  assert.equal(resolvePuzzleLink('?puzzle=hard-1',PUZZLES,BONUSES,0,CHALLENGES).puzzle,CHALLENGES[0]);
  assert.equal(resolvePuzzleLink('?puzzle=hard-2',PUZZLES,BONUSES,0,CHALLENGES),null);
  assert.equal(resolvePuzzleLink('?puzzle=hard-1',PUZZLES,BONUSES,8,CHALLENGES).index,0);
});
test('hard challenge save keeps the completed daily result intact', () => {
  const daily=newState(); daily.board=solve(PUZZLES[0])[0]; check(PUZZLES[0],daily);
  const original=saveProgress({daily:{},results:{}},PUZZLES[0],daily,0);
  const hard=newState(); hard.board=solve(CHALLENGES[0])[0]; check(CHALLENGES[0],hard);
  const saved=saveProgress(original,CHALLENGES[0],hard,0,true);
  assert.deepEqual(saved.daily,original.daily);
  assert.deepEqual(saved.results,original.results);
  assert.equal(saved.archive['hard-1'].status,'won');
});
