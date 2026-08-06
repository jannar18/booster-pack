import * as THREE from 'three';
import { createScene } from './scene.js';
import { createPack, createPackLite, PACK_WORLD_W, PACK_WORLD_H } from './pack.js';
import { CARD_ASPECT, cardTexture, makeCardCanvas } from './cardArt.js';
import { CREATURES, RARITY_LABEL, drawPack } from './creatures.js';
import { clock, tween, updateTweens, cancelAllTweens, ease, mulberry32, clamp, lerp } from './util.js';

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

const { scene, camera, composer, renderer, viewHeightAt, viewWidthAt } = createScene(app);
renderer.domElement.setAttribute('aria-label', 'Interactive Lumen booster pack');
renderer.domElement.tabIndex = 0;

const world = new THREE.Group();
scene.add(world);

const pack = createPack();
pack.group.renderOrder = 3;
world.add(pack.group);

const farLeftPack = createPackLite(pack.frontTex, pack.backTex);
const leftPack = createPackLite(pack.frontTex, pack.backTex);
const rightPack = createPackLite(pack.frontTex, pack.backTex);
const farRightPack = createPackLite(pack.frontTex, pack.backTex);
const neighborPacks = [farLeftPack, leftPack, rightPack, farRightPack];
world.add(farLeftPack, leftPack, rightPack, farRightPack);

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

const reflections = Array.from({ length: 5 }, () => reflection(pack.frontTex));
world.add(...reflections);

const cutGroup = new THREE.Group();
const cutCore = new THREE.Mesh(
  new THREE.PlaneGeometry(PACK_WORLD_W, 0.035),
  new THREE.MeshBasicMaterial({ color: 0xfffff1, transparent: true, opacity: 1, depthTest: false })
);
const cutGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(PACK_WORLD_W * 1.15, 0.19),
  new THREE.MeshBasicMaterial({ color: 0xffdd87, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthTest: false })
);
cutCore.renderOrder = cutGlow.renderOrder = 10;
cutGroup.add(cutGlow, cutCore);
cutGroup.position.set(0, pack.cutWorldY(), 0.52);
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
let sequenceToken = 0;
let focused = false;
let dragging = null;
let carouselOffset = 0;
let carouselTween = null;

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
  const nearZ = -0.42;
  const farZ = -0.86;
  const sideViewWidth = viewWidthAt(nearZ);
  const sideStep = sideViewWidth * 0.235;
  const nearScale = Math.min(
    packScaleAt(0.5, 0.68, nearZ, PACK_Y_SCALE),
    centerScale * 0.88,
  );
  const farScale = centerScale * 0.72;
  return { centerScale, nearScale, farScale, nearZ, farZ, sideStep };
}

function layoutSelection(offset = carouselOffset) {
  const { centerScale, nearScale, farScale, nearZ, farZ, sideStep } = selectionLayoutMetrics();
  const entries = [
    { object: farLeftPack, reflection: reflections[0], x: -sideStep * 2 + offset },
    { object: leftPack, reflection: reflections[1], x: -sideStep + offset },
    { object: pack.group, reflection: reflections[2], x: offset },
    { object: rightPack, reflection: reflections[3], x: sideStep + offset },
    { object: farRightPack, reflection: reflections[4], x: sideStep * 2 + offset },
  ];

  entries.forEach(({ object, reflection: item, x }) => {
    const slotProgress = clamp(Math.abs(x) / sideStep, 0, 2);
    const nearProgress = Math.min(slotProgress, 1);
    const farProgress = Math.max(slotProgress - 1, 0);
    const objectScale = slotProgress <= 1
      ? lerp(centerScale, nearScale, nearProgress)
      : lerp(nearScale, farScale, farProgress);
    const yaw = clamp(x / sideStep, -1.55, 1.55) * 0.66;
    const roll = clamp(x / sideStep, -1.55, 1.55) * 0.015;
    const z = slotProgress <= 1
      ? lerp(0, nearZ, nearProgress)
      : lerp(nearZ, farZ, farProgress);
    const y = slotProgress <= 1
      ? lerp(0.12, -0.03, nearProgress)
      : lerp(-0.03, -0.1, farProgress);
    object.position.set(x, y, z);
    // Packs turn progressively away from the center, forming a dense convex
    // ring with near neighbors and partial outer packs like the reference.
    object.rotation.set(0, yaw, roll);
    setPackScale(object, objectScale);

    item.position.set(x, -2.48, -0.8);
    item.rotation.y = yaw;
    item.scale.x = objectScale;
    item.scale.y = -objectScale * PACK_Y_SCALE * 0.72;
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

function setCut(value) {
  cutProgress = Math.max(0, Math.min(1, value));
  cutGroup.visible = cutProgress > 0.005;
  cutCore.scale.x = cutProgress;
  cutGlow.scale.x = cutProgress;
  const x = -PACK_WORLD_W / 2 + (PACK_WORLD_W * cutProgress) / 2;
  cutCore.position.x = x;
  cutGlow.position.x = x - PACK_WORLD_W * 0.035;
  cutGlow.material.opacity = 0.2 + cutProgress * 0.58;
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
  carouselTween = null;
  carouselOffset = 0;
  sequenceToken += 1;
  focused = false;
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
  carouselTween?.cancel();
  carouselTween = tween({
    duration: targetOffset === 0 ? 0.32 : 0.42,
    easing: targetOffset === 0 ? ease.outCubic : ease.outBackSoft,
    onUpdate: (value) => {
      carouselOffset = lerp(startOffset, targetOffset, value);
      layoutSelection(carouselOffset);
    },
    onComplete: () => {
      // All three packs share the same artwork, so recycling their visual slots
      // after a completed swipe is imperceptible and keeps the openable pack in
      // the center for the next gesture.
      carouselOffset = 0;
      layoutSelection();
      carouselTween = null;
    },
  });
}

async function animateOpening() {
  const token = ++sequenceToken;
  moment = 'm3';
  setLabel('Seal released');
  navigator.vibrate?.(12);
  await tween({ duration: 0.16, easing: ease.outExpo, onUpdate: (v) => {
    setCut(0.9 + v * 0.1);
    pack.group.rotation.z = Math.sin(v * Math.PI * 5) * 0.008 * (1 - v);
  }}).promise;
  if (token !== sequenceToken) return;

  moment = 'm4';
  pack.showMouth(1);
  setCut(0);
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
  }, onComplete: () => setLabel(`${cards[0].name} · ${RARITY_LABEL[cards[0].rarity]} · tap to continue`) });
}

