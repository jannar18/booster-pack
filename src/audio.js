const MUTE_STORAGE_KEY = 'lumen.sound-muted.v1';

export function createAudioController({ onMuteChange } = {}) {
  let muted = false;
  try { muted = localStorage.getItem(MUTE_STORAGE_KEY) === 'true'; }
  catch { muted = false; }

  let context = null;
  let master = null;
  let noiseBuffer = null;
  let cutVoice = null;
  let cutRequested = false;
  let cutRequestedProgress = 0;

  function initialize() {
    if (context) return context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 14;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;
    master = context.createGain();
    master.gain.value = 0.72;
    master.connect(compressor);
    compressor.connect(context.destination);
    return context;
  }

  async function unlock() {
    if (muted) return false;
    const ctx = initialize();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); }
      catch { return false; }
    }
    return ctx.state === 'running';
  }

  function whenReady(effect) {
    if (muted) return;
    void unlock().then((ready) => {
      if (ready && !muted) effect(context);
    });
  }

  function tone({
    frequency,
    endFrequency = frequency,
    duration = 0.2,
    gain = 0.035,
    type = 'sine',
    delay = 0,
    attack = 0.012,
  }) {
    if (!context || !master) return;
    const start = context.currentTime + delay;
    const stop = start + duration;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, frequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), stop);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, stop);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(stop + 0.02);
  }

  function getNoiseBuffer() {
    if (noiseBuffer || !context) return noiseBuffer;
    const length = context.sampleRate;
    noiseBuffer = context.createBuffer(1, length, context.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.72 + white * 0.28;
      samples[index] = previous;
    }
    return noiseBuffer;
  }

  function noise({
    duration = 0.2,
    gain = 0.025,
    frequency = 1500,
    endFrequency = frequency,
    type = 'bandpass',
    q = 0.8,
    delay = 0,
  }) {
    if (!context || !master) return;
    const start = context.currentTime + delay;
    const stop = start + duration;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = getNoiseBuffer();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(frequency, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), stop);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.018, duration * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, stop);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    source.start(start);
    source.stop(stop + 0.02);
  }

  function stopCutVoice(fade = 0.045) {
    if (!cutVoice || !context) return;
    const voice = cutVoice;
    cutVoice = null;
    const now = context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0.0001, now, Math.max(0.006, fade / 3));
    try { voice.noise.stop(now + fade + 0.03); }
    catch { /* The source may already have ended. */ }
    try { voice.tone.stop(now + fade + 0.03); }
    catch { /* The oscillator may already have ended. */ }
  }

  function startCutVoice() {
    if (!context || !master || cutVoice || !cutRequested || muted) return;
    const now = context.currentTime;
    const noiseSource = context.createBufferSource();
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    noiseSource.buffer = getNoiseBuffer();
    noiseSource.loop = true;
    oscillator.type = 'sine';
    oscillator.frequency.value = 720;
    filter.type = 'bandpass';
    filter.Q.value = 1.8;
    filter.frequency.value = 1250;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.018, now + 0.035);
    noiseSource.connect(filter);
    oscillator.connect(gain);
    filter.connect(gain);
    gain.connect(master);
    noiseSource.start(now);
    oscillator.start(now);
    cutVoice = { noise: noiseSource, tone: oscillator, filter, gain };
    updateCut(cutRequestedProgress);
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    try { localStorage.setItem(MUTE_STORAGE_KEY, String(muted)); }
    catch { /* Storage may be unavailable in private contexts. */ }
    if (muted) {
      cutRequested = false;
      stopCutVoice(0.025);
      if (master && context) master.gain.setTargetAtTime(0.0001, context.currentTime, 0.01);
    } else {
      const ctx = initialize();
      if (ctx && master) master.gain.setTargetAtTime(0.72, ctx.currentTime, 0.012);
      void unlock();
    }
    onMuteChange?.(muted);
    return muted;
  }

  function beginCut() {
    if (muted) return;
    cutRequested = true;
    cutRequestedProgress = 0;
    whenReady(() => startCutVoice());
  }

  function updateCut(progress) {
    cutRequestedProgress = Math.max(0, Math.min(1, progress));
    if (!cutVoice || !context) return;
    const now = context.currentTime;
    cutVoice.filter.frequency.setTargetAtTime(1050 + cutRequestedProgress * 2100, now, 0.025);
    cutVoice.tone.frequency.setTargetAtTime(640 + cutRequestedProgress * 560, now, 0.025);
    cutVoice.gain.gain.setTargetAtTime(0.014 + cutRequestedProgress * 0.018, now, 0.02);
  }

  function endCut(completed = false) {
    cutRequested = false;
    stopCutVoice(completed ? 0.06 : 0.035);
    if (!completed) return;
    whenReady(() => {
      noise({ duration: 0.11, gain: 0.046, frequency: 2400, endFrequency: 4200, q: 2.4 });
      tone({ frequency: 980, endFrequency: 1480, duration: 0.14, gain: 0.028, type: 'triangle' });
    });
  }

  const controller = {
    unlock,
    isMuted: () => muted,
    toggleMuted: () => setMuted(!muted),
    setMuted,
    beginCut,
    updateCut,
    endCut,
    selectPack() {
      whenReady(() => {
        noise({ duration: 0.18, gain: 0.018, frequency: 850, endFrequency: 1900 });
        tone({ frequency: 230, endFrequency: 360, duration: 0.2, gain: 0.022, type: 'sine' });
      });
    },
    carouselStep() {
      whenReady(() => tone({ frequency: 310, endFrequency: 390, duration: 0.075, gain: 0.012, type: 'triangle' }));
    },
    releaseSeal() {
      whenReady(() => {
        noise({ duration: 0.26, gain: 0.048, frequency: 3400, endFrequency: 780, q: 1.4 });
        tone({ frequency: 680, endFrequency: 180, duration: 0.28, gain: 0.024, type: 'triangle' });
      });
    },
    openFoil() {
      whenReady(() => {
        noise({ duration: 0.48, gain: 0.034, frequency: 2100, endFrequency: 620, q: 0.7 });
        noise({ duration: 0.2, gain: 0.016, frequency: 4200, endFrequency: 1700, delay: 0.16, q: 2.1 });
      });
    },
    raiseCards() {
      whenReady(() => {
        tone({ frequency: 190, endFrequency: 440, duration: 0.64, gain: 0.025, type: 'sine' });
        tone({ frequency: 285, endFrequency: 660, duration: 0.58, gain: 0.014, type: 'triangle', delay: 0.08 });
      });
    },
    revealCard(rarity = 'c', index = 0) {
      whenReady(() => {
        const base = 420 + index * 28;
        const notes = rarity === 'x' ? [1, 1.26, 1.5, 2] : rarity === 'r' ? [1, 1.25, 1.5] : rarity === 'u' ? [1, 1.25] : [1];
        notes.forEach((ratio, noteIndex) => tone({
          frequency: base * ratio,
          endFrequency: base * ratio * 1.04,
          duration: rarity === 'x' ? 0.48 : 0.24,
          gain: (rarity === 'x' ? 0.025 : 0.02) / Math.sqrt(notes.length),
          type: noteIndex % 2 ? 'triangle' : 'sine',
          delay: noteIndex * 0.045,
        }));
        noise({ duration: 0.12, gain: rarity === 'x' ? 0.026 : 0.012, frequency: 3200, endFrequency: 5400 });
      });
    },
    completePack() {
      whenReady(() => {
        [392, 494, 587, 784].forEach((frequency, index) => tone({
          frequency,
          endFrequency: frequency * 1.01,
          duration: 0.42,
          gain: 0.018,
          delay: index * 0.065,
        }));
      });
    },
    restartPack() {
      whenReady(() => noise({ duration: 0.22, gain: 0.018, frequency: 650, endFrequency: 1450 }));
    },
    openCollection() {
      whenReady(() => tone({ frequency: 280, endFrequency: 440, duration: 0.18, gain: 0.016, type: 'triangle' }));
    },
    closeCollection() {
      whenReady(() => tone({ frequency: 440, endFrequency: 260, duration: 0.15, gain: 0.014, type: 'triangle' }));
    },
    suspend() {
      cutRequested = false;
      stopCutVoice(0.02);
      if (context?.state === 'running') void context.suspend();
    },
    state: () => ({
      muted,
      available: Boolean(window.AudioContext || window.webkitAudioContext),
      contextState: context?.state || 'uninitialized',
      cutting: Boolean(cutVoice),
    }),
  };

  onMuteChange?.(muted);
  return controller;
}
