// ===========================================================================
// PUZZLETOWN — PROCEDURAL MEDIEVAL COUNTRYSIDE BACKGROUND MUSIC ENGINE
// ===========================================================================
// A handcrafted, procedural acoustic ensemble evocative of a sunny afternoon
// in a quaint medieval village. Lilting 6/8 folk meter (94 BPM) in G Major.
//
// Instrumentation:
//  - Plucked Strings (Celtic Harp / Dulcimer) — Main lyrical melodic voice
//  - Wooden Flute (Breathy Recorder / Pipe) — Occasional call-and-response flourishes
//  - Pizzicato Strings — Gentle rhythmic 6/8 arpeggio accompaniment
//  - Warm Acoustic Bass — Root & fifth acoustic bass foundation
//  - Bells & Wooden Chimes — Soft, sparse cadence accents
// ===========================================================================

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
// Pitch Frequency Table (G Major / Folk Modal Scale)
// ---------------------------------------------------------------------------
const NOTE_FREQS: Record<string, number> = {
  // Octave 2 (Bass)
  E2: 82.41,
  F2: 87.31,
  Fs2: 92.5,
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,

  // Octave 3 (Tenor & Bass Fifths)
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  Fs3: 185.0,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,

  // Octave 4 (Melody & Pizzicato Accompaniment)
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  Fs4: 369.99,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,

  // Octave 5 (Harp Highs & Flute)
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  Fs5: 739.99,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,

  // Octave 6 (Bells & Chimes)
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98
};

// ---------------------------------------------------------------------------
// 6/8 Timing Grid (Compound Duple Folk Dance Meter)
// ---------------------------------------------------------------------------
// 94 BPM (dotted-quarter beats per minute)
// 1 measure = 2 dotted-quarter beats = 6 eighth-note steps (steps 0, 1, 2, 3, 4, 5)
// ---------------------------------------------------------------------------
const TEMPO = 94;
const BEAT_DURATION = 60 / TEMPO; // ~0.638s per dotted-quarter beat
const STEP_DURATION = BEAT_DURATION / 3; // ~0.213s per 8th note step
const MEASURE_DURATION = STEP_DURATION * 6; // ~1.277s per 6/8 measure

// ---------------------------------------------------------------------------
// Audio Routing & Bus Effects (Stereo Panning, Lowpass, Acoustic Room Delay)
// ---------------------------------------------------------------------------
let isPlaying = false;
let masterMusicGain: GainNode | null = null;
let masterFilter: BiquadFilterNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedback: GainNode | null = null;
let schedulerTimer: number | null = null;

// Panners for organic stereo separation
let harpPanner: StereoPannerNode | GainNode | null = null;
let flutePanner: StereoPannerNode | GainNode | null = null;
let pizzPanner: StereoPannerNode | GainNode | null = null;
let bellPanner: StereoPannerNode | GainNode | null = null;

// Noise buffer cache for wooden flute breath attacks
let breathNoiseBuffer: AudioBuffer | null = null;
function getBreathNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!breathNoiseBuffer || breathNoiseBuffer.sampleRate !== ctx.sampleRate) {
    const dur = 0.15;
    const size = Math.floor(ctx.sampleRate * dur);
    breathNoiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = breathNoiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return breathNoiseBuffer;
}

function createPanner(ctx: AudioContext, pan: number): StereoPannerNode | GainNode {
  if (ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    return panner;
  }
  return ctx.createGain();
}

