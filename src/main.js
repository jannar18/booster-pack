import * as THREE from 'three';
import { createScene } from './scene.js';
import { createPack, createPackLite, PACK_WORLD_W, PACK_WORLD_H } from './pack.js';
import { CARD_ASPECT, cardTexture, makeCardCanvas } from './cardArt.js';
import { CREATURES, RARITY_LABEL, drawPack } from './creatures.js';
import { clock, tween, updateTweens, cancelAllTweens, ease, mulberry32, clamp, lerp, makeCanvas } from './util.js';
import { createAudioController } from './audio.js';

const $ = (id) => document.getElementById(id);
const app = $('app');
const label = $('openLabel');
const libraryButton = $('libraryBtn');
const library = $('library');
const closeLibrary = $('closeLibrary');
const libraryGrid = $('libGrid');
const libraryCount = $('libCount');
const libraryStats = $('libStats');
const skipButton = $('skipBtn');
const audioButton = $('audioBtn');

function renderAudioButton(muted) {
  audioButton.setAttribute('aria-pressed', String(muted));
  audioButton.setAttribute('aria-label', muted ? 'Turn sound on' : 'Mute sound');
  audioButton.title = muted ? 'Turn sound on' : 'Mute sound';
}

const audio = createAudioController({ onMuteChange: renderAudioButton });

const { scene, camera, composer, renderer, viewHeightAt, viewWidthAt } = createScene(app);
renderer.domElement.setAttribute('aria-label', 'Interactive Lumen booster pack');
renderer.domElement.tabIndex = 0;

const world = new THREE.Group();
scene.add(world);

const pack = createPack();
pack.group.renderOrder = 3;
world.add(pack.group);

const CAROUSEL_SIDE_COUNT = 4;
const leftPacks = Array.from(
  { length: CAROUSEL_SIDE_COUNT },
  () => createPackLite(pack.frontTex, pack.backTex),
);
const rightPacks = Array.from(
  { length: CAROUSEL_SIDE_COUNT },
  () => createPackLite(pack.frontTex, pack.backTex),
);
const neighborPacks = [...leftPacks, ...rightPacks];
world.add(...neighborPacks);

function reflection(texture) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PACK_WORLD_W, PACK_WORLD_H), material);
  mesh.scale.y = -0.72;
  mesh.rotation.x = -0.035;
  mesh.renderOrder = 0;
  return mesh;
}

const reflections = Array.from(
  { length: CAROUSEL_SIDE_COUNT * 2 + 1 },
  () => reflection(pack.frontTex),
);
world.add(...reflections);

