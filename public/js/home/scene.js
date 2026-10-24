// The "Prep -> Knife -> Fire -> Plate -> Served" scene. createScene() builds everything once;
// render(p, time) poses the whole scene for scroll progress p.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LAYOUT, countertop, board, knife as makeKnife, skillet, plate as makePlate } from './props.js';
import { createProduce } from './produce.js';
import { createBurnerFlames, createFlambe, createSteam, createEmbers, createBokeh } from './fx.js';
import { span, range, window01, sampleKeys, lerp, arcTo } from './util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Camera keyframes: where it is and what it looks at, by scroll progress.
const CAM = [
  { p: 0.0, pos: V(1.4, 4.4, 6.4), at: V(0.25, 0.2, 0) },
  { p: 0.09, pos: V(0.6, 3.3, 4.6), at: V(0.0, 0.25, 0.05) },
  { p: 0.16, pos: V(-0.1, 1.9, 3.2), at: V(-0.75, 0.4, 0.2) },
  { p: 0.24, pos: V(0.9, 2.0, 3.0), at: V(0.1, 0.4, -0.15) },
  { p: 0.32, pos: V(1.6, 1.9, 3.1), at: V(0.85, 0.4, 0.25) },
  { p: 0.4, pos: V(2.1, 3.4, 5.2), at: V(1.8, 0.35, 0.0) },
  { p: 0.5, pos: V(3.6, 2.9, 3.7), at: V(3.5, 0.45, -0.2) },
  { p: 0.575, pos: V(2.7, 1.6, 3.2), at: V(3.5, 0.75, -0.2) },
  { p: 0.65, pos: V(5.1, 3.0, 4.3), at: V(5.1, 0.45, 0.0) },
  { p: 0.75, pos: V(6.8, 2.2, 3.3), at: V(6.75, 0.3, 0.25) },
  { p: 0.83, pos: V(6.5, 2.7, 4.2), at: V(6.5, 0.45, 0.2) },
  { p: 1.0, pos: V(3.5, 5.6, 10.6), at: V(3.5, 1.05, 0.0) },
];
const POS_KEYS = CAM.map((k) => ({ p: k.p, v: k.pos }));
const AT_KEYS = CAM.map((k) => ({ p: k.p, v: k.at }));

