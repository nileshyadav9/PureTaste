// Small math helpers shared by the scroll scene. Everything in the scene is a pure
// function of scroll progress p (0..1), so scrolling backwards simply rewinds.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOut = (t) => 1 - (1 - t) ** 3;

// Progress of p through [a, b], clamped to 0..1.
export const range = (p, a, b) => clamp((p - a) / (b - a));
// Eased version of range().
export const span = (p, a, b) => smooth(range(p, a, b));
// 0 -> 1 -> 0 bump across [a, b] with soft edges of width `edge`.
export const window01 = (p, a, b, edge = 0.02) => span(p, a - edge, a) * (1 - span(p, b, b + edge));

// Deterministic pseudo-random generator (mulberry32).
export function rand(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 2D value noise for procedural textures.
export function makeNoise(seed = 7) {
  const r = rand(seed);
  const size = 256;
  const perm = new Uint8Array(size * 2);
  const vals = new Float32Array(size);
  for (let i = 0; i < size; i++) { perm[i] = i; vals[i] = r(); }
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < size; i++) perm[i + size] = perm[i];
  const at = (x, y) => vals[perm[(perm[x & 255] + y) & 255]];
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = smooth(xf), v = smooth(yf);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  };
  noise.fbm = (x, y, oct = 4) => {
    let sum = 0, amp = 0.5, f = 1, norm = 0;
    for (let o = 0; o < oct; o++) { sum += noise(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2; }
    return sum / norm;
  };
  return noise;
}

// Linear interpolation with a vertical arc: an object "thrown" from a to b.
export function arcTo(out, a, b, t, height) {
  out.lerpVectors(a, b, t);
  out.y += Math.sin(Math.PI * t) * height;
  return out;
}

// Centripetal-ish Catmull-Rom through keyframes [{p, v: Vector3}] — used for the camera.
export function sampleKeys(keys, p, out) {
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1].p) i++;
  const k1 = keys[i], k2 = keys[i + 1];
  const k0 = keys[Math.max(0, i - 1)], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const t = range(p, k1.p, k2.p);
  const t2 = t * t, t3 = t2 * t;
  for (const c of ['x', 'y', 'z']) {
    const p0 = k0.v[c], p1 = k1.v[c], p2 = k2.v[c], p3 = k3.v[c];
    out[c] = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }
  return out;
}
