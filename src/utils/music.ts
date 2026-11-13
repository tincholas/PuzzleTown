// Procedural Calm & Happy Village Background Music Synthesizer
// Zero external audio assets, works 100% offline, soothing kalimba / marimba acoustic aesthetic

import { getAudioContext } from './sound';

const STORAGE_KEY_MUSIC = 'puzzletown_music_enabled';

let musicEnabled: boolean = (() => {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MUSIC);
    return saved !== null ? saved === 'true' : true;
  } catch {
    return true;
  }
})();

export function isMusicEnabled(): boolean {
  return musicEnabled;
}

export function setMusicEnabled(enabled: boolean) {
  musicEnabled = enabled;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_MUSIC, String(enabled));
    } catch {
      // Ignore
    }
  }

  if (enabled) {
    startMusic();
  } else {
    stopMusic();
  }
}

// ---------------------------------------------------------------------------
// Music Composition & Harmonic Progression
// Key: C Major / A Minor Pentatonic & Add9 chords
// ---------------------------------------------------------------------------
const NOTE_FREQS: Record<string, number> = {
  C2: 65.41,
  D2: 73.42,
  E2: 82.41,
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0
};

interface MeasurePattern {
  bass: string;
  notes: { beat: number; note: string; dur: number; vol?: number }[];
}