function makeSoftBandTexture() {
  const [canvas, ctx] = makeCanvas(256, 64);
  const vertical = ctx.createLinearGradient(0, 0, 0, 64);
  vertical.addColorStop(0, 'rgba(255,255,255,0)');
  vertical.addColorStop(0.34, 'rgba(255,255,255,0.18)');
  vertical.addColorStop(0.5, 'rgba(255,255,255,1)');
  vertical.addColorStop(0.66, 'rgba(255,255,255,0.18)');
  vertical.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, 256, 64);
  const horizontal = ctx.createLinearGradient(0, 0, 256, 0);
  horizontal.addColorStop(0, 'rgba(255,255,255,0.08)');
  horizontal.addColorStop(0.06, '#fff');
  horizontal.addColorStop(0.94, '#fff');
  horizontal.addColorStop(1, 'rgba(255,255,255,0.12)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = horizontal;
  ctx.fillRect(0, 0, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeRadialLightTexture() {
  const [canvas, ctx] = makeCanvas(96, 96);
  const glow = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
  glow.addColorStop(0, '#fff');
  glow.addColorStop(0.12, 'rgba(255,255,255,0.98)');
  glow.addColorStop(0.38, 'rgba(255,255,255,0.42)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 96, 96);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const cutBandTexture = makeSoftBandTexture();
const cutLightTexture = makeRadialLightTexture();
const cutGroup = new THREE.Group();
const cutHaze = new THREE.Mesh(
  new THREE.PlaneGeometry(PACK_WORLD_W, 0.34),
  new THREE.MeshBasicMaterial({
    map: cutBandTexture,
    color: 0xffc869,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
);
const cutGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(PACK_WORLD_W, 0.15),
  new THREE.MeshBasicMaterial({
    map: cutBandTexture,
    color: 0xffdc8a,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
);
const cutCoreMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
});
cutCoreMaterial.color.setRGB(2.35, 2.05, 1.15);
const cutCore = new THREE.Mesh(new THREE.PlaneGeometry(PACK_WORLD_W, 0.022), cutCoreMaterial);

function cutSprite(color, opacity = 0) {
  return new THREE.Sprite(new THREE.SpriteMaterial({
    map: cutLightTexture,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }));
}

const cutHeadGlow = cutSprite(0xffcf72);
const cutHeadCore = cutSprite(0xffffe8);
cutHeadGlow.scale.set(0.34, 0.34, 1);
cutHeadCore.scale.set(0.11, 0.11, 1);
const cutShimmers = Array.from({ length: 5 }, (_, index) => {
  const shimmer = cutSprite(index % 2 ? 0xffe7a5 : 0xffffff);
  shimmer.scale.set(0.13 + index * 0.008, 0.075, 1);
  return shimmer;
});
const cutSparks = Array.from({ length: 10 }, (_, index) => {
  const spark = cutSprite(index % 3 ? 0xffe4a3 : 0xffffff);
  const size = 0.025 + (index % 4) * 0.008;
  spark.scale.set(size, size, 1);
  return spark;
});

[cutHaze, cutGlow, cutCore, cutHeadGlow, cutHeadCore, ...cutShimmers, ...cutSparks]
  .forEach((object) => { object.renderOrder = 10; });
cutGroup.add(cutHaze, cutGlow, cutCore, cutHeadGlow, cutHeadCore, ...cutShimmers, ...cutSparks);
// Keep the overlay close to the foil surface. At the old z=0.52 the camera's
// perspective projected this positive-y line several pixels above the printed
// rainbow seam even though both shared the same world-space y coordinate.
cutGroup.position.set(0, pack.cutWorldY(), 0.16);
pack.group.add(cutGroup);

const sparkleGeometry = new THREE.BufferGeometry();
const sparklePositions = new Float32Array(72 * 3);
for (let i = 0; i < 72; i += 1) {
  sparklePositions[i * 3] = (Math.random() - 0.5) * 3.2;
  sparklePositions[i * 3 + 1] = (Math.random() - 0.5) * 4.7;
  sparklePositions[i * 3 + 2] = 0.4 + Math.random() * 0.3;
}
sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
const sparkles = new THREE.Points(
  sparkleGeometry,
  new THREE.PointsMaterial({ color: 0xfff4ba, size: 0.035, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
);
world.add(sparkles);

const cardRoot = new THREE.Group();
cardRoot.renderOrder = 7;
world.add(cardRoot);

const aura = new THREE.Mesh(
  new THREE.CircleGeometry(1.7, 64),
  new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
);
aura.position.z = -0.05;
cardRoot.add(aura);

let cards = [];
let cardMeshes = [];
let moment = 'm1';
let revealIndex = 0;
let cutProgress = 0;
let cutVisualProgress = 0;
let cutReleaseFlash = 0;
let sequenceToken = 0;
let focused = false;
let completionPending = false;
let dragging = null;
let carouselOffset = 0;
let carouselTween = null;
let wheelGesture = null;
let wheelSettleTimer = null;

const CARD_HEIGHT = 2.95;
const CARD_WIDTH = CARD_HEIGHT * CARD_ASPECT;
const REVEAL_CARD_Z = 0.6;
// Keep the rising stack between the pouch's back and front foil surfaces. The
// lower card stays occluded by the sleeve while the exposed portion clears the
// open mouth, which makes the cards read as physically inside the pack.
const EMERGING_CARD_Z = 0.04;
// The original carousel used a slightly compressed pouch silhouette. Preserve
// that same proportion through selection, focus, cutting, and card emergence.
const PACK_Y_SCALE = 0.88;
const SELECTION_PACK_WIDTH = 0.48;
const SELECTION_PACK_MAX_HEIGHT = 0.62;
const FOCUSED_PACK_WIDTH = 0.79;
const FOCUSED_PACK_MAX_HEIGHT = 0.78;
const REVEAL_CARD_MAX_HEIGHT = 0.76;
const OPEN_PACK_Y = -0.18;
const EMERGING_PACK_Y = -1.85;

function releasedTopPose() {
  return {
    x: 1.3,
    y: pack.closedTopY + 0.74,
    z: 0.4,
    rx: 0.12,
    ry: 0.22,
    rz: 0.28,
    scale: 0.78,
  };
}

function fitScaleAt({ widthFraction, heightFraction, objectWidth, objectHeight, z = 0, yScale = 1 }) {
  const scaleForWidth = (viewWidthAt(z) * widthFraction) / objectWidth;
  const scaleForHeight = (viewHeightAt(z) * heightFraction) / (objectHeight * yScale);
  return Math.min(scaleForWidth, scaleForHeight);
}

function packScaleAt(widthFraction, heightFraction, z = 0, yScale = 1) {
  return fitScaleAt({
    widthFraction,
    heightFraction,
    objectWidth: PACK_WORLD_W,
    objectHeight: PACK_WORLD_H,
    z,
    yScale,
  });
}

function setPackScale(object, scale) {
  object.scale.set(scale, scale * PACK_Y_SCALE, scale);
}

function selectionPackScale() {
  return packScaleAt(
    SELECTION_PACK_WIDTH,
    SELECTION_PACK_MAX_HEIGHT,
    0,
    PACK_Y_SCALE,
  );
}

function focusedPackScale() {
  return packScaleAt(
    FOCUSED_PACK_WIDTH,
    FOCUSED_PACK_MAX_HEIGHT,
    pack.group.position.z,
    PACK_Y_SCALE,
  );
}

// Keep the complete focused pouch inside the viewport. A slightly low center
// leaves room for the HUD and makes the pack feel grounded without cropping.
function focusedPackY() {
  return -viewHeightAt(pack.group.position.z) * 0.04;
}

function selectionLayoutMetrics() {
  const centerScale = selectionPackScale();
  // Nine evenly spaced packs complete a ring without duplicating the rear
  // position. The ring radius is viewport-relative so the near side packs sit
  // near the edges while the remaining packs curl back into the scene.
  const angleStep = (Math.PI * 2) / (CAROUSEL_SIDE_COUNT * 2 + 1);
  // On portrait screens width alone produces a tiny, crowded orbit. Using the
  // larger scene dimension preserves the same physical depth as landscape.
  const ringRadius = Math.max(viewWidthAt(0), viewHeightAt(0)) * 0.5;
  const sideStep = ringRadius * Math.sin(angleStep);
  return { centerScale, angleStep, ringRadius, sideStep };
}

function layoutSelection(offset = carouselOffset) {
  const { centerScale, angleStep, ringRadius, sideStep } = selectionLayoutMetrics();
  const entries = [
    ...leftPacks.map((object, index) => ({
      object,
      reflection: reflections[index],
      slot: index - CAROUSEL_SIDE_COUNT,
    })),
    {
      object: pack.group,
      reflection: reflections[CAROUSEL_SIDE_COUNT],
      slot: 0,
    },
    ...rightPacks.map((object, index) => ({
      object,
      reflection: reflections[CAROUSEL_SIDE_COUNT + 1 + index],
      slot: index + 1,
    })),
  ];

  entries.forEach(({ object, reflection: item, slot }) => {
    const angle = slot * angleStep + (offset / sideStep) * angleStep;
    const x = Math.sin(angle) * ringRadius;
    const z = (Math.cos(angle) - 1) * ringRadius;
    const depthProgress = (1 - Math.cos(angle)) * 0.5;
    const y = lerp(0.12, 0, depthProgress);
    const roll = Math.sin(angle) * 0.018;
    object.position.set(x, y, z);
    // Each pouch faces radially outward from the ring. Perspective now creates
    // the size change naturally, while the far packs wrap inward behind the
    // selected pouch instead of continuing offscreen along a shallow arc.
    object.rotation.set(0, angle, roll);
    setPackScale(object, centerScale);

    item.position.set(x, -2.48 + y, z - 0.22);
    item.rotation.y = angle;
    item.scale.x = centerScale;
    item.scale.y = -centerScale * PACK_Y_SCALE * 0.72;
  });

  return sideStep;
}

function revealCardScale() {
  return fitScaleAt({
    widthFraction: 0.72,
    heightFraction: REVEAL_CARD_MAX_HEIGHT,
    objectWidth: CARD_WIDTH,
    objectHeight: CARD_HEIGHT,
    z: REVEAL_CARD_Z,
  });
}

function packScreenWidth() {
  const visibleWorldWidth = PACK_WORLD_W * pack.group.scale.x;
  return (visibleWorldWidth / viewWidthAt(pack.group.position.z)) * innerWidth;
}

const COPY = {
  m1: 'Choose a pack',
  m2: 'Slide across the light',
  m3: 'Keep sliding',
  m4: 'The seal is open',
  m5: 'Your cards are awakening',
  m6: 'Tap to reveal the next card',
};

function setLabel(text, visible = true) {
  label.textContent = text;
  label.classList.toggle('hidden', !visible);
}

function setSkip(visible) {
  skipButton.classList.toggle('hidden', !visible);
}

function layoutCutLight(progress) {
  const visibleWidth = PACK_WORLD_W * progress;
  const centerX = -PACK_WORLD_W / 2 + visibleWidth / 2;
  const headX = -PACK_WORLD_W / 2 + visibleWidth;
  for (const layer of [cutHaze, cutGlow, cutCore]) {
    layer.scale.x = progress;
    layer.position.x = centerX;
  }
  cutHeadGlow.position.x = headX;
  cutHeadCore.position.x = headX;
}

function setCut(value) {
  cutProgress = clamp(value, 0, 1);
  cutVisualProgress = cutProgress;
  cutReleaseFlash = 0;
  layoutCutLight(cutVisualProgress);
  cutGroup.visible = cutVisualProgress > 0.005;
}

function releaseCutLight() {
  cutProgress = 0;
  cutVisualProgress = 1;
  cutReleaseFlash = 1;
  layoutCutLight(1);
  tween({
    from: 1,
    to: 0,
    duration: reducedMotion.matches ? 0.12 : 0.32,
    easing: ease.outCubic,
    onUpdate: (value) => { cutReleaseFlash = value; },
    onComplete: () => {
      cutReleaseFlash = 0;
      cutVisualProgress = 0;
      cutGroup.visible = false;
    },
  });
}

function removeCards() {
  for (const mesh of cardMeshes) {
    cardRoot.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  cardMeshes = [];
  aura.material.opacity = 0;
}

function makeCardMesh(creature, index) {
  const faceMap = cardTexture(creature).tex;
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x505050,
    map: faceMap,
    emissive: 0xffffff,
    emissiveMap: faceMap,
    emissiveIntensity: 0.68,
    roughness: 0.62,
    metalness: creature.rarity === 'r' || creature.rarity === 'x' ? 0.08 : 0,
    clearcoat: creature.rarity === 'r' || creature.rarity === 'x' ? 0.28 : 0.16,
    clearcoatRoughness: 0.46,
    envMapIntensity: 0.24,
    transparent: true,
    alphaTest: 0.025,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT), material);
  mesh.userData = { creature, index };
  mesh.renderOrder = 8 + (cards.length - index);
  return mesh;
}

function buildCards(seed = 0x1a2b3c4d) {
  removeCards();
  cards = drawPack(mulberry32(seed));
  cardMeshes = cards.map(makeCardMesh);
  cardMeshes.forEach((mesh, index) => {
    mesh.position.set(index * 0.026, index * -0.02, -index * 0.026);
    mesh.rotation.z = index * -0.003;
    cardRoot.add(mesh);
  });
  revealIndex = 0;
}

function resetTransforms() {
  cancelAllTweens();
  audio.endCut(false);
  carouselTween = null;
  carouselOffset = 0;
  if (wheelSettleTimer) clearTimeout(wheelSettleTimer);
  wheelSettleTimer = null;
  wheelGesture = null;
  sequenceToken += 1;
  focused = false;
  completionPending = false;
  pack.group.visible = true;
  pack.body.visible = true;
  pack.top.visible = true;
  pack.group.position.set(0, 0, 0);
  pack.group.rotation.set(0, 0, 0);
  setPackScale(pack.group, 1);
  pack.body.position.set(0, 0, 0);
  pack.top.position.set(0, pack.closedTopY, 0);
  pack.top.rotation.set(0, 0, 0);
  pack.top.scale.setScalar(1);
  pack.top.visible = true;
  pack.throat.rotation.x = Math.PI / 2;
  pack.throat.position.z = -0.12;
  pack.showMouth(0);
  neighborPacks.forEach((item) => { item.visible = true; });
  reflections.forEach((item) => { item.visible = true; });
  cardRoot.visible = false;
  cardRoot.position.set(0, 0, REVEAL_CARD_Z);
  cardRoot.rotation.set(0, 0, 0);
  cardRoot.scale.setScalar(1);
  cardMeshes.forEach((mesh, index) => {
    mesh.visible = true;
    mesh.position.set(index * 0.026, index * -0.02, -index * 0.026);
    mesh.rotation.set(0, 0, index * -0.003);
    mesh.scale.setScalar(1);
    mesh.material.opacity = 1;
    mesh.material.transparent = true;
  });
  setCut(0);
  setSkip(false);
}

function applyMoment(id) {
  moment = id;
  resetTransforms();
  setLabel(COPY[id], true);
  if (id === 'm1') audio.enterSelection();
  else audio.leaveSelection();

  if (id === 'm1') {
    layoutSelection();
    setLabel('Swipe to choose · tap to open');
    return;
  }

  focused = true;
  neighborPacks.forEach((item) => { item.visible = false; });
  reflections.forEach((item) => { item.visible = false; });
  sparkles.visible = true;
  setPackScale(pack.group, focusedPackScale());
  pack.group.position.y = focusedPackY();

  if (id === 'm2') return;

  if (id === 'm3') {
    setCut(0.72);
    pack.group.rotation.z = 0.009;
    return;
  }

  pack.showMouth(1);
  setCut(0);

  if (id === 'm4') {
    const topPose = releasedTopPose();
    pack.group.position.y = OPEN_PACK_Y;
    pack.top.position.set(topPose.x, topPose.y, topPose.z);
    pack.top.rotation.set(topPose.rx, topPose.ry, topPose.rz);
    pack.top.scale.setScalar(topPose.scale);
    pack.throat.rotation.x = Math.PI / 2 - 0.35;
    pack.throat.position.z = 0.16;
    pack.body.position.y = -0.17;
    return;
  }

  pack.top.visible = false;
  cardRoot.visible = true;

  if (id === 'm5') {
    setPackScale(pack.group, 0.86);
    pack.group.position.y = EMERGING_PACK_Y;
    cardRoot.position.set(0, -1.22, EMERGING_CARD_Z);
    cardRoot.scale.setScalar(0.7);
    return;
  }

  pack.group.visible = false;
  cardRoot.position.set(0, -0.16, REVEAL_CARD_Z);
  cardRoot.scale.setScalar(revealCardScale());
  const rarity = cards[revealIndex]?.rarity;
  aura.material.opacity = rarity === 'x' ? 0.5 : rarity === 'r' ? 0.23 : 0;
  setSkip(true);
  setLabel(`${cards[revealIndex].name} · ${RARITY_LABEL[rarity]} · tap to continue`);
}

function goto(id) {
  const normalized = /^m[1-6]$/.test(id) ? id : 'm1';
  applyMoment(normalized);
  return state();
}

function animateFocus() {
  if (moment !== 'm1') return;
  audio.selectPack();
  moment = 'm2';
  focused = true;
  setLabel(COPY.m2);
  neighborPacks.forEach((item) => { item.visible = false; });
  reflections.forEach((item) => { item.visible = false; });
  const startScale = pack.group.scale.clone();
  const startY = pack.group.position.y;
  const targetScale = focusedPackScale();
  const targetY = focusedPackY();
  tween({ duration: 0.56, easing: ease.outBackSoft, onUpdate: (value) => {
    pack.group.scale.set(
      startScale.x + (targetScale - startScale.x) * value,
      startScale.y + (targetScale * PACK_Y_SCALE - startScale.y) * value,
      startScale.z + (targetScale - startScale.z) * value
    );
    pack.group.position.y = startY + (targetY - startY) * value;
  }});
}

function settleCarousel(targetOffset) {
  const startOffset = carouselOffset;
  const { sideStep } = selectionLayoutMetrics();
  const stepDistance = Math.abs(targetOffset - startOffset) / sideStep;
  if (Math.abs(targetOffset) >= sideStep * 0.5) audio.carouselStep();
  carouselTween?.cancel();
  carouselTween = tween({
    duration: 0.3 + Math.min(stepDistance, 2) * 0.08,
    easing: ease.outCubic,
    onUpdate: (value) => {
      carouselOffset = lerp(startOffset, targetOffset, value);
      layoutSelection(carouselOffset);
    },
    onComplete: () => {
      // Every pack shares the same artwork, so a whole-number rotation can be
      // recycled invisibly while keeping the detailed openable pack centered.
      carouselOffset = 0;
      layoutSelection();
      carouselTween = null;
    },
  });
}

function finishWheelCarousel() {
  if (!wheelGesture || moment !== 'm1') return;
  const { sideStep } = selectionLayoutMetrics();
  const commits = Math.abs(wheelGesture.total) > sideStep * 0.12 ||
    Math.abs(wheelGesture.lastDelta) > sideStep * 0.08;
  const direction = Math.sign(wheelGesture.total || wheelGesture.lastDelta);
  const projectedOffset = carouselOffset + wheelGesture.lastDelta * 2.5;
  let targetStep = Math.round(projectedOffset / sideStep);
  if (commits && targetStep === 0) targetStep = direction;
  wheelGesture = null;
  wheelSettleTimer = null;
  settleCarousel(commits ? targetStep * sideStep : 0);
}

function wheelCarousel(event) {
  if (moment !== 'm1') return;
  const horizontalDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY) * 0.65
    ? event.deltaX
    : event.shiftKey ? event.deltaY : 0;
  if (Math.abs(horizontalDelta) < 0.5) return;

  void audio.unlock();
  event.preventDefault();
  carouselTween?.cancel();
  carouselTween = null;
  const worldDelta = -(horizontalDelta / innerWidth) * viewWidthAt(0);
  if (!wheelGesture) wheelGesture = { total: 0, lastDelta: 0 };
  wheelGesture.total += worldDelta;
  wheelGesture.lastDelta = worldDelta;
  carouselOffset += worldDelta;
  layoutSelection(carouselOffset);

  if (wheelSettleTimer) clearTimeout(wheelSettleTimer);
  wheelSettleTimer = setTimeout(finishWheelCarousel, 140);
}

async function animateOpening() {
  const token = ++sequenceToken;
  audio.endCut();
  moment = 'm3';
  setLabel('Seal released');
  navigator.vibrate?.(12);
  await tween({ duration: 0.16, easing: ease.outExpo, onUpdate: (v) => {
    setCut(0.9 + v * 0.1);
    pack.group.rotation.z = Math.sin(v * Math.PI * 5) * 0.008 * (1 - v);
  }}).promise;
  if (token !== sequenceToken) return;

  moment = 'm4';
  audio.releaseSeal();
  audio.openFoil();
  pack.showMouth(1);
  releaseCutLight();
  const topY = pack.top.position.y;
  const packY = pack.group.position.y;
  const topTarget = releasedTopPose();
  pack.throat.rotation.x = Math.PI / 2 - 0.35;
  pack.throat.position.z = 0.16;
  tween({ duration: 0.8, easing: ease.outCubic, onUpdate: (v) => {
    pack.top.position.set(topTarget.x * v, topY + (topTarget.y - topY) * v, topTarget.z * v);
    pack.top.rotation.set(topTarget.rx * v, topTarget.ry * v, topTarget.rz * v);
    pack.top.scale.setScalar(1 + (topTarget.scale - 1) * v);
    pack.group.position.y = packY + (OPEN_PACK_Y - packY) * v;
    pack.body.position.y = -Math.sin(v * Math.PI) * 0.16;
  }});
  await tween({ duration: 0.58, easing: ease.outCubic, delay: 0.2, onUpdate: () => {} }).promise;
  if (token !== sequenceToken) return;

  moment = 'm5';
  audio.raiseCards();
  pack.top.visible = false;
  setCut(0);
  cardRoot.visible = true;
  cardRoot.position.set(0, -1.78, EMERGING_CARD_Z);
  cardRoot.scale.setScalar(0.7);
  setLabel(COPY.m5);
  const openPackY = pack.group.position.y;
  tween({ duration: 0.9, easing: ease.outQuint, onUpdate: (v) => {
    cardRoot.position.y = -1.78 + v * 0.56;
    pack.group.position.y = openPackY + (EMERGING_PACK_Y - openPackY) * v;
    setPackScale(pack.group, focusedPackScale() + (0.86 - focusedPackScale()) * v);
  }});
  await tween({ duration: 0.72, easing: ease.outCubic, delay: 0.43, onUpdate: () => {} }).promise;
  if (token !== sequenceToken) return;

  moment = 'm6';
  pack.group.visible = false;
  persistPack();
  setSkip(true);
  const startY = cardRoot.position.y;
  const startScale = cardRoot.scale.x;
  tween({ duration: 0.52, easing: ease.outBackSoft, onUpdate: (v) => {
    cardRoot.position.z = EMERGING_CARD_Z + (REVEAL_CARD_Z - EMERGING_CARD_Z) * v;
    cardRoot.position.y = startY + (-0.16 - startY) * v;
    cardRoot.scale.setScalar(startScale + (revealCardScale() - startScale) * v);
  }, onComplete: () => {
    setLabel(`${cards[0].name} · ${RARITY_LABEL[cards[0].rarity]} · tap to continue`);
    audio.revealCard(cards[0].rarity, 0);
  }});
}

function advance() {
  if (completionPending) return;
  if (moment === 'm1') { animateFocus(); return; }
  if (moment === 'm2') { setCut(1); animateOpening(); return; }
  if (moment !== 'm6') { goto('m6'); persistPack(); return; }
  if (revealIndex >= cardMeshes.length - 1) {
    completionPending = true;
    const token = sequenceToken;
    setLabel('Pack complete');
    audio.completePack();
    window.setTimeout(() => {
      if (token === sequenceToken) restart({ playSound: false });
    }, 420);
    return;
  }

  const outgoing = cardMeshes[revealIndex];
  const next = cards[revealIndex + 1];
  const startX = outgoing.position.x;
  revealIndex += 1;
  navigator.vibrate?.(next.rarity === 'x' ? [12, 35, 18] : 8);
  tween({ duration: 0.42, easing: ease.outCubic, onUpdate: (v) => {
    outgoing.position.x = startX - v * 2.8;
    outgoing.position.y = v * 1.2;
    outgoing.rotation.z = -v * 0.34;
    outgoing.material.transparent = true;
    outgoing.material.opacity = 1 - v;
  }, onComplete: () => { outgoing.visible = false; } });
  aura.material.opacity = next.rarity === 'x' ? 0.5 : next.rarity === 'r' ? 0.23 : 0;
  audio.revealCard(next.rarity, revealIndex);
  setLabel(`${next.name} · ${RARITY_LABEL[next.rarity]} · ${revealIndex + 1} of ${cards.length}`);
}

const STORAGE_KEY = 'lumen.collection.v1';

function readCollection() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function persistPack() {
  if (!cards.length) return;
  const collection = readCollection();
  const signature = cards.map((card) => card.id).join('|');
  if (collection.at(-1)?.signature === signature && Date.now() - collection.at(-1).openedAt < 5000) return;
  collection.push({ signature, openedAt: Date.now(), cards: cards.map((card) => card.id) });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
  renderLibrary();
}

function collectionIds() {
  return readCollection().flatMap((entry) => entry.cards || []);
}

function renderLibrary() {
  const ids = collectionIds();
  const counts = new Map();
  ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
  libraryCount.textContent = String(ids.length);
  libraryCount.setAttribute('aria-label', `${ids.length} cards`);
  libraryStats.textContent = `${counts.size} of ${CREATURES.length} discovered · ${ids.length} cards`;
  libraryGrid.replaceChildren();
  if (!ids.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Open your first pack to begin the collection.';
    libraryGrid.append(empty);
    return;
  }
  [...counts.entries()].forEach(([id, count], index) => {
    const creature = CREATURES.find((item) => item.id === id);
    if (!creature) return;
    const tile = document.createElement('article');
    tile.className = 'cardTile';
    tile.style.animationDelay = `${Math.min(index * 45, 360)}ms`;
    tile.setAttribute('aria-label', `${creature.name}, ${RARITY_LABEL[creature.rarity]}, ${count} owned`);
    const image = document.createElement('img');
    image.alt = `${creature.name} card`;
    image.src = makeCardCanvas(creature).toDataURL('image/jpeg', 0.88);
    tile.append(image);
    if (count > 1) {
      const duplicate = document.createElement('span');
      duplicate.className = 'dupe';
      duplicate.textContent = `×${count}`;
      tile.append(duplicate);
    }
    libraryGrid.append(tile);
  });
}

function openCollection() {
  void audio.unlock();
  audio.openCollection();
  library.classList.add('open');
  libraryButton.setAttribute('aria-expanded', 'true');
  closeLibrary.focus({ preventScroll: true });
}

function closeCollection() {
  audio.closeCollection();
  library.classList.remove('open');
  libraryButton.setAttribute('aria-expanded', 'false');
  libraryButton.focus({ preventScroll: true });
}

function restart({ playSound = true } = {}) {
  if (playSound) audio.restartPack();
  buildCards((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
  goto('m1');
}

function state() {
  return {
    moment,
    focused,
    cutProgress,
    revealIndex,
    audio: audio.state(),
    cards: cards.map((card) => card.id),
    collectionCount: collectionIds().length,
    carouselOffset,
    packTransform: {
      x: pack.group.position.x,
      yaw: pack.group.rotation.y,
      scale: pack.group.scale.toArray(),
    },
    cardRootZ: cardRoot.position.z,
    sideYaw: neighborPacks.map((item) => item.rotation.y),
    sidePositions: neighborPacks.map((item) => item.position.toArray()),
  };
}

function pointerDown(event) {
  if (event.button != null && event.button !== 0) return;
  void audio.unlock();
  if (moment === 'm1') {
    if (wheelSettleTimer) clearTimeout(wheelSettleTimer);
    wheelSettleTimer = null;
    wheelGesture = null;
    carouselTween?.cancel();
    carouselTween = null;
  }
  renderer.domElement.setPointerCapture?.(event.pointerId);
  const now = performance.now();
  dragging = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    startOffset: carouselOffset,
    moved: false,
    t: now,
    history: [{ x: event.clientX, t: now }],
  };
  if (moment === 'm2') {
    audio.beginCut();
    setLabel(COPY.m2);
  }
}

function pointerMove(event) {
  if (!dragging || dragging.id !== event.pointerId) return;
  const dx = event.clientX - dragging.x;
  const dy = event.clientY - dragging.y;
  dragging.moved ||= Math.hypot(dx, dy) > 8;
  if (moment === 'm1') {
    const now = performance.now();
    dragging.history.push({ x: event.clientX, t: now });
    dragging.history = dragging.history.filter((sample) => now - sample.t <= 120);
    // Convert screen travel to world travel so the packs remain glued to the
    // pointer on both narrow and wide viewports.
    carouselOffset = dragging.startOffset + (dx / innerWidth) * viewWidthAt(0);
    layoutSelection(carouselOffset);
  } else if (moment === 'm2' || moment === 'm3') {
    moment = 'm3';
    // Completion follows the physical pouch, not the browser window. This
    // keeps the gesture 1:1 when height-constrained on wide displays.
    const progress = Math.max(0, dx / (packScreenWidth() * 0.86));
    setCut(progress);
    audio.updateCut(progress);
    pack.group.rotation.z = Math.sin(progress * Math.PI * 8) * 0.007;
    setLabel(progress < 0.85 ? COPY.m3 : 'Release to open');
  }
}

function pointerUp(event) {
  if (!dragging || dragging.id !== event.pointerId) return;
  const gesture = dragging;
  dragging = null;
  if (moment === 'm1') {
    if (!gesture.moved && event.type !== 'pointercancel') {
      carouselOffset = 0;
      layoutSelection();
      animateFocus();
      return;
    }

    const first = gesture.history[0];
    const last = gesture.history.at(-1) || first;
    const elapsed = Math.max(last.t - first.t, 1);
    const velocityPixels = ((last.x - first.x) / elapsed) * 1000;
    const velocityWorld = (velocityPixels / innerWidth) * viewWidthAt(0);
    const sideStep = selectionLayoutMetrics().sideStep;
    const projectedOffset = carouselOffset + velocityWorld * 0.1;
    let targetStep = Math.round(projectedOffset / sideStep);
    if (Math.abs(velocityPixels) > 420 && targetStep === 0) {
      targetStep = Math.sign(velocityPixels);
    }
    settleCarousel(targetStep * sideStep);
    return;
  }
  if ((moment === 'm2' || moment === 'm3') && cutProgress >= 0.78) { animateOpening(); return; }
  if (moment === 'm3') {
    audio.endCut(false);
    moment = 'm2';
    const start = cutProgress;
    tween({ from: start, to: 0, duration: 0.26, easing: ease.outCubic, onUpdate: setCut });
    setLabel(COPY.m2);
    return;
  }
  if (moment === 'm2') audio.endCut(false);
  if (moment === 'm6' && !gesture.moved) advance();
}

renderer.domElement.addEventListener('pointerdown', pointerDown);
renderer.domElement.addEventListener('pointermove', pointerMove);
renderer.domElement.addEventListener('pointerup', pointerUp);
renderer.domElement.addEventListener('pointercancel', pointerUp);
renderer.domElement.addEventListener('wheel', wheelCarousel, { passive: false });
renderer.domElement.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    void audio.unlock();
    advance();
  }
  if (event.key === 'Escape' && library.classList.contains('open')) closeCollection();
});

libraryButton.addEventListener('click', openCollection);
closeLibrary.addEventListener('click', closeCollection);
audioButton.addEventListener('click', () => {
  void audio.unlock();
  audio.toggleMuted();
});
skipButton.addEventListener('click', () => {
  audio.endCut(false);
  goto('m6');
  audio.revealCard(cards[0]?.rarity, 0);
});
library.addEventListener('click', (event) => { if (event.target === library) closeCollection(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && library.classList.contains('open')) closeCollection(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) audio.suspend(); });
window.addEventListener('resize', () => {
  if (moment === 'm1') layoutSelection();
  else if (moment === 'm2' || moment === 'm3') {
    setPackScale(pack.group, focusedPackScale());
    pack.group.position.y = focusedPackY();
  } else if (moment === 'm4') setPackScale(pack.group, focusedPackScale());
  else if (moment === 'm6') cardRoot.scale.setScalar(revealCardScale());
});

function animateCutLight(time) {
  const progress = cutVisualProgress;
  const active = progress > 0.005 && (cutProgress > 0 || cutReleaseFlash > 0.005);
  cutGroup.visible = active;
  if (!active) return;

  layoutCutLight(progress);
  const animated = !reducedMotion.matches;
  const pulse = animated
    ? 0.96 + Math.sin(time * 9.7) * 0.025 + Math.sin(time * 4.1 + 0.8) * 0.018
    : 1;
  const completion = 0.76 + progress * 0.24;
  const visibility = cutProgress > 0 ? 1 : cutReleaseFlash;
  const flare = cutReleaseFlash;

  cutHaze.material.opacity = Math.min(0.72, (0.12 + progress * 0.14 + flare * 0.28) * pulse * visibility);
  cutGlow.material.opacity = Math.min(0.9, (0.32 + progress * 0.34 + flare * 0.22) * pulse * visibility);
  cutCore.material.opacity = Math.min(1, (0.82 + progress * 0.16) * pulse * visibility);
  cutHeadGlow.material.opacity = Math.min(1, (0.42 + completion * 0.24 + flare * 0.28) * visibility);
  cutHeadCore.material.opacity = Math.min(1, (0.84 + flare * 0.16) * visibility);
  const haloSize = (0.28 + progress * 0.09 + flare * 0.28) * pulse;
  const coreSize = 0.075 + progress * 0.025 + flare * 0.045;
  cutHeadGlow.scale.set(haloSize, haloSize, 1);
  cutHeadCore.scale.set(coreSize, coreSize, 1);

  if (!animated) {
    cutShimmers.forEach((shimmer) => { shimmer.visible = false; });
    cutSparks.forEach((spark) => { spark.visible = false; });
    return;
  }

  const leftEdge = -PACK_WORLD_W / 2;
  const visibleWidth = PACK_WORLD_W * progress;
  cutShimmers.forEach((shimmer, index) => {
    const phase = (time * 0.62 + index / cutShimmers.length) % 1;
    shimmer.visible = visibleWidth > 0.08;
    shimmer.position.set(
      leftEdge + phase * visibleWidth,
      Math.sin(time * 3.2 + index * 1.9) * 0.018,
      0.012,
    );
    const shimmerScale = 0.1 + 0.08 * Math.sin(Math.PI * phase);
    shimmer.scale.set(shimmerScale, 0.055 + completion * 0.028, 1);
    shimmer.material.opacity = Math.sin(Math.PI * phase) * 0.48 * completion * visibility;
  });

  const headX = leftEdge + visibleWidth;
  cutSparks.forEach((spark, index) => {
    const age = (time * 1.35 + index / cutSparks.length) % 1;
    const trail = Math.min(visibleWidth, 0.16 + progress * 0.28);
    spark.visible = visibleWidth > 0.06;
    spark.position.set(
      headX - age * trail,
      Math.sin(index * 2.4 + time * 5.3) * (0.025 + age * 0.045),
      0.018,
    );
    const sparkSize = (0.024 + (index % 4) * 0.007) * (1 - age * 0.55) * (1 + flare * 0.8);
    spark.scale.set(sparkSize, sparkSize, 1);
    spark.material.opacity = Math.pow(1 - age, 1.6) * (0.34 + progress * 0.42) * visibility;
  });
}

function animate(now) {
  requestAnimationFrame(animate);
  clock.tick(now);
  updateTweens();
  const time = clock.t;
  if (moment === 'm1') {
    pack.group.position.y += ((0.12 + Math.sin(time * 1.8) * 0.025) - pack.group.position.y) * 0.05;
  } else if (moment === 'm2') {
    pack.group.rotation.y = Math.sin(time * 1.25) * 0.025;
  }
  animateCutLight(time);
  sparkles.rotation.z = time * 0.035;
  sparkles.material.opacity = 0.36 + Math.sin(time * 2.1) * 0.12;
  if (aura.material.opacity > 0) {
    aura.rotation.z = time * 0.08;
    aura.scale.setScalar(1 + Math.sin(time * 2.3) * 0.035);
  }
  composer.render();
}

buildCards();
renderLibrary();
goto('m1');
requestAnimationFrame(animate);

window.__flow = {
  goto,
  state,
  advance,
  restart,
  clearCollection() { localStorage.removeItem(STORAGE_KEY); renderLibrary(); },
  openCollection,
  closeCollection,
  references: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'],
};
