// Shared utilities: deterministic clock, tweens, easings, seeded RNG, canvas helpers.

// ---- Seeded RNG (mulberry32) ----
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export let rng = mulberry32(Date.now() & 0xffffffff);
export function seedRng(seed) { rng = mulberry32(seed); }

// ---- Clock (freezable for deterministic screenshots) ----
export const clock = {
  t: 0,
  dt: 0,
  frozen: false,
  _last: null,
  tick(now) {
    if (this._last === null) this._last = now;
    const dt = Math.min((now - this._last) / 1000, 1 / 20);
    this._last = now;
    if (!this.frozen) { this.dt = dt; this.t += dt; }
    else this.dt = 0;
    return this.dt;
  },
  freeze() { this.frozen = true; },
  unfreeze() { this.frozen = false; },
  // Advance manually while frozen (used by test hooks to settle animations).
  step(dt) { this.t += dt; this.dt = dt; },
};

// ---- Easings ----
export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  outBack: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  outBackSoft: (t) => { const c = 0.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  inBack: (t) => { const c = 1.70158; return (c + 1) * t * t * t - c * t * t; },
  outElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
  },
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};

// ---- Tween system driven by the global clock ----
const activeTweens = new Set();

export function tween({ from = 0, to = 1, duration = 1, easing = ease.inOutCubic, delay = 0, onUpdate, onComplete }) {
  const tw = {
    start: clock.t + delay, duration, from, to, easing, onUpdate, onComplete,
    done: false, cancelled: false,
    promise: null, _resolve: null,
    cancel() { this.cancelled = true; activeTweens.delete(this); this._resolve?.(); },
  };
  tw.promise = new Promise((res) => { tw._resolve = res; });
  activeTweens.add(tw);
  return tw;
}

export function updateTweens() {
  for (const tw of [...activeTweens]) {
    if (tw.cancelled) continue;
    const t = (clock.t - tw.start) / tw.duration;
    if (t < 0) continue;
    const k = Math.min(t, 1);
    const v = tw.from + (tw.to - tw.from) * tw.easing(k);
    tw.onUpdate?.(v, k);
    if (k >= 1) {
      tw.done = true;
      activeTweens.delete(tw);
      tw.onComplete?.();
      tw._resolve();
    }
  }
}

export function cancelAllTweens() {
  for (const tw of [...activeTweens]) tw.cancel();
}

export const delay = (s) => tween({ duration: s, onUpdate: () => {} }).promise;

// Settle everything instantly (used by test hooks): fast-forward the clock.
export function settleTweens(maxSeconds = 30) {
  const step = 1 / 60;
  let n = Math.ceil(maxSeconds / step);
  while (activeTweens.size > 0 && n-- > 0) {
    clock.step(step);
    updateTweens();
  }
}

// ---- Canvas helpers ----
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
