// Pure Web Audio API procedural sound synthesizer for camera actions.
// 0 external assets, 0 network requests, instantaneous and responsive.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined" || !this.soundEnabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Focal-plane mechanical shutter (Leica / SLR style click-clack)
  playShutter() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // First curtain release (crisp metallic transient)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(320, t);
    osc1.frequency.exponentialRampToValueAtTime(80, t + 0.04);
    gain1.gain.setValueAtTime(0.3, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.05);

    // Mechanical snap noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.06);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(3, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(t);

    // Second curtain closure (delayed 65ms)
    const t2 = t + 0.065;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(220, t2);
    osc2.frequency.exponentialRampToValueAtTime(50, t2 + 0.05);
    gain2.gain.setValueAtTime(0.35, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.05);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.06);
  }

  // Film advance motorized / lever winding sound
  playFilmAdvance() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const duration = 0.18;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const ratchet = Math.sin((i / ctx.sampleRate) * 120 * Math.PI * 2) > 0 ? 1 : -0.5;
      output[i] = (Math.random() * 2 - 1) * ratchet;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2400, t);
    filter.Q.setValueAtTime(2, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);
  }

  // Beep for timer countdown
  playTimerBeep(isFinal = false) {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(isFinal ? 1760 : 880, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isFinal ? 0.12 : 0.06));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + (isFinal ? 0.13 : 0.07));
  }

  // Dual-tone high-pitch chirp for AF confirmation (Canon / Sony / Nikon bip-bip)
  playAutofocusLock() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1046.5, t); // C6
    gain1.gain.setValueAtTime(0.18, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.065);

    const t2 = t + 0.07;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(2093.0, t2); // C7
    gain2.gain.setValueAtTime(0.22, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.075);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.085);
  }

  // Tactile micro-click for dial rotation and parameter notches
  playDialTick() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.015);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.02);
  }

  // Soft high-tech acoustic lock when horizon aligns at exactly 0.0°
  playLevelLock() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1318.5, t); // E6
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  // Hasselblad 500C/M Medium Format Mirror Slap & Leaf Shutter
  playHasselbladShutter() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // Heavy mirror box resonance (low-frequency thud)
    const oscMirror = ctx.createOscillator();
    const gainMirror = ctx.createGain();
    oscMirror.type = "sine";
    oscMirror.frequency.setValueAtTime(140, t);
    oscMirror.frequency.exponentialRampToValueAtTime(35, t + 0.08);
    gainMirror.gain.setValueAtTime(0.45, t);
    gainMirror.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    oscMirror.connect(gainMirror);
    gainMirror.connect(ctx.destination);
    oscMirror.start(t);
    oscMirror.stop(t + 0.1);

    // Leaf shutter blades transient
    const tLeaf = t + 0.025;
    const oscLeaf = ctx.createOscillator();
    const gainLeaf = ctx.createGain();
    oscLeaf.type = "triangle";
    oscLeaf.frequency.setValueAtTime(850, tLeaf);
    oscLeaf.frequency.exponentialRampToValueAtTime(120, tLeaf + 0.05);
    gainLeaf.gain.setValueAtTime(0.35, tLeaf);
    gainLeaf.gain.exponentialRampToValueAtTime(0.001, tLeaf + 0.06);
    oscLeaf.connect(gainLeaf);
    gainLeaf.connect(ctx.destination);
    oscLeaf.start(tLeaf);
    oscLeaf.stop(tLeaf + 0.07);
  }

  // Polaroid 600 Electric Motor Ejection & Whir
  playPolaroidEject() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const duration = 0.35;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const gear = Math.sin((i / ctx.sampleRate) * 220 * Math.PI * 2);
      output[i] = (Math.random() * 2 - 1) * 0.4 + gear * 0.6;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.linearRampToValueAtTime(800, t + duration);
    filter.Q.setValueAtTime(3.5, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);
  }

  // Leica M3 Silky Brass Lever Advance
  playLeicaWinding() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const duration = 0.22;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const teeth = Math.sin((i / ctx.sampleRate) * 160 * Math.PI * 2) > 0.2 ? 0.8 : -0.2;
      output[i] = (Math.random() * 2 - 1) * teeth;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(3200, t);
    filter.Q.setValueAtTime(4, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);
  }
}

export const soundEngine = new SoundEngine();

export const playDialTick = () => soundEngine.playDialTick();
export const playLevelLock = () => soundEngine.playLevelLock();
export const playHasselbladShutter = () => soundEngine.playHasselbladShutter();
export const playPolaroidEject = () => soundEngine.playPolaroidEject();
export const playLeicaWinding = () => soundEngine.playLeicaWinding();
