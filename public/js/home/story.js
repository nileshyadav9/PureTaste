// Scroll story controller: maps page scroll to progress p, fades captions, and drives the 3D scene.
// The scene module (and three.js) only loads when the device can run it; otherwise CSS shows a static layout.
import { clamp } from './util.js';

const story = document.querySelector('[data-story]');
const root = document.documentElement;

if (story && root.classList.contains('has-3d')) init();

function init() {
  const pin = story.querySelector('.story-pin');
  const canvas = story.querySelector('.story-canvas');
  const scrim = story.querySelector('.story-scrim');
  const hint = story.querySelector('.scroll-hint');
  const stepsList = story.querySelector('.story-steps');
  const caps = [...story.querySelectorAll('[data-cap]')].map((el) => ({ el, from: +el.dataset.from, to: +el.dataset.to }));
  const steps = [...story.querySelectorAll('[data-step]')].map((el) => ({ el, at: +el.dataset.step }));

  let target = 0;
  let current = 0;
  let scene = null;
  let running = false;
  let lastNow = 0;
  const t0 = performance.now();
  const frameTimes = [];
  let qualityChecks = 0;

  function readTarget() {
    const rect = story.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    target = total > 0 ? clamp(-rect.top / total) : 0;
  }

  function applyCaptions(p) {
    const fade = 0.018;
    for (const c of caps) {
      const fadeIn = c.from <= 0 ? 1 : clamp((p - c.from) / fade);
      const fadeOut = c.to >= 1 ? 1 : 1 - clamp((p - c.to) / fade);
      const o = fadeIn * fadeOut;
      const y = (1 - o) * (p < c.from + fade ? 28 : -28);
      c.el.style.setProperty('--o', o.toFixed(3));
      c.el.style.setProperty('--y', `${y.toFixed(1)}px`);
      c.el.classList.toggle('is-active', o > 0.6);
    }
    let on = -1;
    steps.forEach((s, i) => { if (p >= s.at - 0.005) on = i; });
    steps.forEach((s, i) => s.el.classList.toggle('is-on', i === on));
    stepsList.style.opacity = p > 0.08 && p < 0.86 ? 1 : 0;
    scrim.classList.toggle('is-final', p > 0.85);
    hint.style.opacity = String(1 - clamp(p / 0.02));
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - (lastNow || now)) / 1000);
    lastNow = now;

    // ease toward the scroll position for a smooth, weighty feel
    current += (target - current) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - current) < 0.0001) current = target;
    applyCaptions(current);

    if (scene) {
      scene.render(current, (now - t0) / 1000);
      watchPerformance(dt);
    }
    requestAnimationFrame(frame);
  }

  // If frames are slow, drop the pixel ratio (at most twice).
  function watchPerformance(dt) {
    if (qualityChecks >= 2 || document.hidden) return;
    frameTimes.push(dt);
    if (frameTimes.length < 90) return;
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    frameTimes.length = 0;
    qualityChecks++;
    if (median > 0.03 && scene.pixelRatio > 1) scene.setPixelRatio(Math.max(1, scene.pixelRatio * 0.7));
  }

  function start() {
    if (running) return;
    running = true;
    lastNow = 0;
    requestAnimationFrame(frame);
  }

  readTarget();
  current = target;
  applyCaptions(current);
  window.addEventListener('scroll', readTarget, { passive: true });
  window.addEventListener('resize', readTarget);

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) start();
    else running = false;
  }).observe(story);

  const resize = () => scene?.resize(pin.clientWidth, pin.clientHeight);
  new ResizeObserver(resize).observe(pin);

  (async () => {
    try {
      const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
      const { createScene } = await import('./scene.js');
      scene = await createScene(canvas, { mobile });
      resize();
      scene.render(current, 0);
      story.classList.add('is-ready');
    } catch (err) {
      console.error('3D story unavailable, using the static layout.', err);
      running = false;
      root.classList.replace('has-3d', 'no-3d');
      caps.forEach((c) => { c.el.style.removeProperty('--o'); c.el.style.removeProperty('--y'); });
    }
  })();
}
