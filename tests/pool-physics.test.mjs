import test from 'node:test';
import assert from 'node:assert/strict';
import { stepFloat, tiltVector, wakeShape } from '../pool-physics.js';

test('float reflects from every wall without escaping or gaining collision energy', () => {
  for (const [x, y, vx, vy, axis] of [[0, 30, -150, 0, 'x'], [100, 30, 150, 0, 'x'], [40, 0, 0, -150, 'y'], [40, 60, 0, 150, 'y']]) {
    const next = stepFloat({ x, y, vx, vy }, { x: 0, y: 0 }, { width: 100, height: 60 }, 1 / 60);
    assert.ok(next.x >= 0 && next.x <= 100 && next.y >= 0 && next.y <= 60);
    assert.ok(next[axis === 'x' ? 'hitX' : 'hitY']);
    assert.ok(next[axis === 'x' ? 'vx' : 'vy'] * (axis === 'x' ? vx : vy) < 0);
    assert.ok(Math.hypot(next.vx, next.vy) < 150);
  }
});

test('sustained tilt stays bounded across frame stalls and viewport resizing', () => {
  let state = { x: 60, y: 30, vx: 0, vy: 0 };
  for (let i = 0; i < 10000; i++) {
    const bounds = i < 5000 ? { width: 150, height: 60 } : { width: 12, height: 0 };
    state = stepFloat(state, { x: Math.sin(i / 50), y: Math.cos(i / 70) }, bounds, i % 50 ? 1 / 60 : 5);
    assert.ok(state.x >= 0 && state.x <= bounds.width && state.y >= 0 && state.y <= bounds.height);
    assert.ok(Math.abs(state.vx) <= 260 && Math.abs(state.vy) <= 260);
  }
});

test('tilt calibrates the held angle, handles portrait and landscape and rejects missing sensors', () => {
  const neutral = { beta: 50, gamma: 5 };
  assert.deepEqual(tiltVector(50, 5, neutral), { x: 0, y: 0 });
  assert.deepEqual(tiltVector(78, 33, neutral), { x: 1, y: 1 });
  const landscape = tiltVector(78, 5, neutral, 90);
  assert.ok(Math.abs(landscape.x - 1) < 1e-6 && Math.abs(landscape.y) < 1e-6);
  const reverse = tiltVector(50, 33, neutral, 180);
  assert.ok(Math.abs(reverse.x + 1) < 1e-6);
  assert.equal(tiltVector(null, null, neutral), null);
  assert.equal(tiltVector(NaN, 0, neutral), null);
  assert.equal(tiltVector(-179, 0, { beta: 179, gamma: 0 }).y, 0);
});

test('comfortable phone angles stay neutral, tremors are ignored, and deliberate tilt eases in', () => {
  for (const beta of [25, 45, 65, 80]) {
    const neutral = { beta, gamma: -7 };
    const jitter = tiltVector(beta + 2, -9, neutral);
    assert.ok(Math.abs(jitter.x) === 0 && Math.abs(jitter.y) === 0);
    const gentle = tiltVector(beta + 8, -7, neutral);
    const firm = tiltVector(beta + 20, -7, neutral);
    assert.ok(gentle.y > 0 && gentle.y < .2 && firm.y > gentle.y && firm.y < 1);
  }
});

test('wake follows velocity, grows with speed and disappears when still', () => {
  assert.equal(wakeShape(0, 0, 120).strength, 0);
  assert.equal(wakeShape(100, 0, 120).angle, 0);
  assert.equal(wakeShape(0, 100, 120).angle, 90);
  assert.equal(Math.abs(wakeShape(-100, 0, 120).angle), 180);
  assert.ok(wakeShape(150, 0, 120).length > wakeShape(20, 0, 120).length);
  assert.ok(wakeShape(150, 0, 120).strength > wakeShape(20, 0, 120).strength);
});

test('drag release slows naturally and background time never causes a large teleport', () => {
  const initial = { x: 50, y: 30, vx: 100, vy: 0 };
  const stalled = stepFloat(initial, { x: 0, y: 0 }, { width: 400, height: 60 }, 60);
  assert.ok(stalled.x - initial.x < 4);
  let state = initial;
  for (let i = 0; i < 300; i++) state = stepFloat(state, { x: 0, y: 0 }, { width: 400, height: 60 }, 1 / 60);
  assert.ok(Math.abs(state.vx) < 1);
});
