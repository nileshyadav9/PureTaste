// Kitchen props built from three.js primitives: counter, board, knife, skillet, burner, plate.
import * as THREE from 'three';
import { woodTexture, stoneTexture, blobTexture, riceTexture } from './textures.js';
import { makeNoise } from './util.js';

export const LAYOUT = {
  boardTop: 0.173,
  burner: new THREE.Vector3(3.5, 0, -0.2),
  panLift: 0.15,      // grate height the pan rests on
  panFloor: 0.2,      // world y of the pan's cooking surface
  plate: new THREE.Vector3(6.7, 0, 0.25),
  plateTop: 0.04,
};

let blobTex;
export function blob(w, d, opacity = 0.6) {
  blobTex ??= blobTexture();
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity }),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}

export function countertop(texSize) {
  const mat = new THREE.MeshStandardMaterial({ map: stoneTexture(texSize), roughness: 0.62, metalness: 0.05 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 22), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(3.3, 0, -2);
  return m;
}

export function board(texSize) {
  const w = 3.2, d = 2.0, r = 0.16;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -d / 2);
  shape.lineTo(w / 2 - r, -d / 2);
  shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  shape.lineTo(w / 2, d / 2 - r);
  shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  shape.lineTo(-w / 2 + r, d / 2);
  shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  shape.lineTo(-w / 2, -d / 2 + r);
  shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  // hanging hole
  const hole = new THREE.Path();
  hole.absarc(w / 2 - 0.28, 0, 0.09, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3, curveSegments: 16 });
  const tex = woodTexture(texSize);
  tex.repeat.set(1 / w, 1 / d);
  tex.offset.set(0.5, 0.5);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.58, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.028;

  const g = new THREE.Group();
  const shadow = blob(w * 1.25, d * 1.35, 0.8);
  shadow.position.y = 0.002;
  g.add(shadow, mesh);
  return g;
}

const steel = () => new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.2 });

// Chef's knife matching the logo. Origin = lowest point of the edge at the heel; tip points +x.
export function knife() {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = 0.42;
  g.add(inner);

  const blade = new THREE.Shape();
  blade.moveTo(0, 0);
  blade.lineTo(1.35, 0);
  blade.quadraticCurveTo(1.75, -0.02, 1.95, -0.16);
  blade.quadraticCurveTo(1.6, -0.4, 1.0, -0.42);
  blade.lineTo(0.07, -0.42);
  blade.quadraticCurveTo(0, -0.42, 0, -0.35);
  blade.lineTo(0, 0);
  const bladeGeo = new THREE.ExtrudeGeometry(blade, { depth: 0.018, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1, curveSegments: 24 });
  bladeGeo.translate(0, 0, -0.009);
  inner.add(new THREE.Mesh(bladeGeo, steel()));

  const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.075), steel());
  bolster.position.set(-0.035, -0.1, 0);
  inner.add(bolster);

  const handle = new THREE.Shape();
  handle.moveTo(0, 0);
  handle.lineTo(-0.9, 0.015);
  handle.quadraticCurveTo(-1.0, 0.02, -1.0, -0.08);
  handle.quadraticCurveTo(-1.0, -0.22, -0.88, -0.22);
  handle.quadraticCurveTo(-0.45, -0.17, 0, -0.2);
  handle.lineTo(0, 0);
  const handleGeo = new THREE.ExtrudeGeometry(handle, { depth: 0.07, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3, curveSegments: 16 });
  handleGeo.translate(-0.085, 0, -0.035);
  const handleMat = new THREE.MeshPhysicalMaterial({ color: 0x121212, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  inner.add(new THREE.Mesh(handleGeo, handleMat));

  const rivetGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.118, 16);
  rivetGeo.rotateX(Math.PI / 2);
  for (const x of [-0.33, -0.58, -0.83]) {
    const rv = new THREE.Mesh(rivetGeo, steel());
    rv.position.set(x, -0.1, 0);
    inner.add(rv);
  }
  return g;
}

