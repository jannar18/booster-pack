// Original card faces and card back for the Lumen TCG, painted to canvas.
import * as THREE from 'three';
import { makeCanvas, roundedRectPath, mulberry32 } from './util.js';
import { ELEMENTS, RARITY_LABEL } from './creatures.js';
import { paintFoxling } from './packArt.js';

export const CARD_W = 1024;
export const CARD_H = 1430;
export const CARD_ASPECT = CARD_W / CARD_H;

const texCache = new Map();

// ---------- creature portraits (all original, stylized) ----------
// Each painter draws centered at (0,0) in a ~[-100,100] box; scale applied outside.

function pBlob(ctx) {
  // Puddlet: a happy water droplet creature.
  const g = ctx.createLinearGradient(0, -70, 0, 60);
  g.addColorStop(0, '#9fd9fb'); g.addColorStop(1, '#3f8fd4');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -78);
  ctx.bezierCurveTo(34, -40, 56, -10, 56, 18);
  ctx.bezierCurveTo(56, 52, 30, 70, 0, 70);
  ctx.bezierCurveTo(-30, 70, -56, 52, -56, 18);
  ctx.bezierCurveTo(-56, -10, -34, -40, 0, -78);
  ctx.closePath();
  ctx.fill();
  // highlight
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(-22, -18, 10, 20, 0.4, 0, Math.PI * 2); ctx.fill();
  // face
  ctx.fillStyle = '#123a63';
  ctx.beginPath(); ctx.ellipse(-16, 18, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(16, 18, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-17.6, 15.4, 1.8, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(14.4, 15.4, 1.8, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#123a63'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8, 34); ctx.quadraticCurveTo(0, 41, 8, 34); ctx.stroke();
  // cheeks
  ctx.fillStyle = 'rgba(255,150,170,0.5)';
  ctx.beginPath(); ctx.ellipse(-28, 28, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(28, 28, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
}

function pCub(ctx) {
  // Cindercub: a round bear cub with an ember glow belly.
  const fur = ctx.createLinearGradient(0, -70, 0, 80);
  fur.addColorStop(0, '#a8503c'); fur.addColorStop(1, '#73301f');
  // ears
  ctx.fillStyle = fur;
  ctx.beginPath(); ctx.arc(-38, -58, 16, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(38, -58, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffb36a';
  ctx.beginPath(); ctx.arc(-38, -58, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(38, -58, 8, 0, Math.PI * 2); ctx.fill();
  // body+head
  ctx.fillStyle = fur;
  ctx.beginPath(); ctx.ellipse(0, 22, 52, 50, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -34, 44, 38, 0, 0, Math.PI * 2); ctx.fill();
  // ember belly
  const belly = ctx.createRadialGradient(0, 30, 4, 0, 30, 36);
  belly.addColorStop(0, '#ffe07a'); belly.addColorStop(0.6, '#ff9440');
  belly.addColorStop(1, 'rgba(255,120,50,0)');
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.ellipse(0, 30, 34, 32, 0, 0, Math.PI * 2); ctx.fill();
  // muzzle
  ctx.fillStyle = '#e8b48f';
  ctx.beginPath(); ctx.ellipse(0, -22, 18, 13, 0, 0, Math.PI * 2); ctx.fill();
  // face
  ctx.fillStyle = '#2c1410';
  ctx.beginPath(); ctx.ellipse(-18, -38, 5.5, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(18, -38, 5.5, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -27, 5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-19.6, -40.6, 2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(16.4, -40.6, 2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  // paws
  ctx.fillStyle = '#8a3b28';
  ctx.beginPath(); ctx.ellipse(-34, 62, 13, 9, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(34, 62, 13, 9, -0.2, 0, Math.PI * 2); ctx.fill();
}

function pSprout(ctx) {
  // Thistlet: a seedling sprite with a leaf hat.
  ctx.fillStyle = '#e9f7d9';
  ctx.beginPath(); ctx.ellipse(0, 20, 40, 46, 0, 0, Math.PI * 2); ctx.fill();
  const shade = ctx.createLinearGradient(0, -20, 0, 66);
  shade.addColorStop(0, 'rgba(160,210,140,0)'); shade.addColorStop(1, 'rgba(120,180,110,0.55)');
  ctx.fillStyle = shade;
  ctx.beginPath(); ctx.ellipse(0, 20, 40, 46, 0, 0, Math.PI * 2); ctx.fill();
  // leaf hat
  ctx.fillStyle = '#3f9a4b';
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.bezierCurveTo(-52, -38, -40, -86, -2, -66);
  ctx.bezierCurveTo(6, -88, 54, -70, 30, -34);
  ctx.bezierCurveTo(16, -22, 6, -22, 0, -24);
  ctx.fill();
  ctx.strokeStyle = '#2c7136'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -28); ctx.quadraticCurveTo(-20, -48, -26, -62); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, -30); ctx.quadraticCurveTo(16, -48, 26, -56); ctx.stroke();
  // face
  ctx.fillStyle = '#2c5232';
  ctx.beginPath(); ctx.ellipse(-14, 12, 4.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(14, 12, 4.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-15.4, 9.8, 1.6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12.6, 9.8, 1.6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2c5232'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-6, 26); ctx.quadraticCurveTo(0, 31, 6, 26); ctx.stroke();
  ctx.fillStyle = 'rgba(255,160,170,0.5)';
  ctx.beginPath(); ctx.ellipse(-24, 22, 5.5, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(24, 22, 5.5, 4, 0, 0, Math.PI * 2); ctx.fill();
  // feet
  ctx.fillStyle = '#cfe8b8';
  ctx.beginPath(); ctx.ellipse(-16, 66, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(16, 66, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
}

function pGolem(ctx) {
  // Pebblum: stacked mossy stones with stubby arms.
  const stone = (x, y, rx, ry, hue) => {
    const g = ctx.createLinearGradient(x, y - ry, x, y + ry);
    g.addColorStop(0, hue[0]); g.addColorStop(1, hue[1]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  };
  stone(0, 48, 52, 30, ['#b09578', '#7d654c']);
  stone(0, 2, 42, 28, ['#c2a98c', '#8d7458']);
  stone(0, -40, 32, 26, ['#cbb497', '#997f61']);
  // moss caps
  ctx.fillStyle = '#6da05c';
  ctx.beginPath(); ctx.ellipse(-6, -60, 22, 8, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(20, -14, 14, 5, 0.2, 0, Math.PI * 2); ctx.fill();
  // arms
  stone(-52, 14, 13, 10, ['#a98f70', '#77604a']);
  stone(52, 14, 13, 10, ['#a98f70', '#77604a']);
  // face carved into top stone
  ctx.fillStyle = '#3d2f22';
  ctx.beginPath(); ctx.ellipse(-12, -42, 4.5, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, -42, 4.5, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-13.2, -44, 1.5, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10.8, -44, 1.5, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3d2f22'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-5, -30); ctx.quadraticCurveTo(0, -26, 5, -30); ctx.stroke();
}

function pCat(ctx) {
  // Wispurr: a shadow cat with glowing eyes and smoky tail.
  const body = ctx.createLinearGradient(0, -60, 0, 70);
  body.addColorStop(0, '#6b4fa8'); body.addColorStop(1, '#33205e');
  // smoky tail
  ctx.strokeStyle = 'rgba(120,90,190,0.65)';
  ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(30, 52);
  ctx.bezierCurveTo(72, 44, 80, 6, 58, -14);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,130,230,0.4)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(58, -14); ctx.bezierCurveTo(46, -26, 52, -40, 66, -44);
  ctx.stroke();
  // body
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(-4, 30, 40, 40, 0, 0, Math.PI * 2); ctx.fill();
  // head
  ctx.beginPath(); ctx.ellipse(-8, -26, 34, 30, 0, 0, Math.PI * 2); ctx.fill();
  // ears
  ctx.beginPath();
  ctx.moveTo(-36, -44); ctx.lineTo(-42, -76); ctx.lineTo(-16, -54); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -52); ctx.lineTo(20, -78); ctx.lineTo(22, -44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b58fe8';
  ctx.beginPath();
  ctx.moveTo(-33, -50); ctx.lineTo(-37, -68); ctx.lineTo(-22, -54); ctx.closePath(); ctx.fill();
  // glowing eyes
  for (const ex of [-20, 6]) {
    const eg = ctx.createRadialGradient(ex, -26, 1, ex, -26, 12);
    eg.addColorStop(0, '#ffe97a'); eg.addColorStop(0.5, 'rgba(255,220,110,0.6)');
    eg.addColorStop(1, 'rgba(255,220,110,0)');
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.arc(ex, -26, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffef9c';
    ctx.beginPath(); ctx.ellipse(ex, -26, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4d2a85';
    ctx.beginPath(); ctx.ellipse(ex, -26, 1.8, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  // whisker wisps
  ctx.strokeStyle = 'rgba(190,160,255,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-38, -16); ctx.quadraticCurveTo(-52, -14, -60, -18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(22, -14); ctx.quadraticCurveTo(36, -12, 44, -16); ctx.stroke();
  // paws
  ctx.fillStyle = '#26174a';
  ctx.beginPath(); ctx.ellipse(-24, 66, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8, 68, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
}

function pRay(ctx) {
  // Galeon: a silver manta gliding, wing-tips curled.
  const body = ctx.createLinearGradient(0, -40, 0, 50);
  body.addColorStop(0, '#bfe3f4'); body.addColorStop(1, '#5a93c4');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.bezierCurveTo(50, -46, 92, -20, 96, 8);
  ctx.bezierCurveTo(70, 2, 46, 10, 26, 26);
  ctx.bezierCurveTo(14, 38, -14, 38, -26, 26);
  ctx.bezierCurveTo(-46, 10, -70, 2, -96, 8);
  ctx.bezierCurveTo(-92, -20, -50, -46, 0, -30);
  ctx.closePath();
  ctx.fill();
  // belly sheen
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.ellipse(0, 4, 30, 16, 0, 0, Math.PI * 2); ctx.fill();
  // tail
  ctx.strokeStyle = '#5a93c4'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 34); ctx.quadraticCurveTo(6, 62, -6, 82); ctx.stroke();
  // eyes
  ctx.fillStyle = '#12395e';
  ctx.beginPath(); ctx.ellipse(-16, -12, 4.5, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(16, -12, 4.5, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-17.2, -14.2, 1.6, 2.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(14.8, -14.2, 1.6, 2.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#12395e'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(0, 5, 6, 0); ctx.stroke();
  // wing speckles
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (const [sx, sy] of [[-56, -8], [-44, -18], [56, -8], [44, -18], [-68, 0], [68, 0]]) {
    ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, Math.PI * 2); ctx.fill();
  }
}

function pStag(ctx) {
  // Emberoak: a proud stag with kindled antlers.
  // antlers with flame tips
  ctx.strokeStyle = '#7a4a20'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 14, -52);
    ctx.quadraticCurveTo(s * 34, -78, s * 30, -100);
    ctx.moveTo(s * 24, -72);
    ctx.quadraticCurveTo(s * 44, -76, s * 54, -92);
    ctx.stroke();
    for (const [fx, fy] of [[s * 30, -102], [s * 56, -94]]) {
      const fg = ctx.createRadialGradient(fx, fy, 1, fx, fy, 16);
      fg.addColorStop(0, '#ffe27a'); fg.addColorStop(0.5, 'rgba(255,140,50,0.75)');
      fg.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(fx, fy, 16, 0, Math.PI * 2); ctx.fill();
    }
  }
  const coat = ctx.createLinearGradient(0, -50, 0, 80);
  coat.addColorStop(0, '#a3562b'); coat.addColorStop(1, '#6e3517');
  // neck + body
  ctx.fillStyle = coat;
  ctx.beginPath(); ctx.ellipse(6, 44, 44, 34, 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-20, -44);
  ctx.bezierCurveTo(-30, -10, -22, 24, 6, 36);
  ctx.lineTo(24, 30);
  ctx.bezierCurveTo(10, 8, 8, -24, 4, -46);
  ctx.closePath();
  ctx.fill();
  // head
  ctx.fillStyle = coat;
  ctx.beginPath(); ctx.ellipse(-8, -46, 22, 17, -0.25, 0, Math.PI * 2); ctx.fill();
  // muzzle
  ctx.fillStyle = '#e8c49a';
  ctx.beginPath(); ctx.ellipse(-26, -50, 10, 7, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a1e0e';
  ctx.beginPath(); ctx.ellipse(-33, -52, 3, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  // ear
  ctx.fillStyle = '#8a4520';
  ctx.beginPath(); ctx.ellipse(6, -58, 10, 5, 0.5, 0, Math.PI * 2); ctx.fill();
  // eye
  ctx.fillStyle = '#2c1408';
  ctx.beginPath(); ctx.ellipse(-10, -48, 3.6, 4.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-11, -49.6, 1.3, 1.7, 0, 0, Math.PI * 2); ctx.fill();
  // chest ember markings
  ctx.fillStyle = 'rgba(255,170,70,0.75)';
  for (const [mx, my, mr] of [[-2, 20, 4], [8, 34, 3], [-8, 40, 2.5]]) {
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  }
  // legs
  ctx.strokeStyle = '#5e2c12'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(-16, 66); ctx.lineTo(-20, 96); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12, 70); ctx.lineTo(14, 98); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(34, 60); ctx.lineTo(42, 92); ctx.stroke();
}

function pOwl(ctx) {
  // Lunavis: a crescent-marked owl with star-flecked wings.
  const body = ctx.createLinearGradient(0, -60, 0, 70);
  body.addColorStop(0, '#7a5fc0'); body.addColorStop(1, '#3c2a72');
  // wings folded
  ctx.fillStyle = '#31215e';
  ctx.beginPath(); ctx.ellipse(-38, 18, 20, 46, 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(38, 18, 20, 46, -0.25, 0, Math.PI * 2); ctx.fill();
  // body
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(0, 14, 40, 54, 0, 0, Math.PI * 2); ctx.fill();
  // belly
  ctx.fillStyle = '#cfc0f2';
  ctx.beginPath(); ctx.ellipse(0, 28, 24, 32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(90,70,150,0.5)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-16, 14 + i * 12);
    ctx.quadraticCurveTo(0, 20 + i * 12, 16, 14 + i * 12);
    ctx.stroke();
  }
  // head
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(0, -38, 34, 30, 0, 0, Math.PI * 2); ctx.fill();
  // ear tufts
  ctx.beginPath();
  ctx.moveTo(-26, -56); ctx.lineTo(-34, -80); ctx.lineTo(-12, -62); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(26, -56); ctx.lineTo(34, -80); ctx.lineTo(12, -62); ctx.closePath(); ctx.fill();
  // facial disk
  ctx.fillStyle = '#cfc0f2';
  ctx.beginPath(); ctx.ellipse(-13, -38, 13, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(13, -38, 13, 15, 0, 0, Math.PI * 2); ctx.fill();
  // eyes
  for (const ex of [-13, 13]) {
    ctx.fillStyle = '#2a1a52';
    ctx.beginPath(); ctx.arc(ex, -38, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd97a';
    ctx.beginPath(); ctx.arc(ex, -38, 5.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#241245';
    ctx.beginPath(); ctx.arc(ex, -38, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex - 1.6, -40, 1.4, 0, Math.PI * 2); ctx.fill();
  }
  // beak
  ctx.fillStyle = '#e8b44a';
  ctx.beginPath();
  ctx.moveTo(-4, -32); ctx.lineTo(4, -32); ctx.lineTo(0, -22); ctx.closePath(); ctx.fill();
  // crescent forehead mark
  ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -58, 7, Math.PI * 0.2, Math.PI * 1.3); ctx.stroke();
  // star flecks on wings
  ctx.fillStyle = 'rgba(255,240,190,0.9)';
  for (const [sx, sy] of [[-40, 2], [-34, 26], [-44, 44], [40, 2], [34, 26], [44, 44]]) {
    ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
  }
  // talons
  ctx.fillStyle = '#e8b44a';
  ctx.beginPath(); ctx.ellipse(-12, 68, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, 68, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
}

const PORTRAITS = {
  fox: (ctx) => paintFoxling(ctx, 0, 0, 1.15),
  blob: pBlob, cub: pCub, sprout: pSprout, golem: pGolem,
  cat: pCat, ray: pRay, stag: pStag, owl: pOwl,
};

// ---------- art window backgrounds per element ----------
function paintArtBackground(ctx, x, y, w, h, el, seed, fullArt = false) {
  const r = mulberry32(seed);
  const E = ELEMENTS[el];
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

  const skyByEl = {
    tide:  [['#eefaff', 0], ['#bfe6f8', 0.45], ['#6fb4e2', 1]],
    ember: [['#fff3df', 0], ['#ffd9a4', 0.5], ['#f29a5c', 1]],
    bloom: [['#f4fbe8', 0], ['#cdeba9', 0.5], ['#8cc878', 1]],
    volt:  [['#fffbe8', 0], ['#fdeea8', 0.5], ['#f2ce68', 1]],
    umbra: [['#2c2150', 0], ['#4d3a85', 0.55], ['#7a5fc0', 1]],
    terra: [['#fdf3e4', 0], ['#e8cfa8', 0.5], ['#c49a68', 1]],
  };
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [c, o] of skyByEl[el]) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  // Element-flavored dressing
  if (el === 'tide') {
    // distant shore + water sparkle
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(x + w * 0.5, y + h * 0.2, w * 0.4, h * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4f93c8';
    ctx.fillRect(x, y + h * 0.62, w, h * 0.38);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 14; i++) {
      const wx = x + w * r(), wy = y + h * (0.65 + 0.3 * r());
      ctx.beginPath(); ctx.ellipse(wx, wy, 14 + r() * 26, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (el === 'umbra') {
    // stars + moon
    ctx.fillStyle = 'rgba(255,250,220,0.9)';
    for (let i = 0; i < 40; i++) {
      ctx.globalAlpha = 0.3 + r() * 0.7;
      ctx.beginPath(); ctx.arc(x + w * r(), y + h * 0.7 * r(), 1 + r() * 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const moon = ctx.createRadialGradient(x + w * 0.78, y + h * 0.2, 4, x + w * 0.78, y + h * 0.2, w * 0.2);
    moon.addColorStop(0, 'rgba(255,248,220,0.95)');
    moon.addColorStop(0.35, 'rgba(255,244,200,0.5)');
    moon.addColorStop(1, 'rgba(255,244,200,0)');
    ctx.fillStyle = moon;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#241a48';
    ctx.fillRect(x, y + h * 0.78, w, h * 0.22);
  } else if (el === 'ember') {
    // dusky ridge + drifting embers
    ctx.fillStyle = '#b0562c';
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.72);
    for (let i = 0; i <= 8; i++) {
      ctx.lineTo(x + (w * i) / 8, y + h * (0.62 + 0.1 * Math.sin(i * 1.8 + 1)));
    }
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7c3416';
    ctx.fillRect(x, y + h * 0.82, w, h * 0.18);
    for (let i = 0; i < 16; i++) {
      const ex = x + w * r(), ey = y + h * (0.2 + 0.6 * r());
      const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 6);
      eg.addColorStop(0, 'rgba(255,210,120,0.95)'); eg.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = eg;
      ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();
    }
  } else if (el === 'volt') {
    // sunburst rays
    ctx.save();
    ctx.translate(x + w / 2, y + h * 0.3);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-w * 0.06, -h); ctx.lineTo(w * 0.06, -h); ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#d8b452';
    ctx.fillRect(x, y + h * 0.78, w, h * 0.22);
    ctx.fillStyle = '#e8ca6a';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.78, w * 0.55, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  } else if (el === 'bloom') {
    // meadow + petals
    ctx.fillStyle = '#5fa254';
    ctx.fillRect(x, y + h * 0.68, w, h * 0.32);
    ctx.fillStyle = '#74b866';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.68, w * 0.58, h * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 18; i++) {
      const fx = x + w * r(), fy = y + h * (0.7 + 0.26 * r());
      ctx.fillStyle = ['#ffb7ce', '#fff3ad', '#d8a8f2'][Math.floor(r() * 3)];
      ctx.beginPath(); ctx.arc(fx, fy, 3.5 + r() * 3, 0, Math.PI * 2); ctx.fill();
    }
  } else if (el === 'terra') {
    // canyon strata
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = ['#caa06c', '#b48752', '#9c7040', '#835a30'][i];
      ctx.beginPath();
      ctx.moveTo(x, y + h * (0.5 + i * 0.13));
      for (let j = 0; j <= 6; j++) {
        ctx.lineTo(x + (w * j) / 6, y + h * (0.46 + i * 0.13 + 0.05 * Math.sin(j * 2.1 + i)));
      }
      ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    }
  }

  // soft vignette light
  const vg = ctx.createRadialGradient(x + w / 2, y + h * 0.45, w * 0.1, x + w / 2, y + h * 0.45, w * 0.75);
  vg.addColorStop(0, 'rgba(255,255,255,0.14)');
  vg.addColorStop(1, 'rgba(40,40,80,0.12)');
  ctx.fillStyle = vg;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function paintGem(ctx, cx, cy, rr, color) {
  const g = ctx.createRadialGradient(cx - rr * 0.3, cy - rr * 0.4, rr * 0.1, cx, cy, rr);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, color);
  g.addColorStop(1, shade(color, -0.45));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = rr * 0.14;
  ctx.beginPath(); ctx.arc(cx, cy, rr * 0.92, 0, Math.PI * 2); ctx.stroke();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(Math.min(255, Math.max(0, r + 255 * amt)));
  g = Math.round(Math.min(255, Math.max(0, g + 255 * amt)));
  b = Math.round(Math.min(255, Math.max(0, b + 255 * amt)));
  return `rgb(${r},${g},${b})`;
}

function paintRarityGem(ctx, x, y, s, rarity) {
  ctx.save();
  ctx.translate(x, y);
  const draw = (fill) => {
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.8, 0);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = 'rgba(60,60,90,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  };
  if (rarity === 'c') draw('#8b97ad');
  else if (rarity === 'u') { draw('#8b97ad'); ctx.translate(s * 1.9, 0); draw('#8b97ad'); }
  else if (rarity === 'r') {
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, '#7de0ff'); g.addColorStop(0.5, '#c58bff'); g.addColorStop(1, '#ffd97a');
    draw(g);
  } else {
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, '#ffe27a'); g.addColorStop(1, '#ff9a3c');
    draw(g);
    ctx.translate(s * 1.9, 0); draw(g);
  }
  ctx.restore();
}

// ---------- the full card face ----------
export function makeCardCanvas(creature) {
  const [c, ctx] = makeCanvas(CARD_W, CARD_H);
  const W = CARD_W, H = CARD_H;
  const E = ELEMENTS[creature.element];
  const seed = [...creature.id].reduce((a, ch) => a + ch.charCodeAt(0), 7);
  const fullArt = creature.rarity === 'x';

  // Outer white border
  roundedRectPath(ctx, 0, 0, W, H, 46);
  ctx.fillStyle = '#f6f4ef';
  ctx.fill();

  const inX = 34, inY = 34, inW = W - 68, inH = H - 68;

  if (fullArt) {
    // Full-art: scene fills the card, panels float over it.
    paintArtBackground(ctx, inX, inY, inW, inH, creature.element, seed, true);
    const P = PORTRAITS[creature.shape];
    ctx.save();
    ctx.translate(inX + inW * 0.5, inY + inH * 0.52);
    const s = inW / 210;
    ctx.scale(s, s);
    P(ctx);
    ctx.restore();
    // god-ray shimmer
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 6; i++) {
      const gx = inX + inW * (0.1 + 0.8 * (i / 5));
      const g = ctx.createLinearGradient(gx, inY, gx - inW * 0.3, inY + inH);
      g.addColorStop(0, 'rgba(255,255,240,0.55)');
      g.addColorStop(0.5, 'rgba(255,255,240,0.08)');
      g.addColorStop(1, 'rgba(255,255,240,0)');
      ctx.fillStyle = g;
      ctx.fillRect(inX, inY, inW, inH);
    }
    ctx.restore();
  } else {
    // Frame background: soft element-tinted texture
    const bg = ctx.createLinearGradient(0, inY, 0, inY + inH);
    bg.addColorStop(0, E.light);
    bg.addColorStop(1, shade(E.main, 0.25));
    roundedRectPath(ctx, inX, inY, inW, inH, 30);
    ctx.fillStyle = bg;
    ctx.fill();
    // subtle sparkle field on the frame
    const r2 = mulberry32(seed * 3 + 1);
    ctx.save();
    roundedRectPath(ctx, inX, inY, inW, inH, 30);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 90; i++) {
      ctx.globalAlpha = 0.08 + r2() * 0.3;
      const sx = inX + inW * r2(), sy = inY + inH * r2();
      ctx.beginPath(); ctx.arc(sx, sy, 1 + r2() * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ---- Header: name + HP + element gem ----
  const headY = inY + 14;
  ctx.textBaseline = 'alphabetic';
  if (!fullArt) {
    ctx.fillStyle = '#22304a';
  } else {
    ctx.fillStyle = '#fff';
    ctx.save();
    roundedRectPath(ctx, inX + 10, headY - 4, inW - 20, 74, 20);
    ctx.fillStyle = 'rgba(20,25,45,0.42)';
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff';
  }
  // Build the stat cluster from the gem inward. The HP value can be two or
  // three digits, so measuring it prevents values like 100/110/130 from
  // backing into the label.
  const gemX = inX + inW - 44;
  const gemRadius = 26;
  const hpValue = String(creature.hp);
  const hpValueRight = gemX - gemRadius - 8;
  ctx.textAlign = 'right';
  ctx.font = `800 56px "Avenir Next", sans-serif`;
  const hpValueWidth = ctx.measureText(hpValue).width;
  const hpLabelRight = hpValueRight - hpValueWidth - 14;
  ctx.font = `700 30px "Avenir Next", sans-serif`;
  const hpLabelWidth = ctx.measureText('HP').width;
  const statsLeft = hpLabelRight - hpLabelWidth;

  const nameX = inX + 34;
  const nameMaxWidth = Math.max(1, statsLeft - nameX - 22);
  let nameSize = 54;
  ctx.font = `800 ${nameSize}px "Avenir Next", "Trebuchet MS", sans-serif`;
  const measuredNameWidth = ctx.measureText(creature.name).width;
  if (measuredNameWidth > nameMaxWidth) {
    nameSize = Math.max(40, Math.floor(nameSize * nameMaxWidth / measuredNameWidth));
    ctx.font = `800 ${nameSize}px "Avenir Next", "Trebuchet MS", sans-serif`;
  }
  ctx.textAlign = 'left';
  ctx.fillText(creature.name, nameX, headY + 52);

  ctx.textAlign = 'right';
  ctx.font = `700 30px "Avenir Next", sans-serif`;
  ctx.fillText('HP', hpLabelRight, headY + 50);
  ctx.font = `800 56px "Avenir Next", sans-serif`;
  ctx.fillText(hpValue, hpValueRight, headY + 52);
  paintGem(ctx, gemX, headY + 34, gemRadius, E.gem);

  // ---- Art window (non-full-art) ----
  if (!fullArt) {
    const artX = inX + 22, artY = inY + 88, artW = inW - 44, artH = inH * 0.44;
    ctx.save();
    roundedRectPath(ctx, artX, artY, artW, artH, 14);
    ctx.clip();
    paintArtBackground(ctx, artX, artY, artW, artH, creature.element, seed);
    const P = PORTRAITS[creature.shape];
    ctx.save();
    ctx.translate(artX + artW * 0.5, artY + artH * 0.58);
    const s = artW / 240;
    ctx.scale(s, s);
    P(ctx);
    ctx.restore();
    // holo sheen band for rares
    if (creature.rarity === 'r') {
      ctx.globalCompositeOperation = 'overlay';
      const holo = ctx.createLinearGradient(artX, artY, artX + artW, artY + artH);
      holo.addColorStop(0, 'rgba(120,220,255,0.4)');
      holo.addColorStop(0.35, 'rgba(230,140,255,0.3)');
      holo.addColorStop(0.65, 'rgba(255,220,120,0.35)');
      holo.addColorStop(1, 'rgba(140,255,190,0.4)');
      ctx.fillStyle = holo;
      ctx.fillRect(artX, artY, artW, artH);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    // art frame line
    roundedRectPath(ctx, artX, artY, artW, artH, 14);
    ctx.strokeStyle = 'rgba(70,80,110,0.55)';
    ctx.lineWidth = 4;
    ctx.stroke();
    // info strip under art
    const stripY = artY + artH + 10;
    roundedRectPath(ctx, artX + 30, stripY, artW - 60, 34, 17);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
    ctx.fillStyle = '#5a6478';
    ctx.font = `600 21px "Avenir Next", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `${RARITY_LABEL[creature.rarity]} · ${ELEMENTS[creature.element].name} Creature`,
      inX + inW / 2, stripY + 25
    );
  }

  // ---- Move row ----
  const moveY = fullArt ? inY + inH * 0.66 : inY + inH * 0.62;
  const moveH = 120;
  ctx.save();
  roundedRectPath(ctx, inX + 20, moveY, inW - 40, moveH, 18);
  ctx.fillStyle = fullArt ? 'rgba(22,28,48,0.5)' : 'rgba(255,255,255,0.55)';
  ctx.fill();
  ctx.restore();
  // cost gems
  for (let i = 0; i < creature.move.cost; i++) {
    paintGem(ctx, inX + 62 + i * 52, moveY + 60, 22, E.gem);
  }
  ctx.fillStyle = fullArt ? '#fff' : '#22304a';
  ctx.textAlign = 'left';
  ctx.font = `800 44px "Avenir Next", sans-serif`;
  ctx.fillText(creature.move.name, inX + 62 + creature.move.cost * 52 + 20, moveY + 76);
  ctx.textAlign = 'right';
  ctx.font = `800 52px "Avenir Next", sans-serif`;
  ctx.fillText(String(creature.move.dmg), inX + inW - 58, moveY + 78);

  // ---- Flavor text ----
  ctx.textAlign = 'left';
  ctx.font = `italic 500 26px Georgia, serif`;
  ctx.fillStyle = fullArt ? 'rgba(255,255,255,0.92)' : '#454f64';
  const flavorY = moveY + moveH + 52;
  wrapText(ctx, creature.flavor, inX + 44, flavorY, inW - 88, 34);

  // ---- Footer ----
  const footY = inY + inH - 26;
  paintRarityGem(ctx, inX + 44, footY - 8, 15, creature.rarity);
  ctx.font = `600 22px "Avenir Next", sans-serif`;
  ctx.fillStyle = fullArt ? 'rgba(255,255,255,0.85)' : '#6a7488';
  ctx.textAlign = 'right';
  const num = String(Math.abs(seed) % 78 + 1).padStart(3, '0');
  ctx.fillText(`${num}/078 · AURORA GROVE`, inX + inW - 40, footY);
  ctx.textAlign = 'left';
  ctx.fillText('LUMEN © S1', inX + 84, footY);

  return c;
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w; yy += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

// ---------- card back ----------
export function makeCardBackCanvas() {
  const [c, ctx] = makeCanvas(CARD_W, CARD_H);
  const W = CARD_W, H = CARD_H;
  roundedRectPath(ctx, 0, 0, W, H, 46);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#3a2470');
  g.addColorStop(0.5, '#2a1854');
  g.addColorStop(1, '#1c0f3e');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  roundedRectPath(ctx, 0, 0, W, H, 46);
  ctx.clip();
  // radiating lumen motif
  ctx.translate(W / 2, H / 2);
  for (let ring = 1; ring <= 4; ring++) {
    ctx.strokeStyle = `rgba(180,150,255,${0.22 - ring * 0.04})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, ring * 150, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = 'rgba(200,170,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(0, -80); ctx.lineTo(28, -420); ctx.lineTo(-28, -420);
    ctx.closePath(); ctx.fill();
  }
  // center diamond
  ctx.rotate(Math.PI / 4);
  const dg = ctx.createLinearGradient(-70, -70, 70, 70);
  dg.addColorStop(0, '#ffd97a'); dg.addColorStop(1, '#b06ff0');
  roundedRectPath(ctx, -70, -70, 140, 140, 34);
  ctx.fillStyle = dg;
  ctx.fill();
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 64px "Avenir Next", sans-serif`;
  ctx.letterSpacing = '6px';
  ctx.fillText('LUMEN', 0, 320);
  ctx.restore();
  // border ring
  roundedRectPath(ctx, 18, 18, W - 36, H - 36, 36);
  ctx.strokeStyle = 'rgba(220,200,255,0.5)';
  ctx.lineWidth = 6;
  ctx.stroke();
  return c;
}

export function cardTexture(creature) {
  const key = creature ? creature.id : '__back__';
  if (!texCache.has(key)) {
    const canvas = creature ? makeCardCanvas(creature) : makeCardBackCanvas();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    texCache.set(key, { tex, canvas });
  }
  return texCache.get(key);
}
