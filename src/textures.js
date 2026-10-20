// Procedural canvas textures painted at startup: nothing is downloaded.
// The palette is deliberately matte and grubby: teal-grey plaster, sooty brick, rain-streaked concrete.
import * as THREE from "three";

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function tex(c, { repeat = [1, 1], srgb = true, wrap = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function speckle(ctx, w, h, count, rand, alpha = 0.08) {
  for (let i = 0; i < count; i++) {
    const v = Math.floor(rand() * 255);
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }
}

// Rain streaks, soot and damp: the dirt layer shared by every wall texture.
function grime(ctx, w, h, rand, { streaks = 30, stains = 8, moss = 0.35, soot = 0.25 } = {}) {
  for (let i = 0; i < streaks; i++) {
    const x = rand() * w, top = rand() * h * 0.6, len = 60 + rand() * h * 0.7;
    const g = ctx.createLinearGradient(0, top, 0, top + len);
    g.addColorStop(0, `rgba(10,12,12,${0.18 + rand() * 0.25})`);
    g.addColorStop(1, "rgba(10,12,12,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, top, 2 + rand() * 7, len);
  }
  for (let i = 0; i < stains; i++) {
    const x = rand() * w, y = rand() * h, r = 30 + rand() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(20,24,22,${0.12 + rand() * 0.2})`);
    g.addColorStop(1, "rgba(20,24,22,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.5 + rand() * 0.6), rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (moss > 0) {
    const g = ctx.createLinearGradient(0, h * 0.72, 0, h);
    g.addColorStop(0, "rgba(60,80,50,0)");
    g.addColorStop(1, `rgba(55,78,48,${moss})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
  }
  if (soot > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.25);
    g.addColorStop(0, `rgba(8,10,10,${soot})`);
    g.addColorStop(1, "rgba(8,10,10,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h * 0.25);
  }
}

// Faint hand-drawn hatching so flat colour reads as ink and wash.
function hatch(ctx, w, h, rand, alpha = 0.05, spacing = 9) {
  ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
  ctx.lineWidth = 1;
  for (let y = -w; y < h + w; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y + rand() * 2);
    ctx.lineTo(w, y + w * 0.6 + rand() * 2);
    ctx.stroke();
  }
}

// --- toon ramp ---------------------------------------------------------------------
export function toonGradient(steps = [0.32, 0.5, 0.72, 0.9, 1.0]) {
  const data = new Uint8Array(steps.map((v) => Math.round(v * 255)));
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

// --- paper grain for the ink pass --------------------------------------------------
export function paperNoise() {
  const W = 384, H = 384;
  const [c, ctx] = canvas(W, H);
  const img = ctx.createImageData(W, H);
  const rand = rng(77);
  for (let i = 0; i < W * H; i++) {
    const v = 128 + (rand() - 0.5) * 70 + (rand() - 0.5) * 30;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = tex(c, { srgb: false });
  t.anisotropy = 1;
  return t;
}

// --- cobblestones (colour + bump) ----------------------------------------------------
export function cobblestone(repeat = [1, 1]) {
  const rand = rng(7);
  const W = 512, H = 512, sw = 34, sh = 26, g = 4;
  const [c, ctx] = canvas(W, H);
  const [b, bctx] = canvas(W, H);
  ctx.fillStyle = "#1d2225";
  ctx.fillRect(0, 0, W, H);
  bctx.fillStyle = "#101010";
  bctx.fillRect(0, 0, W, H);
  for (let row = 0, y = 0; y < H + sh; row++, y += sh) {
    const off = row % 2 ? sw / 2 : 0;
    for (let x = -sw; x < W + sw; x += sw) {
      const px = x + off + g / 2 + (rand() - 0.5) * 3;
      const py = y + g / 2 + (rand() - 0.5) * 2;
      const w = sw - g - rand() * 4, h = sh - g - rand() * 3;
      const L = 33 + rand() * 14;
      const hue = 190 + rand() * 30;
      ctx.fillStyle = `hsl(${hue}, ${7 + rand() * 7}%, ${L}%)`;
      ctx.beginPath();
      ctx.roundRect(px, py, w, h, 6);
      ctx.fill();
      ctx.fillStyle = `hsla(${hue}, 10%, ${L + 12}%, 0.3)`;
      ctx.fillRect(px + 3, py + 2, w - 6, 2);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
      const gr = bctx.createRadialGradient(px + w / 2, py + h / 2, 2, px + w / 2, py + h / 2, w / 2);
      gr.addColorStop(0, "#c8c8c8");
      gr.addColorStop(0.75, "#9a9a9a");
      gr.addColorStop(1, "#2a2a2a");
      bctx.fillStyle = gr;
      bctx.beginPath();
      bctx.roundRect(px, py, w, h, 6);
      bctx.fill();
    }
  }
  speckle(ctx, W, H, 2500, rand, 0.1);
  grime(ctx, W, H, rand, { streaks: 0, stains: 14, moss: 0, soot: 0 });
  return { map: tex(c, { repeat }), bumpMap: tex(b, { repeat, srgb: false }) };
}

// --- flagstone pavement -------------------------------------------------------------
export function pavement(repeat = [1, 1], seed = 13) {
  const rand = rng(seed);
  const W = 512, H = 512, sw = 128, sh = 96;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#1c2123";
  ctx.fillRect(0, 0, W, H);
  for (let row = 0, y = 0; y < H; row++, y += sh) {
    const off = row % 2 ? sw / 2 : 0;
    for (let x = -sw; x < W; x += sw) {
      ctx.fillStyle = `hsl(${195 + rand() * 20}, ${6 + rand() * 5}%, ${30 + rand() * 9}%)`;
      ctx.fillRect(x + off + 3, y + 3, sw - 6, sh - 6);
    }
  }
  speckle(ctx, W, H, 6000, rand, 0.07);
  grime(ctx, W, H, rand, { streaks: 0, stains: 10, moss: 0, soot: 0 });
  hatch(ctx, W, H, rand, 0.04, 11);
  return tex(c, { repeat });
}

// --- old plaster peeling off brick (tavern upper storey) ------------------------------
export function oldPlaster(repeat = [1, 1], seed = 3) {
  const rand = rng(seed);
  const W = 512, H = 512;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#2e2724";
  ctx.fillRect(0, 0, W, H);
  const bw = 52, bh = 22, m = 4;
  for (let row = 0, y = 0; y < H; row++, y += bh) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < W; x += bw) {
      ctx.fillStyle = `hsl(${10 + rand() * 16}, ${16 + rand() * 12}%, ${24 + rand() * 11}%)`;
      ctx.fillRect(x + off + m / 2, y + m / 2, bw - m, bh - m);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x + off + m / 2, y + bh - m, bw - m, 2);
    }
  }
  for (let i = 0; i < 8; i++) {
    const cx = rand() * W, cy = rand() * H, r = 100 + rand() * 150;
    ctx.fillStyle = `hsl(${150 + rand() * 30}, ${8 + rand() * 6}%, ${30 + rand() * 9}%)`;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const rr = r * (0.7 + rand() * 0.45);
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.8;
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  speckle(ctx, W, H, 4000, rand, 0.08);
  grime(ctx, W, H, rand, { streaks: 34, stains: 10, moss: 0.4, soot: 0.3 });
  hatch(ctx, W, H, rand, 0.05, 8);
  return tex(c, { repeat });
}

// --- bare brick (chimneys) ------------------------------------------------------------------
export function brick(repeat = [1, 1], seed = 4) {
  const rand = rng(seed);
  const W = 256, H = 256;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#2a2522";
  ctx.fillRect(0, 0, W, H);
  const bw = 40, bh = 18, m = 4;
  for (let row = 0, y = 0; y < H; row++, y += bh) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < W; x += bw) {
      ctx.fillStyle = `hsl(${8 + rand() * 14}, ${18 + rand() * 10}%, ${22 + rand() * 10}%)`;
      ctx.fillRect(x + off + m / 2, y + m / 2, bw - m, bh - m);
    }
  }
  grime(ctx, W, H, rand, { streaks: 6, stains: 3, moss: 0, soot: 0.4 });
  return tex(c, { repeat });
}