export async function createScene(canvas, { mobile = false } = {}) {
  const maxDpr = mobile ? 1.5 : 2;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0b09);
  scene.fog = new THREE.Fog(0x0d0b09, 10, 26);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);

  // lights: warm key, cool rim, soft fill, and the fire glow
  scene.add(new THREE.HemisphereLight(0xffe4c4, 0x1a120a, 0.55));
  const key = new THREE.DirectionalLight(0xffdcb0, 2.4);
  key.position.set(-3, 7, 5);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x9fb4ff, 0.7);
  rim.position.set(3, 3.5, -6);
  scene.add(rim);
  const fireLight = new THREE.PointLight(0xff7a2a, 0, 0, 1.4);
  fireLight.position.set(LAYOUT.burner.x, 1.0, LAYOUT.burner.z);
  scene.add(fireLight);

  // props
  const texSize = mobile ? 512 : 1024;
  scene.add(countertop(texSize));
  scene.add(board(texSize));

  const { burner, pan } = skillet();
  burner.position.copy(LAYOUT.burner);
  scene.add(burner, pan);

  const plate = makePlate();
  plate.position.copy(LAYOUT.plate);
  scene.add(plate);

  const knife = makeKnife();
  scene.add(knife);

  const produce = createProduce();
  scene.add(produce.group);

  // effects
  const burnerFlames = createBurnerFlames(V(LAYOUT.burner.x, 0.0, LAYOUT.burner.z));
  const flambe = createFlambe(V(LAYOUT.burner.x, LAYOUT.panFloor + 0.05, LAYOUT.burner.z));
  const steam = createSteam(V(LAYOUT.plate.x + 0.05, LAYOUT.plateTop, LAYOUT.plate.z));
  const bokeh = createBokeh(mobile ? 16 : 26);
  scene.add(burnerFlames.group, flambe.group, steam.group, bokeh.points);

  const embers = await createEmbers({
    count: mobile ? 1800 : 3200,
    logoUrl: new URL('../../assets/logo/logo-mark.png', import.meta.url).href,
    source: V(LAYOUT.burner.x, LAYOUT.panFloor + 0.2, LAYOUT.burner.z),
  });
  scene.add(embers.points);

  // ---------- layout that depends on the viewport ----------
  let width = 1, height = 1, aspect = 1, dolly = 1;
  const last = CAM[CAM.length - 1];

  function placeLogo() {
    const dir = last.at.clone().sub(last.pos).normalize();
    const right = new THREE.Vector3().crossVectors(dir, V(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir);
    const dist = 6 * dolly;
    const visH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visW = visH * aspect;
    const size = Math.min(visH * 0.36, (visW * 0.62) / embers.aspect);
    const lift = aspect < 1 ? visH * 0.15 : visH * 0.2;
    const camPos = last.at.clone().add(last.pos.clone().sub(last.at).multiplyScalar(dolly));
    embers.uniforms.uCenter.value.copy(camPos).addScaledVector(dir, dist).addScaledVector(up, lift);
    embers.uniforms.uRight.value.copy(right);
    embers.uniforms.uUp.value.copy(up);
    embers.uniforms.uScale.value = size;
    embers.uniforms.uSize.value = (mobile ? 30 : 34) * (height / 900);
  }

  function resize(w, h) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    aspect = width / height;
    renderer.setSize(width, height, false);
    // Portrait screens: widen the lens a little and pull the camera back.
    camera.fov = aspect < 1 ? 48 : 40;
    dolly = aspect < 0.95 ? Math.pow(0.95 / aspect, 0.5) : 1;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    embers.uniforms.uPixelRatio.value = dpr;
    bokeh.uniforms.uPixelRatio.value = dpr;
    placeLogo();
  }

  // ---------- per-frame posing ----------
  const camPos = new THREE.Vector3(), camAt = new THREE.Vector3();
  const panStart = V(LAYOUT.burner.x, LAYOUT.panLift + 0.9, LAYOUT.burner.z - 5);
  const panRest = V(LAYOUT.burner.x, LAYOUT.panLift, LAYOUT.burner.z);

  function render(p, time) {
    // camera
    sampleKeys(POS_KEYS, p, camPos);
    sampleKeys(AT_KEYS, p, camAt);
    camPos.sub(camAt).multiplyScalar(dolly).add(camAt);
    // gentle idle drift so the frame never feels frozen
    camPos.x += Math.sin(time * 0.25) * 0.05;
    camPos.y += Math.sin(time * 0.31) * 0.03;
    camera.position.copy(camPos);
    camera.lookAt(camAt);

    // Leave room for the captions: scene right of the text on wide screens, above it on tall ones.
    const centerFinal = span(p, 0.83, 0.93);
    if (aspect >= 1.15) camera.setViewOffset(width, height, -width * 0.15 * (1 - centerFinal), 0, width, height);
    else if (aspect < 0.9) camera.setViewOffset(width, height, 0, height * 0.12 * (1 - centerFinal * 0.4), width, height);
    else camera.clearViewOffset();

    key.target.position.copy(camAt);

    // skillet: slides in, toss, tilts toward the plate
    pan.visible = p > 0.37;
    const slide = span(p, 0.385, 0.44);
    arcTo(pan.position, panStart, panRest, slide, 0.4);
    const toss = range(p, 0.55, 0.595);
    pan.position.y += Math.sin(Math.PI * toss) * 0.14;
    pan.rotation.x = -Math.sin(Math.PI * 2 * toss) * 0.1;
    const pour = window01(p, 0.628, 0.67, 0.02);
    pan.position.x += pour * 0.7;
    pan.position.y += pour * 0.45;
    pan.rotation.z = -pour * 0.55;

    produce.update(p, time, knife);

    // fire levels
    const burnerLevel = span(p, 0.42, 0.46) * (1 - span(p, 0.7, 0.74));
    const flicker = 0.85 + Math.sin(time * 17) * 0.08 + Math.sin(time * 31) * 0.07;
    const burst = window01(p, 0.552, 0.598, 0.012);
    const sizzle = span(p, 0.47, 0.5) * (1 - span(p, 0.62, 0.64)) * 0.28;
    const flambeLevel = Math.max(burst, sizzle) * flicker;
    burnerFlames.update(time, burnerLevel * flicker, camera);
    flambe.group.position.copy(pan.position);
    flambe.group.position.y += LAYOUT.panFloor - LAYOUT.panLift + 0.04;
    flambe.update(time, flambeLevel, camera);
    fireLight.intensity = (burnerLevel * 3 + flambeLevel * 22) * flicker;

    steam.update(time, span(p, 0.69, 0.76), camera);

    const form = span(p, 0.86, 0.975);
    embers.uniforms.uTime.value = time;
    embers.uniforms.uFire.value = Math.max(burnerLevel * 0.55 + burst * 0.5, span(p, 0.72, 0.84) * 0.35);
    embers.uniforms.uForm.value = form;
    bokeh.uniforms.uTime.value = time;

    renderer.render(scene, camera);
  }

  function setPixelRatio(next) {
    dpr = next;
    renderer.setPixelRatio(dpr);
    resize(width, height);
  }

  return {
    render,
    resize,
    get pixelRatio() { return dpr; },
    setPixelRatio,
    dispose() { renderer.dispose(); },
  };
}
