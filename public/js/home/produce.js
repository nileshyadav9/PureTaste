// Vegetables, their cut pieces, and the knife choreography.
// Each piece has four poses (stacked = looks whole, on the board, in the pan, on the plate)
// and update(p) blends between them, so the whole sequence is scrubbable.
import * as THREE from 'three';
import { tomatoFaceTexture, onionFaceTexture } from './textures.js';
import { blob, LAYOUT } from './props.js';
import { rand, range, span, smooth, lerp, arcTo } from './util.js';

const tmpQ = new THREE.Quaternion();
const e2q = (x, y, z, order = 'XYZ') => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, order));

// ---------- whole vegetables ----------

function lathe(points, segments = 48) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

function lobes(geo, count, amount, falloff = () => 1) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const a = Math.atan2(v.z, v.x);
    const k = 1 + Math.cos(a * count) * amount * falloff(v.y);
    pos.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

const green = () => new THREE.MeshStandardMaterial({ color: 0x3f7a2a, roughness: 0.55, side: THREE.DoubleSide });

function tomatoWhole(R, skin) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(R, 48, 32);
  lobes(geo, 5, 0.035, (y) => 1 - Math.abs(y) / R);
  geo.scale(1, 0.85, 1);
  g.add(new THREE.Mesh(geo, skin));
  const leafGeo = new THREE.ConeGeometry(0.03, 0.2, 4);
  leafGeo.translate(0, 0.1, 0);
  leafGeo.scale(1, 1, 0.35);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(leafGeo, green());
    leaf.position.y = R * 0.82;
    leaf.rotation.set(0, (i / 5) * Math.PI * 2, 1.35, 'YXZ');
    g.add(leaf);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.08, 8), green());
  stem.position.y = R * 0.88;
  g.add(stem);
  return g;
}

function pepperWhole(mat) {
  const g = new THREE.Group();
  const geo = lathe([[0, 0.03], [0.2, 0], [0.34, 0.05], [0.4, 0.18], [0.415, 0.36], [0.4, 0.53], [0.33, 0.64], [0.18, 0.69], [0.07, 0.66], [0, 0.645]], 64);
  lobes(geo, 4, 0.09, (y) => (y < 0.12 ? 1.6 : 1));
  g.add(new THREE.Mesh(geo, mat));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.035, 16), green());
  cap.position.y = 0.665;
  g.add(cap);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.66, 0), new THREE.Vector3(0.01, 0.76, 0), new THREE.Vector3(0.06, 0.83, 0.01)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.032, 8), green()));
  return g;
}

function onionWhole(mat) {
  const geo = lathe([[0, 0], [0.12, 0.01], [0.28, 0.08], [0.34, 0.22], [0.32, 0.38], [0.22, 0.52], [0.08, 0.62], [0.025, 0.7], [0, 0.72]], 48);
  return new THREE.Mesh(geo, mat);
}

function garlicWhole() {
  const geo = lathe([[0, 0], [0.12, 0.01], [0.19, 0.07], [0.205, 0.14], [0.15, 0.22], [0.06, 0.29], [0.014, 0.37], [0, 0.375]], 64);
  lobes(geo, 8, 0.07, (y) => Math.max(0, 1 - y / 0.3));
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xefe6d8, roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color(0xfff2e0) }));
}

// Cross-section ring of a 4-lobed bell pepper, extruded along z and centred.
function pepperRing(radius, depth) {
  const outer = new THREE.Shape();
  const hole = new THREE.Path();
  const steps = 48, wall = 0.05;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const k = 1 + 0.08 * Math.cos(a * 4);
    const ro = radius * k, ri = Math.max(0.02, radius * k - wall);
    if (i === 0) { outer.moveTo(Math.cos(a) * ro, Math.sin(a) * ro); hole.moveTo(Math.cos(-a) * ri, Math.sin(-a) * ri); }
    else { outer.lineTo(Math.cos(a) * ro, Math.sin(a) * ro); hole.lineTo(Math.cos(-a) * ri, Math.sin(-a) * ri); }
  }
  outer.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false, curveSegments: 4 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function herbSprig() {
  const g = new THREE.Group();
  const mat = green();
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.25, 0.025, 0.05), new THREE.Vector3(0.5, 0.04, 0.02), new THREE.Vector3(0.72, 0.05, -0.04)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.011, 6), mat));
  const leaf = new THREE.Shape();
  leaf.moveTo(0, 0);
  leaf.quadraticCurveTo(0.07, 0.065, 0.17, 0);
  leaf.quadraticCurveTo(0.07, -0.065, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leaf, 6);
  leafGeo.rotateX(-Math.PI / 2);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4c8f30, roughness: 0.5, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const t = 0.12 + (i / 8) * 0.88;
    const m = new THREE.Mesh(leafGeo, leafMat);
    m.position.copy(curve.getPoint(t));
    m.position.y += 0.008;
    const side = i % 2 ? 1 : -1;
    m.rotation.set(0.25 * side, side * (1.0 - t * 0.4), 0.15, 'YXZ');
    m.scale.setScalar(1.1 - t * 0.4);
    g.add(m);
  }
  return g;
}