function initAudioGraph(ctx: AudioContext) {
  if (masterMusicGain) return;

  // Master Gain Node (fades in to ~0.08)
  masterMusicGain = ctx.createGain();
  masterMusicGain.gain.setValueAtTime(0.0001, ctx.currentTime);

  // Warm Acoustic Master Lowpass Filter (rolls off harsh highs above 2600Hz)
  masterFilter = ctx.createBiquadFilter();
  masterFilter.type = 'lowpass';
  masterFilter.frequency.setValueAtTime(2600, ctx.currentTime);
  masterFilter.Q.setValueAtTime(0.8, ctx.currentTime);

  // Subtle acoustic room delay (delay: 0.22s, gentle feedback: 0.15)
  delayNode = ctx.createDelay();
  delayNode.delayTime.setValueAtTime(0.22, ctx.currentTime);

  delayFeedback = ctx.createGain();
  delayFeedback.gain.setValueAtTime(0.15, ctx.currentTime);

  const delayWet = ctx.createGain();
  delayWet.gain.setValueAtTime(0.12, ctx.currentTime);

  // Connect Delay Network
  masterFilter.connect(delayNode);
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayNode.connect(delayWet);
  delayWet.connect(masterMusicGain);

  masterFilter.connect(masterMusicGain);
  masterMusicGain.connect(ctx.destination);

  // Individual instrument stereo panners
  harpPanner = createPanner(ctx, -0.2); // Harp panned slightly left
  harpPanner.connect(masterFilter);

  flutePanner = createPanner(ctx, 0.22); // Flute panned slightly right
  flutePanner.connect(masterFilter);

  pizzPanner = createPanner(ctx, -0.1); // Pizzicato center-left
  pizzPanner.connect(masterFilter);

  bellPanner = createPanner(ctx, 0.15); // Bells center-right
  bellPanner.connect(masterFilter);
}

// ---------------------------------------------------------------------------
// Procedurally Synthesized Acoustic Instruments
// ---------------------------------------------------------------------------

/**
 * A. Plucked Celtic Harp / Dulcimer (Main Melodic Voice)
 * Warm, rounded attack, natural acoustic decay, sine/triangle harmonics.
 */
function scheduleHarpNote(
  ctx: AudioContext,
  noteName: string,
  time: number,
  durationSteps: number,
  vol = 0.8
) {
  const freq = NOTE_FREQS[noteName];
  if (!freq || !harpPanner) return;

  const duration = durationSteps * STEP_DURATION;

  // 1. Fundamental warm triangle wave
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, time);

  // 2. Octave overtone (plucked string ring)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, time);

  // 3. Subtle 3rd harmonic (string warmth)
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(freq * 3, time);

  // Plucked envelope: 4ms attack, natural resonant decay
  const peak = 0.14 * vol;
  gain1.gain.setValueAtTime(0.0001, time);
  gain1.gain.linearRampToValueAtTime(peak, time + 0.005);
  gain1.gain.exponentialRampToValueAtTime(0.0001, time + duration * 1.4);

  gain2.gain.setValueAtTime(0.0001, time);
  gain2.gain.linearRampToValueAtTime(peak * 0.25, time + 0.004);
  gain2.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.7);

  gain3.gain.setValueAtTime(0.0001, time);
  gain3.gain.linearRampToValueAtTime(peak * 0.08, time + 0.003);
  gain3.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.4);

  osc1.connect(gain1);
  osc2.connect(gain2);
  osc3.connect(gain3);

  gain1.connect(harpPanner);
  gain2.connect(harpPanner);
  gain3.connect(harpPanner);

  osc1.start(time);
  osc2.start(time);
  osc3.start(time);
  osc1.stop(time + duration * 1.45);
  osc2.stop(time + duration * 1.45);
  osc3.stop(time + duration * 1.45);
}

/**
 * B. Wooden Flute / Recorder (Melodic Responses & Flourishes)
 * Breathy, soft wooden tone, natural vibrato fading in after 80ms.
 */
