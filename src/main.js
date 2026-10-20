import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildStreet } from "./street.js";
import { createInk } from "./ink.js";
import { DESTINATIONS } from "./destinations.js";
import "./style.css";

// ---- renderer, scene, camera ---------------------------------------------------
const stage = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 500);
const HOME = { pos: new THREE.Vector3(0.3, 5.8, 34), target: new THREE.Vector3(0.1, 4.4, -6) };
camera.position.copy(HOME.pos);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.rotateSpeed = 0.35;
controls.zoomSpeed = 0.6;
controls.minDistance = 34;
controls.maxDistance = 48;
controls.minPolarAngle = Math.PI * 0.40;
controls.maxPolarAngle = Math.PI * 0.52;
controls.minAzimuthAngle = -0.5;
controls.maxAzimuthAngle = 0.5;
controls.update();

const street = buildStreet(scene, { viewer: HOME.pos });
const ink = createInk(renderer, scene, camera, { ink: 1.0, grain: 0.18 });

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  ink.setSize();
});

// ---- HUD ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const tooltip = $("tooltip"), tooltipName = $("tooltip-name"), tooltipBlurb = $("tooltip-blurb");
const fade = $("fade"), toast = $("toast"), hint = $("hint");
const portal = $("portal"), frame = $("portal-frame"), portalTitle = $("portal-title"), portalOpen = $("portal-open");
const doorButtons = [...document.querySelectorAll(".door")];

function tickClock() {
  const d = new Date();
  let h = d.getHours() % 12 || 12;
  $("clock").textContent = `${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;
}
tickClock();
setInterval(tickClock, 15000);

let toastTimer;
function showToast(html, ms = 9000) {
  toast.innerHTML = html;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.hidden = true), ms);
}

// ---- small tween helper ----------------------------------------------------------------
const tweens = [];
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
function tween(dur, onUpdate, onDone) {
  return new Promise((resolve) => {
    tweens.push({ t: 0, dur, onUpdate, onDone: () => { onDone?.(); resolve(); } });
  });
}
function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t = Math.min(tw.t + dt, tw.dur);
    tw.onUpdate(easeInOut(tw.t / tw.dur));
    if (tw.t >= tw.dur) {
      tweens.splice(i, 1);
      tw.onDone();
    }
  }
}

function flyCamera(pos, target, dur) {
  const p0 = camera.position.clone(), t0 = controls.target.clone();
  return tween(dur, (k) => {
    camera.position.lerpVectors(p0, pos, k);
    controls.target.lerpVectors(t0, target, k);
  });
}
function fadeTo(opacity, dur) {
  const o0 = parseFloat(fade.style.opacity || "0");
  fade.classList.toggle("is-blocking", opacity > 0.5);
  return tween(dur, (k) => (fade.style.opacity = String(o0 + (opacity - o0) * k)));
}

// ---- hover and picking ----------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
raycaster.params.Line.threshold = 0;
const pointer = new THREE.Vector2();
const pickTargets = Object.values(street.buildings).map((b) => b.group);
const glow = { tavern: 0, studio: 0 };
let hovered = null;
let busy = false;

function pickAt(x, y) {
  pointer.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickTargets, true)[0];
  let o = hit?.object;
  while (o && !o.userData.destination) o = o.parent;
  return o?.userData.destination ?? null;
}

function setHover(id) {
  if (hovered === id) return;
  hovered = id;
  renderer.domElement.style.cursor = id ? "pointer" : "";
  tooltip.classList.toggle("is-on", !!id);
  if (id) {
    const d = DESTINATIONS[id];
    tooltipName.textContent = d.name;
    tooltipBlurb.textContent = d.blurb;
    tooltip.style.setProperty("--accent", d.accent);
  }
  for (const b of doorButtons) b.classList.toggle("is-hot", b.dataset.dest === id);
}

function updateGlow(dt) {
  for (const id of Object.keys(glow)) {
    const goal = hovered === id && !busy ? 1 : 0;
    glow[id] += (goal - glow[id]) * Math.min(1, dt * 9);
    const b = street.buildings[id];
    for (const m of b.windows) m.color.setScalar(m.userData.base * (1 + 0.6 * glow[id]));
    b.outline.material.opacity = 0.8 * glow[id];
  }
}

let down = null;
const canvas = renderer.domElement;
canvas.addEventListener("pointermove", (e) => {
  tooltip.style.transform = `translate(${e.clientX + 18}px, ${e.clientY + 18}px)`;
  if (busy) return;
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
    setHover(null);
    return;
  }
  setHover(pickAt(e.clientX, e.clientY));
});
canvas.addEventListener("pointerleave", () => setHover(null));
canvas.addEventListener("pointerdown", (e) => (down = { x: e.clientX, y: e.clientY, t: performance.now() }));
canvas.addEventListener("pointerup", (e) => {
  const d = down;
  down = null;
  if (!d || busy) return;
  if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 600) return;
  const id = pickAt(e.clientX, e.clientY);
  if (id) enter(id);
});
for (const b of doorButtons) {
  b.addEventListener("pointerenter", () => !busy && setHover(b.dataset.dest));
  b.addEventListener("pointerleave", () => setHover(null));
  b.addEventListener("click", () => enter(b.dataset.dest));
}

// ---- going inside ----------------------------------------------------------------------------
async function reachable(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5000);
  try {
    await fetch(url, { mode: "no-cors", cache: "no-store", signal: ctl.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function enter(id, { instant = false } = {}) {
  if (busy) return;
  const dest = DESTINATIONS[id];
  const b = street.buildings[id];
  busy = true;
  setHover(null);
  controls.enabled = false;

  const ping = reachable(dest.url);
  if (!instant) {
    const fly = flyCamera(b.doorView.pos, b.doorView.target, 1.5);
    await tween(0.8, () => {});
    await Promise.all([fadeTo(1, 0.7), fly]);
  } else {
    fade.style.opacity = "1";
    fade.classList.add("is-blocking");
  }

  if (!(await ping)) {
    const local = /localhost|127\.0\.0\.1/.test(dest.url);
    showToast(
      `<strong>${dest.name}</strong> isn't answering at <code>${dest.url}</code>.<br>` +
        (local
          ? `Start everything with <code>npm run dev:all</code> from the city-square folder, then try the door again.`
          : `Check the address, or set <code>VITE_${id.toUpperCase()}_URL</code> in a .env file.`)
    );
    await leave();
    return;
  }
  openPortal(dest);
  if (!instant && !history.state?.portal) history.pushState({ portal: id }, "", `#${id}`);
}