// --- rain-streaked concrete (apartment) -----------------------------------------------------
export function concrete(repeat = [1, 1], seed = 11, base = [195, 8, 40]) {
  const rand = rng(seed);
  const W = 512, H = 512;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = `hsl(${base[0]}, ${base[1]}%, ${base[2]}%)`;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `hsla(${base[0] + rand() * 20 - 10}, ${base[1]}%, ${base[2] + rand() * 12 - 6}%, 0.5)`;
    ctx.fillRect(rand() * W, rand() * H, 40 + rand() * 120, 20 + rand() * 60);
  }
  speckle(ctx, W, H, 9000, rand, 0.07);
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 2;
  for (let y = 128; y < H; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const x = rand() * W, y = rand() * H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) ctx.lineTo(x + (rand() - 0.5) * 50, y + k * 18 + rand() * 10);
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  grime(ctx, W, H, rand, { streaks: 44, stains: 12, moss: 0.3, soot: 0.3 });
  hatch(ctx, W, H, rand, 0.045, 9);
  return tex(c, { repeat });
}

// --- painted wood planks (tavern shopfront) -----------------------------------------------------
export function planks(repeat = [1, 1], hue = 172, seed = 5, light = 15) {
  const rand = rng(seed);
  const W = 512, H = 512, pw = 64;
  const [c, ctx] = canvas(W, H);
  for (let x = 0; x < W; x += pw) {
    ctx.fillStyle = `hsl(${hue + rand() * 8}, ${20 + rand() * 8}%, ${light + rand() * 6}%)`;
    ctx.fillRect(x, 0, pw, H);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x, 0, 3, H);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(x + 3, 0, 2, H);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.08 + rand() * 0.14})`;
      ctx.fillRect(x + 5 + rand() * (pw - 10), rand() * H, 1 + rand() * 2, 40 + rand() * 160);
    }
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = `hsla(${hue}, 10%, ${light + 22}%, ${0.15 + rand() * 0.2})`;
      ctx.fillRect(x + 6 + rand() * (pw - 16), rand() * H, 4 + rand() * 10, 2 + rand() * 6);
    }
  }
  speckle(ctx, W, H, 2000, rand, 0.06);
  grime(ctx, W, H, rand, { streaks: 12, stains: 6, moss: 0.35, soot: 0.15 });
  return tex(c, { repeat });
}

// --- tar and gravel roof ---------------------------------------------------------------------------
export function roofTar(repeat = [1, 1], seed = 8) {
  const rand = rng(seed);
  const W = 256, H = 256;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#23282b";
  ctx.fillRect(0, 0, W, H);
  speckle(ctx, W, H, 7000, rand, 0.12);
  grime(ctx, W, H, rand, { streaks: 0, stains: 8, moss: 0, soot: 0 });
  return tex(c, { repeat });
}

// --- tavern name board ----------------------------------------------------------------------------------
export function signBoard(text) {
  const W = 1024, H = 192;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#1b3530";
  ctx.fillRect(0, 0, W, H);
  const rand = rng(2);
  speckle(ctx, W, H, 1500, rand, 0.12);
  ctx.strokeStyle = "#8d7c48";
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, W - 28, H - 28);
  ctx.strokeStyle = "rgba(141,124,72,0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(26, 26, W - 52, H - 52);
  ctx.font = "bold 104px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = "#d9b96c";
  ctx.fillText(text, W / 2, H / 2 + 6, W - 90);
  ctx.shadowBlur = 0;
  grime(ctx, W, H, rand, { streaks: 10, stains: 4, moss: 0, soot: 0.2 });
  return tex(c, { wrap: false });
}

// --- vertical neon sign ----------------------------------------------------------------------------------
export function neonSign(chars, color = "#ff5fcf") {
  const W = 256, H = 256 * chars.length;
  const [c, ctx] = canvas(W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 190px 'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif";
  chars.forEach((ch, i) => {
    const y = 128 + i * 256;
    ctx.shadowColor = color;
    ctx.shadowBlur = 40;
    ctx.lineWidth = 16;
    ctx.strokeStyle = color;
    ctx.lineJoin = "round";
    ctx.strokeText(ch, W / 2, y);
    ctx.strokeText(ch, W / 2, y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffe6f8";
    ctx.fillText(ch, W / 2, y);
  });
  return tex(c, { wrap: false });
}

// --- small shop sign -----------------------------------------------------------------------------------------
export function shopSign(text, bg = "#2b3134", fg = "#b7c3cc") {
  const W = 512, H = 128;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.font = "bold 52px 'IBM Plex Mono', 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = fg;
  ctx.fillText(text, W / 2, H / 2, W - 40);
  grime(ctx, W, H, rng(9), { streaks: 6, stains: 2, moss: 0, soot: 0.25 });
  return tex(c, { wrap: false });
}

// --- lit windows ------------------------------------------------------------------------------------------------
// kind: tavern | bedroom | desk | shop | dim | stair
export function windowPane({ kind = "dim", cols = 2, rows = 2, w = 256, h = 256, seed = 1 } = {}) {
  const rand = rng(seed);
  const [c, ctx] = canvas(w, h);
  const warm = ["#f0b760", "#c98538", "#6f3d16"];
  const cool = ["#3b4651", "#28303a", "#171c23"];
  const pal = kind === "dim" ? cool : warm;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, pal[0]);
  g.addColorStop(0.55, pal[1]);
  g.addColorStop(1, pal[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (kind === "tavern") {
    for (let x = 10; x < w - 10; x += 14) {
      ctx.fillStyle = `hsla(${rand() * 360}, 55%, 52%, 0.75)`;
      ctx.fillRect(x, 14, 8, 26 + rand() * 10);
    }
    ctx.fillStyle = "rgba(60,30,10,0.85)";
    ctx.fillRect(0, 50, w, 6);
    const n = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const x = 30 + (i / n) * (w - 60) + rand() * 20, y = h * 0.52 + rand() * 30, r = 16 + rand() * 8;
      ctx.fillStyle = `hsl(${15 + rand() * 20}, 35%, ${12 + rand() * 10}%)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(x - r * 1.8, y + r * 0.8, r * 3.6, h, r);
      ctx.fill();
      if (rand() > 0.5) {
        ctx.fillStyle = `hsl(${rand() > 0.5 ? 10 : 30}, 70%, 40%)`;
        ctx.beginPath();
        ctx.arc(x, y - r * 0.4, r * 1.05, Math.PI, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "rgba(40,20,8,0.9)";
    ctx.fillRect(0, h * 0.86, w, h * 0.14);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "rgba(255,210,120,0.8)";
      ctx.fillRect(20 + rand() * (w - 40), h * 0.8, 6, 14);
    }
  } else if (kind === "bedroom") {
    ctx.fillStyle = "#e9dcc7";
    ctx.beginPath();
    ctx.roundRect(w * 0.08, h * 0.55, w * 0.55, h * 0.3, 8);
    ctx.fill();
    ctx.fillStyle = "#f7f1e6";
    ctx.fillRect(w * 0.12, h * 0.58, w * 0.18, h * 0.1);
    ctx.fillStyle = "#5a3a22";
    ctx.fillRect(w * 0.08, h * 0.85, w * 0.55, h * 0.06);
    ctx.fillStyle = "rgba(90,50,30,0.8)";
    ctx.fillRect(w * 0.72, h * 0.6, w * 0.2, h * 0.3);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(w * 0.7, h * 0.2, w * 0.22, h * 0.25);
  } else if (kind === "desk") {
    ctx.fillStyle = "#4a2d18";
    ctx.fillRect(w * 0.1, h * 0.72, w * 0.8, h * 0.06);
    ctx.fillStyle = "#8fd3ff";
    ctx.fillRect(w * 0.38, h * 0.5, w * 0.26, h * 0.2);
    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(w * 0.16, h * 0.52, w * 0.12, h * 0.2);
    ctx.fillRect(w * 0.72, h * 0.52, w * 0.12, h * 0.2);
    ctx.fillStyle = "#f4efe6";
    ctx.beginPath();
    ctx.roundRect(w * 0.48, h * 0.3, w * 0.1, h * 0.12, 4);
    ctx.fill();
    ctx.fillStyle = "#3f7a4a";
    ctx.beginPath();
    ctx.arc(w * 0.86, h * 0.42, w * 0.06, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "shop") {
    ctx.fillStyle = "#1a1c20";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `hsl(${rand() * 360}, 40%, ${30 + rand() * 22}%)`;
      ctx.fillRect(14 + (i % 3) * (w / 3), 20 + Math.floor(i / 3) * (h / 2.4), w / 3 - 28, h / 3);
    }
    ctx.fillStyle = "rgba(255,200,120,0.18)";
    ctx.fillRect(0, 0, w, h);
  } else if (kind === "stair") {
    ctx.fillStyle = "#cfa968";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(w * 0.1, h * 0.2, w * 0.3, h);
  }

  const sheen = ctx.createLinearGradient(0, 0, w, h);
  sheen.addColorStop(0, "rgba(255,255,255,0.1)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0)");
  sheen.addColorStop(1, "rgba(0,0,0,0.14)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#15110d";
  const mw = Math.max(4, Math.round(w / 44));
  for (let i = 1; i < cols; i++) ctx.fillRect(Math.round((w / cols) * i - mw / 2), 0, mw, h);
  for (let j = 1; j < rows; j++) ctx.fillRect(0, Math.round((h / rows) * j - mw / 2), w, mw);
  ctx.lineWidth = mw * 2.2;
  ctx.strokeStyle = "#15110d";
  ctx.strokeRect(0, 0, w, h);
  return tex(c, { wrap: false });
}

