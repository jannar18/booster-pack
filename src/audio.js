const MUTE_STORAGE_KEY = 'lumen.sound-muted.v1';
const AUDIO_ROOT = `${import.meta.env.BASE_URL}audio/`;

const SAMPLE_FILES = {
  packTouch: 'pack-touch.mp3',
  grain1: 'foil-grain-1.mp3',
  grain2: 'foil-grain-2.mp3',
  grain3: 'foil-grain-3.mp3',
  grain4: 'foil-grain-4.mp3',
  sealRelease: 'seal-release.mp3',
  foilPeel: 'foil-peel.mp3',
  cardsRise: 'cards-rise.mp3',
  cardContact1: 'card-contact-1.mp3',
  cardContact2: 'card-contact-2.mp3',
  auroraChime: 'aurora-chime.mp3',
  selectionAmbience: 'selection-ambience.mp3',
};

const CUT_GRAINS = ['grain1', 'grain2', 'grain3', 'grain4'];
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export function createAudioController({ onMuteChange } = {}) {
  let muted = false;
  try { muted = localStorage.getItem(MUTE_STORAGE_KEY) === 'true'; }
  catch { muted = false; }

  let context = null;
  let master = null;
  let materialBus = null;
  let magicBus = null;
  let loadPromise = null;
  let cutRequested = false;
  let cutProgress = 0;
  let cutSampleTime = 0;
  let nextGrainTime = 0;
  let grainIndex = 0;
  let carouselCueIndex = 0;
  let selectionRequested = false;
  let selectionVoice = null;
  const buffers = new Map();
  const activeSources = new Set();

  function initialize() {
    if (context) return context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -22;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.22;

    master = context.createGain();
    materialBus = context.createGain();
    magicBus = context.createGain();
    master.gain.value = 0.78;
    materialBus.gain.value = 0.92;
    magicBus.gain.value = 0.42;
    materialBus.connect(master);
    magicBus.connect(master);
    master.connect(compressor);
    compressor.connect(context.destination);
    return context;
  }

  async function loadSamples() {
    if (loadPromise) return loadPromise;
    const ctx = initialize();
    if (!ctx) return false;
    loadPromise = Promise.all(Object.entries(SAMPLE_FILES).map(async ([name, file]) => {
      try {
        const response = await fetch(`${AUDIO_ROOT}${file}`);
        if (!response.ok) throw new Error(`Audio request failed: ${response.status}`);
        const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
        buffers.set(name, buffer);
      } catch (error) {
        console.warn(`[audio] Could not load ${file}`, error);
      }
    })).then(() => buffers.size > 0);
    return loadPromise;
  }

  async function unlock() {
    if (muted) return false;
    const ctx = initialize();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); }
      catch { return false; }
    }
    void loadSamples().then(() => startSelectionAmbience());
    return ctx.state === 'running';
  }

  function whenReady(effect) {
    if (muted) return;
    void unlock().then(async (ready) => {
      if (!ready) return;
      await loadSamples();
      if (!muted) effect();
    });
  }

  function playSample(name, {
    gain = 0.3,
    rate = 1,
    pan = 0,
    delay = 0,
    duration,
    bus = 'material',
  } = {}) {
    if (!context || muted) return null;
    const buffer = buffers.get(name);
    if (!buffer) return null;

    const source = context.createBufferSource();
    const envelope = context.createGain();
    const destination = bus === 'magic' ? magicBus : materialBus;
    const start = context.currentTime + Math.max(0, delay);
    source.buffer = buffer;
    source.playbackRate.value = clamp(rate, 0.5, 1.8);
    envelope.gain.value = Math.max(0.0001, gain);
    source.connect(envelope);

    if (context.createStereoPanner) {
      const panner = context.createStereoPanner();
      panner.pan.value = clamp(pan, -1, 1);
      envelope.connect(panner);
      panner.connect(destination);
    } else {
      envelope.connect(destination);
    }

    source.addEventListener('ended', () => activeSources.delete(source), { once: true });
    activeSources.add(source);
    source.start(start);
    if (duration) source.stop(start + Math.min(duration, buffer.duration / source.playbackRate.value));
    return source;
  }

  function startSelectionAmbience() {
    if (!context || muted || !selectionRequested || selectionVoice) return;
    const buffer = buffers.get('selectionAmbience');
    if (!buffer) return;
    const source = context.createBufferSource();
    const envelope = context.createGain();
    const now = context.currentTime;
    source.buffer = buffer;
    source.loop = true;
    source.loopEnd = buffer.duration;
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(0.46, now + 1.1);
    source.connect(envelope);
    envelope.connect(magicBus);
    source.addEventListener('ended', () => {
      activeSources.delete(source);
      if (selectionVoice?.source === source) selectionVoice = null;
    }, { once: true });
    activeSources.add(source);
    selectionVoice = { source, envelope };
    source.start(now);
  }

  function stopSelectionAmbience(fade = 0.38) {
    if (!selectionVoice || !context) return;
    const voice = selectionVoice;
    selectionVoice = null;
    const now = context.currentTime;
    voice.envelope.gain.cancelScheduledValues(now);
    voice.envelope.gain.setValueAtTime(Math.max(0.0001, voice.envelope.gain.value), now);
    voice.envelope.gain.exponentialRampToValueAtTime(0.0001, now + fade);
    try { voice.source.stop(now + fade + 0.03); }
    catch { /* The source may already have ended. */ }
  }

  function enterSelection() {
    selectionRequested = true;
    if (!muted && context?.state === 'running') void loadSamples().then(() => startSelectionAmbience());
  }

  function leaveSelection() {
    selectionRequested = false;
    stopSelectionAmbience();
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    try { localStorage.setItem(MUTE_STORAGE_KEY, String(muted)); }
    catch { /* Storage may be unavailable in private contexts. */ }
    if (muted) {
      cutRequested = false;
      stopSelectionAmbience(0.025);
      activeSources.forEach((source) => {
        try { source.stop(); }
        catch { /* The source may already have ended. */ }
      });
      activeSources.clear();
      if (master && context) master.gain.setTargetAtTime(0.0001, context.currentTime, 0.01);
    } else {
      const ctx = initialize();
      if (ctx && master) master.gain.setTargetAtTime(0.78, ctx.currentTime, 0.012);
      void unlock();
    }
    onMuteChange?.(muted);
    return muted;
  }

  function beginCut() {
    if (muted) return;
    cutRequested = true;
    cutProgress = 0;
    cutSampleTime = performance.now();
    nextGrainTime = cutSampleTime;
    void unlock();
  }

  function updateCut(progress) {
    const nextProgress = clamp(progress, 0, 1);
    const now = performance.now();
    const elapsed = Math.max(8, now - cutSampleTime);
    const distance = Math.abs(nextProgress - cutProgress);
    const velocity = distance / (elapsed / 1000);
    cutProgress = nextProgress;
    cutSampleTime = now;

    // A small dead zone prevents a sound on pointer-down, and requiring fresh
    // travel keeps the foil silent whenever the hand stops moving.
    if (!cutRequested || muted || nextProgress < 0.045 || distance < 0.004 || now < nextGrainTime) return;

    const speed = clamp(velocity / 2.8, 0, 1);
    const grain = CUT_GRAINS[grainIndex % CUT_GRAINS.length];
    grainIndex += 1;
    playSample(grain, {
      gain: 0.2 + speed * 0.22,
      rate: 0.88 + speed * 0.22 + ((grainIndex % 3) - 1) * 0.025,
      pan: -0.82 + nextProgress * 1.64,
      duration: 0.12 + speed * 0.045,
    });
    nextGrainTime = now + (88 - speed * 53);
  }

  function endCut() {
    cutRequested = false;
  }

  const controller = {
    unlock,
    isMuted: () => muted,
    toggleMuted: () => setMuted(!muted),
    setMuted,
    beginCut,
    updateCut,
    endCut,
    enterSelection,
    leaveSelection,
    selectPack() {
      leaveSelection();
      whenReady(() => playSample('packTouch', { gain: 0.55, rate: 0.92 }));
    },
    carouselStep() {
      whenReady(() => {
        const foil = CUT_GRAINS[carouselCueIndex % CUT_GRAINS.length];
        const pan = carouselCueIndex % 2 ? 0.24 : -0.24;
        carouselCueIndex += 1;
        playSample(foil, { gain: 0.3, rate: 1.08 + (carouselCueIndex % 3) * 0.045, pan, duration: 0.15 });
        playSample('auroraChime', { gain: 0.34, rate: 1.34, pan: -pan * 0.45, delay: 0.028, duration: 0.3, bus: 'magic' });
      });
    },
    releaseSeal() {
      whenReady(() => playSample('sealRelease', { gain: 0.68, rate: 1.03 }));
    },
    openFoil() {
      whenReady(() => playSample('foilPeel', { gain: 0.52, rate: 0.96, delay: 0.085 }));
    },
    raiseCards() {
      whenReady(() => playSample('cardsRise', { gain: 0.42, rate: 0.92 }));
    },
    revealCard(rarity = 'c', index = 0) {
      whenReady(() => {
        playSample(index % 2 ? 'cardContact2' : 'cardContact1', {
          gain: index % 2 ? 0.54 : 0.64,
          rate: 0.96 + (index % 3) * 0.025,
        });
        const magicGain = rarity === 'x' ? 0.2 : rarity === 'r' ? 0.13 : rarity === 'u' ? 0.065 : 0;
        if (magicGain) playSample('auroraChime', {
          gain: magicGain,
          rate: rarity === 'x' ? 1.04 : rarity === 'r' ? 0.94 : 1.16,
          delay: 0.055,
          bus: 'magic',
        });
      });
    },
    completePack() {
      whenReady(() => playSample('auroraChime', { gain: 0.16, rate: 0.86, bus: 'magic' }));
    },
    restartPack() {},
    openCollection() {
      whenReady(() => playSample('cardContact1', { gain: 0.18, rate: 1.18 }));
    },
    closeCollection() {
      whenReady(() => playSample('cardContact1', { gain: 0.14, rate: 0.92 }));
    },
    suspend() {
      cutRequested = false;
      stopSelectionAmbience(0.02);
      activeSources.forEach((source) => {
        try { source.stop(); }
        catch { /* The source may already have ended. */ }
      });
      activeSources.clear();
      if (context?.state === 'running') void context.suspend();
    },
    state: () => ({
      muted,
      available: Boolean(window.AudioContext || window.webkitAudioContext),
      contextState: context?.state || 'uninitialized',
      samplesLoaded: buffers.size,
      cutting: cutRequested,
      selectionRequested,
      selectionAmbience: Boolean(selectionVoice),
    }),
  };

  onMuteChange?.(muted);
  return controller;
}
