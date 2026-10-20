// Procedural canvas textures: nothing is downloaded, everything is painted at startup.
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
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  else t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
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

// --- cobblestones (colour + bump) -------------------------------------------
export function cobblestone(repeat = [1, 1]) {
  const rand = rng(7);
  const W = 512, H = 512, sw = 32, sh = 24, g = 3;
  const [c, ctx] = canvas(W, H);
  const [b, bctx] = canvas(W, H);
  ctx.fillStyle = "#0e1114";
  ctx.fillRect(0, 0, W, H);
  bctx.fillStyle = "#101010";
  bctx.fillRect(0, 0, W, H);
  for (let row = 0, y = 0; y < H + sh; row++, y += sh) {
    const off = row % 2 ? sw / 2 : 0;
    for (let x = -sw; x < W + sw; x += sw) {
      const px = x + off + g / 2 + (rand() - 0.5) * 2;
      const py = y + g / 2 + (rand() - 0.5) * 2;
      const w = sw - g - rand() * 3, h = sh - g - rand() * 2;
      const L = 20 + rand() * 14;
      const hue = 205 + rand() * 20;
      ctx.fillStyle = `hsl(${hue}, ${6 + rand() * 6}%, ${L}%)`;
      ctx.beginPath();
      ctx.roundRect(px, py, w, h, 5);
      ctx.fill();
      ctx.fillStyle = `hsla(${hue}, 8%, ${L + 10}%, 0.35)`;
      ctx.fillRect(px + 2, py + 2, w - 4, 2);
      const gr = bctx.createRadialGradient(px + w / 2, py + h / 2, 2, px + w / 2, py + h / 2, w / 2);
      gr.addColorStop(0, "#c8c8c8");
      gr.addColorStop(0.75, "#9a9a9a");
      gr.addColorStop(1, "#2a2a2a");
      bctx.fillStyle = gr;
      bctx.beginPath();
      bctx.roundRect(px, py, w, h, 5);
      bctx.fill();
    }
  }
  speckle(ctx, W, H, 2500, rand, 0.1);
  return { map: tex(c, { repeat }), bumpMap: tex(b, { repeat, srgb: false }) };
}

// --- old plaster over brick (tavern upper storey) --------------------------
export function oldPlaster(repeat = [1, 1], seed = 3) {
  const rand = rng(seed);
  const W = 512, H = 512;
  const [c, ctx] = canvas(W, H);
  // brick base
  ctx.fillStyle = "#2a2622";
  ctx.fillRect(0, 0, W, H);
  const bw = 48, bh = 20, m = 4;
  for (let row = 0, y = 0; y < H; row++, y += bh) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < W; x += bw) {
      ctx.fillStyle = `hsl(${12 + rand() * 14}, ${18 + rand() * 12}%, ${22 + rand() * 10}%)`;
      ctx.fillRect(x + off + m / 2, y + m / 2, bw - m, bh - m);
    }
  }
  // plaster patches
  for (let i = 0; i < 9; i++) {
    const cx = rand() * W, cy = rand() * H, r = 90 + rand() * 140;
    ctx.fillStyle = `hsl(${120 + rand() * 30}, ${8 + rand() * 6}%, ${26 + rand() * 8}%)`;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.35) {
      const rr = r * (0.75 + rand() * 0.4);
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.8;
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  // damp streaks and grime
  for (let i = 0; i < 30; i++) {
    const x = rand() * W;
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "rgba(0,0,0,0.25)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gr;
    ctx.fillRect(x, 0, 2 + rand() * 6, H);
  }
  speckle(ctx, W, H, 4000, rand, 0.08);
  return tex(c, { repeat });
}