// 16-measure peaceful, cheerful village cycle (~56 seconds per loop at 68 BPM)
const VILLAGE_MELODY: MeasurePattern[] = [
  // Measure 1: Cmaj7 morning sun
  {
    bass: 'C3',
    notes: [
      { beat: 0.0, note: 'G4', dur: 0.9, vol: 0.8 },
      { beat: 1.0, note: 'B4', dur: 0.8, vol: 0.65 },
      { beat: 2.0, note: 'E5', dur: 1.2, vol: 0.9 },
      { beat: 3.0, note: 'D5', dur: 0.8, vol: 0.7 }
    ]
  },
  // Measure 2: Cmaj7 gentle breeze
  {
    bass: 'C3',
    notes: [
      { beat: 0.5, note: 'C5', dur: 0.9, vol: 0.75 },
      { beat: 1.5, note: 'G4', dur: 0.8, vol: 0.6 },
      { beat: 2.5, note: 'E4', dur: 1.0, vol: 0.7 }
    ]
  },
  // Measure 3: Fmaj7 warm pasture
  {
    bass: 'F2',
    notes: [
      { beat: 0.0, note: 'A4', dur: 0.9, vol: 0.8 },
      { beat: 1.0, note: 'C5', dur: 0.8, vol: 0.7 },
      { beat: 2.0, note: 'E5', dur: 1.3, vol: 0.9 },
      { beat: 3.5, note: 'D5', dur: 0.6, vol: 0.6 }
    ]
  },
  // Measure 4: Fmaj7 blossom
  {
    bass: 'F2',
    notes: [
      { beat: 0.5, note: 'C5', dur: 0.9, vol: 0.7 },
      { beat: 1.5, note: 'A4', dur: 0.8, vol: 0.65 },
      { beat: 2.5, note: 'F4', dur: 1.0, vol: 0.7 }
    ]
  },
  // Measure 5: G6 cheerful path
  {
    bass: 'G2',
    notes: [
      { beat: 0.0, note: 'B4', dur: 0.9, vol: 0.85 },
      { beat: 1.0, note: 'D5', dur: 0.8, vol: 0.7 },
      { beat: 2.0, note: 'G5', dur: 1.2, vol: 0.95 },
      { beat: 3.0, note: 'E5', dur: 0.8, vol: 0.7 }
    ]
  },
  // Measure 6: G6 riverbank
  {
    bass: 'G2',
    notes: [
      { beat: 0.5, note: 'D5', dur: 0.9, vol: 0.75 },
      { beat: 1.5, note: 'B4', dur: 0.8, vol: 0.6 },
      { beat: 2.5, note: 'G4', dur: 1.1, vol: 0.7 }
    ]
  },
  // Measure 7: Am7 cozy hearth
  {
    bass: 'A2',
    notes: [
      { beat: 0.0, note: 'C5', dur: 0.9, vol: 0.8 },
      { beat: 1.0, note: 'E5', dur: 0.8, vol: 0.75 },
      { beat: 2.0, note: 'A5', dur: 1.4, vol: 0.9 },
      { beat: 3.5, note: 'G5', dur: 0.6, vol: 0.65 }
    ]
  },
  // Measure 8: Am7 resting
  {
    bass: 'A2',
    notes: [
      { beat: 0.5, note: 'E5', dur: 0.9, vol: 0.7 },
      { beat: 1.5, note: 'C5', dur: 0.8, vol: 0.65 },
      { beat: 2.5, note: 'A4', dur: 1.1, vol: 0.75 }
    ]
  },
  // Measure 9: Dm9 quiet steps
  {
    bass: 'D3',
    notes: [
      { beat: 0.0, note: 'F4', dur: 0.8, vol: 0.75 },
      { beat: 1.0, note: 'A4', dur: 0.8, vol: 0.7 },
      { beat: 2.0, note: 'E5', dur: 1.1, vol: 0.85 },
      { beat: 3.0, note: 'D5', dur: 0.8, vol: 0.7 }
    ]
  },
  // Measure 10: Dm9 timber frame
  {
    bass: 'D3',
    notes: [
      { beat: 0.5, note: 'C5', dur: 0.9, vol: 0.7 },
      { beat: 1.5, note: 'A4', dur: 0.8, vol: 0.6 },
      { beat: 2.5, note: 'F4', dur: 1.0, vol: 0.65 }
    ]
  },
  // Measure 11: Em7 sunny garden
  {
    bass: 'E2',
    notes: [
      { beat: 0.0, note: 'G4', dur: 0.9, vol: 0.8 },
      { beat: 1.0, note: 'B4', dur: 0.8, vol: 0.7 },
      { beat: 2.0, note: 'D5', dur: 1.2, vol: 0.85 },
      { beat: 3.5, note: 'B4', dur: 0.6, vol: 0.6 }
    ]
  },
  // Measure 12: Em7 flowers
  {
    bass: 'E2',
    notes: [
      { beat: 0.5, note: 'G4', dur: 0.9, vol: 0.7 },
      { beat: 1.5, note: 'E4', dur: 0.8, vol: 0.6 },
      { beat: 2.5, note: 'B3', dur: 1.0, vol: 0.65 }
    ]
  },
  // Measure 13: Fmaj7 sweet meadow
  {
    bass: 'F2',
    notes: [
      { beat: 0.0, note: 'A4', dur: 0.9, vol: 0.8 },
      { beat: 1.0, note: 'C5', dur: 0.8, vol: 0.75 },
      { beat: 2.0, note: 'E5', dur: 1.2, vol: 0.9 },
      { beat: 3.0, note: 'G5', dur: 0.8, vol: 0.7 }
    ]
  },
  // Measure 14: Fmaj7 peaceful evening
  {
    bass: 'F2',
    notes: [
      { beat: 0.5, note: 'E5', dur: 0.9, vol: 0.7 },
      { beat: 1.5, note: 'C5', dur: 0.8, vol: 0.65 },
      { beat: 2.5, note: 'A4', dur: 1.0, vol: 0.7 }
    ]
  },
  // Measure 15: G7sus hopeful twilight
  {
    bass: 'G2',
    notes: [
      { beat: 0.0, note: 'D5', dur: 0.9, vol: 0.85 },
      { beat: 1.0, note: 'C5', dur: 0.8, vol: 0.75 },
      { beat: 2.0, note: 'B4', dur: 1.1, vol: 0.8 },
      { beat: 3.0, note: 'A4', dur: 0.7, vol: 0.7 }
    ]
  },
  // Measure 16: Resolution back home
  {
    bass: 'G2',
    notes: [
      { beat: 0.5, note: 'G4', dur: 1.0, vol: 0.8 },
      { beat: 2.0, note: 'D4', dur: 0.9, vol: 0.7 },
      { beat: 3.0, note: 'C4', dur: 1.2, vol: 0.85 }
    ]
  }
];

const BPM = 68;
const BEAT_DURATION = 60 / BPM; // ~0.882 seconds per beat
const MEASURE_DURATION = BEAT_DURATION * 4; // ~3.529 seconds per measure

let isPlaying = false;
let masterMusicGain: GainNode | null = null;
let musicFilter: BiquadFilterNode | null = null;
let schedulerTimer: number | null = null;
let currentMeasure = 0;
let nextMeasureTime = 0;

/**
 * Synthesizes a gentle, acoustic kalimba/marimba plink.
 */