function scheduleFluteNote(
  ctx: AudioContext,
  noteName: string,
  time: number,
  durationSteps: number,
  vol = 0.75
) {
  const freq = NOTE_FREQS[noteName];
  if (!freq || !flutePanner) return;

  const duration = durationSteps * STEP_DURATION;

  // 1. Primary breathy sine fundamental
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, time);

  // 2. Soft 3rd harmonic (cylindrical wooden bore resonance)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(freq * 3, time);

  // 3. Natural vibrato LFO (5.2 Hz gentle waver starting after 70ms)
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(5.2, time);
  lfoGain.gain.setValueAtTime(0.0, time);
  lfoGain.gain.linearRampToValueAtTime(freq * 0.012, time + 0.12); // subtle 1.2% vibrato
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);

  // 4. Breath noise puff on attack
  const noise = getBreathNoiseBuffer(ctx);
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noise;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(freq * 1.4, time);
  noiseFilter.Q.setValueAtTime(2.5, time);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, time);
  noiseGain.gain.linearRampToValueAtTime(0.025 * vol, time + 0.02);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);

  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(flutePanner);

  // Flute envelope: Soft 25ms attack, smooth breath release
  const peak = 0.11 * vol;
  gain1.gain.setValueAtTime(0.0001, time);
  gain1.gain.linearRampToValueAtTime(peak, time + 0.025);
  gain1.gain.setValueAtTime(peak, time + duration * 0.7);
  gain1.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.05);

  gain2.gain.setValueAtTime(0.0001, time);
  gain2.gain.linearRampToValueAtTime(peak * 0.14, time + 0.025);
  gain2.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.8);

  osc1.connect(gain1);
  osc2.connect(gain2);
  gain1.connect(flutePanner);
  gain2.connect(flutePanner);

  osc1.start(time);
  osc2.start(time);
  lfo.start(time);
  noiseSrc.start(time);

  osc1.stop(time + duration + 0.06);
  osc2.stop(time + duration + 0.06);
  lfo.stop(time + duration + 0.06);
  noiseSrc.stop(time + 0.08);
}

/**
 * C. Pizzicato Strings (Rhythmic Folk Accompaniment)
 * Damped plucked triangle wave with lowpass filtering.
 */
function schedulePizzicatoNote(
  ctx: AudioContext,
  noteName: string,
  time: number,
  vol = 0.6
) {
  const freq = NOTE_FREQS[noteName];
  if (!freq || !pizzPanner) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);

  // Crisp fast pluck attack and short damping (0.24s)
  const peak = 0.09 * vol;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);

  osc.connect(gain);
  gain.connect(pizzPanner);

  osc.start(time);
  osc.stop(time + 0.25);
}

/**
 * D. Warm Acoustic Bass (Harmonic Anchor)
 * Rounded low-frequency acoustic upright / lute bass.
 */
function scheduleAcousticBass(
  ctx: AudioContext,
  noteName: string,
  time: number,
  durationSteps = 3,
  vol = 0.85
) {
  const freq = NOTE_FREQS[noteName];
  if (!freq || !masterFilter) return;

  const duration = durationSteps * STEP_DURATION;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, time);

  // Soft lowpass on bass to keep it warm and grounded
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(320, time);

  const peak = 0.16 * vol;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.95);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterFilter);

  osc.start(time);
  osc.stop(time + duration);
}

/**
 * E. Soft Bells & Wooden Chimes (Sparse Cadence Accents)
 */
function scheduleBellNote(
  ctx: AudioContext,
  noteName: string,
  time: number,
  vol = 0.5
) {
  const freq = NOTE_FREQS[noteName];
  if (!freq || !bellPanner) return;

  // Inharmonic bell partials (1.0, 2.76, 5.40)
  [1.0, 2.76, 5.4].forEach((ratio, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * ratio, time);

    const relVol = idx === 0 ? 0.09 : idx === 1 ? 0.035 : 0.015;
    const dur = idx === 0 ? 1.4 : idx === 1 ? 0.8 : 0.4;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(relVol * vol, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(gain);
    gain.connect(bellPanner!);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  });
}

/**
 * Subtle wooden percussion tap to gently mark 6/8 lilt (step 0 and step 3)
 */
function scheduleWoodClick(ctx: AudioContext, time: number, vol = 0.04) {
  if (!masterFilter) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(640, time);
  osc.frequency.exponentialRampToValueAtTime(180, time + 0.02);

  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);

  osc.connect(gain);
  gain.connect(masterFilter);

  osc.start(time);
  osc.stop(time + 0.025);
}

// ---------------------------------------------------------------------------
// Procedural Composition Architecture
// ---------------------------------------------------------------------------

interface ChordBar {
  chord: string; // e.g. 'G', 'D', 'Em', 'C', 'F', 'Am'
  bassRoot: string; // e.g. 'G2'
  bassFifth: string; // e.g. 'D3'
  pizzNotes: [string, string, string]; // Triad accompaniment (e.g. ['G3', 'B3', 'D4'])
}