// ---------- the vegetable lineup on the board ----------

const B = LAYOUT.boardTop;
const PAN = new THREE.Vector3(LAYOUT.burner.x, LAYOUT.panFloor, LAYOUT.burner.z);
const PLATE = LAYOUT.plate;

const VEG = [
  { key: 'tomato', x: -0.85, z: 0.08, R: 0.34, h: 0.58, window: [0.165, 0.235] },
  { key: 'pepper', x: 0.15, z: -0.3, R: 0.42, h: 0.85, window: [0.245, 0.315] },
  { key: 'onion', x: 0.95, z: 0.08, R: 0.33, h: 0.72, window: [0.325, 0.385] },
];

export function createProduce() {
  const group = new THREE.Group();
  const r = rand(17);

  const mats = {
    tomatoSkin: new THREE.MeshPhysicalMaterial({ color: 0xc4231a, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.18 }),
    tomatoFace: new THREE.MeshStandardMaterial({ map: tomatoFaceTexture(), roughness: 0.38 }),
    pepper: new THREE.MeshPhysicalMaterial({ color: 0xf2b10a, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    pepperFace: new THREE.MeshStandardMaterial({ color: 0xf7e39a, roughness: 0.45 }),
    onionSkin: new THREE.MeshPhysicalMaterial({ color: 0x7a2246, roughness: 0.42, clearcoat: 0.3 }),
    onionFace: new THREE.MeshStandardMaterial({ map: onionFaceTexture(), roughness: 0.4 }),
  };
  const rawColors = {
    tomatoSkin: mats.tomatoSkin.color.clone(),
    pepper: mats.pepper.color.clone(),
    pepperFace: mats.pepperFace.color.clone(),
    onionSkin: mats.onionSkin.color.clone(),
  };

  const pieces = [];
  const wholes = [];

  for (const v of VEG) {
    const center = new THREE.Vector3(v.x, B, v.z);
    let whole;
    if (v.key === 'tomato') whole = tomatoWhole(v.R, mats.tomatoSkin);
    if (v.key === 'pepper') whole = pepperWhole(mats.pepper);
    if (v.key === 'onion') whole = onionWhole(mats.onionSkin);
    whole.position.copy(center);
    if (v.key === 'tomato') whole.position.y += v.R * 0.85;
    const shadow = blob(v.R * 3, v.R * 3, 0.7);
    shadow.position.set(v.x, B + 0.003, v.z);
    group.add(whole, shadow);
    wholes.push({ veg: v, mesh: whole, shadow });

    const vegPieces = [];
    if (v.key === 'pepper') {
      // lobed rings stacked along z, the way a bell pepper is sliced crosswise
      const n = 5;
      const t = (v.R * 2 * 0.82) / n;
      const cy = B + 0.36;
      for (let i = 0; i < n; i++) {
        const zOff = ((n - 1) / 2 - i) * t;
        const rad = v.R * Math.sqrt(Math.max(0.15, 1 - (zOff / v.R) ** 2)) * 0.95;
        const mesh = new THREE.Mesh(pepperRing(rad, t * 0.9), [mats.pepperFace, mats.pepper]);
        vegPieces.push({
          mesh,
          stackPos: new THREE.Vector3(v.x, cy, v.z + zOff),
          stackQuat: new THREE.Quaternion(),
          boardPos: new THREE.Vector3(v.x - 0.1 + i * 0.2, B + t * 0.45 + 0.01 + i * 0.012, v.z - 0.22),
          boardQuat: e2q(-Math.PI / 2 + 0.18, r() * 0.5, 0, 'YXZ'),
          lay: 'ring',
        });
      }
    } else if (v.key === 'tomato' || v.key === 'onion') {
      // discs stacked along z with a sphere's profile, so the stack reads as the whole vegetable
      const n = v.key === 'tomato' ? 6 : 5;
      const t = (v.R * 2 * 0.86) / n;
      const cy = v.key === 'tomato' ? B + v.R * 0.85 : B + 0.32;
      const sideMat = v.key === 'tomato' ? mats.tomatoSkin : mats.onionSkin;
      const faceMat = v.key === 'tomato' ? mats.tomatoFace : mats.onionFace;
      for (let i = 0; i < n; i++) {
        const zOff = ((n - 1) / 2 - i) * t; // i = 0 is the front slice
        const rad = v.R * Math.sqrt(Math.max(0.08, 1 - (zOff / v.R) ** 2)) * 0.97;
        const geo = new THREE.CylinderGeometry(rad, rad, t * 0.9, 28);
        const mesh = new THREE.Mesh(geo, [sideMat, faceMat, faceMat]);
        const fanX = v.x - (v.key === 'tomato' ? 0.45 : 0.32) + i * 0.17;
        vegPieces.push({
          mesh,
          stackPos: new THREE.Vector3(v.x, cy, v.z + zOff),
          stackQuat: e2q(Math.PI / 2, 0, 0),
          boardPos: new THREE.Vector3(fanX, B + t * 0.45 + 0.02 + i * 0.012, v.z + 0.55),
          boardQuat: e2q(-0.2, r() * 0.4, 0, 'YXZ'),
          lay: 'flat',
        });
      }
    }

    // cut planes (z) the knife visits, front to back: one between each pair of slices
    const zs = vegPieces.map((pc) => pc.stackPos.z).sort((a, b) => b - a);
    const cuts = [];
    for (let k = 0; k < vegPieces.length - 1; k++) cuts.push((zs[k] + zs[k + 1]) / 2);
    v.cuts = cuts;
    const [s, e] = v.window;
    const chopTime = (k) => s + ((k + 0.65) / cuts.length) * (e - s);
    v.swapAt = s + (0.5 / cuts.length) * (e - s);

    vegPieces.forEach((pc, i) => {
      // piece falls after the first cut in front of... behind it
      let k = cuts.findIndex((cz) => cz < pc.stackPos.z);
      if (k < 0) k = cuts.length - 1;
      pc.fallAt = chopTime(k) + r() * 0.004;
      pc.veg = v;
      group.add(pc.mesh);
      pieces.push(pc);
    });
  }

  // pan + plate poses
  pieces.forEach((pc, i) => {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 0.58;
    pc.panPos = new THREE.Vector3(PAN.x + Math.cos(a) * rr, PAN.y + 0.035 + (i % 3) * 0.02, PAN.z + Math.sin(a) * rr);
    const yaw = r() * Math.PI * 2;
    pc.panQuat = pc.lay === 'flat' ? e2q(0, yaw, 0) : e2q(Math.PI / 2, yaw, 0, 'YXZ');
    const b = r() * Math.PI * 2, br = Math.sqrt(r()) * 0.4;
    pc.platePos = new THREE.Vector3(PLATE.x + 0.3 + Math.cos(b) * br, LAYOUT.plateTop + 0.03 + (i % 4) * 0.022, PLATE.z + 0.3 + Math.sin(b) * br * 0.8);
    pc.plateQuat = pc.lay === 'flat' ? e2q(r() * 0.3, r() * Math.PI * 2, 0, 'YXZ') : e2q(Math.PI / 2, r() * Math.PI * 2, 0, 'YXZ');
    pc.toPan = 0.445 + i * 0.0035;
    pc.toPlate = 0.632 + i * 0.0028;
    pc.tossH = 0.35 + r() * 0.45;
    pc.spinAxis = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
    pc.seed = r() * 100;
  });

  // garlic stays on the board; the herb sprig waits on the counter and ends up as the garnish
  const garlic = garlicWhole();
  garlic.position.set(-1.2, B, -0.6);
  const gShadow = blob(0.7, 0.7, 0.6);
  gShadow.position.set(-1.2, B + 0.003, -0.6);
  const sprig = herbSprig();
  const sprigStart = new THREE.Vector3(-2.35, 0.012, -0.55);
  const sprigEnd = new THREE.Vector3(PLATE.x - 0.15, LAYOUT.plateTop + 0.33, PLATE.z - 0.05);
  sprig.position.copy(sprigStart);
  sprig.rotation.y = 0.5;
  group.add(garlic, gShadow, sprig);

  // ---------- knife path ----------
  const knifeStart = new THREE.Vector3(3.6, 1.8, 1.4);
  const knifeRest = new THREE.Vector3(1.95, 0.06, 0.35);
  const chopQuat = e2q(0, Math.PI, 0.05, 'YXZ');
  const startQuat = e2q(-0.4, Math.PI + 0.5, 0.35, 'YXZ');
  const restQuat = e2q(Math.PI / 2, Math.PI / 2 - 0.25, 0, 'YXZ');
  const above = (v, z) => new THREE.Vector3(v.x + 0.75, B + v.h + 0.12, z);

  function knifePose(p, pos, quat) {
    const first = VEG[0], last = VEG[VEG.length - 1];
    if (p < first.window[0]) {
      const t = span(p, 0.115, first.window[0]);
      arcTo(pos, knifeStart, above(first, first.cuts[0]), t, 0.4);
      quat.slerpQuaternions(startQuat, chopQuat, t);
      return;
    }
    for (let vi = 0; vi < VEG.length; vi++) {
      const v = VEG[vi];
      const [s, e] = v.window;
      if (p <= e) {
        const m = v.cuts.length;
        const u = range(p, s, e) * m;
        const k = Math.min(m - 1, Math.floor(u));
        const lu = u - k;
        const fromZ = v.cuts[Math.max(0, k - 1)], toZ = v.cuts[k];
        const z = lerp(fromZ, toZ, smooth(range(lu, 0, 0.3)));
        const lift = v.h + 0.12;
        const y = B + 0.004 + lift * (1 - Math.sin(Math.PI * range(lu, 0.3, 1)));
        pos.set(v.x + 0.75, y, z);
        quat.copy(chopQuat);
        return;
      }
      const next = VEG[vi + 1];
      if (next && p < next.window[0]) {
        const t = span(p, e, next.window[0]);
        arcTo(pos, above(v, v.cuts[v.cuts.length - 1]), above(next, next.cuts[0]), t, 0.25);
        quat.copy(chopQuat);
        return;
      }
    }
    const t = span(p, last.window[1], last.window[1] + 0.05);
    arcTo(pos, above(last, last.cuts[last.cuts.length - 1]), knifeRest, t, 0.5);
    quat.slerpQuaternions(chopQuat, restQuat, t);
  }

  // ---------- per-frame update ----------
  const white = new THREE.Color(1, 1, 1);
  const browned = new THREE.Color(0.62, 0.42, 0.3);
  const charred = new THREE.Color(0xa0521a);

  function update(p, time, knife) {
    for (const w of wholes) {
      const visible = p < w.veg.swapAt;
      w.mesh.visible = visible;
      w.shadow.material.opacity = visible ? 0.7 : 0.7 * (1 - span(p, w.veg.swapAt, w.veg.swapAt + 0.04));
    }

    // cooking colour shift
    const cook = span(p, 0.47, 0.62);
    mats.tomatoFace.color.copy(white).lerp(browned, cook * 0.55);
    mats.onionFace.color.copy(white).lerp(browned, cook * 0.6);
    mats.tomatoSkin.color.copy(rawColors.tomatoSkin).lerp(browned, cook * 0.35);
    mats.onionSkin.color.copy(rawColors.onionSkin).lerp(browned, cook * 0.3);
    mats.pepper.color.copy(rawColors.pepper).lerp(charred, cook * 0.45);
    mats.pepperFace.color.copy(rawColors.pepperFace).lerp(charred, cook * 0.35);

    const toss = range(p, 0.55, 0.595);
    const sizzle = span(p, 0.47, 0.5) * (1 - span(p, 0.625, 0.64));

    // vegetables shrink as they cook down
    const shrink = 1 - cook * 0.38;

    for (const pc of pieces) {
      const { mesh } = pc;
      mesh.visible = p >= pc.veg.swapAt;
      if (!mesh.visible) continue;
      mesh.scale.setScalar(shrink);

      const fall = span(p, pc.fallAt, pc.fallAt + 0.018);
      const tPan = span(p, pc.toPan, pc.toPan + 0.03);
      const tPlate = span(p, pc.toPlate, pc.toPlate + 0.035);

      if (tPlate > 0) {
        arcTo(mesh.position, pc.panPos, pc.platePos, tPlate, 0.9);
        mesh.quaternion.slerpQuaternions(pc.panQuat, pc.plateQuat, tPlate);
      } else if (tPan > 0) {
        arcTo(mesh.position, pc.boardPos, pc.panPos, tPan, 1.1);
        mesh.quaternion.slerpQuaternions(pc.boardQuat, pc.panQuat, tPan);
        if (tPan >= 1) {
          const bump = Math.sin(Math.PI * toss);
          mesh.position.y += bump * pc.tossH + Math.abs(Math.sin(time * 22 + pc.seed)) * 0.012 * sizzle;
          if (toss > 0 && toss < 1) {
            tmpQ.setFromAxisAngle(pc.spinAxis, smooth(toss) * Math.PI * 2);
            mesh.quaternion.premultiply(tmpQ);
          }
        }
      } else {
        // stacked -> fallen: a small hop forward as each slice drops
        arcTo(mesh.position, pc.stackPos, pc.boardPos, fall, 0.12);
        mesh.quaternion.slerpQuaternions(pc.stackQuat, pc.boardQuat, fall);
      }
    }

    // garnish flies to the plate
    const g = span(p, 0.715, 0.76);
    arcTo(sprig.position, sprigStart, sprigEnd, g, 1.6);
    sprig.rotation.set(0, 0.5 + g * 1.2, 0);

    knifePose(p, knife.position, knife.quaternion);
  }

  return { group, update };
}
