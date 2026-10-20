// The square: The Garrison Tavern on the left, the music apartment on the right, each free-standing
// on its own pavement island, angled toward each other and the viewer. A cobbled street runs
// between them into the fog and another runs along their fronts.
import * as THREE from "three";
import * as T from "./textures.js";
import { streetLamp, utilityPole, wireRun, makeRain, makeSteam, scooter, crate, drain, bollard, MAT, toon, glow, smear } from "./props.js";

export const FOG = 0x313d47;

const frameMat = toon({ color: 0x17130f });
const slabMat = toon({ map: T.pavement([3.5, 4.5]) });
const windowCache = new Map();

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function plane(w, h, mat, x, y, z, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  return m;
}

function cyl(rt, rb, h, mat, x, y, z, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// rotY: 0 faces +z, PI/2 faces +x, -PI/2 faces -x, PI faces -z
function litWindow(parent, { w, h, kind = "dim", cols = 2, rows = 2, pos, rotY = 0, intensity, seed = 1, halo = 0 }) {
  const key = `${kind}|${cols}|${rows}|${Math.round((h / w) * 10)}|${seed}`;
  let map = windowCache.get(key);
  if (!map) {
    map = T.windowPane({ kind, cols, rows, w: 256, h: Math.round((256 * h) / w), seed });
    windowCache.set(key, map);
  }
  const base = intensity ?? (kind === "dim" ? 0.55 : 1.0);
  const mat = new THREE.MeshBasicMaterial({ map, color: new THREE.Color().setScalar(base) });
  mat.userData.base = base;
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.14), frameMat);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  pane.position.z = 0.08;
  g.add(frame, pane);
  if (halo > 0) {
    const s = glow(0xffb15c, Math.max(w, h) * 2.1, halo);
    s.position.z = 0.6;
    g.add(s);
  }
  g.position.set(pos[0], pos[1], pos[2]);
  g.rotation.y = rotY;
  parent.add(g);
  return mat;
}

function outlineFor(w, h, d, x, y, z, color) {
  const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
  const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
  line.position.set(x, y, z);
  line.raycast = () => {};
  return line;
}

function bracketLamp(parent, x, y, z, dir = 1) {
  // dir: +1 hangs off a +x face, -1 off a -x face
  parent.add(box(0.55, 0.05, 0.05, MAT.metal, x + dir * 0.27, y + 0.25, z));
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.22, 12, 1, true), toon({ color: 0x1c2226, side: THREE.DoubleSide }));
  shade.position.set(x + dir * 0.55, y + 0.15, z);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd9a8 }));
  bulb.position.set(x + dir * 0.55, y + 0.06, z);
  const l = new THREE.PointLight(0xffc37a, 4, 0, 2);
  l.position.set(x + dir * 0.6, y, z);
  const h = glow(0xffc37a, 1.6, 0.4);
  h.position.set(x + dir * 0.55, y + 0.05, z);
  parent.add(shade, bulb, l, h);
}

