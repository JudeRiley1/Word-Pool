export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Relative to a comfortable holding angle. Ignore small tremors before easing in.
export function tiltVector(beta, gamma, neutral, angle = 0) {
  if (![beta, gamma].every(Number.isFinite)) return null;
  const wrap = degrees => ((degrees + 540) % 360) - 180;
  const response = degrees => Math.sign(degrees) * Math.pow(clamp((Math.abs(degrees) - 3) / 25, 0, 1), 1.35);
  const x = response(wrap(gamma - neutral.gamma));
  const y = response(wrap(beta - neutral.beta));
  const radians = angle * Math.PI / 180;
  return { x: clamp(x * Math.cos(radians) + y * Math.sin(radians), -1, 1), y: clamp(y * Math.cos(radians) - x * Math.sin(radians), -1, 1) };
}

export function stepFloat(state, gravity, bounds, seconds) {
  const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, .035);
  const width = Math.max(0, bounds.width), height = Math.max(0, bounds.height);
  const damping = Math.exp(-1.65 * dt);
  let vx = clamp((state.vx + gravity.x * 240 * dt) * damping, -170, 170);
  let vy = clamp((state.vy + gravity.y * 240 * dt) * damping, -170, 170);
  let x = state.x + vx * dt, y = state.y + vy * dt;
  let hitX = false, hitY = false, impact = 0;
  if (x < 0 || x > width) { impact = Math.max(impact, Math.abs(vx)); hitX = true; vx = (x < 0 ? 1 : -1) * Math.abs(vx) * .7; x = clamp(x, 0, width); }
  if (y < 0 || y > height) { impact = Math.max(impact, Math.abs(vy)); hitY = true; vy = (y < 0 ? 1 : -1) * Math.abs(vy) * .7; y = clamp(y, 0, height); }
  if (!width) { x = 0; vx = 0; }
  if (!height) { y = 0; vy = 0; }
  return { x, y, vx, vy, hitX, hitY, impact };
}

export function wakeShape(vx, vy, size) {
  const speed = Math.hypot(vx, vy);
  return { angle: Math.atan2(vy, vx) * 180 / Math.PI, strength: clamp((speed - 5) / 100, 0, 1), length: size * (.65 + clamp(speed / 170, 0, 1) * .65) };
}
