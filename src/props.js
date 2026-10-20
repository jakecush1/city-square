// Street furniture: lamps, utility poles and wires, rain, steam, a scooter, crates.
import * as THREE from "three";
import { softSprite, rng, planks } from "./textures.js";

export const MAT = {
  metal: new THREE.MeshStandardMaterial({ color: 0x1b1f24, roughness: 0.55, metalness: 0.6 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x241f1b, roughness: 0.9 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x101214, roughness: 0.9 }),
  insulator: new THREE.MeshStandardMaterial({ color: 0x566a70, roughness: 0.4 }),
  wire: new THREE.LineBasicMaterial({ color: 0x07090c }),
};

let crateTex;

export function streetLamp(x, z, { height = 4.4, color = 0xffb766, intensity = 34, rotation = 0 } = {}) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.5, 12), MAT.metal);
  base.position.y = 0.25;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.1, height, 10), MAT.metal);
  pole.position.y = height / 2 + 0.4;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.11, 0.26, 10), MAT.metal);
  collar.position.y = height + 0.42;
  const cage = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.72, 0.52),
    new THREE.MeshStandardMaterial({ color: 0x0f1216, roughness: 0.6, metalness: 0.5, transparent: true, opacity: 0.4 })
  );
  cage.position.y = height + 0.95;
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.52, 0.36),
    new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb15c, emissiveIntensity: 3.4, roughness: 1 })
  );
  glass.position.y = height + 0.95;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.36, 4), MAT.metal);
  cap.rotation.y = Math.PI / 4;
  cap.position.y = height + 1.48;
  const light = new THREE.PointLight(color, intensity, 0, 2);
  light.position.y = height + 0.85;
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: softSprite("rgba(255,200,130,0.75)"),
      color: 0xffb15c,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  halo.scale.set(2.6, 2.6, 1);
  halo.position.y = height + 0.95;
  for (const m of [base, pole, collar, cap]) m.castShadow = true;
  g.add(base, pole, collar, cage, glass, cap, light, halo);
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  g.userData.light = light;
  g.userData.glass = glass.material;
  g.userData.halo = halo.material;
  g.userData.baseIntensity = intensity;
  return g;
}

export function utilityPole(x, z, { height = 11.5, crossbars = 2, transformer = false, rotation = 0 } = {}) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, height, 8), MAT.darkWood);
  pole.position.y = height / 2;
  pole.castShadow = true;
  g.add(pole);
  for (let i = 0; i < crossbars; i++) {
    const y = height - 0.55 - i * 0.95;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 0.12), MAT.darkWood);
    bar.position.y = y;
    g.add(bar);
    for (const dx of [-0.95, -0.35, 0.35, 0.95]) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.2, 6), MAT.insulator);
      ins.position.set(dx, y + 0.16, 0);
      g.add(ins);
    }
  }
  if (transformer) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.0, 12), MAT.metal);
    t.position.set(0.5, height - 2.8, 0);
    g.add(t);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 12), MAT.metal);
    lid.position.set(0.5, height - 2.26, 0);
    g.add(lid);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  g.userData.tops = [0, 1].map((i) => new THREE.Vector3(x, height - 0.4 - i * 0.95, z));
  return g;
}

export function wire(a, b, sag = 0.7) {
  const mid = a.clone().lerp(b, 0.5);
  mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(18));
  const line = new THREE.Line(geo, MAT.wire);
  line.raycast = () => {};
  return line;
}

// Bundle of wires between consecutive anchor points, with small lateral offsets.
export function wireRun(points, { strands = 3, sag = 0.8 } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < points.length - 1; i++) {
    for (let s = 0; s < strands; s++) {
      const off = new THREE.Vector3((s - (strands - 1) / 2) * 0.22, s * 0.05, 0);
      g.add(wire(points[i].clone().add(off), points[i + 1].clone().add(off), sag * (0.8 + s * 0.15)));
    }
  }
  return g;
}