function scheduleKalimbaNote(
  ctx: AudioContext,
  noteName: string,
  time: number,
  duration: number,
  relVol = 0.8
) {
  const freq = NOTE_FREQS[noteName];
  if (!freq || !masterMusicGain) return;

  // 1. Fundamental warm triangle wave
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, time);

  // 2. Soft sine overtone (octave) for bell-like music-box tine
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, time);

  const peakVol = 0.16 * relVol;
  gain1.gain.setValueAtTime(0.0001, time);
  gain1.gain.linearRampToValueAtTime(peakVol, time + 0.006);
  gain1.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  gain2.gain.setValueAtTime(0.0001, time);
  gain2.gain.linearRampToValueAtTime(peakVol * 0.22, time + 0.004);
  gain2.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.5);

  osc1.connect(gain1);
  osc2.connect(gain2);

  gain1.connect(musicFilter || masterMusicGain);
  gain2.connect(musicFilter || masterMusicGain);

  osc1.start(time);
  osc2.start(time);
  osc1.stop(time + duration);
  osc2.stop(time + duration);
}

/**
 * Schedules a warm acoustic bass note anchoring the measure.
 */
function scheduleBassNote(
  ctx: AudioContext,
  noteName: string,
  time: number,
  duration: number
) {
  const freq = NOTE_FREQS[noteName];
  if (!freq || !masterMusicGain) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, time);

  const peakVol = 0.18;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(peakVol, time + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  osc.connect(gain);
  gain.connect(musicFilter || masterMusicGain);

  osc.start(time);
  osc.stop(time + duration);
}

/**
 * Lookahead scheduler running every 200ms to schedule upcoming notes smoothly.
 */
function scheduleUpcomingMusic() {
  const ctx = getAudioContext();
  if (!ctx || !isPlaying) return;

  const lookahead = 0.5; // Schedule 500ms into the future
  while (nextMeasureTime < ctx.currentTime + lookahead) {
    const pattern = VILLAGE_MELODY[currentMeasure % VILLAGE_MELODY.length];

    // Schedule measure bass
    if (pattern.bass) {
      scheduleBassNote(ctx, pattern.bass, nextMeasureTime, MEASURE_DURATION * 0.9);
    }

    // Schedule kalimba melody notes
    pattern.notes.forEach((item) => {
      const noteTime = nextMeasureTime + item.beat * BEAT_DURATION;
      if (noteTime >= ctx.currentTime - 0.05) {
        scheduleKalimbaNote(
          ctx,
          item.note,
          noteTime,
          item.dur * BEAT_DURATION,
          item.vol ?? 0.8
        );
      }
    });

    nextMeasureTime += MEASURE_DURATION;
    currentMeasure++;
  }
}

/**
 * Starts the calm village background music (fades in gently).
 */
export function startMusic() {
  if (!musicEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (isPlaying) return;
  isPlaying = true;

  if (!masterMusicGain) {
    masterMusicGain = ctx.createGain();
    // Warm low-pass filter to keep acoustic tone soft and gentle
    musicFilter = ctx.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.setValueAtTime(1400, ctx.currentTime);

    musicFilter.connect(masterMusicGain);
    masterMusicGain.connect(ctx.destination);
  }

  // Fade in gently over 1.2s to 0.085 master volume
  const now = ctx.currentTime;
  masterMusicGain.gain.cancelScheduledValues(now);
  masterMusicGain.gain.setValueAtTime(0.0001, now);
  masterMusicGain.gain.linearRampToValueAtTime(0.085, now + 1.2);

  currentMeasure = 0;
  nextMeasureTime = now + 0.1;

  if (schedulerTimer === null) {
    schedulerTimer = window.setInterval(scheduleUpcomingMusic, 200);
  }
}

/**
 * Stops the background music with a gentle fade out.
 */
export function stopMusic() {
  if (!isPlaying) return;
  isPlaying = false;

  if (schedulerTimer !== null) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  const ctx = getAudioContext();
  if (ctx && masterMusicGain) {
    const now = ctx.currentTime;
    masterMusicGain.gain.cancelScheduledValues(now);
    masterMusicGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
  }
}

// ---------------------------------------------------------------------------
// Browser Autoplay & Visibility Change Lifecycle Hooks
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  // 1. Resume audio context & music on first user touch/click (browser policy compliance)
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        if (musicEnabled && !isPlaying) {
          startMusic();
        }
      });
    } else if (musicEnabled && !isPlaying) {
      startMusic();
    }
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };

  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });

  // 2. Pause music when tab/app is minimized or in background, resume when active
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (isPlaying && masterMusicGain && getAudioContext()) {
        const ctx = getAudioContext()!;
        masterMusicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
      }
    } else {
      if (musicEnabled && isPlaying && masterMusicGain && getAudioContext()) {
        const ctx = getAudioContext()!;
        masterMusicGain.gain.setTargetAtTime(0.085, ctx.currentTime, 0.3);
      } else if (musicEnabled && !isPlaying) {
        startMusic();
      }
    }
  });
}