interface ProgressionScheme {
  name: string;
  bars: ChordBar[];
}

// 5 Compatible Harmonic Progressions in G Major with Folk Modal Color
const PROGRESSIONS: ProgressionScheme[] = [
  // 1. The Village Green (I – V – vi – IV)
  {
    name: 'Village Green',
    bars: [
      { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] },
      { chord: 'D', bassRoot: 'D3', bassFifth: 'A3', pizzNotes: ['Fs3', 'A3', 'D4'] },
      { chord: 'Em', bassRoot: 'E2', bassFifth: 'B2', pizzNotes: ['G3', 'B3', 'E4'] },
      { chord: 'C', bassRoot: 'C3', bassFifth: 'G3', pizzNotes: ['E3', 'G3', 'C4'] }
    ]
  },
  // 2. Sunny Orchard (I – IV – V – I)
  {
    name: 'Sunny Orchard',
    bars: [
      { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] },
      { chord: 'C', bassRoot: 'C3', bassFifth: 'G3', pizzNotes: ['E3', 'G3', 'C4'] },
      { chord: 'D', bassRoot: 'D3', bassFifth: 'A3', pizzNotes: ['Fs3', 'A3', 'D4'] },
      { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] }
    ]
  },
  // 3. Meadow Twilight (vi – IV – I – V)
  {
    name: 'Meadow Twilight',
    bars: [
      { chord: 'Em', bassRoot: 'E2', bassFifth: 'B2', pizzNotes: ['G3', 'B3', 'E4'] },
      { chord: 'C', bassRoot: 'C3', bassFifth: 'G3', pizzNotes: ['E3', 'G3', 'C4'] },
      { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] },
      { chord: 'D', bassRoot: 'D3', bassFifth: 'A3', pizzNotes: ['Fs3', 'A3', 'D4'] }
    ]
  },
  // 4. Folk Fair (I – ♭VII – IV – I, Mixolydian Countryside Warmth!)
  {
    name: 'Folk Fair',
    bars: [
      { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] },
      { chord: 'F', bassRoot: 'F2', bassFifth: 'C3', pizzNotes: ['F3', 'A3', 'C4'] },
      { chord: 'C', bassRoot: 'C3', bassFifth: 'G3', pizzNotes: ['E3', 'G3', 'C4'] },
      { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] }
    ]
  },
  // 5. Cozy Hearth (I – vi – ii – V)
  {
    name: 'Cozy Hearth',
    bars: [
      { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] },
      { chord: 'Em', bassRoot: 'E2', bassFifth: 'B2', pizzNotes: ['G3', 'B3', 'E4'] },
      { chord: 'Am', bassRoot: 'A2', bassFifth: 'E3', pizzNotes: ['A3', 'C4', 'E4'] },
      { chord: 'D', bassRoot: 'D3', bassFifth: 'A3', pizzNotes: ['Fs3', 'A3', 'D4'] }
    ]
  }
];

// ---------------------------------------------------------------------------
// Melodic Motifs in 6/8 Folk Meter
// (Steps 0, 1, 2, 3, 4, 5 per bar. Durations in steps.)
// ---------------------------------------------------------------------------

interface MelodicNote {
  step: number; // 0 to 5
  note: string;
  dur: number; // in steps (1 = 8th note, 3 = dotted quarter)
  vol?: number;
}

