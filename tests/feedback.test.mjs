import test from 'node:test';
import assert from 'node:assert/strict';
import { letterFeedback } from '../engine.js';
import { insertionGap } from '../progression.js';

test('letter colors distinguish exact positions, misplaced letters and extras', () => {
  assert.deepEqual(letterFeedback('TONE', 'TONE'), ['correct','correct','correct','correct']);
  assert.deepEqual(letterFeedback('SCLD', 'SOLD'), ['correct','absent','correct','correct']);
  assert.deepEqual(letterFeedback('ATO', 'CAT'), ['present','present','absent']);
  assert.deepEqual(letterFeedback('ARKB', 'BARK'), ['present','present','present','present']);
});
test('exact letters take priority over duplicate misplaced letters', () => {
  assert.deepEqual(letterFeedback('LLAMA', 'ALARM'), ['absent','correct','correct','present','present']);
  assert.deepEqual(letterFeedback('EERIE', 'SERVE'), ['absent','correct','correct','absent','correct']);
  assert.deepEqual(letterFeedback('AAAA', 'BARK'), ['absent','correct','absent','absent']);
});
test('every non-gray letter consumes at most one matching answer letter', () => {
  for (const [word,answer] of [['LEVEL','HELLO'],['ABBA','BAAB'],['EEEEE','SHEEP'],['TEETH','THREE']]) {
    const colors = letterFeedback(word, answer);
    for (const letter of new Set(word)) {
      const count = [...word].filter((l,i)=>l===letter && colors[i]!=='absent').length;
      assert.ok(count <= [...answer].filter(l=>l===letter).length);
    }
  }
});
test('drop targeting retains original gap indices across missing and repeated letters', () => {
  const positions = [{ index: 1, center: 100 }, { index: 2, center: 150 }, { index: 4, center: 200 }];
  assert.equal(insertionGap(positions, 20, 5), 1);
  assert.equal(insertionGap(positions, 125, 5), 2);
  assert.equal(insertionGap(positions, 180, 5), 4);
  assert.equal(insertionGap(positions, 250, 5), 5);
});