// --- sky and soft sprites ------------------------------------------------------------------------------------------
export function skyGradient(top = "#0a0e16", bottom = "#2a323f") {
  const W = 1024, H = 512;
  const [c, ctx] = canvas(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(0.6, bottom);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const rand = rng(31);
  for (let i = 0; i < 90; i++) {
    const x = rand() * W, y = H * (0.25 + rand() * 0.5), rx = 80 + rand() * 240, ry = 12 + rand() * 40;
    const light = rand() > 0.45;
    const cg = ctx.createRadialGradient(x, y, 0, x, y, rx);
    cg.addColorStop(0, light ? "rgba(96,110,124,0.2)" : "rgba(8,11,16,0.26)");
    cg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cg;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return tex(c, { wrap: false });
}

export function softSprite(inner = "rgba(255,255,255,0.55)") {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.5, "rgba(255,255,255,0.14)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return tex(c, { wrap: false });
}

// A streak of light lying on wet ground: bright near the source (top), fading toward the viewer.
export function smearGradient() {
  const [c, ctx] = canvas(64, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.35, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  const side = ctx.createLinearGradient(0, 0, 64, 0);
  side.addColorStop(0, "rgba(0,0,0,1)");
  side.addColorStop(0.3, "rgba(0,0,0,0)");
  side.addColorStop(0.7, "rgba(0,0,0,0)");
  side.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, 64, 256);
  return tex(c, { wrap: false });
}