// Collection of lilting 4-bar melodic phrases for Celtic Harp
const HARP_THEMES: MelodicNote[][] = [
  // Theme 1: Cheerful morning stroll
  [
    // Bar 0 (G)
    { step: 0, note: 'B4', dur: 2 },
    { step: 2, note: 'C5', dur: 1 },
    { step: 3, note: 'D5', dur: 3 },
    // Bar 1 (D)
    { step: 0, note: 'A4', dur: 2 },
    { step: 2, note: 'B4', dur: 1 },
    { step: 3, note: 'Fs4', dur: 3 },
    // Bar 2 (Em)
    { step: 0, note: 'G4', dur: 1 },
    { step: 1, note: 'A4', dur: 1 },
    { step: 2, note: 'B4', dur: 1 },
    { step: 3, note: 'E5', dur: 3 },
    // Bar 3 (C)
    { step: 0, note: 'D5', dur: 2 },
    { step: 2, note: 'C5', dur: 1 },
    { step: 3, note: 'B4', dur: 3 }
  ],
  // Theme 2: Sunny pasture dance
  [
    // Bar 0
    { step: 0, note: 'D5', dur: 2 },
    { step: 2, note: 'E5', dur: 1 },
    { step: 3, note: 'D5', dur: 2 },
    { step: 5, note: 'B4', dur: 1 },
    // Bar 1
    { step: 0, note: 'C5', dur: 2 },
    { step: 2, note: 'D5', dur: 1 },
    { step: 3, note: 'C5', dur: 2 },
    { step: 5, note: 'A4', dur: 1 },
    // Bar 2
    { step: 0, note: 'B4', dur: 2 },
    { step: 2, note: 'C5', dur: 1 },
    { step: 3, note: 'D5', dur: 2 },
    { step: 5, note: 'G4', dur: 1 },
    // Bar 3
    { step: 0, note: 'A4', dur: 3 },
    { step: 3, note: 'G4', dur: 3 }
  ],
  // Theme 3: Lilting countryside cadence
  [
    // Bar 0
    { step: 0, note: 'G4', dur: 3 },
    { step: 3, note: 'B4', dur: 2 },
    { step: 5, note: 'D5', dur: 1 },
    // Bar 1
    { step: 0, note: 'C5', dur: 2 },
    { step: 2, note: 'B4', dur: 1 },
    { step: 3, note: 'A4', dur: 3 },
    // Bar 2
    { step: 0, note: 'B4', dur: 1 },
    { step: 1, note: 'C5', dur: 1 },
    { step: 2, note: 'D5', dur: 1 },
    { step: 3, note: 'G5', dur: 3 },
    // Bar 3
    { step: 0, note: 'Fs5', dur: 2 },
    { step: 2, note: 'E5', dur: 1 },
    { step: 3, note: 'D5', dur: 3 }
  ]
];

// Wooden Flute answering phrases (plays on bars 2-3 or 0-1 as call-and-response)
const FLUTE_RESPONSES: MelodicNote[][] = [
  // Response 1: Joyful ascending trill & breathy resolution
  [
    { step: 0, note: 'D5', dur: 1, vol: 0.8 },
    { step: 1, note: 'E5', dur: 1, vol: 0.8 },
    { step: 2, note: 'Fs5', dur: 1, vol: 0.85 },
    { step: 3, note: 'G5', dur: 3, vol: 0.9 },
    // Bar 3 response
    { step: 0, note: 'E5', dur: 2, vol: 0.8 },
    { step: 2, note: 'D5', dur: 1, vol: 0.75 },
    { step: 3, note: 'C5', dur: 2, vol: 0.7 },
    { step: 5, note: 'B4', dur: 1, vol: 0.65 }
  ],
  // Response 2: Whimsical recorder flourish
  [
    { step: 0, note: 'B5', dur: 2, vol: 0.85 },
    { step: 2, note: 'A5', dur: 1, vol: 0.8 },
    { step: 3, note: 'G5', dur: 3, vol: 0.85 },
    // Bar 3 response
    { step: 0, note: 'D5', dur: 2, vol: 0.75 },
    { step: 2, note: 'Fs5', dur: 1, vol: 0.8 },
    { step: 3, note: 'G5', dur: 3, vol: 0.9 }
  ],
  // Response 3: Sweet gentle echo
  [
    { step: 0, note: 'G5', dur: 2, vol: 0.8 },
    { step: 2, note: 'E5', dur: 1, vol: 0.75 },
    { step: 3, note: 'D5', dur: 3, vol: 0.85 },
    // Bar 3 response
    { step: 0, note: 'C5', dur: 1, vol: 0.7 },
    { step: 1, note: 'B4', dur: 1, vol: 0.7 },
    { step: 2, note: 'A4', dur: 1, vol: 0.7 },
    { step: 3, note: 'G4', dur: 3, vol: 0.85 }
  ]
];

