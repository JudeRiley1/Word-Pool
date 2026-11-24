import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverShare } from '../sharing.js';

const text = 'Letter Relay #001 · 1/6\n● ● ● ●\nhttps://example.org/';
test('native sharing receives only the spoiler-free text', async () => {
  let received;
  const result = await deliverShare(text, { nativeShare: async input => { received = input; }, copyText: () => assert.fail('Native success must not copy') });
  assert.equal(result, 'shared');
  assert.deepEqual(received, { text });
});
test('cancelling native sharing does not unexpectedly copy', async () => {
  assert.equal(await deliverShare(text, { nativeShare: async () => { throw { name: 'AbortError' }; }, copyText: () => assert.fail('Cancel must not copy') }), 'cancelled');
});
test('unsupported native sharing falls back to clipboard', async () => {
  let received;
  assert.equal(await deliverShare(text, { copyText: async value => { received = value; } }), 'copied');
  assert.equal(received, text);
});
test('a failed native share falls back to clipboard', async () => {
  assert.equal(await deliverShare(text, { nativeShare: async () => { throw new Error('Unavailable'); }, copyText: async () => {} }), 'copied');
});
test('clipboard denial offers selectable text', async () => {
  assert.equal(await deliverShare(text, { copyText: async () => { throw new Error('Denied'); } }), 'selectable');
});
test('browsers without either API offer selectable text', async () => {
  assert.equal(await deliverShare(text), 'selectable');
});