// ---- The Garrison Tavern: front face is +x, near side is +z ----------------------------------
function buildTavern() {
  const g = new THREE.Group();
  g.userData.destination = "tavern";
  const plasterMat = toon({ map: T.oldPlaster([2.6, 1.4]) });
  const plankMat = toon({ map: T.planks([4, 1.4]) });
  const doorMat = toon({ map: T.planks([1, 1], 150, 9, 18), color: 0x9aa89a });
  const trim = toon({ color: 0x1c2e29 });
  const stone = toon({ color: 0x40474c });
  const roof = toon({ map: T.roofTar([4, 5]) });
  const brickMat = toon({ map: T.brick([1, 2]) });
  const brass = toon({ color: 0xc9a048 });
  const windows = [];

  g.add(box(10.2, 4.4, 12.2, plankMat, 0, 2.2, 0)); // shopfront  x -5.1..5.1  z -6.1..6.1
  g.add(box(10, 5.4, 12, plasterMat, 0, 7.1, 0)); // upper storey y 4.4..9.8
  g.add(box(10.6, 0.45, 12.6, stone, 0, 10.0, 0)); // eave
  g.add(box(10.0, 0.3, 12.0, roof, 0, 10.3, 0)); // roof deck
  for (const z of [6.15, -6.15]) g.add(box(10.6, 0.6, 0.3, stone, 0, 10.5, z));
  for (const x of [5.15, -5.15]) g.add(box(0.3, 0.6, 12.6, stone, x, 10.5, 0));
  g.add(box(0.9, 2.0, 0.9, brickMat, -3, 11.2, -3.5));
  g.add(box(1.1, 0.15, 1.1, stone, -3, 12.25, -3.5));
  g.add(box(0.8, 1.5, 0.8, brickMat, 2.5, 10.9, 2));
  g.add(cyl(0.12, 0.12, 0.9, MAT.metal, 1.5, 10.9, -4.5, 8));

  // sign band
  g.add(box(0.3, 1.9, 9.6, trim, 5.2, 5.05, 0));
  g.add(plane(9.2, 1.5, toon({ map: T.signBoard("THE GARRISON TAVERN") }), 5.36, 5.05, 0, Math.PI / 2));
  g.add(box(0.55, 0.28, 10.0, trim, 5.2, 6.1, 0));
  g.add(box(0.5, 0.22, 10.0, trim, 5.2, 4.05, 0));
  bracketLamp(g, 5.2, 6.35, -3.6, 1);
  bracketLamp(g, 5.2, 6.35, 2.6, 1);

  // front: big window and door
  windows.push(litWindow(g, { w: 5.0, h: 3.0, kind: "tavern", cols: 6, rows: 3, pos: [5.12, 2.45, -1.2], rotY: Math.PI / 2, intensity: 1.05, seed: 4, halo: 0.32 }));
  g.add(box(0.45, 0.16, 5.6, stone, 5.2, 0.85, -1.2));
  g.add(box(0.16, 2.95, 1.4, doorMat, 5.12, 1.47, 3.9));
  g.add(box(0.2, 3.75, 1.8, trim, 5.1, 1.9, 3.9));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), brass);
  knob.position.set(5.24, 1.4, 3.4);
  g.add(knob);
  windows.push(litWindow(g, { w: 1.1, h: 0.5, kind: "stair", cols: 3, rows: 1, pos: [5.14, 3.3, 3.9], rotY: Math.PI / 2, intensity: 0.9 }));
  g.add(box(0.7, 0.18, 1.9, stone, 5.4, 0.25, 3.9));
  for (const [z, seed] of [[-3.4, 2], [2.4, 3]]) {
    windows.push(litWindow(g, { w: 1.7, h: 2.3, kind: "stair", cols: 2, rows: 3, pos: [5.0, 7.3, z], rotY: Math.PI / 2, intensity: 0.9, seed, halo: 0.14 }));
    g.add(box(0.4, 0.14, 2.1, stone, 5.1, 6.05, z));
  }
  const spill = new THREE.PointLight(0xffa64a, 9, 0, 2);
  spill.position.set(6.8, 2.2, -1.2);
  g.add(spill);

  // near side (+z)
  windows.push(litWindow(g, { w: 2.2, h: 2.0, kind: "tavern", cols: 3, rows: 2, pos: [1.6, 2.4, 6.12], intensity: 0.95, seed: 8, halo: 0.18 }));
  litWindow(g, { w: 1.6, h: 2.0, kind: "dim", cols: 2, rows: 2, pos: [-2.6, 2.5, 6.12] });
  windows.push(litWindow(g, { w: 1.7, h: 2.3, kind: "stair", cols: 2, rows: 3, pos: [-2.6, 7.3, 6.0], intensity: 0.75, seed: 5 }));
  litWindow(g, { w: 1.7, h: 2.3, kind: "dim", cols: 2, rows: 3, pos: [1.6, 7.3, 6.0] });
  for (const x of [-2.6, 1.6]) g.add(box(2.1, 0.14, 0.4, stone, x, 6.05, 6.1));

  // far side (-z) and back (-x)
  for (const x of [-2.6, 1.6]) litWindow(g, { w: 1.7, h: 2.3, kind: "dim", cols: 2, rows: 3, pos: [x, 7.3, -6.0], rotY: Math.PI });
  litWindow(g, { w: 1.6, h: 2.0, kind: "dim", cols: 2, rows: 2, pos: [0, 2.5, -6.12], rotY: Math.PI });
  for (const z of [-3, 3]) litWindow(g, { w: 1.5, h: 2.2, kind: "dim", cols: 2, rows: 3, pos: [-5.0, 7.3, z], rotY: -Math.PI / 2 });
  g.add(box(0.16, 2.6, 1.2, doorMat, -5.12, 1.3, 0));

  for (const z of [6.05, -6.05]) g.add(cyl(0.07, 0.07, 9.4, MAT.metal, 5.05, 4.7, z, 8));
  g.add(cyl(0.07, 0.07, 9.4, MAT.metal, -5.05, 4.7, 6.05, 8));

  // island pavement, clutter, outline
  const slab = box(12.8, 0.16, 15.8, slabMat, 0.9, 0.08, 1.1); // x -5.5..7.3  z -6.8..9.0
  slab.castShadow = false;
  g.add(slab);
  g.add(crate(6.3, 0.16, 7.3, 1.1, 0.3), crate(5.1, 0.16, 8.1, 0.8, -0.2));
  g.add(bollard(7.0, 8.7), bollard(7.0, -6.5));
  const lamp = streetLamp(7.0, -5.0, { intensity: 22 });
  lamp.position.y = 0.16;
  g.add(lamp);
  const outline = outlineFor(10.7, 11.0, 12.9, 0, 5.5, 0, 0xe8b45a);
  g.add(outline);

  return {
    group: g,
    windows,
    outline,
    lamps: [lamp],
    doorLocal: { pos: new THREE.Vector3(8.6, 2.0, 5.3), target: new THREE.Vector3(5.0, 1.5, 3.9) },
    smearsLocal: [
      { at: new THREE.Vector3(5.4, 0, -1.2), color: 0xffa050, width: 5.4, length: 11, opacity: 0.5 },
      { at: new THREE.Vector3(1.6, 0, 6.3), color: 0xffa050, width: 2.4, length: 6, opacity: 0.2 },
      { at: new THREE.Vector3(7.0, 0, -5.0), color: 0xffb060, width: 2.0, length: 10, opacity: 0.5 },
    ],
  };
}