export function makeRain({ count = 2600, x = [-24, 24], y = [0, 24], z = [-55, 20] } = {}) {
  const rand = rng(99);
  const pos = new Float32Array(count * 6);
  const vel = new Float32Array(count);
  const len = 0.6;
  for (let i = 0; i < count; i++) {
    const px = x[0] + rand() * (x[1] - x[0]);
    const py = y[0] + rand() * (y[1] - y[0]);
    const pz = z[0] + rand() * (z[1] - z[0]);
    pos.set([px, py, pz, px + 0.05, py + len, pz], i * 6);
    vel[i] = 15 + rand() * 9;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x9fb0c4, transparent: true, opacity: 0.28, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.raycast = () => {};
  const wind = 0.9;
  lines.userData.update = (dt) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const o = i * 6;
      let py = a[o + 1] - vel[i] * dt;
      let px = a[o] - wind * dt;
      if (py < y[0]) {
        py = y[1] - rand() * 2;
        px = x[0] + rand() * (x[1] - x[0]);
        a[o + 2] = a[o + 5] = z[0] + rand() * (z[1] - z[0]);
      }
      a[o] = px;
      a[o + 1] = py;
      a[o + 3] = px + 0.05;
      a[o + 4] = py + len;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return lines;
}

export function makeSteam(x, y, z, { count = 5, rise = 2.6, speed = 0.22 } = {}) {
  const g = new THREE.Group();
  const map = softSprite("rgba(255,255,255,0.5)");
  const rand = rng(Math.floor(x * 13 + z * 7));
  const puffs = [];
  for (let i = 0; i < count; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: 0xcfd6dd, transparent: true, opacity: 0, depthWrite: false }));
    s.raycast = () => {};
    puffs.push({ s, phase: rand(), dx: (rand() - 0.5) * 0.6 });
    g.add(s);
  }
  g.position.set(x, y, z);
  g.userData.update = (dt, t) => {
    for (const p of puffs) {
      const life = (t * speed + p.phase) % 1;
      p.s.position.set(p.dx + Math.sin(t * 0.7 + p.phase * 6) * 0.25 * life, life * rise, 0);
      const k = 0.7 + life * 2.4;
      p.s.scale.set(k, k, 1);
      p.s.material.opacity = Math.sin(life * Math.PI) * 0.32 * (1 - life * 0.5);
    }
  };
  return g;
}

export function scooter(x, z, rotation = 0) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.45, metalness: 0.3 });
  const wheel = new THREE.TorusGeometry(0.26, 0.09, 8, 18);
  const w1 = new THREE.Mesh(wheel, MAT.rubber);
  w1.position.set(-0.75, 0.3, 0);
  const w2 = new THREE.Mesh(wheel, MAT.rubber);
  w2.position.set(0.75, 0.3, 0);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.42), body);
  floor.position.set(-0.05, 0.42, 0);
  const rear = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), body);
  rear.position.set(0.55, 0.75, 0);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 0.42), MAT.rubber);
  seat.position.set(0.5, 1.07, 0);
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.95, 0.5), body);
  front.position.set(-0.7, 0.85, 0);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), MAT.metal);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(-0.75, 1.38, 0);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffc070, emissiveIntensity: 0.3 }));
  lamp.position.set(-0.9, 1.1, 0);
  const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), MAT.metal);
  mirror.position.set(-0.7, 1.55, 0.25);
  for (const m of [w1, w2, floor, rear, seat, front]) m.castShadow = true;
  g.add(w1, w2, floor, rear, seat, front, bar, lamp, mirror);
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  return g;
}

export function crate(x, y, z, size = 1.1, rotation = 0) {
  crateTex ??= planks([1, 1], 30, 21);
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(size, size * 0.8, size),
    new THREE.MeshStandardMaterial({ map: crateTex, color: 0x8a7a66, roughness: 0.95 })
  );
  m.position.set(x, y + size * 0.4, z);
  m.rotation.y = rotation;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function drain(x, z) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.6), MAT.metal);
  frame.position.y = 0.03;
  g.add(frame);
  for (let i = -3; i <= 3; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.44), new THREE.MeshStandardMaterial({ color: 0x000000 }));
    slot.position.set(i * 0.13, 0.065, 0);
    g.add(slot);
  }
  g.position.set(x, 0, z);
  return g;
}