function advance() {
  if (moment === 'm1') { animateFocus(); return; }
  if (moment === 'm2') { setCut(1); animateOpening(); return; }
  if (moment !== 'm6') { goto('m6'); persistPack(); return; }
  if (revealIndex >= cardMeshes.length - 1) { restart(); return; }

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
  library.classList.add('open');
  libraryButton.setAttribute('aria-expanded', 'true');
  closeLibrary.focus({ preventScroll: true });
}

function closeCollection() {
  library.classList.remove('open');
  libraryButton.setAttribute('aria-expanded', 'false');
  libraryButton.focus({ preventScroll: true });
}

function restart() {
  buildCards((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
  goto('m1');
}

function state() {
  return {
    moment,
    focused,
    cutProgress,
    revealIndex,
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
  };
}

function pointerDown(event) {
  if (event.button != null && event.button !== 0) return;
  if (moment === 'm1') {
    carouselTween?.cancel();
    carouselTween = null;
  }
  renderer.domElement.setPointerCapture?.(event.pointerId);
  const now = performance.now();
  dragging = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    moved: false,
    t: now,
    history: [{ x: event.clientX, t: now }],
  };
  if (moment === 'm2') setLabel(COPY.m2);
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
    carouselOffset = (dx / innerWidth) * viewWidthAt(0);
    layoutSelection(carouselOffset);
  } else if (moment === 'm2' || moment === 'm3') {
    moment = 'm3';
    // Completion follows the physical pouch, not the browser window. This
    // keeps the gesture 1:1 when height-constrained on wide displays.
    const progress = Math.max(0, dx / (packScreenWidth() * 0.86));
    setCut(progress);
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
    const velocity = ((last.x - first.x) / elapsed) * 1000;
    const dx = event.clientX - gesture.x;
    const commits = Math.abs(dx) > innerWidth * 0.09 || Math.abs(velocity) > 420;
    const direction = Math.sign(dx || velocity);
    const sideStep = selectionLayoutMetrics().sideStep;
    settleCarousel(commits && direction ? direction * sideStep : 0);
    return;
  }
  if ((moment === 'm2' || moment === 'm3') && cutProgress >= 0.78) { animateOpening(); return; }
  if (moment === 'm3') {
    moment = 'm2';
    const start = cutProgress;
    tween({ from: start, to: 0, duration: 0.26, easing: ease.outCubic, onUpdate: setCut });
    setLabel(COPY.m2);
    return;
  }
  if (moment === 'm6' && !gesture.moved) advance();
}

renderer.domElement.addEventListener('pointerdown', pointerDown);
renderer.domElement.addEventListener('pointermove', pointerMove);
renderer.domElement.addEventListener('pointerup', pointerUp);
renderer.domElement.addEventListener('pointercancel', pointerUp);
renderer.domElement.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); advance(); }
  if (event.key === 'Escape' && library.classList.contains('open')) closeCollection();
});

libraryButton.addEventListener('click', openCollection);
closeLibrary.addEventListener('click', closeCollection);
skipButton.addEventListener('click', () => goto('m6'));
library.addEventListener('click', (event) => { if (event.target === library) closeCollection(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && library.classList.contains('open')) closeCollection(); });
window.addEventListener('resize', () => {
  if (moment === 'm1') layoutSelection();
  else if (moment === 'm2' || moment === 'm3') {
    setPackScale(pack.group, focusedPackScale());
    pack.group.position.y = focusedPackY();
  } else if (moment === 'm4') setPackScale(pack.group, focusedPackScale());
  else if (moment === 'm6') cardRoot.scale.setScalar(revealCardScale());
});

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
