// Procedural canvas textures, so the scene ships no image files.
import * as THREE from 'three';
import { makeNoise, rand } from './util.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { srgb = true, repeat } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

// End-grain-free maple/walnut cutting board: grain runs along x.
export function woodTexture(size = 1024) {
  const [c, ctx] = canvas(size, size / 2);
  const img = ctx.createImageData(c.width, c.height);
  const n = makeNoise(11);
  const light = [178, 124, 74], dark = [112, 70, 38];
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const u = x / c.width, v = y / c.height;
      const warp = n.fbm(u * 3, v * 6, 3) * 6;
      const g = Math.sin((v * 46 + warp) * Math.PI);
      const ring = Math.pow(Math.abs(g), 0.35);
      const fine = n(u * 260, v * 30) * 0.25;
      const t = Math.min(1, Math.max(0, ring * 0.75 + fine + n.fbm(u * 2, v * 2, 2) * 0.2));
      const i = (y * c.width + x) * 4;
      for (let k = 0; k < 3; k++) img.data[i + k] = dark[k] + (light[k] - dark[k]) * t;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c);
}

// Dark speckled stone counter.
export function stoneTexture(size = 1024) {
  const [c, ctx] = canvas(size, size);
  const img = ctx.createImageData(size, size);
  const n = makeNoise(5);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const cloud = n.fbm(u * 4, v * 4, 4);
      const speck = n(u * 420, v * 420);
      let l = 20 + cloud * 18 + (speck > 0.82 ? 26 : 0) - (speck < 0.12 ? 8 : 0);
      const i = (y * size + x) * 4;
      img.data[i] = l * 1.08;
      img.data[i + 1] = l * 1.0;
      img.data[i + 2] = l * 0.9;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { repeat: [3, 2] });
}

// Soft radial blob used as a cheap contact shadow.
export function blobTexture() {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.85)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return toTexture(c, { srgb: false });
}

// Tomato cross-section: skin, pericarp, seed cavities, core.
export function tomatoFaceTexture() {
  const s = 256, [c, ctx] = canvas(s, s);
  const r = rand(3);
  const cx = s / 2, cy = s / 2;
  ctx.fillStyle = '#8f140d'; ctx.beginPath(); ctx.arc(cx, cy, s / 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e0412b'; ctx.beginPath(); ctx.arc(cx, cy, s * 0.47, 0, Math.PI * 2); ctx.fill();
  const lobes = 4;
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2 + 0.3;
    const lx = cx + Math.cos(a) * s * 0.22, ly = cy + Math.sin(a) * s * 0.22;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(a);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, s * 0.15);
    g.addColorStop(0, '#f7b267');
    g.addColorStop(1, '#e8743b');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.15, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f9e1a0';
    for (let k = 0; k < 7; k++) {
      ctx.beginPath();
      ctx.ellipse((r() - 0.5) * s * 0.18, (r() - 0.5) * s * 0.1, 4, 2.4, r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.fillStyle = '#ef6a4a'; ctx.beginPath(); ctx.arc(cx, cy, s * 0.08, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,160,0.35)'; ctx.lineWidth = 3;
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2 + 0.3 + Math.PI / lobes;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * s * 0.44, cy + Math.sin(a) * s * 0.44); ctx.stroke();
  }
  return toTexture(c);
}

// Red onion slice: concentric rings.
export function onionFaceTexture() {
  const s = 256, [c, ctx] = canvas(s, s);
  const cx = s / 2;
  ctx.fillStyle = '#6d1f45'; ctx.beginPath(); ctx.arc(cx, cx, s / 2, 0, Math.PI * 2); ctx.fill();
  const rings = 7;
  for (let i = 0; i < rings; i++) {
    const rr = s * 0.47 * (1 - i / rings);
    ctx.fillStyle = i % 2 ? '#f4e9ef' : '#e6d0de';
    ctx.beginPath(); ctx.arc(cx, cx, rr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(150,50,100,0.55)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cx, rr, 0, Math.PI * 2); ctx.stroke();
  }
  return toTexture(c);
}

// Grainy yellow rice surface.
export function riceTexture() {
  const s = 256, [c, ctx] = canvas(s, s);
  const r = rand(9);
  ctx.fillStyle = '#d9a23a';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `hsl(${40 + r() * 8}, ${70 + r() * 20}%, ${58 + r() * 22}%)`;
    ctx.beginPath();
    ctx.ellipse(r() * s, r() * s, 5 + r() * 2, 2 + r(), r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = r() > 0.5 ? '#c0392b' : '#3e7d2a';
    ctx.fillRect(r() * s, r() * s, 3, 3);
  }
  return toTexture(c, { repeat: [2, 2] });
}
