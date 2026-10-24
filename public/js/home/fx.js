// Shader effects: gas flames, flambé fire, steam, rising embers that form the logo, background bokeh.
import * as THREE from 'three';
import { rand } from './util.js';

const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
    return s;
  }
`;

// ---------- flames ----------

function flameMaterial({ inner, mid, outer, speed = 2.2 }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uSeed: { value: Math.random() * 10 },
      uInner: { value: new THREE.Color(inner) },
      uMid: { value: new THREE.Color(mid) },
      uOuter: { value: new THREE.Color(outer) },
      uSpeed: { value: speed },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uIntensity, uSeed, uSpeed;
      uniform vec3 uInner, uMid, uOuter;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        vec2 uv = vUv;
        float n = fbm(vec2(uv.x * 3.0 + uSeed, uv.y * 2.4 - uTime * uSpeed));
        float x = (uv.x - 0.5) * 2.0 + (n - 0.5) * 0.7 * uv.y;
        float h = uv.y / max(uIntensity, 0.001);
        float width = (1.0 - pow(clamp(h, 0.0, 1.0), 0.8)) * (0.55 + 0.45 * smoothstep(0.0, 0.25, h));
        float shape = 1.0 - smoothstep(width * 0.45, width, abs(x));
        shape *= smoothstep(0.0, 0.06, uv.y);
        float heat = shape * (0.55 + n * 0.75) * (1.0 - h * 0.55);
        vec3 col = mix(uOuter, uMid, smoothstep(0.15, 0.55, heat));
        col = mix(col, uInner, smoothstep(0.6, 1.0, heat));
        float a = smoothstep(0.06, 0.45, heat) * smoothstep(0.0, 0.15, uIntensity);
        gl_FragColor = vec4(col * a * 1.4, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function flamePlane(w, h, mat) {
  const geo = new THREE.PlaneGeometry(w, h);
  geo.translate(0, h / 2, 0);
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 5;
  return m;
}

// Cylindrical billboard: rotate around Y to face the camera.
function faceCamera(obj, camera) {
  obj.getWorldPosition(_wp);
  obj.rotation.y = Math.atan2(camera.position.x - _wp.x, camera.position.z - _wp.z) - (obj.parent?.rotation.y ?? 0);
}
const _wp = new THREE.Vector3();

export function createBurnerFlames(center) {
  const group = new THREE.Group();
  group.position.copy(center);
  const flames = [];
  const count = 16;
  for (let i = 0; i < count; i++) {
    const mat = flameMaterial({ inner: 0xe8f0ff, mid: 0x4f7bff, outer: 0x1a2a9a, speed: 3.2 });
    const f = flamePlane(0.16, 0.26, mat);
    const a = (i / count) * Math.PI * 2;
    f.position.set(Math.cos(a) * 0.27, 0.07, Math.sin(a) * 0.27);
    group.add(f);
    flames.push(f);
  }
  return {
    group,
    update(time, intensity, camera) {
      group.visible = intensity > 0.01;
      for (const f of flames) {
        f.material.uniforms.uTime.value = time;
        f.material.uniforms.uIntensity.value = intensity;
        faceCamera(f, camera);
      }
    },
  };
}

export function createFlambe(center) {
  const group = new THREE.Group();
  group.position.copy(center);
  const flames = [];
  const layout = [[0, 0, 1.6, 1.5], [-0.35, 0.15, 1.1, 1.1], [0.35, -0.1, 1.1, 1.2], [0.1, 0.3, 0.9, 0.9]];
  for (const [x, z, w, h] of layout) {
    const mat = flameMaterial({ inner: 0xfff2c4, mid: 0xff8a2b, outer: 0xb3200c, speed: 2.4 });
    const f = flamePlane(w, h, mat);
    f.position.set(x, 0, z);
    group.add(f);
    flames.push(f);
  }
  return {
    group,
    update(time, intensity, camera) {
      group.visible = intensity > 0.01;
      for (const f of flames) {
        f.material.uniforms.uTime.value = time;
        f.material.uniforms.uIntensity.value = intensity;
        faceCamera(f, camera);
      }
    },
  };
}

// ---------- steam ----------

export function createSteam(center) {
  const group = new THREE.Group();
  group.position.copy(center);
  const planes = [];
  const mat0 = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 }, uSeed: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uIntensity, uSeed;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        vec2 uv = vUv;
        float sway = sin(uv.y * 4.0 + uTime * 0.8 + uSeed) * 0.12 * uv.y;
        float n = fbm(vec2((uv.x + sway) * 3.0 + uSeed, uv.y * 2.0 - uTime * 0.35));
        float column = 1.0 - smoothstep(0.08, 0.42, abs(uv.x - 0.5 + sway));
        float fade = smoothstep(0.0, 0.2, uv.y) * (1.0 - smoothstep(0.55, 1.0, uv.y));
        float a = smoothstep(0.42, 0.8, n) * column * fade * uIntensity * 0.32;
        gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 3; i++) {
    const mat = mat0.clone();
    mat.uniforms.uSeed.value = i * 3.7;
    const geo = new THREE.PlaneGeometry(0.9, 1.9);
    geo.translate(0, 0.95, 0);
    const m = new THREE.Mesh(geo, mat);
    m.position.set((i - 1) * 0.35, 0.12, (i % 2) * 0.15);
    m.renderOrder = 6;
    group.add(m);
    planes.push(m);
  }
  return {
    group,
    update(time, intensity, camera) {
      group.visible = intensity > 0.01;
      for (const m of planes) {
        m.material.uniforms.uTime.value = time;
        m.material.uniforms.uIntensity.value = intensity;
        faceCamera(m, camera);
      }
    },
  };
}

// ---------- embers -> logo ----------

// Samples the logo mark's opaque pixels into target points (x, y in -0.5..0.5 of height) and colours.
async function sampleLogo(url, count) {
  // onload rather than img.decode(): decode() can stall indefinitely in background tabs
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  const w = 180, h = Math.round((img.naturalHeight / img.naturalWidth) * w);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const pts = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] > 140) pts.push([x, y, data[i], data[i + 1], data[i + 2]]);
    }
  }
  const r = rand(5);
  const targets = new Float32Array(count * 2);
  const colors = new Float32Array(count * 3);
  const gold = new THREE.Color(0xe0b25a), cream = new THREE.Color(0xfff1d6), col = new THREE.Color();
  for (let k = 0; k < count; k++) {
    const [x, y, R, G, Bc] = pts[Math.floor(r() * pts.length)];
    targets[k * 2] = (x + r() - 0.5 - w / 2) / h;
    targets[k * 2 + 1] = -(y + r() - 0.5 - h / 2) / h;
    const max = Math.max(R, G, Bc), min = Math.min(R, G, Bc);
    const sat = max ? (max - min) / max : 0;
    if (sat > 0.35) col.setRGB(R / 255, G / 255, Bc / 255, THREE.SRGBColorSpace).multiplyScalar(1.15);
    else col.copy(gold).lerp(cream, max / 255);
    col.toArray(colors, k * 3);
  }
  return { targets, colors, aspect: w / h };
}

export async function createEmbers({ count, logoUrl, source }) {
  const { targets, colors, aspect } = await sampleLogo(logoUrl, count);
  const r = rand(23);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = r();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geo.setAttribute('aTarget', new THREE.BufferAttribute(targets, 2));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(3.5, 2, 0), 50);

  const uniforms = {
    uTime: { value: 0 },
    uFire: { value: 0 },
    uForm: { value: 0 },
    uSource: { value: source.clone() },
    uCenter: { value: new THREE.Vector3() },
    uRight: { value: new THREE.Vector3(1, 0, 0) },
    uUp: { value: new THREE.Vector3(0, 1, 0) },
    uScale: { value: 1.6 },
    uSize: { value: 26 },
    uPixelRatio: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uTime, uFire, uForm, uScale, uSize, uPixelRatio;
      uniform vec3 uSource, uCenter, uRight, uUp;
      attribute vec4 aSeed;
      attribute vec2 aTarget;
      attribute vec3 aColor;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float life = fract(uTime * (0.1 + aSeed.x * 0.16) + aSeed.y);
        vec3 freeP = uSource + vec3((aSeed.z - 0.5) * 1.3, 0.05, (aSeed.w - 0.5) * 1.0);
        freeP.y += life * (2.2 + aSeed.x * 1.8);
        freeP.x += sin(uTime * 1.3 + aSeed.y * 20.0) * 0.3 * life;
        freeP.z += cos(uTime * 1.1 + aSeed.z * 20.0) * 0.25 * life;

        float f = smoothstep(aSeed.x * 0.45, aSeed.x * 0.45 + 0.55, uForm);
        vec3 target = uCenter + uRight * aTarget.x * uScale + uUp * aTarget.y * uScale;
        target += (uRight * sin(uTime * 1.7 + aSeed.y * 40.0) + uUp * cos(uTime * 1.3 + aSeed.z * 40.0)) * 0.006;
        vec3 p = mix(freeP, target, f);
        p += uUp * sin(f * 3.14159) * 0.5 * (1.0 - aSeed.z * 0.5);

        float lit = clamp((uFire - aSeed.w * 0.9) * 6.0, 0.0, 1.0);
        float freeA = (1.0 - life) * smoothstep(0.0, 0.1, life) * lit;
        vAlpha = mix(freeA, 0.95, f);
        vec3 ember = mix(vec3(1.0, 0.38, 0.08), vec3(1.0, 0.78, 0.35), aSeed.z);
        vColor = mix(ember, aColor, f);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = mix(0.5 + aSeed.z * 0.8, 0.85, f);
        gl_PointSize = uSize * size * uPixelRatio / -mv.z;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 10;
  return { points, uniforms, aspect };
}

// ---------- background bokeh (blurred kitchen lights) ----------

export function createBokeh(count = 26) {
  const r = rand(31);
  const pos = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = -6 + r() * 20;
    pos[i * 3 + 1] = 2.5 + r() * 5;
    pos[i * 3 + 2] = -9 - r() * 6;
    sizes[i] = 0.5 + r();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: 1 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uPixelRatio, uTime;
      attribute float aSize;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * 900.0 * uPixelRatio / -mv.z;
        vA = 0.1 + 0.06 * sin(uTime * 0.5 + position.x * 3.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.38, d) * vA;
        gl_FragColor = vec4(vec3(1.0, 0.72, 0.4) * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, uniforms: mat.uniforms };
}
