// The 3D booster pack: crinkled foil pouch built from displaced planes,
// split into a body and a severable top strip, with an iridescent mouth rim.
import * as THREE from 'three';
import { makePackFrontTexture, makePackBackTexture, CUT_Y_FRAC } from './packArt.js';

export const PACK_WORLD_W = 2.15;
// Match the long, narrow silhouette of a physical trading-card booster. Width
// drives the responsive scale in main.js, so keeping it fixed while increasing
// the world-space height preserves the carousel/focus widths and lets every
// texture slice retain its original UV range.
export const PACK_WORLD_H = 4.57;
// v runs 0 (bottom) → 1 (top) of the pack.
export const CUT_V = 1 - CUT_Y_FRAC;

const CRIMP_TOP = 0.945;   // above: flat crimp
const CRIMP_BOT = 0.06;    // below: flat crimp
const BULGE_FRONT = 0.30;
const BULGE_BACK = 0.20;

// Keep the printed canvas in the middle of the lighting range. The scene uses
// several fairly strong lights plus bloom, so a white physical-material tint
// pushes even the darker printed inks over the bloom threshold. A neutral,
// darker substrate preserves the texture's hue separation while the low-energy
// clearcoat still catches a restrained foil highlight on the crinkles.
const PACK_SUBSTRATE = 0x969696;

function crinkleNoise(u, v) {
  return (
    Math.sin(u * 21.7 + v * 5.1) * Math.sin(v * 17.3 + 1.7) * 0.45 +
    Math.sin(u * 43.1 + 2.9) * Math.sin(v * 39.7 + u * 7.7) * 0.3 +
    Math.sin(u * 9.3 + v * 31.1 + 4.2) * 0.25
  );
}

function bulgeAt(u, v, amp) {
  // Pinched flat at crimps and side seams; full in the middle.
  let vw;
  if (v <= CRIMP_BOT) vw = 0;
  else if (v >= CRIMP_TOP) vw = 0;
  else vw = Math.pow(Math.sin(Math.PI * (v - CRIMP_BOT) / (CRIMP_TOP - CRIMP_BOT)), 0.55);
  const uw = Math.pow(Math.max(Math.sin(Math.PI * u), 0), 0.5);
  return amp * vw * uw;
}

// Build one face (front or back) of the pack covering v ∈ [vLo, vHi].
function buildFace(tex, vLo, vHi, sign, opts = {}) {
  const { crinkleAmp = 0.016 } = opts;
  // Keep roughly the same triangle density after lengthening the pouch, so the
  // foil bulge and fine crinkles remain smoothly shaded rather than stretched
  // across tall geometry bands.
  const segX = 40, segY = Math.max(8, Math.round(90 * (vHi - vLo)));
  const w = PACK_WORLD_W, h = PACK_WORLD_H * (vHi - vLo);
  const geo = new THREE.PlaneGeometry(w, h, segX, segY);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i);
    const localV = uv.getY(i);
    const v = vLo + localV * (vHi - vLo);
    let z = bulgeAt(u, v, sign > 0 ? BULGE_FRONT : BULGE_BACK);
    const edge = Math.pow(Math.max(Math.sin(Math.PI * u), 0), 0.4) *
      (v > CRIMP_BOT && v < CRIMP_TOP ? 1 : 0.35);
    z += crinkleNoise(u, v) * crinkleAmp * (0.4 + 0.6 * edge);
    pos.setZ(i, sign * z);
    // Remap uv to the texture slice (texture v=1 is image top = pack top).
    uv.setY(i, v);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex,
    color: PACK_SUBSTRATE,
    roughness: 0.64,
    metalness: 0.04,
    clearcoat: 0.16,
    clearcoatRoughness: 0.58,
    envMapIntensity: 0.2,
    ior: 1.28,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  if (sign < 0) mesh.rotation.y = Math.PI;
  return mesh;
}

