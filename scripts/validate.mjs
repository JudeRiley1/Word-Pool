import assert from 'node:assert/strict';
import { PUZZLES, PRACTICE, START_DATE } from '../puzzles.js';
import { solve, words, DAY_MS } from '../engine.js';

const boards = new Set();
const answers = new Set();
const ids = new Set();
assert.ok(PUZZLES.length >= 30, 'At least 30 launch puzzles are required');
for (const puzzle of [PRACTICE, ...PUZZLES]) {
  assert.ok(!ids.has(puzzle.id), `Repeated ID ${puzzle.id}`);
  ids.add(puzzle.id);
  for (const field of ['starts', 'clues', 'answers']) assert.equal(puzzle[field].length, 4);
  for (const word of [...puzzle.starts, ...puzzle.answers]) assert.match(word, /^[A-Z]{2,8}$/);
  for (const clue of puzzle.clues) assert.ok(clue.length >= 8 && clue.length <= 65, `Check clue length: ${clue}`);
  assert.equal(new Set(puzzle.clues).size, 4, `Repeated clue in ${puzzle.id}`);
  const startKey = puzzle.starts.join('|'), answerKey = puzzle.answers.join('|');
  assert.ok(!boards.has(startKey), `Repeated board ${puzzle.id}`);
  assert.ok(!answers.has(answerKey), `Repeated answer set ${puzzle.id}`);
  boards.add(startKey); answers.add(answerKey);
  const solutions = solve(puzzle);
  assert.ok(solutions.length > 0, `Puzzle ${puzzle.id} is impossible`);
  for (const solution of solutions) assert.deepEqual(words(puzzle, solution), puzzle.answers);
  // Repeated letters or gaps adjacent to a sent letter may have equivalent identities.
  const routes = new Set(solutions.map(s => s.map((m, row) => puzzle.starts[row][m.index]).join('')));
  assert.equal(routes.size, 1, `Puzzle ${puzzle.id} has different transfer-letter solutions`);
  console.log(`${String(puzzle.id).padStart(8)}  ${puzzle.starts.join(' / ')}  →  ${puzzle.answers.join(' / ')}  [${[...routes][0]}]`);
}
const last = new Date(Date.parse(`${START_DATE}T00:00:00Z`) + (PUZZLES.length - 1) * DAY_MS).toISOString().slice(0, 10);
console.log(`\nAll ${PUZZLES.length} daily puzzles and the practice puzzle are valid. Schedule: ${START_DATE} through ${last} (UTC).`);
console.log('Clue meanings and common alternative answers are editorially reviewed; this validator checks structure, uniqueness and legal transfers.');