// ---- The music apartment: front face is -x, near side is +z ------------------------------------
function buildApartment() {
  const g = new THREE.Group();
  g.userData.destination = "studio";
  const concreteMat = toon({ map: T.concrete([2.6, 2.4], 11) });
  const bayMat = toon({ map: T.concrete([1.1, 2.2], 17, [195, 7, 46]) });
  const ledge = toon({ color: 0x646c71 });
  const darkMetal = toon({ color: 0x171a1e });
  const roof = toon({ map: T.roofTar([4, 5], 12) });
  const windows = [];

  g.add(box(10, 12.2, 14, concreteMat, 0, 6.1, 0)); // x -5..5  z -7..7
  for (const y of [4.3, 8.3]) g.add(box(10.3, 0.22, 14.3, ledge, 0, y, 0));
  g.add(box(10.4, 0.3, 14.4, ledge, 0, 12.3, 0));
  g.add(box(9.9, 0.2, 13.9, roof, 0, 12.5, 0));
  for (const z of [7.1, -7.1]) g.add(box(10.5, 0.5, 0.35, ledge, 0, 12.65, z));
  for (const x of [5.1, -5.1]) g.add(box(0.35, 0.5, 14.5, ledge, x, 12.65, 0));
  // rooftop: tank, air unit, stair bulkhead, railing along the front
  const tank = cyl(0.9, 0.9, 1.6, darkMetal, 2.0, 13.8, -3.0, 14);
  g.add(tank);
  for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) g.add(cyl(0.05, 0.05, 0.9, MAT.metal, 2.0 + dx, 12.95, -3.0 + dz, 6));
  g.add(box(1.2, 0.8, 1.0, ledge, -2.5, 13.0, 3.0));
  g.add(box(1.8, 2.2, 2.0, concreteMat, 3.0, 13.7, 4.5));
  g.add(box(0.1, 1.8, 0.9, darkMetal, 2.05, 13.5, 4.5));
  for (let z = -6; z <= 6; z += 2) g.add(box(0.05, 0.9, 0.05, darkMetal, -5.1, 13.35, z));
  g.add(box(0.04, 0.04, 14, darkMetal, -5.1, 13.8, 0));
  for (let x = -4; x <= 4; x += 2) g.add(box(0.05, 0.9, 0.05, darkMetal, x, 13.35, 7.1));
  g.add(box(10, 0.04, 0.04, darkMetal, 0, 13.8, 7.1));

  // corner bay stepping out of the near face at the front corner
  g.add(box(3.9, 8.0, 1.8, bayMat, -3.35, 8.3, 7.4)); // x -5.3..-1.4  z 6.5..8.3
  g.add(box(4.2, 0.3, 2.1, ledge, -3.35, 4.3, 7.4));
  g.add(box(4.2, 0.3, 2.1, ledge, -3.35, 12.35, 7.4));
  g.add(box(4.2, 0.18, 2.1, ledge, -3.35, 8.3, 7.4));
  windows.push(litWindow(g, { w: 2.9, h: 2.6, kind: "desk", cols: 3, rows: 2, pos: [-3.35, 10.5, 8.3], intensity: 1.05, seed: 1, halo: 0.3 }));
  windows.push(litWindow(g, { w: 2.9, h: 2.4, kind: "bedroom", cols: 3, rows: 2, pos: [-3.35, 6.35, 8.3], intensity: 0.95, seed: 2, halo: 0.25 }));
  windows.push(litWindow(g, { w: 1.2, h: 2.6, kind: "desk", cols: 1, rows: 2, pos: [-5.3, 10.5, 7.4], rotY: -Math.PI / 2, intensity: 1.0, seed: 3 }));
  windows.push(litWindow(g, { w: 1.2, h: 2.4, kind: "bedroom", cols: 1, rows: 2, pos: [-5.3, 6.35, 7.4], rotY: -Math.PI / 2, intensity: 0.9, seed: 4 }));

  // front (-x)
  windows.push(litWindow(g, { w: 1.8, h: 2.3, kind: "stair", cols: 2, rows: 2, pos: [-5.0, 6.35, 0.6], rotY: -Math.PI / 2, intensity: 0.75, seed: 6, halo: 0.12 }));
  litWindow(g, { w: 1.8, h: 2.3, kind: "dim", cols: 2, rows: 2, pos: [-5.0, 10.5, 0.6], rotY: -Math.PI / 2 });
  litWindow(g, { w: 1.8, h: 2.3, kind: "dim", cols: 2, rows: 2, pos: [-5.0, 6.35, -4.6], rotY: -Math.PI / 2 });
  windows.push(litWindow(g, { w: 1.8, h: 2.3, kind: "stair", cols: 2, rows: 2, pos: [-5.0, 10.5, -4.6], rotY: -Math.PI / 2, intensity: 0.65, seed: 7 }));
  windows.push(litWindow(g, { w: 3.0, h: 2.1, kind: "shop", cols: 2, rows: 1, pos: [-5.0, 2.3, -1.2], rotY: -Math.PI / 2, intensity: 0.9, seed: 9, halo: 0.14 }));
  g.add(plane(2.6, 0.55, toon({ map: T.shopSign("RECORD SHOP") }), -5.08, 3.75, -1.2, -Math.PI / 2));
  g.add(box(0.14, 2.8, 1.3, darkMetal, -5.04, 1.4, 2.6));
  windows.push(litWindow(g, { w: 1.1, h: 0.5, kind: "stair", cols: 2, rows: 1, pos: [-5.0, 3.1, 2.6], rotY: -Math.PI / 2, intensity: 0.9 }));
  windows.push(litWindow(g, { w: 1.0, h: 2.3, kind: "stair", cols: 1, rows: 2, pos: [-5.0, 1.35, -5.2], rotY: -Math.PI / 2, intensity: 1.0, seed: 12, halo: 0.12 }));
  g.add(box(0.26, 0.6, 0.42, MAT.metal, -5.1, 3.3, 4.3));
  g.add(cyl(0.07, 0.07, 12, MAT.metal, -5.08, 6.1, -6.9, 8));

  // near face (+z)
  litWindow(g, { w: 2.0, h: 2.4, kind: "dim", cols: 2, rows: 2, pos: [0.8, 10.5, 7.0] });
  windows.push(litWindow(g, { w: 2.0, h: 2.4, kind: "stair", cols: 2, rows: 2, pos: [3.4, 10.5, 7.0], intensity: 0.65, seed: 10 }));
  windows.push(litWindow(g, { w: 2.0, h: 2.4, kind: "bedroom", cols: 2, rows: 2, pos: [0.8, 6.35, 7.0], intensity: 0.7, seed: 5 }));
  litWindow(g, { w: 2.0, h: 2.4, kind: "dim", cols: 2, rows: 2, pos: [3.4, 6.35, 7.0] });
  windows.push(litWindow(g, { w: 3.4, h: 2.2, kind: "shop", cols: 2, rows: 1, pos: [1.6, 2.3, 7.0], intensity: 0.95, seed: 11, halo: 0.14 }));
  g.add(box(1.2, 2.7, 0.14, darkMetal, 4.1, 1.35, 7.04));

  // back (-z) and far side (+x)
  for (const x of [-3, 0, 3]) for (const y of [6.35, 10.5]) litWindow(g, { w: 1.8, h: 2.3, kind: "dim", cols: 2, rows: 2, pos: [x, y, -7.0], rotY: Math.PI });
  for (const z of [-4, 0, 4]) for (const y of [6.35, 10.5]) litWindow(g, { w: 1.8, h: 2.3, kind: "dim", cols: 2, rows: 2, pos: [5.0, y, z], rotY: Math.PI / 2 });
  g.add(box(0.14, 2.6, 1.2, darkMetal, 5.04, 1.3, 0));

  // neon: 音楽アパート, hung off the front wall at the near corner
  const neonMap = T.neonSign(["音", "楽", "ア", "パ", "ー", "ト"]);
  const neonMat = new THREE.MeshBasicMaterial({ map: neonMap, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const sign = new THREE.Group();
  sign.position.set(-5.95, 7.7, 5.0);
  sign.add(box(1.55, 7.7, 0.3, darkMetal, 0, 0, 0));
  sign.add(plane(1.3, 7.5, neonMat, 0, 0, 0.17));
  sign.add(plane(1.3, 7.5, neonMat, 0, 0, -0.17, Math.PI));
  for (const y of [-3.5, 3.5]) sign.add(box(1.0, 0.08, 0.08, darkMetal, 0.5, y, 0));
  const neonHalo = glow(0xff5fcf, 1, 0.3);
  neonHalo.scale.set(5, 11, 1);
  neonHalo.position.z = 0.5;
  sign.add(neonHalo);
  g.add(sign);
  const neonLight = new THREE.PointLight(0xff5fcf, 12, 0, 2);
  neonLight.position.set(-6.5, 7.5, 5.9);
  g.add(neonLight);

  // island pavement, scooter, outline
  const slab = box(12.8, 0.16, 17.3, slabMat, -0.9, 0.08, 1.5); // x -7.3..5.5  z -7.15..10.15
  slab.castShadow = false;
  g.add(slab);
  const sc = scooter(1.5, 9.0, 0.1);
  sc.position.y = 0.16;
  g.add(sc);
  g.add(bollard(-7.0, 9.9), bollard(-7.0, -6.9));
  const lamp = streetLamp(-7.0, -5.5, { intensity: 22 });
  lamp.position.y = 0.16;
  g.add(lamp);
  const outline = outlineFor(10.8, 13.4, 14.7, 0, 6.7, 0.3, 0xff6fcf);
  g.add(outline);

  return {
    group: g,
    windows,
    outline,
    lamps: [lamp],
    neon: { mat: neonMat, light: neonLight, halo: neonHalo.material, baseLight: 12, baseHalo: 0.3 },
    doorLocal: { pos: new THREE.Vector3(-8.6, 2.0, 4.6), target: new THREE.Vector3(-5.0, 1.5, 2.6) },
    smearsLocal: [
      { at: new THREE.Vector3(-6.2, 0, 5.2), color: 0xff5fcf, width: 3.0, length: 14, opacity: 0.45 },
      { at: new THREE.Vector3(-3.35, 0, 8.5), color: 0xffb060, width: 3.4, length: 10, opacity: 0.36 },
      { at: new THREE.Vector3(1.6, 0, 7.2), color: 0xffb060, width: 3.0, length: 6, opacity: 0.18 },
      { at: new THREE.Vector3(-5.3, 0, -1.2), color: 0xffb060, width: 2.6, length: 6, opacity: 0.16 },
      { at: new THREE.Vector3(-7.0, 0, -5.5), color: 0xffb060, width: 2.0, length: 10, opacity: 0.5 },
    ],
  };
}

// ---- the square --------------------------------------------------------------------------------------
export function buildStreet(scene, { viewer = new THREE.Vector3(0, 5, 27) } = {}) {
  const animated = [];
  const lamps = [];
  const buildings = {};
  const add = (o) => {
    scene.add(o);
    if (o.userData.update) animated.push(o);
    return o;
  };

  scene.fog = new THREE.FogExp2(FOG, 0.0105);
  scene.background = new THREE.Color(FOG);

  // ground: cobbles everywhere, pavement where people walk
  const cob = T.cobblestone([64, 80]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 200), toon({ map: cob.map, bumpMap: cob.bumpMap, bumpScale: 0.5 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -40);
  ground.receiveShadow = true;
  add(ground);
  add(drain(1.6, -4));
  add(drain(-2.4, 12.8));

  // the two buildings, turned toward each other and toward the viewer
  const place = (b, x, z, rotY) => {
    b.group.position.set(x, 0, z);
    b.group.rotation.y = rotY;
    b.group.updateMatrixWorld(true);
    b.doorView = { pos: b.group.localToWorld(b.doorLocal.pos.clone()), target: b.group.localToWorld(b.doorLocal.target.clone()) };
    for (const s of b.smearsLocal) {
      const w = b.group.localToWorld(s.at.clone());
      add(smear(w.x, w.z, s.color, { width: s.width, length: s.length, opacity: s.opacity, angle: Math.atan2(viewer.x - w.x, viewer.z - w.z) }));
    }
    lamps.push(...b.lamps);
    add(b.group);
  };
  const tavern = buildTavern();
  place(tavern, -13.5, -1.0, -0.35);
  buildings.tavern = tavern;
  const studio = buildApartment();
  place(studio, 13.5, -2.0, 0.35);
  buildings.studio = studio;

  // the far end of the street and a skyline behind it, all soft in the fog
  {
    const rand = T.rng(42);
    const far = toon({ color: 0x1b2229 });
    const mid = toon({ map: T.concrete([2, 2], 21, [200, 6, 28]) });
    const bg = new THREE.Group();
    for (let i = 0; i < 34; i++) {
      const w = 8 + rand() * 16, h = 10 + rand() * 30, x = -125 + i * 7.5 + rand() * 5;
      bg.add(box(w, h, 10, rand() < 0.5 ? far : mid, x, h / 2, -95 - rand() * 35));
    }
    bg.traverse((o) => {
      if (o.isMesh) o.castShadow = false;
    });
    add(bg);
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(900, 360), new THREE.MeshBasicMaterial({ map: T.skyGradient("#1c2634", "#" + FOG.toString(16).padStart(6, "0")), fog: false }));
    backdrop.position.set(0, 110, -250);
    backdrop.raycast = () => {};
    add(backdrop);
  }

  // lamps, poles, wires
  for (const [x, z] of [[-6.8, -16], [6.8, -30], [-6.8, -44], [6.8, -58]]) lamps.push(add(streetLamp(x, z)));
  const poles = [add(utilityPole(-9.2, -14, { transformer: true })), add(utilityPole(9.2, -31)), add(utilityPole(-9.2, -48)), add(utilityPole(9.2, -65, { crossbars: 1 }))];
  for (const level of [0, 1]) add(wireRun(poles.filter((p) => p.userData.tops[level]).map((p) => p.userData.tops[level]), { strands: 3, sag: 1.1 }));
  const tavernRoof = tavern.group.localToWorld(new THREE.Vector3(5, 10.6, -6));
  const studioRoof = studio.group.localToWorld(new THREE.Vector3(-5, 12.9, -7));
  add(wireRun([tavernRoof, poles[0].userData.tops[0]], { strands: 2, sag: 0.5 }));
  add(wireRun([poles[0].userData.tops[1], studioRoof], { strands: 2, sag: 1.0 }));
  add(wireRun([poles[0].userData.tops[0], studio.group.localToWorld(new THREE.Vector3(-5.9, 11.2, 5.0))], { strands: 1, sag: 0.9 }));
  for (const l of lamps.slice(2)) add(smear(l.position.x, l.position.z, 0xffb060, { width: 2.0, length: 10, opacity: 0.48, angle: Math.atan2(viewer.x - l.position.x, viewer.z - l.position.z) }));

  // weather
  add(makeRain());
  add(makeSteam(1.6, 0.05, -4));
  add(makeSteam(-2.4, 0.05, 12.8, { count: 3, rise: 1.8 }));

  // sky light: flat and cool, stepped by the toon ramp
  add(new THREE.HemisphereLight(0x55708a, 0x1c2126, 2.2));
  const moon = new THREE.DirectionalLight(0x8ea3c8, 1.7);
  moon.position.set(-26, 42, 22);
  moon.target.position.set(0, 0, -8);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -36;
  moon.shadow.camera.right = 36;
  moon.shadow.camera.top = 40;
  moon.shadow.camera.bottom = -40;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 140;
  moon.shadow.bias = -0.0006;
  moon.shadow.normalBias = 0.04;
  add(moon);
  add(moon.target);

  function neonFlicker(t) {
    if (Math.sin(t * 1.3) > 0.985) return 0.35 + 0.3 * Math.abs(Math.sin(t * 90));
    return 0.93 + 0.07 * Math.sin(t * 41) * Math.sin(t * 9.3);
  }
  function update(dt, t) {
    for (const o of animated) o.userData.update(dt, t);
    const f = neonFlicker(t);
    const n = studio.neon;
    n.light.intensity = n.baseLight * f;
    n.halo.opacity = n.baseHalo * f;
    n.mat.color.setScalar(0.7 + 0.3 * f);
    lamps.forEach((l, i) => {
      const k = 0.97 + 0.03 * Math.sin(t * 13 + i) * Math.sin(t * 5.7 + i * 2);
      l.userData.light.intensity = l.userData.baseIntensity * k;
      l.userData.halo.opacity = 0.55 * k;
    });
  }

  return { buildings, update };
}