// Iridescent rim ribbon following the mouth opening after the cut.
function buildMouthRim() {
  const pts = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push(new THREE.Vector3(
      (u - 0.5) * PACK_WORLD_W * 0.97,
      0,
      bulgeAt(u, CUT_V, BULGE_FRONT) * 0.92
    ));
  }
  for (let i = n; i >= 0; i--) {
    const u = i / n;
    pts.push(new THREE.Vector3(
      (u - 0.5) * PACK_WORLD_W * 0.97,
      0,
      -bulgeAt(u, CUT_V, BULGE_BACK) * 0.92
    ));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const geo = new THREE.TubeGeometry(curve, 128, 0.02, 8, true);
  // Vertex-color the tube with a thin-film rainbow along its length.
  const colors = [];
  const pos = geo.attributes.position;
  const holo = [
    new THREE.Color('#59f0ff'), new THREE.Color('#8f7bff'),
    new THREE.Color('#ff6fdc'), new THREE.Color('#ffd964'),
    new THREE.Color('#7dffb9'), new THREE.Color('#59f0ff'),
  ];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / PACK_WORLD_W + 0.5;
    // Tube vertices extend a hair past the centerline at the end caps. Normalize
    // JavaScript's signed remainder so the palette lookup never receives -1.
    const f = ((x * 2.2) % 1 + 1) % 1;
    const seg = Math.min(Math.floor(f * (holo.length - 1)), holo.length - 2);
    const c = holo[seg].clone().lerp(holo[seg + 1], f * (holo.length - 1) - seg);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geo, mat);
}

// A real horizontal cut surface. The old throat was a vertical rectangle
// placed behind the opaque front face, so it could not read as an opening.
// This lens follows the same front/back bulges as the rim and remains visible
// from the camera's slightly lower view of the raised pack mouth.
function buildMouthInterior() {
  const shape = new THREE.Shape();
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = (u - 0.5) * PACK_WORLD_W * 0.95;
    const z = bulgeAt(u, CUT_V, BULGE_FRONT) * 0.88;
    if (i === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  }
  for (let i = n; i >= 0; i--) {
    const u = i / n;
    shape.lineTo(
      (u - 0.5) * PACK_WORLD_W * 0.95,
      -bulgeAt(u, CUT_V, BULGE_BACK) * 0.88
    );
  }
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape, 12);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x090615,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.renderOrder = 4;
  return mesh;
}

export function createPack() {
  const frontTex = makePackFrontTexture();
  const backTex = makePackBackTexture();

  const group = new THREE.Group();

  // Body (below the cut)
  const body = new THREE.Group();
  const bodyFront = buildFace(frontTex, 0, CUT_V, +1);
  const bodyBack = buildFace(backTex, 0, CUT_V, -1);
  // Position faces so the pack's overall center stays at group origin.
  const bodyH = PACK_WORLD_H * CUT_V;
  const bodyCenterY = -PACK_WORLD_H / 2 + bodyH / 2;
  bodyFront.position.y = bodyCenterY;
  bodyBack.position.y = bodyCenterY;
  body.add(bodyFront, bodyBack);

  // Dark interior visible through the mouth once opened.
  const throat = buildMouthInterior();
  throat.position.y = PACK_WORLD_H * (CUT_V - 0.5) + 0.004;
  throat.visible = false;
  body.add(throat);

  // Iridescent mouth rim (hidden until cut)
  const rim = buildMouthRim();
  rim.position.y = PACK_WORLD_H * (CUT_V - 0.5);
  body.add(rim);

  // Top strip (above the cut) — the piece that flies away.
  const top = new THREE.Group();
  const topFront = buildFace(frontTex, CUT_V, 1, +1);
  const topBack = buildFace(backTex, CUT_V, 1, -1);
  const topH = PACK_WORLD_H * (1 - CUT_V);
  const topCenterY = PACK_WORLD_H / 2 - topH / 2;
  const topInner = new THREE.Group();
  topFront.position.y = 0;
  topBack.position.y = 0;
  topInner.add(topFront, topBack);
  // Underside rainbow edge on the severed strip
  const underRim = buildMouthRim();
  underRim.scale.setScalar(0.98);
  underRim.position.y = -topH / 2;
  underRim.material = underRim.material.clone();
  topInner.add(underRim);
  top.add(topInner);
  top.position.y = topCenterY;

  group.add(body, top);

  return {
    group, body, top, rim, underRim, throat,
    frontTex, backTex,
    cutWorldY: () => PACK_WORLD_H * (CUT_V - 0.5),
    showMouth(opacity = 1) {
      rim.material.opacity = opacity;
      throat.visible = opacity > 0.3;
      underRim.material.opacity = opacity;
    },
  };
}

// A cheaper pack instance for carousel neighbors (shares textures).
export function createPackLite(frontTex, backTex) {
  const group = new THREE.Group();
  const f = buildFace(frontTex, 0, 1, +1);
  const b = buildFace(backTex, 0, 1, -1);
  group.add(f, b);
  return group;
}