// ---------------------------------------------------------------------------
// Arrangement Types (Orchestration Density Cycling)
// ---------------------------------------------------------------------------
type ArrangementType =
  | 'harp_solo' // Intimate solo harp + gentle bass
  | 'call_response' // Harp calls, Wooden Flute answers!
  | 'quiet_stroll' // Harp & Flute rest; peaceful pizzicato & bell accents
  | 'full_village' // Full warm countryside ensemble
  | 'flute_lead'; // Wooden Flute takes the melody

const ARRANGEMENT_CYCLE: ArrangementType[] = [
  'harp_solo',
  'call_response',
  'full_village',
  'quiet_stroll',
  'flute_lead',
  'call_response',
  'full_village',
  'quiet_stroll'
];

let phraseIndex = 0;
let nextBarTime = 0;

/**
 * Procedurally schedules a complete 4-bar strophe on the 6/8 meter grid.
 */
function scheduleFourBarPhrase(ctx: AudioContext, startTime: number) {
  // Pick progression and arrangement in an organic cycle with variation
  const progression = PROGRESSIONS[phraseIndex % PROGRESSIONS.length];
  const arrangement = ARRANGEMENT_CYCLE[phraseIndex % ARRANGEMENT_CYCLE.length];
  const harpTheme = HARP_THEMES[phraseIndex % HARP_THEMES.length];
  const fluteResponse = FLUTE_RESPONSES[phraseIndex % FLUTE_RESPONSES.length];

  for (let barIdx = 0; barIdx < 4; barIdx++) {
    const barTime = startTime + barIdx * MEASURE_DURATION;
    const barData = progression.bars[barIdx];

    // 1. Warm Acoustic Bass:
    // Root on step 0 (downbeat), Fifth on step 3 (mid-measure lilt)
    scheduleAcousticBass(ctx, barData.bassRoot, barTime, 3, 0.85);
    scheduleAcousticBass(ctx, barData.bassFifth, barTime + 3 * STEP_DURATION, 3, 0.7);

    // 2. Light Wooden Click (subtle rhythmic heartbeat on steps 0 and 3)
    if (arrangement !== 'quiet_stroll') {
      scheduleWoodClick(ctx, barTime, 0.03);
      scheduleWoodClick(ctx, barTime + 3 * STEP_DURATION, 0.025);
    }

    // 3. Pizzicato Strings Accompaniment:
    // Plays lilting 6/8 broken arpeggio (steps 0, 2, 3, 5)
    if (arrangement !== 'harp_solo') {
      const [n1, n2, n3] = barData.pizzNotes;
      const pizzVol = arrangement === 'quiet_stroll' ? 0.75 : 0.55;
      schedulePizzicatoNote(ctx, n1, barTime + 0 * STEP_DURATION, pizzVol);
      schedulePizzicatoNote(ctx, n2, barTime + 2 * STEP_DURATION, pizzVol * 0.85);
      schedulePizzicatoNote(ctx, n3, barTime + 3 * STEP_DURATION, pizzVol * 0.95);
      schedulePizzicatoNote(ctx, n2, barTime + 5 * STEP_DURATION, pizzVol * 0.8);
    }

    // 4. Soft Bell Accent on phrase cadences
    if (barIdx === 3 && (arrangement === 'call_response' || arrangement === 'full_village')) {
      scheduleBellNote(ctx, 'D6', barTime + 3 * STEP_DURATION, 0.5);
    } else if (arrangement === 'quiet_stroll' && (barIdx === 1 || barIdx === 3)) {
      scheduleBellNote(ctx, barIdx === 1 ? 'B5' : 'G5', barTime + 0 * STEP_DURATION, 0.45);
    }
  }

  // 5. Melodic Scheduling according to Arrangement Type:
  if (arrangement === 'harp_solo' || arrangement === 'full_village') {
    // Harp plays the full 4-bar theme
    harpTheme.forEach((noteItem) => {
      // Find bar based on index in theme (4 notes per bar roughly)
      const bar = Math.floor(harpTheme.indexOf(noteItem) / 3.5);
      const noteTime =
        startTime + Math.min(bar, 3) * MEASURE_DURATION + noteItem.step * STEP_DURATION;
      scheduleHarpNote(ctx, noteItem.note, noteTime, noteItem.dur, noteItem.vol ?? 0.8);
    });

    // In full village, Flute joins on bars 2-3 as a counter-melody!
    if (arrangement === 'full_village') {
      fluteResponse.forEach((item) => {
        const noteTime = startTime + 2 * MEASURE_DURATION + item.step * STEP_DURATION;
        scheduleFluteNote(ctx, item.note, noteTime, item.dur, (item.vol ?? 0.7) * 0.8);
      });
    }
  } else if (arrangement === 'call_response') {
    // Call: Harp plays bars 0-1
    harpTheme.slice(0, 6).forEach((noteItem) => {
      const bar = Math.floor(harpTheme.indexOf(noteItem) / 3);
      const noteTime =
        startTime + Math.min(bar, 1) * MEASURE_DURATION + noteItem.step * STEP_DURATION;
      scheduleHarpNote(ctx, noteItem.note, noteTime, noteItem.dur, noteItem.vol ?? 0.85);
    });

    // Response: Wooden Flute answers on bars 2-3!
    fluteResponse.forEach((item) => {
      const noteTime = startTime + 2 * MEASURE_DURATION + item.step * STEP_DURATION;
      scheduleFluteNote(ctx, item.note, noteTime, item.dur, item.vol ?? 0.8);
    });
  } else if (arrangement === 'flute_lead') {
    // Flute plays the lead melodic motif
    harpTheme.forEach((noteItem) => {
      const bar = Math.floor(harpTheme.indexOf(noteItem) / 3.5);
      const noteTime =
        startTime + Math.min(bar, 3) * MEASURE_DURATION + noteItem.step * STEP_DURATION;
      scheduleFluteNote(ctx, noteItem.note, noteTime, noteItem.dur, noteItem.vol ?? 0.8);
    });
  }
  // (In 'quiet_stroll', both lead instruments rest, creating peaceful breathing room!)

  phraseIndex++;
}

