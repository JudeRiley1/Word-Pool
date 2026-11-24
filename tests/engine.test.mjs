import test from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES, PRACTICE, START_DATE, BONUSES, CHALLENGES } from '../puzzles.js';
import { newState, copy, words, tokens, solve, move, undo, reset, check, restore, stats, dayIndex, shareText, validBoard } from '../engine.js';

const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
for (const puzzle of [PRACTICE, ...PUZZLES, ...BONUSES, ...CHALLENGES]) {
  test(`puzzle ${puzzle.id} solves through actual moves in all six orders`, () => {
    const solution = solve(puzzle)[0];
    assert.ok(solution, 'Must have a legal solution');
    for (const order of orders) {
      const state = newState();
      for (const row of order) assert.ok(move(puzzle, state, row, solution[row].index, solution[row].gap));
      assert.deepEqual(words(puzzle, state.board), puzzle.answers);
      assert.equal(check(puzzle, state).kind, 'won');
      assert.equal(state.checks.length, 1);
      assert.equal(move(puzzle, state, 0, 0, 0), false, 'Completed board is locked');
      assert.equal(reset(state), false);
      assert.deepEqual(restore(puzzle, JSON.parse(JSON.stringify(state))), state);
    }
  });
}

test('practice bottom-up relay, original order and received identity', () => {
  const state = newState();
  move(PRACTICE, state, 2, 0, 0);
  assert.deepEqual(words(PRACTICE, state.board), ['GLASS', 'RAIN', 'OW', 'CRATE']);
  move(PRACTICE, state, 0, 0, 0);
  assert.deepEqual(words(PRACTICE, state.board), ['LASS', 'GRAIN', 'OW', 'CRATE']);
  move(PRACTICE, state, 1, 0, 0);
  assert.deepEqual(words(PRACTICE, state.board), PRACTICE.answers);
  assert.equal(tokens(PRACTICE, state.board, 1)[0].received, true);
  assert.equal(move(PRACTICE, state, 1, -1, 0), false, 'Received token cannot be sent');
});

test('repeated letters retain distinct identities; relocating a transfer restores the old letter', () => {
  const state = newState();
  move(PRACTICE, state, 0, 3, 2);
  assert.deepEqual(tokens(PRACTICE, state.board, 0).map(t => t.index), [0, 1, 2, 4]);
  move(PRACTICE, state, 0, 4, 2);
  assert.deepEqual(tokens(PRACTICE, state.board, 0).map(t => t.index), [0, 1, 2, 3]);
  assert.equal(words(PRACTICE, state.board)[1], 'RASIN');
  move(PRACTICE, state, 0, 0, 0);
  assert.equal(words(PRACTICE, state.board)[0], 'LASS');
  assert.equal(words(PRACTICE, state.board)[1], 'GRAIN');
});

test('check only complete boards, duplicate submissions, undo and reset preserve checks', () => {
  const state = newState();
  assert.equal(check(PRACTICE, state).kind, 'incomplete');
  for (let row = 0; row < 3; row++) move(PRACTICE, state, row, 1, 0);
  assert.equal(check(PRACTICE, state).kind, 'playing');
  assert.equal(check(PRACTICE, state).kind, 'duplicate');
  assert.equal(state.checks.length, 1);
  const previous = copy(state.board);
  move(PRACTICE, state, 0, 2, 0);
  undo(state);
  assert.deepEqual(state.board, previous);
  assert.equal(check(PRACTICE, state).kind, 'duplicate');
  reset(state);
  assert.deepEqual(state.board, [null, null, null]);
  assert.equal(state.checks.length, 1);
  undo(state);
  assert.deepEqual(state.board, previous);
  assert.equal(state.checks.length, 1);
});

test('six distinct unsuccessful checks end and restore a loss', () => {
  const state = newState();
  move(PRACTICE, state, 1, 1, 0);
  move(PRACTICE, state, 2, 1, 0);
  const arrangements = [[0, 0], [0, 1], [0, 3], [0, 4], [1, 0], [1, 1]];
  for (let i = 0; i < 6; i++) {
    move(PRACTICE, state, 0, ...arrangements[i]);
    assert.equal(check(PRACTICE, state).kind, i === 5 ? 'lost' : 'playing');
  }
  assert.equal(state.checks.length, 6);
  assert.deepEqual(restore(PRACTICE, state), state);
  assert.equal(undo(state), false);
});

test('saved progress survives serialization and malformed data recovers safely', () => {
  const state = newState();
  move(PRACTICE, state, 2, 0, 0);
  assert.deepEqual(restore(PRACTICE, JSON.parse(JSON.stringify(state))), state);
  assert.deepEqual(restore(PRACTICE, { board: [null, { index: 99, gap: 0 }, null], checks: [] }), newState());
  assert.deepEqual(restore(PRACTICE, { ...state, checks: [{ signature: 'oops', correct: [] }] }), newState());
  assert.equal(validBoard(PRACTICE, [null, null, { index: -1, gap: 0 }]), false);
});

test('UTC rollover and schedule boundaries are independent of local timezone', () => {
  assert.equal(dayIndex(START_DATE, Date.parse('2026-11-23T23:59:59.999Z')), -1);
  assert.equal(dayIndex(START_DATE, Date.parse('2026-11-24T00:00:00Z')), 0);
  assert.equal(dayIndex(START_DATE, Date.parse('2026-11-24T18:00:00-06:00')), 1);
  assert.equal(dayIndex(START_DATE, Date.parse('2026-12-23T23:59:59Z')), 29);
  assert.equal(PUZZLES[dayIndex(START_DATE, Date.parse('2026-12-24T00:00:00Z'))].id, 31);
  assert.equal(PUZZLES[dayIndex(START_DATE, Date.parse('2027-02-22T00:00:00Z'))], undefined);
});

test('stats count wins, losses, gaps and streak grace on an unplayed current day', () => {
  const ledger = { 0: { status: 'won', checks: 1 }, 1: { status: 'won', checks: 2 }, 2: { status: 'lost', checks: 6 }, 4: { status: 'won', checks: 2 }, 5: { status: 'won', checks: 6 } };
  assert.deepEqual(stats(ledger, 6), { played: 5, wins: 4, current: 2, best: 2, distribution: [1, 2, 0, 0, 0, 1] });
  assert.equal(stats(ledger, 7).current, 0);
  assert.equal(stats(ledger, 2).current, 0);
  assert.deepEqual(stats({}, 0), { played: 0, wins: 0, current: 0, best: 0, distribution: [0, 0, 0, 0, 0, 0] });
});

test('share format contains checks and link, with no answers or clues', () => {
  const puzzle = PUZZLES[0], state = newState();
  state.board = solve(puzzle)[0];
  check(puzzle, state);
  const text = shareText(puzzle, state, 'https://example.org/letter-relay/');
  assert.equal(text, 'Word Pool #001\n1/6 checks\n🟩\n🟩\n🟩\n🟩\nPlay this relay: https://example.org/letter-relay/');
  for (const secret of [...puzzle.starts, ...puzzle.answers, ...puzzle.clues]) assert.ok(!text.includes(secret));
  state.status = 'lost';
  assert.match(shareText(puzzle, state, 'https://example.org/'), /X\/6/);
});