// Cast-iron skillet on a gas burner. Returns { burner, pan } — pan is positioned separately.
export function skillet() {
  const iron = new THREE.MeshStandardMaterial({ color: 0x1d1c1b, roughness: 0.55, metalness: 0.55, side: THREE.DoubleSide });
  const profile = [
    [0, 0], [0.82, 0], [0.9, 0.035], [1.0, 0.25], [1.035, 0.27], [1.015, 0.285],
    [0.97, 0.262], [0.88, 0.072], [0.8, 0.045], [0, 0.045],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const pan = new THREE.Group();
  pan.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 64), iron));

  const oil = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 48),
    new THREE.MeshStandardMaterial({ color: 0x2b1a0c, roughness: 0.12, metalness: 0.3 }),
  );
  oil.rotation.x = -Math.PI / 2;
  oil.position.y = 0.047;
  pan.add(oil);

  const handle = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.17), iron);
  handle.geometry.translate(0.6, 0, 0);
  handle.position.set(0.98, 0.22, 0);
  handle.rotation.z = 0.16;
  const handleArm = new THREE.Group();
  handleArm.add(handle);
  handleArm.rotation.y = -0.65;
  pan.add(handleArm);

  const burner = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.45, metalness: 0.7 });
  const plateMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.03, 2.6), new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.25, metalness: 0.4 }));
  plateMesh.position.y = 0.015;
  burner.add(plateMesh);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.07, 32), dark);
  cap.position.y = 0.065;
  burner.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.028, 8, 48), dark);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.13;
  burner.add(ring);
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.045, 0.045), dark);
    bar.geometry.translate(0.6, 0, 0);
    bar.position.y = 0.13;
    bar.rotation.y = (i / 4) * Math.PI * 2 + Math.PI / 4;
    burner.add(bar);
  }
  const shadow = blob(3.2, 3.2, 0.7);
  shadow.position.y = 0.032;
  burner.add(shadow);
  return { burner, pan };
}

// Off-white plate with a gold rim, rice and a seared chicken breast.
export function plate() {
  const g = new THREE.Group();
  const profile = [
    [0, 0.03], [0.72, 0.03], [0.88, 0.06], [1.2, 0.135], [1.24, 0.14], [1.25, 0.125],
    [1.18, 0.11], [0.86, 0.04], [0.68, 0.0], [0.6, 0.0], [0, 0.005],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const ceramic = new THREE.MeshPhysicalMaterial({ color: 0xf3eee4, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.2, side: THREE.DoubleSide });
  g.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 72), ceramic));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.215, 0.008, 6, 96), new THREE.MeshStandardMaterial({ color: 0xd6a548, metalness: 1, roughness: 0.25 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.138;
  g.add(rim);

  // rice dome with bumpy grains
  const riceGeo = new THREE.SphereGeometry(0.5, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2);
  const n = makeNoise(21);
  const pos = riceGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + (n(v.x * 9 + 5, v.z * 9 + v.y * 7) - 0.5) * 0.14;
    pos.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  riceGeo.computeVertexNormals();
  const rice = new THREE.Mesh(riceGeo, new THREE.MeshStandardMaterial({ map: riceTexture(), roughness: 0.7 }));
  rice.scale.set(1, 0.55, 0.9);
  rice.position.set(-0.36, 0.03, -0.12);
  g.add(rice);

  // seared chicken breast; grill marks painted as vertex colours
  const chickenGeo = new THREE.SphereGeometry(1, 96, 48);
  const cp = chickenGeo.attributes.position;
  const colors = new Float32Array(cp.count * 3);
  const base = new THREE.Color(0xc0682e), seared = new THREE.Color(0x4a1d0a), c = new THREE.Color();
  for (let i = 0; i < cp.count; i++) {
    v.fromBufferAttribute(cp, i);
    if (v.y < 0) v.y *= 0.25;
    cp.setXYZ(i, v.x, v.y, v.z);
    const stripe = v.y > 0.2 ? Math.max(0, Math.sin((v.x * 0.8 + v.z * 0.6) * 14) - 0.55) / 0.45 : 0;
    c.copy(base).lerp(seared, stripe * 0.85 + (1 - v.y) * 0.12);
    c.toArray(colors, i * 3);
  }
  chickenGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  chickenGeo.computeVertexNormals();
  const chicken = new THREE.Mesh(chickenGeo, new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.35,
  }));
  chicken.scale.set(0.42, 0.12, 0.27);
  chicken.rotation.y = 0.5;
  chicken.position.set(0.3, 0.06, -0.3);
  g.add(chicken);

  const shadow = blob(3.1, 3.1, 0.75);
  shadow.position.y = 0.002;
  g.add(shadow);
  return g;
}