/**
 * Lookahead scheduler running every 250ms to queue up upcoming 4-bar phrases smoothly.
 */
function scheduleUpcomingMusic() {
  const ctx = getAudioContext();
  if (!ctx || !isPlaying) return;

  const fourBarDuration = MEASURE_DURATION * 4; // ~5.1 seconds
  const lookahead = 1.0; // Schedule 1 second ahead of current playback

  while (nextBarTime < ctx.currentTime + lookahead) {
    scheduleFourBarPhrase(ctx, nextBarTime);
    nextBarTime += fourBarDuration;
  }
}

// ---------------------------------------------------------------------------
// Engine Lifecycle Controls
// ---------------------------------------------------------------------------

/**
 * Starts the procedural background music (gentle 1.5s fade in).
 */
export function startMusic() {
  if (!musicEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (isPlaying) return;
  isPlaying = true;

  initAudioGraph(ctx);

  if (masterMusicGain) {
    const now = ctx.currentTime;
    masterMusicGain.gain.cancelScheduledValues(now);
    masterMusicGain.gain.setValueAtTime(0.0001, now);
    // Unobtrusive, warm ambient background volume (~0.08)
    masterMusicGain.gain.linearRampToValueAtTime(0.08, now + 1.5);
  }

  const now = ctx.currentTime;
  nextBarTime = now + 0.1;
  phraseIndex = 0;

  if (schedulerTimer === null) {
    schedulerTimer = window.setInterval(scheduleUpcomingMusic, 250);
  }
}

/**
 * Stops the background music with a gentle 0.8s fade out.
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
    masterMusicGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
  }
}

// ---------------------------------------------------------------------------
// Browser Autoplay & Visibility Change Lifecycle Hooks
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  // 1. Resume audio context & start music on first user interaction (browser policy compliance)
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
        masterMusicGain.gain.setTargetAtTime(0.08, ctx.currentTime, 0.3);
      } else if (musicEnabled && !isPlaying) {
        startMusic();
      }
    }
  });
}