// --- concrete (apartment) ---------------------------------------------------
export function concrete(repeat = [1, 1], seed = 11, base = [210, 7, 33]) {
  const rand = rng(seed);
  const W = 512, H = 512;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = `hsl(${base[0]}, ${base[1]}%, ${base[2]}%)`;
  ctx.fillRect(0, 0, W, H);
  speckle(ctx, W, H, 9000, rand, 0.07);
  for (let i = 0; i < 24; i++) {
    const x = rand() * W, w = 4 + rand() * 20, h = 80 + rand() * 300;
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "rgba(0,0,0,0.28)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gr;
    ctx.fillRect(x, 0, w, h);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  for (let y = 128; y < H; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  return tex(c, { repeat });
}

// --- painted wood planks (tavern shopfront) ---------------------------------
export function planks(repeat = [1, 1], hue = 168, seed = 5) {
  const rand = rng(seed);
  const W = 512, H = 512, pw = 64;
  const [c, ctx] = canvas(W, H);
  for (let x = 0; x < W; x += pw) {
    ctx.fillStyle = `hsl(${hue + rand() * 8}, ${22 + rand() * 8}%, ${13 + rand() * 6}%)`;
    ctx.fillRect(x, 0, pw, H);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x, 0, 2, H);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(x + 2, 0, 2, H);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.08 + rand() * 0.12})`;
      ctx.fillRect(x + 4 + rand() * (pw - 8), rand() * H, 1 + rand() * 2, 40 + rand() * 160);
    }
  }
  speckle(ctx, W, H, 2000, rand, 0.06);
  return tex(c, { repeat });
}

// --- tavern name board -------------------------------------------------------
export function signBoard(text) {
  const W = 1024, H = 192;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#17302b";
  ctx.fillRect(0, 0, W, H);
  const rand = rng(2);
  speckle(ctx, W, H, 1500, rand, 0.12);
  ctx.strokeStyle = "#8a7a46";
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, W - 28, H - 28);
  ctx.strokeStyle = "rgba(138,122,70,0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(26, 26, W - 52, H - 52);
  ctx.font = "bold 104px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = "#d8b86a";
  ctx.fillText(text, W / 2, H / 2 + 6, W - 90);
  return tex(c, { wrap: false });
}

// --- vertical neon sign ------------------------------------------------------
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

// --- small shop sign ----------------------------------------------------------
export function shopSign(text, bg = "#2b2f33", fg = "#b7c3cc") {
  const W = 512, H = 128;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.font = "bold 52px 'IBM Plex Mono', 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = fg;
  ctx.fillText(text, W / 2, H / 2, W - 40);
  return tex(c, { wrap: false });
}

// --- lit windows --------------------------------------------------------------
// kind: tavern | bedroom | desk | shop | dim | stair
export function windowPane({ kind = "dim", cols = 2, rows = 2, w = 256, h = 256, seed = 1 } = {}) {
  const rand = rng(seed);
  const [c, ctx] = canvas(w, h);
  const warm = ["#f6c069", "#d08a3a", "#7a4316"];
  const cool = ["#3a4656", "#242c38", "#141922"];
  const pal = kind === "dim" ? cool : warm;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, pal[0]);
  g.addColorStop(0.55, pal[1]);
  g.addColorStop(1, pal[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (kind === "tavern") {
    // bottle shelf
    for (let x = 10; x < w - 10; x += 14) {
      ctx.fillStyle = `hsla(${rand() * 360}, 60%, 55%, 0.7)`;
      ctx.fillRect(x, 14, 8, 26 + rand() * 10);
    }
    ctx.fillStyle = "rgba(60,30,10,0.8)";
    ctx.fillRect(0, 50, w, 6);
    // patrons: head + shoulders silhouettes
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
    // table + glasses
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
      ctx.fillStyle = `hsl(${rand() * 360}, 45%, ${30 + rand() * 25}%)`;
      ctx.fillRect(14 + (i % 3) * (w / 3), 20 + Math.floor(i / 3) * (h / 2.4), w / 3 - 28, h / 3);
    }
    ctx.fillStyle = "rgba(255,200,120,0.18)";
    ctx.fillRect(0, 0, w, h);
  } else if (kind === "stair") {
    ctx.fillStyle = "#c9a56a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(w * 0.1, h * 0.2, w * 0.3, h);
  }

  // glass sheen and mullions
  const sheen = ctx.createLinearGradient(0, 0, w, h);
  sheen.addColorStop(0, "rgba(255,255,255,0.12)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0)");
  sheen.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#17120d";
  const mw = Math.max(4, Math.round(w / 48));
  for (let i = 1; i < cols; i++) ctx.fillRect(Math.round((w / cols) * i - mw / 2), 0, mw, h);
  for (let j = 1; j < rows; j++) ctx.fillRect(0, Math.round((h / rows) * j - mw / 2), w, mw);
  ctx.lineWidth = mw * 2;
  ctx.strokeStyle = "#17120d";
  ctx.strokeRect(0, 0, w, h);
  return tex(c, { wrap: false });
}

// --- sky gradient and soft sprites ---------------------------------------------
export function skyGradient(top = "#0a0e16", bottom = "#2a323f") {
  const [c, ctx] = canvas(4, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(0.7, bottom);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
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
