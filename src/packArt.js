// Procedurally painted, fully original pack art for the "Lumen" TCG.
// Front texture is 1024x1536; the hood ends at the holographic tear seam.
import * as THREE from 'three';
import { makeCanvas, roundedRectPath, mulberry32 } from './util.js';

export const PACK_W = 1024;
export const PACK_H = 1536;
export const ART_Y_FRAC = 0.185;
// Keep the physical cut and painted transition on the exact same coordinate.
export const CUT_Y_FRAC = ART_Y_FRAC;

// ---------- small painting helpers ----------
function vGrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function paintLightShafts(ctx, x, y, w, h, r) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 5; i++) {
    const sx = x + w * (0.15 + 0.75 * r());
    const sw = w * (0.05 + 0.09 * r());
    const g = ctx.createLinearGradient(sx, y, sx - w * 0.25, y + h);
    g.addColorStop(0, 'rgba(255,250,220,0.5)');
    g.addColorStop(0.6, 'rgba(255,250,220,0.12)');
    g.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(sx + sw, y);
    ctx.lineTo(sx + sw - w * 0.22, y + h);
    ctx.lineTo(sx - w * 0.22 - sw * 0.6, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function paintFoliageLayer(ctx, x, yBase, w, color, r, blobs, size) {
  ctx.fillStyle = color;
  for (let i = 0; i < blobs; i++) {
    const bx = x + w * r();
    const by = yBase + size * 0.4 * (r() - 0.5);
    ctx.beginPath();
    ctx.ellipse(bx, by, size * (0.5 + r() * 0.7), size * (0.35 + r() * 0.5), (r() - 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintFern(ctx, x, y, len, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = len * 0.045;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.15, -len * 0.55, len * 0.5, -len);
  ctx.stroke();
  const fronds = 7;
  for (let i = 1; i <= fronds; i++) {
    const t = i / (fronds + 1);
    const px = len * 0.5 * t * t + len * 0.12 * t;
    const py = -len * t;
    const fl = len * 0.28 * (1 - t * 0.75);
    ctx.lineWidth = len * 0.028;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px - fl * 0.7, py - fl * 0.25, px - fl, py - fl * 0.15);
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + fl * 0.6, py - fl * 0.35, px + fl * 0.9, py - fl * 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

// The set mascot: "Foxling", an original glowing spirit-fox. Stylized, soft, luminous.
export function paintFoxling(ctx, cx, cy, s, opts = {}) {
  const { glow = true } = opts;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  if (glow) {
    const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, 150);
    aura.addColorStop(0, 'rgba(255,240,200,0.55)');
    aura.addColorStop(0.6, 'rgba(255,230,180,0.18)');
    aura.addColorStop(1, 'rgba(255,230,180,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(-160, -160, 320, 320);
  }

  const cream = '#fff6e2';
  const amber = '#ffc76a';
  const amberDeep = '#f09a3e';

  // Tail: big sweeping flame-like curve behind the body, tipped with light.
  const tailG = ctx.createLinearGradient(20, 30, 95, -95);
  tailG.addColorStop(0, amberDeep);
  tailG.addColorStop(0.55, amber);
  tailG.addColorStop(1, '#fff9e8');
  ctx.fillStyle = tailG;
  ctx.beginPath();
  ctx.moveTo(18, 38);
  ctx.bezierCurveTo(78, 30, 98, -18, 82, -78);
  ctx.bezierCurveTo(76, -96, 58, -92, 58, -70);
  ctx.bezierCurveTo(60, -30, 42, 2, 8, 12);
  ctx.closePath();
  ctx.fill();
  // Tail glow tip
  const tip = ctx.createRadialGradient(76, -80, 2, 76, -80, 34);
  tip.addColorStop(0, 'rgba(255,255,240,0.95)');
  tip.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.fillStyle = tip;
  ctx.fillRect(40, -118, 76, 76);

  // Haunch
  ctx.fillStyle = amber;
  ctx.beginPath();
  ctx.ellipse(14, 34, 26, 22, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Body
  const bodyG = ctx.createLinearGradient(0, -20, 0, 60);
  bodyG.addColorStop(0, amber);
  bodyG.addColorStop(1, amberDeep);
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.ellipse(-6, 22, 30, 34, 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Chest tuft
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.ellipse(-14, 30, 15, 22, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Front legs
  ctx.fillStyle = amber;
  ctx.beginPath(); ctx.ellipse(-18, 52, 6.5, 12, 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-4, 54, 6.5, 11, -0.05, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cream;
  ctx.beginPath(); ctx.ellipse(-18, 60, 6.8, 4.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-4, 62, 6.8, 4.6, 0, 0, Math.PI * 2); ctx.fill();

  // Ears (behind head)
  ctx.fillStyle = amberDeep;
  ctx.beginPath();
  ctx.moveTo(-34, -32); ctx.quadraticCurveTo(-38, -62, -24, -58);
  ctx.quadraticCurveTo(-14, -54, -16, -34); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-2, -36); ctx.quadraticCurveTo(6, -64, 14, -52);
  ctx.quadraticCurveTo(18, -44, 6, -30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffe9c4';
  ctx.beginPath();
  ctx.moveTo(-30, -36); ctx.quadraticCurveTo(-32, -54, -24, -52);
  ctx.quadraticCurveTo(-18, -48, -20, -36); ctx.closePath(); ctx.fill();

  // Head
  const headG = ctx.createLinearGradient(-40, -40, 0, 4);
  headG.addColorStop(0, '#ffd88e');
  headG.addColorStop(1, amber);
  ctx.fillStyle = headG;
  ctx.beginPath();
  ctx.ellipse(-16, -16, 26, 23, -0.08, 0, Math.PI * 2);
  ctx.fill();

  // Muzzle
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.ellipse(-26, -6, 12, 9, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Eyes: big, dark, glossy — friendly.
  ctx.fillStyle = '#3a2a20';
  ctx.beginPath(); ctx.ellipse(-28, -20, 4.6, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-8, -18, 4.6, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-29.5, -22.5, 1.7, 2.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-9.5, -20.5, 1.7, 2.1, 0, 0, Math.PI * 2); ctx.fill();

  // Nose + smile
  ctx.fillStyle = '#503526';
  ctx.beginPath(); ctx.ellipse(-31, -9, 2.6, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6b4a33';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-31, -6.5);
  ctx.quadraticCurveTo(-27, -2.5, -22, -5);
  ctx.stroke();

  // Forehead light-mark (its "lumen")
  ctx.fillStyle = 'rgba(255,255,235,0.95)';
  ctx.beginPath();
  ctx.moveTo(-16, -34); ctx.lineTo(-12.5, -27); ctx.lineTo(-16, -20);
  ctx.lineTo(-19.5, -27); ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function paintMotes(ctx, x, y, w, h, n, r, scale = 1) {
  for (let i = 0; i < n; i++) {
    const mx = x + w * r(), my = y + h * r();
    const mr = (1.5 + r() * 4) * scale;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 3);
    g.addColorStop(0, 'rgba(255,252,230,0.9)');
    g.addColorStop(0.4, 'rgba(255,246,200,0.25)');
    g.addColorStop(1, 'rgba(255,246,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(mx, my, mr * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,245,0.95)';
    ctx.beginPath(); ctx.arc(mx, my, mr * 0.55, 0, Math.PI * 2); ctx.fill();
  }
}

// Painterly scene: sunlit grove clearing with the Foxling mascot.
export function paintGroveScene(ctx, x, y, w, h, r) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // Sky / distant canopy glow
  ctx.fillStyle = vGrad(ctx, x, y, w, h, [
    [0, '#fdf4d8'], [0.28, '#cfe3a8'], [0.55, '#7fb96e'], [1, '#2e6b46'],
  ]);
  ctx.fillRect(x, y, w, h);

  // Sun bloom top center-left
  const sun = ctx.createRadialGradient(x + w * 0.38, y + h * 0.12, 5, x + w * 0.38, y + h * 0.12, w * 0.5);
  sun.addColorStop(0, 'rgba(255,252,235,0.95)');
  sun.addColorStop(0.4, 'rgba(255,244,190,0.35)');
  sun.addColorStop(1, 'rgba(255,244,190,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(x, y, w, h);

  // Distant treeline silhouettes
  paintFoliageLayer(ctx, x, y + h * 0.3, w, 'rgba(96,150,96,0.55)', r, 26, w * 0.09);
  paintFoliageLayer(ctx, x, y + h * 0.4, w, 'rgba(64,118,74,0.75)', r, 22, w * 0.11);

  // Big mossy stone, right side
  ctx.fillStyle = '#5d7a58';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.74, y + h * 0.62, w * 0.2, h * 0.16, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,244,190,0.3)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.7, y + h * 0.56, w * 0.14, h * 0.08, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Mid foliage
  paintFoliageLayer(ctx, x, y + h * 0.55, w, 'rgba(48,104,60,0.85)', r, 18, w * 0.12);

  // Ground
  ctx.fillStyle = vGrad(ctx, x, y + h * 0.68, w, h * 0.32, [
    [0, '#67a05f'], [0.5, '#3f7a4a'], [1, '#22543a'],
  ]);
  ctx.fillRect(x, y + h * 0.68, w, h * 0.32);

  // Sunlit path patch where the creature sits
  const patch = ctx.createRadialGradient(x + w * 0.42, y + h * 0.8, 5, x + w * 0.42, y + h * 0.8, w * 0.3);
  patch.addColorStop(0, 'rgba(244,240,190,0.85)');
  patch.addColorStop(0.7, 'rgba(190,205,120,0.25)');
  patch.addColorStop(1, 'rgba(190,205,120,0)');
  ctx.fillStyle = patch;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.42, y + h * 0.8, w * 0.3, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  paintLightShafts(ctx, x, y, w, h * 0.85, r);

  // Ferns framing corners
  paintFern(ctx, x + w * 0.06, y + h * 0.98, h * 0.3, -0.25, '#1f5c38');
  paintFern(ctx, x + w * 0.16, y + h * 1.02, h * 0.24, 0.15, '#2f7346');
  paintFern(ctx, x + w * 0.95, y + h * 1.0, h * 0.32, 0.3, '#1f5c38');
  paintFern(ctx, x + w * 0.86, y + h * 1.04, h * 0.22, -0.1, '#2f7346');

  // The mascot
  paintFoxling(ctx, x + w * 0.42, y + h * 0.72, w / 260);

  // Foreground blur foliage (dark, soft)
  ctx.filter = 'blur(6px)';
  paintFoliageLayer(ctx, x, y + h * 0.99, w, 'rgba(18,60,40,0.9)', r, 10, w * 0.13);
  ctx.filter = 'none';

  paintMotes(ctx, x, y + h * 0.1, w, h * 0.75, 26, r, w / 1024);
  ctx.restore();
}

// ---------- full pack front ----------
export function makePackFrontTexture() {
  const r = mulberry32(1234);
  const [c, ctx] = makeCanvas(PACK_W, PACK_H);
  const W = PACK_W, H = PACK_H;
  const cutY = H * CUT_Y_FRAC;

  const violet = '#4b2a7e';
  const violetDark = '#341a5c';
  const violetLight = '#6a3fae';

  // === Hood (top band, gets sliced off) ===
  ctx.fillStyle = vGrad(ctx, 0, 0, W, H * 0.34, [
    [0, violetLight], [0.5, violet], [1, violetDark],
  ]);
  ctx.fillRect(0, 0, W, H * 0.34);

  // Emblem pattern on hood: subtle rounded-diamond "lumen" motif rows
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#ffffff';
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 9; col++) {
      const px = col * (W / 8) + (row % 2 ? W / 16 : 0);
      const py = 30 + row * 84;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      roundedRectPath(ctx, -22, -22, 44, 44, 12);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();

  // Crimp texture at very top: vertical flute ridges
  const crimpH = H * 0.055;
  ctx.fillStyle = vGrad(ctx, 0, 0, W, crimpH, [
    [0, '#7c55c0'], [0.5, violet], [1, violetDark],
  ]);
  ctx.fillRect(0, 0, W, crimpH);
  for (let i = 0; i < 64; i++) {
    const fx = (i / 64) * W;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.13)' : 'rgba(20,8,50,0.22)';
    ctx.fillRect(fx, 0, W / 64, crimpH);
  }
  ctx.fillStyle = 'rgba(20,8,50,0.35)';
  ctx.fillRect(0, crimpH - 4, W, 4);

  // === Logo plaque ===
  const plaqueW = W * 0.5, plaqueH = H * 0.075;
  const plaqueX = (W - plaqueW) / 2, plaqueY = H * 0.068;
  ctx.save();
  roundedRectPath(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 26);
  ctx.fillStyle = vGrad(ctx, plaqueX, plaqueY, plaqueW, plaqueH, [
    [0, '#fffdf4'], [1, '#e8e4f6'],
  ]);
  ctx.shadowColor = 'rgba(20,8,50,0.5)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundedRectPath(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 26);
  ctx.strokeStyle = '#c9b2ff';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // "LUMEN" wordmark with gold-to-violet gradient and thin outline
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(plaqueH * 0.58)}px "Avenir Next", "Trebuchet MS", sans-serif`;
  const wm = ctx.createLinearGradient(0, plaqueY, 0, plaqueY + plaqueH);
  wm.addColorStop(0, '#f7b733');
  wm.addColorStop(0.55, '#e88a1a');
  wm.addColorStop(0.56, '#7a3fd4');
  wm.addColorStop(1, '#4b2a7e');
  ctx.fillStyle = wm;
  ctx.strokeStyle = 'rgba(40,20,80,0.7)';
  ctx.lineWidth = 3;
  ctx.letterSpacing = '10px';
  ctx.fillText('LUMEN', W / 2 + 5, plaqueY + plaqueH * 0.44);
  ctx.strokeText('LUMEN', W / 2 + 5, plaqueY + plaqueH * 0.44);
  ctx.font = `700 ${Math.round(plaqueH * 0.2)}px "Avenir Next", "Trebuchet MS", sans-serif`;
  ctx.fillStyle = '#5d4a8a';
  ctx.letterSpacing = '6px';
  ctx.fillText('TRADING CARD GAME', W / 2 + 3, plaqueY + plaqueH * 0.82);
  ctx.restore();

  // Set badge (top-right)
  const bW = W * 0.13, bH = H * 0.034;
  const bX = W * 0.83, bY = H * 0.075;
  roundedRectPath(ctx, bX, bY, bW, bH, 12);
  ctx.fillStyle = '#1d1236';
  ctx.fill();
  ctx.strokeStyle = '#b9a0ee';
  ctx.lineWidth = 3;
  roundedRectPath(ctx, bX, bY, bW, bH, 12);
  ctx.stroke();
  ctx.fillStyle = '#f4ecff';
  ctx.font = `800 ${Math.round(bH * 0.62)}px "Avenir Next", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S1', bX + bW / 2, bY + bH / 2 + 2);

  // === Art window (middle) — painterly grove scene ===
  const artY = H * ART_Y_FRAC;
  const artH = H * 0.63;
  paintGroveScene(ctx, 0, artY, W, artH, r);

  // Hood → art soft transition edge with a holo line
  const holoY = artY - 8;
  const holo = ctx.createLinearGradient(0, holoY, W, holoY);
  holo.addColorStop(0, '#4de3ff');
  holo.addColorStop(0.25, '#7a6cff');
  holo.addColorStop(0.5, '#ff5fd0');
  holo.addColorStop(0.75, '#ffd34d');
  holo.addColorStop(1, '#4de3ff');
  ctx.fillStyle = holo;
  ctx.fillRect(0, holoY, W, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillRect(0, holoY + 10, W, 3);

  // === Bottom band: set name + crimp ===
  const bandY = artY + artH;
  ctx.fillStyle = vGrad(ctx, 0, bandY, W, H - bandY, [
    [0, violet], [1, violetDark],
  ]);
  ctx.fillRect(0, bandY, W, H - bandY);
  ctx.fillStyle = holo;
  ctx.fillRect(0, bandY, W, 8);

  // Set name plate
  const nameW = W * 0.66, nameH = H * 0.052;
  const nameX = (W - nameW) / 2, nameY = bandY + H * 0.022;
  roundedRectPath(ctx, nameX, nameY, nameW, nameH, 20);
  ctx.fillStyle = 'rgba(18,8,42,0.72)';
  ctx.fill();
  roundedRectPath(ctx, nameX, nameY, nameW, nameH, 20);
  ctx.strokeStyle = '#e8c95a';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(nameH * 0.52)}px "Avenir Next", "Trebuchet MS", sans-serif`;
  const ng = ctx.createLinearGradient(0, nameY, 0, nameY + nameH);
  ng.addColorStop(0, '#ffe9a8');
  ng.addColorStop(1, '#f0b23c');
  ctx.fillStyle = ng;
  ctx.letterSpacing = '6px';
  ctx.fillText('AURORA GROVE', W / 2, nameY + nameH / 2 + 2);
  ctx.letterSpacing = '0px';

  // Small mascot tag under the plate
  ctx.font = `700 ${Math.round(H * 0.02)}px "Avenir Next", sans-serif`;
  ctx.fillStyle = '#cdb9f2';
  ctx.fillText('— FOXLING —', W / 2, nameY + nameH + H * 0.02);

  // Bottom crimp
  const bcH = H * 0.045;
  ctx.fillStyle = vGrad(ctx, 0, H - bcH, W, bcH, [
    [0, violetDark], [0.5, violet], [1, '#7c55c0'],
  ]);
  ctx.fillRect(0, H - bcH, W, bcH);
  for (let i = 0; i < 64; i++) {
    const fx = (i / 64) * W;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.12)' : 'rgba(20,8,50,0.22)';
    ctx.fillRect(fx, H - bcH, W / 64, bcH);
  }

  // === Foil wear: subtle diagonal iridescent streaks over everything ===
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 7; i++) {
    const sx = W * (r() * 1.4 - 0.2);
    const g = ctx.createLinearGradient(sx, 0, sx + W * 0.35, H);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(${180 + r() * 75},${200 + r() * 55},255,0.16)`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  // Side darkening for wrap illusion
  const sideL = ctx.createLinearGradient(0, 0, W * 0.09, 0);
  sideL.addColorStop(0, 'rgba(10,5,30,0.4)');
  sideL.addColorStop(1, 'rgba(10,5,30,0)');
  ctx.fillStyle = sideL;
  ctx.fillRect(0, 0, W * 0.09, H);
  const sideR = ctx.createLinearGradient(W, 0, W * 0.91, 0);
  sideR.addColorStop(0, 'rgba(10,5,30,0.4)');
  sideR.addColorStop(1, 'rgba(10,5,30,0)');
  ctx.fillStyle = sideR;
  ctx.fillRect(W * 0.91, 0, W * 0.09, H);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Pack back: violet foil with emblem pattern and centered wordmark.
export function makePackBackTexture() {
  const [c, ctx] = makeCanvas(PACK_W, PACK_H);
  const W = PACK_W, H = PACK_H;
  ctx.fillStyle = vGrad(ctx, 0, 0, W, H, [
    [0, '#5b3496'], [0.5, '#42246f'], [1, '#2c1550'],
  ]);
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#fff';
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 9; col++) {
      const px = col * (W / 8) + (row % 2 ? W / 16 : 0);
      const py = 40 + row * 88;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      roundedRectPath(ctx, -20, -20, 40, 40, 11);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(H * 0.05)}px "Avenir Next", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.letterSpacing = '8px';
  ctx.fillText('LUMEN', W / 2, H / 2);
  // Crimp textures top/bottom
  for (const [cy, ch] of [[0, H * 0.055], [H - H * 0.045, H * 0.045]]) {
    for (let i = 0; i < 64; i++) {
      const fx = (i / 64) * W;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.1)' : 'rgba(20,8,50,0.2)';
      ctx.fillRect(fx, cy, W / 64, ch);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