function openPortal(dest) {
  portalTitle.textContent = dest.name;
  portalOpen.href = dest.url;
  frame.src = dest.url;
  portal.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => portal.classList.add("is-open")));
  running = false;
  setTimeout(() => {
    fade.style.opacity = "0";
    fade.classList.remove("is-blocking");
  }, 650);
}

async function leave() {
  running = true;
  portal.classList.remove("is-open");
  await tween(0.55, () => {});
  portal.hidden = true;
  frame.src = "about:blank";
  await Promise.all([fadeTo(0, 0.9), flyCamera(HOME.pos, HOME.target, 1.4)]);
  controls.enabled = true;
  busy = false;
}

$("portal-back").addEventListener("click", () => {
  if (history.state?.portal) history.back();
  else leave();
});
window.addEventListener("popstate", () => {
  if (!history.state?.portal && !portal.hidden) leave();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !portal.hidden) $("portal-back").click();
});

// deep link: /#tavern or /#studio opens that door straight away
const hash = location.hash.replace("#", "");
if (DESTINATIONS[hash]) {
  history.replaceState({ portal: hash }, "", `#${hash}`);
  enter(hash, { instant: true });
}

// ---- loop -------------------------------------------------------------------------------------
let running = true;
const clock = new THREE.Clock();
let hintShown = true;
function loop() {
  requestAnimationFrame(loop);
  const raw = clock.getDelta();
  if (!running) return;
  const dt = Math.min(raw, 0.05); // simulation step: rain, flicker
  const t = clock.elapsedTime;
  street.update(dt, t);
  updateTweens(Math.min(raw, 0.5)); // camera walks and fades follow wall-clock time
  updateGlow(dt);
  controls.update();
  ink.render(t);
  if (hintShown && t > 14) {
    hintShown = false;
    hint.style.opacity = "0";
  }
}
loop();
