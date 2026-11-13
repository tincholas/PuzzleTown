// Procedural Web Audio API sound synthesizer for tactile cozy feedback
// Works offline, requires 0 external audio assets, and has 0ms latency.

const STORAGE_KEY_SFX = 'puzzletown_sfx_enabled';

let audioCtx: AudioContext | null = null;
let soundEnabled: boolean = (() => {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SFX);
    return saved !== null ? saved === 'true' : true;
  } catch {
    return true;
  }
})();

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isSfxEnabled(): boolean {
  return soundEnabled;
}

export function setSfxEnabled(enabled: boolean) {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_SFX, String(enabled));
    } catch {
      // Ignore
    }
  }
}

export function isSoundMuted(): boolean {
  return !soundEnabled;
}

export function toggleSound(): boolean {
  setSfxEnabled(!soundEnabled);
  return soundEnabled;
}

function playHammerStrike(
  ctx: AudioContext,
  time: number,
  freqMetallic: number,
  gainMetallic: number,
  freqWood: number,
  gainWood: number
) {
  // 1. Crisp metallic nail impact ping
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freqMetallic, time);
  osc1.frequency.exponentialRampToValueAtTime(freqMetallic * 0.55, time + 0.035);

  gain1.gain.setValueAtTime(gainMetallic, time);
  gain1.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(time);
  osc1.stop(time + 0.04);

  // 2. Solid wooden beam thump
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freqWood, time);
  osc2.frequency.exponentialRampToValueAtTime(freqWood * 0.45, time + 0.065);

  gain2.gain.setValueAtTime(gainWood, time);
  gain2.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(time);
  osc2.stop(time + 0.07);
}

/**
 * Satisfying carpentry construction sound:
 * 3 distinct, rhythmic hammer taps driving nails into timber.
 */
export function playPlaceBuildingSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 3 rhythmic hammer strikes: Tap... Tap... THUNK!
  // Tap 1 (t=0.00s): Initial foundation nail
  playHammerStrike(ctx, now, 1260, 0.15, 250, 0.22);

  // Tap 2 (t=0.24s): Mid framing nail
  playHammerStrike(ctx, now + 0.24, 1400, 0.16, 280, 0.20);

  // Tap 3 (t=0.50s): Final decisive blow locking roof & structure in place
  playHammerStrike(ctx, now + 0.50, 1100, 0.19, 210, 0.28);
}

/** Crisp light tap for roads */
export function playPlaceRoadSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.06);
}

/** Tactile wooden click when selecting another item/tool from the tray */
export function playSelectToolSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Primary warm wooden body tap
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(540, now);
  osc1.frequency.exponentialRampToValueAtTime(260, now + 0.04);

  gain1.gain.setValueAtTime(0.15, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.045);

  // Subtle bright transient click for tactile snap
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(980, now);
  osc2.frequency.exponentialRampToValueAtTime(420, now + 0.02);

  gain2.gain.setValueAtTime(0.08, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc2.start(now);
  osc2.stop(now + 0.025);
}

/** Soft crisp rustle when marking empty grass */
export function playMarkEmptySound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(580, now);
  osc.frequency.exponentialRampToValueAtTime(380, now + 0.045);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
}

/** Playful pop sound with ascending pitch when remaining empty tiles pop in at level completion */
export function playEmptyPopCascadeSound(index: number, total: number) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const progress = total > 1 ? index / (total - 1) : 0.5;
  const baseFreq = 480 + progress * 280; // 480Hz rising smoothly to 760Hz
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, now + 0.05);

  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.06);
}

/** Cascading melodic ripple when tapping a border clue to fill row/column */
export function playLineClueRippleSound(stepCount = 5) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [392, 440, 523.25, 587.33, 659.25, 783.99]; // G4, A4, C5, D5, E5, G5

  for (let i = 0; i < stepCount; i++) {
    const t = now + i * 0.045;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const note = notes[i % notes.length];
    osc.type = 'sine';
    osc.frequency.setValueAtTime(note, t);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }
}

/** Pleasant chime when clue reaches 0 (satisfied) */
export function playClueSatisfiedSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, now); // C5
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(659.25, now); // E5

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.22);
  osc2.stop(now + 0.22);
}

/** Gentle error thud when tapping invalid spot */
export function playErrorSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.13);
}

/** Triumphant, warm celebratory village fanfare */
export function playVictorySound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Major arpeggio with celebratory bell shimmer: C4, E4, G4, C5, E5, G5
  const chords = [
    { freq: 261.63, delay: 0.0, dur: 0.35 },
    { freq: 329.63, delay: 0.08, dur: 0.35 },
    { freq: 392.0, delay: 0.16, dur: 0.4 },
    { freq: 523.25, delay: 0.24, dur: 0.6 },
    { freq: 659.25, delay: 0.32, dur: 0.65 },
    { freq: 783.99, delay: 0.4, dur: 0.85 }
  ];

  chords.forEach(({ freq, delay, dur }) => {
    const t = now + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
  });
}
