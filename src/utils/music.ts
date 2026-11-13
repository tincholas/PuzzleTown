// ===========================================================================
// PUZZLETOWN — PROCEDURAL MEDIEVAL COUNTRYSIDE BACKGROUND MUSIC ENGINE
// ===========================================================================
// A handcrafted, procedural acoustic ensemble evocative of a sunny afternoon
// in a quaint medieval village. Lilting 6/8 folk meter (94 BPM) in G Major.
//
// Structured as authentic 8-bar musical strophes (A-Section Village Theme,
// B-Section Orchard Walk, C-Section Folk Fair Modal Variation) with clear
// antecedent/consequent phrasing, call-and-response, and dynamic breathing room.
//
// Instrumentation:
//  - Plucked Celtic Harp / Dulcimer (warm, rounded melodic lead)
//  - Wooden Flute / Recorder (breathy, sweet melodic responses and counterpoint)
//  - Pizzicato Strings (gentle rhythmic 6/8 arpeggio accompaniment)
//  - Warm Acoustic Bass (root and fifth acoustic foundation)
//  - Bells & Wooden Chimes (soft, sparkling cadence accents)
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
  // Octave 2 (Bass roots)
  E2: 82.41,
  F2: 87.31,
  Fs2: 92.5,
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,

  // Octave 3 (Bass fifths & low chord notes)
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  Fs3: 185.0,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,

  // Octave 4 (Melody & Pizzicato accompaniment)
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  Fs4: 369.99,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,

  // Octave 5 (High harp & wooden flute)
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  Fs5: 739.99,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,

  // Octave 6 (Sparkling bells & chimes)
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98
};

// ---------------------------------------------------------------------------
// 6/8 Folk Meter Grid (Compound Duple lilting meter at 94 BPM)
// ---------------------------------------------------------------------------
// 1 measure = 2 dotted-quarter beats = 6 eighth-note steps (steps 0, 1, 2, 3, 4, 5)
// Beat 1: step 0 (downbeat)
// Beat 2: step 3 (mid-measure lilt)
// ---------------------------------------------------------------------------
const TEMPO = 94;
const BEAT_DURATION = 60 / TEMPO; // ~0.638s per dotted-quarter beat
const STEP_DURATION = BEAT_DURATION / 3; // ~0.213s per eighth note step
const MEASURE_DURATION = STEP_DURATION * 6; // ~1.277s per 6/8 measure
const EIGHT_BAR_DURATION = MEASURE_DURATION * 8; // ~10.213s per 8-measure strophe

// ---------------------------------------------------------------------------
// Audio Graph & Routing
// ---------------------------------------------------------------------------
let isPlaying = false;
let masterMusicGain: GainNode | null = null;
let masterFilter: BiquadFilterNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedback: GainNode | null = null;
let schedulerTimer: number | null = null;

// Instrument stereo panners for natural acoustic spread
let harpPanner: StereoPannerNode | GainNode | null = null;
let flutePanner: StereoPannerNode | GainNode | null = null;
let pizzPanner: StereoPannerNode | GainNode | null = null;
let bellPanner: StereoPannerNode | GainNode | null = null;

// Breath noise buffer cache for wooden flute attacks
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

  // Master Gain Node
  masterMusicGain = ctx.createGain();
  masterMusicGain.gain.setValueAtTime(0.0001, ctx.currentTime);

  // Warm master lowpass filter (rolls off digital harshness above 2600Hz)
  masterFilter = ctx.createBiquadFilter();
  masterFilter.type = 'lowpass';
  masterFilter.frequency.setValueAtTime(2600, ctx.currentTime);
  masterFilter.Q.setValueAtTime(0.8, ctx.currentTime);

  // Gentle acoustic room delay (delay: 0.22s, feedback: 0.15)
  delayNode = ctx.createDelay();
  delayNode.delayTime.setValueAtTime(0.22, ctx.currentTime);

  delayFeedback = ctx.createGain();
  delayFeedback.gain.setValueAtTime(0.15, ctx.currentTime);

  const delayWet = ctx.createGain();
  delayWet.gain.setValueAtTime(0.12, ctx.currentTime);

  // Delay network routing
  masterFilter.connect(delayNode);
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayNode.connect(delayWet);
  delayWet.connect(masterMusicGain);

  masterFilter.connect(masterMusicGain);
  masterMusicGain.connect(ctx.destination);

  // Stereo placement for acoustic ensemble
  harpPanner = createPanner(ctx, -0.22); // Harp slightly to the left
  harpPanner.connect(masterFilter);

  flutePanner = createPanner(ctx, 0.24); // Flute slightly to the right
  flutePanner.connect(masterFilter);

  pizzPanner = createPanner(ctx, -0.1); // Pizzicato strings center-left
  pizzPanner.connect(masterFilter);

  bellPanner = createPanner(ctx, 0.18); // Bells center-right
  bellPanner.connect(masterFilter);
}

// ---------------------------------------------------------------------------
// Procedurally Synthesized Instruments
// ---------------------------------------------------------------------------

/**
 * A. Plucked Celtic Harp / Dulcimer (Main Melodic Voice)
 * Warm, rounded attack, natural acoustic decay, rich harmonic overtone blend.
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

  // 2. Octave overtone (plucked string bloom)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, time);

  // 3. 3rd harmonic (string warmth)
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(freq * 3, time);

  // Plucked envelope: 5ms attack, natural resonant decay
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
 * B. Wooden Flute / Recorder (Sweet Melodic Responses & Counterpoint)
 * Soft attack, natural cylindrical wood resonance, gentle 5.2Hz vibrato.
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

  // 1. Primary breathy fundamental
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, time);

  // 2. Wooden resonance 3rd harmonic
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(freq * 3, time);

  // 3. Gentle vibrato LFO (5.2Hz, begins after 70ms)
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(5.2, time);
  lfoGain.gain.setValueAtTime(0.0, time);
  lfoGain.gain.linearRampToValueAtTime(freq * 0.012, time + 0.12);
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);

  // 4. Soft breath attack puff
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = getBreathNoiseBuffer(ctx);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(freq * 1.5, time);
  noiseFilter.Q.setValueAtTime(3.0, time);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.025 * vol, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(flutePanner);

  // Note envelope: smooth 25ms attack, gentle release
  const peak = 0.12 * vol;
  gain1.gain.setValueAtTime(0.0001, time);
  gain1.gain.linearRampToValueAtTime(peak, time + 0.025);
  gain1.gain.setValueAtTime(peak * 0.85, time + duration * 0.7);
  gain1.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.06);

  gain2.gain.setValueAtTime(0.0001, time);
  gain2.gain.linearRampToValueAtTime(peak * 0.18, time + 0.03);
  gain2.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.6);

  osc1.connect(gain1);
  osc2.connect(gain2);
  gain1.connect(flutePanner);
  gain2.connect(flutePanner);

  osc1.start(time);
  osc2.start(time);
  lfo.start(time);
  noiseSource.start(time);

  const stopTime = time + duration + 0.08;
  osc1.stop(stopTime);
  osc2.stop(stopTime);
  lfo.stop(stopTime);
  noiseSource.stop(time + 0.08);
}

/**
 * C. Pizzicato Strings (Gentle Rhythmic 6/8 Accompaniment)
 * Snappy pluck with fast-closing lowpass filter.
 */
function schedulePizzicatoNote(
  ctx: AudioContext,
  noteName: string,
  time: number,
  vol = 0.55
) {
  const freq = NOTE_FREQS[noteName];
  if (!freq || !pizzPanner) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, time);
  filter.frequency.exponentialRampToValueAtTime(280, time + 0.18);

  const peak = 0.1 * vol;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(pizzPanner);

  osc.start(time);
  osc.stop(time + 0.3);
}

/**
 * D. Warm Acoustic Bass (Harmonic Foundation)
 * Rounded low-frequency acoustic warmth (steps 0 and 3).
 */
function scheduleAcousticBass(
  ctx: AudioContext,
  noteName: string,
  time: number,
  durationSteps: number,
  vol = 0.8
) {
  const freq = NOTE_FREQS[noteName];
  if (!freq || !masterFilter) return;

  const duration = durationSteps * STEP_DURATION;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);

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
 * Inharmonic shimmering bell partials (1.0, 2.76, 5.40).
 */
function scheduleBellNote(
  ctx: AudioContext,
  noteName: string,
  time: number,
  vol = 0.5
) {
  const freq = NOTE_FREQS[noteName];
  if (!freq || !bellPanner) return;

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
 * Gentle wooden percussion tap to mark the 6/8 pulse (steps 0 and 3).
 */
function scheduleWoodClick(ctx: AudioContext, time: number, vol = 0.03) {
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
// Composition Data Architecture (Cohesive 8-Bar Folk Strophes)
// ---------------------------------------------------------------------------

interface ChordBar {
  chord: string;
  bassRoot: string;
  bassFifth: string;
  pizzNotes: [string, string, string];
}

interface MelodicNote {
  bar: number; // 0 to 7 (measure within the 8-bar strophe)
  step: number; // 0 to 5 (eighth-note beat in 6/8 meter)
  note: string;
  dur: number; // duration in steps (1 = eighth note, 2 = quarter note, 3 = dotted quarter)
  vol?: number;
}

interface BellAccent {
  bar: number;
  step: number;
  note: string;
  vol?: number;
}

interface SectionDefinition {
  name: string;
  bars: ChordBar[]; // exactly 8 bars
  mainMelody: MelodicNote[]; // Primary melodic theme
  counterMelody?: MelodicNote[]; // Harmonizing counterpoint / response
  bellAccents: BellAccent[];
}

// ---------------------------------------------------------------------------
// SECTION A: "The Village Green" (8 Bars, G Major)
// Memorable, hummable folk theme with balanced antecedent & consequent phrasing.
// ---------------------------------------------------------------------------
const SECTION_A: SectionDefinition = {
  name: 'The Village Green',
  bars: [
    // Antecedent Phrase: I - V - vi - V (ends on open half-cadence)
    { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] }, // Bar 0
    { chord: 'D', bassRoot: 'D3', bassFifth: 'A3', pizzNotes: ['Fs3', 'A3', 'D4'] }, // Bar 1
    { chord: 'Em', bassRoot: 'E2', bassFifth: 'B2', pizzNotes: ['G3', 'B3', 'E4'] }, // Bar 2
    { chord: 'D', bassRoot: 'D3', bassFifth: 'A3', pizzNotes: ['Fs3', 'A3', 'D4'] }, // Bar 3
    // Consequent Phrase: I - IV - V - I (resolves cleanly to tonic G)
    { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] }, // Bar 4
    { chord: 'C', bassRoot: 'C3', bassFifth: 'G3', pizzNotes: ['E3', 'G3', 'C4'] }, // Bar 5
    { chord: 'D', bassRoot: 'D3', bassFifth: 'A3', pizzNotes: ['Fs3', 'A3', 'D4'] }, // Bar 6
    { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] } // Bar 7
  ],
  mainMelody: [
    // Bar 0 (G): Opening lilting theme
    { bar: 0, step: 0, note: 'D4', dur: 2 },
    { bar: 0, step: 2, note: 'G4', dur: 1 },
    { bar: 0, step: 3, note: 'B4', dur: 3 },
    // Bar 1 (D): Gentle turnaround
    { bar: 1, step: 0, note: 'A4', dur: 2 },
    { bar: 1, step: 2, note: 'B4', dur: 1 },
    { bar: 1, step: 3, note: 'A4', dur: 2 },
    { bar: 1, step: 5, note: 'Fs4', dur: 1 },
    // Bar 2 (Em): Rising pastoral contour
    { bar: 2, step: 0, note: 'G4', dur: 2 },
    { bar: 2, step: 2, note: 'A4', dur: 1 },
    { bar: 2, step: 3, note: 'B4', dur: 2 },
    { bar: 2, step: 5, note: 'C5', dur: 1 },
    // Bar 3 (D): Half-cadence resting on A
    { bar: 3, step: 0, note: 'D5', dur: 2 },
    { bar: 3, step: 2, note: 'C5', dur: 1 },
    { bar: 3, step: 3, note: 'B4', dur: 2 },
    { bar: 3, step: 5, note: 'A4', dur: 1 },

    // Bar 4 (G): Consequent answer soaring higher
    { bar: 4, step: 0, note: 'B4', dur: 2 },
    { bar: 4, step: 2, note: 'C5', dur: 1 },
    { bar: 4, step: 3, note: 'D5', dur: 3 },
    // Bar 5 (C): High joyful flourish
    { bar: 5, step: 0, note: 'E5', dur: 2 },
    { bar: 5, step: 2, note: 'D5', dur: 1 },
    { bar: 5, step: 3, note: 'C5', dur: 2 },
    { bar: 5, step: 5, note: 'B4', dur: 1 },
    // Bar 6 (D): Stepped descent
    { bar: 6, step: 0, note: 'A4', dur: 2 },
    { bar: 6, step: 2, note: 'B4', dur: 1 },
    { bar: 6, step: 3, note: 'C5', dur: 2 },
    { bar: 6, step: 5, note: 'A4', dur: 1 },
    // Bar 7 (G): Satisfying resolution home
    { bar: 7, step: 0, note: 'B4', dur: 2 },
    { bar: 7, step: 2, note: 'A4', dur: 1 },
    { bar: 7, step: 3, note: 'G4', dur: 3 }
  ],
  counterMelody: [
    // Flute harmony in bars 4-7 (soaring in 3rds & 6ths)
    { bar: 4, step: 3, note: 'G5', dur: 3, vol: 0.8 },
    { bar: 5, step: 0, note: 'G5', dur: 2, vol: 0.8 },
    { bar: 5, step: 2, note: 'Fs5', dur: 1, vol: 0.75 },
    { bar: 5, step: 3, note: 'E5', dur: 3, vol: 0.8 },
    { bar: 6, step: 0, note: 'Fs5', dur: 2, vol: 0.75 },
    { bar: 6, step: 2, note: 'G5', dur: 1, vol: 0.8 },
    { bar: 6, step: 3, note: 'A5', dur: 3, vol: 0.85 },
    { bar: 7, step: 0, note: 'D5', dur: 2, vol: 0.75 },
    { bar: 7, step: 2, note: 'Fs5', dur: 1, vol: 0.75 },
    { bar: 7, step: 3, note: 'G5', dur: 3, vol: 0.85 }
  ],
  bellAccents: [
    { bar: 3, step: 3, note: 'D6', vol: 0.4 },
    { bar: 7, step: 3, note: 'G6', vol: 0.55 }
  ]
};

// ---------------------------------------------------------------------------
// SECTION B: "The Sunny Orchard" (8 Bars, C Major / G Major)
// Playful, wandering, pastoral change of scenery with true call-and-response.
// ---------------------------------------------------------------------------
const SECTION_B: SectionDefinition = {
  name: 'The Sunny Orchard',
  bars: [
    // First 4 bars: IV - I - vi - V
    { chord: 'C', bassRoot: 'C3', bassFifth: 'G3', pizzNotes: ['E3', 'G3', 'C4'] }, // Bar 0
    { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] }, // Bar 1
    { chord: 'Em', bassRoot: 'E2', bassFifth: 'B2', pizzNotes: ['G3', 'B3', 'E4'] }, // Bar 2
    { chord: 'D', bassRoot: 'D3', bassFifth: 'A3', pizzNotes: ['Fs3', 'A3', 'D4'] }, // Bar 3
    // Second 4 bars: IV - I6 - ii - V - I
    { chord: 'C', bassRoot: 'C3', bassFifth: 'G3', pizzNotes: ['E3', 'G3', 'C4'] }, // Bar 4
    { chord: 'G', bassRoot: 'B2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] }, // Bar 5
    { chord: 'Am', bassRoot: 'A2', bassFifth: 'E3', pizzNotes: ['A3', 'C4', 'E4'] }, // Bar 6
    { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] } // Bar 7
  ],
  mainMelody: [
    // Bar 0 (C): Wandering step
    { bar: 0, step: 0, note: 'E5', dur: 2 },
    { bar: 0, step: 2, note: 'D5', dur: 1 },
    { bar: 0, step: 3, note: 'C5', dur: 3 },
    // Bar 1 (G): Gentle descent
    { bar: 1, step: 0, note: 'D5', dur: 2 },
    { bar: 1, step: 2, note: 'C5', dur: 1 },
    { bar: 1, step: 3, note: 'B4', dur: 3 },
    // Bar 2 (Em): Whimsical turn
    { bar: 2, step: 0, note: 'C5', dur: 2 },
    { bar: 2, step: 2, note: 'B4', dur: 1 },
    { bar: 2, step: 3, note: 'A4', dur: 2 },
    { bar: 2, step: 5, note: 'G4', dur: 1 },
    // Bar 3 (D): Upward leap to D5
    { bar: 3, step: 0, note: 'Fs4', dur: 1 },
    { bar: 3, step: 1, note: 'G4', dur: 1 },
    { bar: 3, step: 2, note: 'A4', dur: 1 },
    { bar: 3, step: 3, note: 'D5', dur: 3 },

    // Bar 4 (C): High sunny meadow flourish
    { bar: 4, step: 0, note: 'G5', dur: 2 },
    { bar: 4, step: 2, note: 'E5', dur: 1 },
    { bar: 4, step: 3, note: 'C5', dur: 3 },
    // Bar 5 (G/B): Cascading steps
    { bar: 5, step: 0, note: 'D5', dur: 2 },
    { bar: 5, step: 2, note: 'B4', dur: 1 },
    { bar: 5, step: 3, note: 'G4', dur: 3 },
    // Bar 6 (Am): Cadence run
    { bar: 6, step: 0, note: 'A4', dur: 1 },
    { bar: 6, step: 1, note: 'B4', dur: 1 },
    { bar: 6, step: 2, note: 'C5', dur: 1 },
    { bar: 6, step: 3, note: 'D5', dur: 3 },
    // Bar 7 (G): Full warm cadence
    { bar: 7, step: 0, note: 'B4', dur: 2 },
    { bar: 7, step: 2, note: 'A4', dur: 1 },
    { bar: 7, step: 3, note: 'G4', dur: 3 }
  ],
  bellAccents: [
    { bar: 1, step: 3, note: 'D6', vol: 0.4 },
    { bar: 7, step: 3, note: 'G6', vol: 0.5 }
  ]
};

// ---------------------------------------------------------------------------
// SECTION C: "The Folk Fair" (8 Bars, Mixolydian Countryside Color)
// Traditional folk modal tune (I – ♭VII – IV – I) with infectious Celtic warmth.
// ---------------------------------------------------------------------------
const SECTION_C: SectionDefinition = {
  name: 'The Folk Fair',
  bars: [
    { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] }, // Bar 0
    { chord: 'F', bassRoot: 'F2', bassFifth: 'C3', pizzNotes: ['F3', 'A3', 'C4'] }, // Bar 1 (♭VII Mixolydian!)
    { chord: 'C', bassRoot: 'C3', bassFifth: 'G3', pizzNotes: ['E3', 'G3', 'C4'] }, // Bar 2
    { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] }, // Bar 3
    { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] }, // Bar 4
    { chord: 'F', bassRoot: 'F2', bassFifth: 'C3', pizzNotes: ['F3', 'A3', 'C4'] }, // Bar 5
    { chord: 'C', bassRoot: 'C3', bassFifth: 'G3', pizzNotes: ['E3', 'G3', 'C4'] }, // Bar 6
    { chord: 'G', bassRoot: 'G2', bassFifth: 'D3', pizzNotes: ['G3', 'B3', 'D4'] } // Bar 7
  ],
  mainMelody: [
    // Bar 0 (G)
    { bar: 0, step: 0, note: 'G4', dur: 2 },
    { bar: 0, step: 2, note: 'B4', dur: 1 },
    { bar: 0, step: 3, note: 'D5', dur: 3 },
    // Bar 1 (F): Flatted 7th modal warmth!
    { bar: 1, step: 0, note: 'C5', dur: 2 },
    { bar: 1, step: 2, note: 'A4', dur: 1 },
    { bar: 1, step: 3, note: 'F4', dur: 3 },
    // Bar 2 (C)
    { bar: 2, step: 0, note: 'G4', dur: 2 },
    { bar: 2, step: 2, note: 'A4', dur: 1 },
    { bar: 2, step: 3, note: 'C5', dur: 3 },
    // Bar 3 (G)
    { bar: 3, step: 0, note: 'B4', dur: 2 },
    { bar: 3, step: 2, note: 'A4', dur: 1 },
    { bar: 3, step: 3, note: 'G4', dur: 3 },

    // Bar 4 (G)
    { bar: 4, step: 0, note: 'D5', dur: 2 },
    { bar: 4, step: 2, note: 'B4', dur: 1 },
    { bar: 4, step: 3, note: 'G4', dur: 3 },
    // Bar 5 (F)
    { bar: 5, step: 0, note: 'A4', dur: 2 },
    { bar: 5, step: 2, note: 'C5', dur: 1 },
    { bar: 5, step: 3, note: 'F5', dur: 3 },
    // Bar 6 (C)
    { bar: 6, step: 0, note: 'E5', dur: 2 },
    { bar: 6, step: 2, note: 'D5', dur: 1 },
    { bar: 6, step: 3, note: 'C5', dur: 2 },
    { bar: 6, step: 5, note: 'A4', dur: 1 },
    // Bar 7 (G)
    { bar: 7, step: 0, note: 'B4', dur: 2 },
    { bar: 7, step: 2, note: 'A4', dur: 1 },
    { bar: 7, step: 3, note: 'G4', dur: 3 }
  ],
  bellAccents: [
    { bar: 3, step: 3, note: 'D6', vol: 0.4 },
    { bar: 7, step: 3, note: 'G6', vol: 0.5 }
  ]
};

const SECTIONS: SectionDefinition[] = [SECTION_A, SECTION_B, SECTION_A, SECTION_C];

// ---------------------------------------------------------------------------
// Arrangement Orchestration Types (Varying Density to Prevent Ear Fatigue)
// ---------------------------------------------------------------------------
type ArrangementMode =
  | 'harp_pastoral' // Intimate Celtic harp melody + gentle bass & pizzicato
  | 'call_response' // Harp plays bars 0-3, Wooden Flute answers bars 4-7
  | 'full_village' // Full ensemble: Harp lead, Flute harmony/counterpoint, bells
  | 'peaceful_breather' // Lead instruments rest; gentle pizzicato, bass, distant chime
  | 'flute_lead'; // Wooden Flute takes the lead melody, soft & breathy

const ARRANGEMENT_SCHEDULE: ArrangementMode[] = [
  'harp_pastoral', // 1. Quiet, welcoming opening
  'call_response', // 2. Flute joins in dialogue
  'full_village', // 3. Warm full ensemble
  'peaceful_breather', // 4. Pure peaceful ambient break
  'flute_lead', // 5. Flute takes the theme
  'full_village', // 6. Cheerful return
  'call_response', // 7. Gentle conversational variation
  'peaceful_breather' // 8. Relaxing puzzle meditation break
];

let cycleCount = 0;
let nextSectionTime = 0;

/**
 * Schedules a coherent 8-bar musical strophe on the audio timeline.
 */
function scheduleEightBarSection(ctx: AudioContext, startTime: number) {
  const section = SECTIONS[cycleCount % SECTIONS.length];
  const arrangement = ARRANGEMENT_SCHEDULE[cycleCount % ARRANGEMENT_SCHEDULE.length];

  // 1. Schedule Harmony, Bass, Rhythmic Pulse, and Pizzicato Accompaniment
  for (let barIdx = 0; barIdx < 8; barIdx++) {
    const barTime = startTime + barIdx * MEASURE_DURATION;
    const barData = section.bars[barIdx];

    // Acoustic Bass: Root on step 0 (downbeat), Fifth on step 3 (mid-measure)
    scheduleAcousticBass(ctx, barData.bassRoot, barTime, 3, 0.85);
    scheduleAcousticBass(ctx, barData.bassFifth, barTime + 3 * STEP_DURATION, 3, 0.7);

    // Subtle rhythmic wooden click on steps 0 and 3 (gentle heartbeat)
    if (arrangement !== 'peaceful_breather') {
      scheduleWoodClick(ctx, barTime, 0.025);
      scheduleWoodClick(ctx, barTime + 3 * STEP_DURATION, 0.02);
    }

    // Pizzicato Triad Arpeggio (steps 0, 2, 3, 5)
    const [p1, p2, p3] = barData.pizzNotes;
    const pizzVol = arrangement === 'peaceful_breather' ? 0.7 : 0.52;
    schedulePizzicatoNote(ctx, p1, barTime + 0 * STEP_DURATION, pizzVol);
    schedulePizzicatoNote(ctx, p2, barTime + 2 * STEP_DURATION, pizzVol * 0.85);
    schedulePizzicatoNote(ctx, p3, barTime + 3 * STEP_DURATION, pizzVol * 0.95);
    schedulePizzicatoNote(ctx, p2, barTime + 5 * STEP_DURATION, pizzVol * 0.8);
  }

  // 2. Schedule Sparkling Bell Cadence Accents
  section.bellAccents.forEach((accent) => {
    const bellTime =
      startTime + accent.bar * MEASURE_DURATION + accent.step * STEP_DURATION;
    scheduleBellNote(ctx, accent.note, bellTime, accent.vol ?? 0.5);
  });

  // 3. Schedule Melodies According to Arrangement Mode
  if (arrangement === 'harp_pastoral') {
    // Celtic Harp plays the complete 8-bar melody with expressive dynamics
    section.mainMelody.forEach((noteItem) => {
      const noteTime =
        startTime + noteItem.bar * MEASURE_DURATION + noteItem.step * STEP_DURATION;
      scheduleHarpNote(ctx, noteItem.note, noteTime, noteItem.dur, noteItem.vol ?? 0.82);
    });
  } else if (arrangement === 'call_response') {
    // Call: Harp plays antecedent phrase (bars 0-3)
    section.mainMelody
      .filter((n) => n.bar < 4)
      .forEach((noteItem) => {
        const noteTime =
          startTime + noteItem.bar * MEASURE_DURATION + noteItem.step * STEP_DURATION;
        scheduleHarpNote(ctx, noteItem.note, noteTime, noteItem.dur, noteItem.vol ?? 0.85);
      });

    // Response: Wooden Flute answers on consequent phrase (bars 4-7)
    section.mainMelody
      .filter((n) => n.bar >= 4)
      .forEach((noteItem) => {
        const noteTime =
          startTime + noteItem.bar * MEASURE_DURATION + noteItem.step * STEP_DURATION;
        scheduleFluteNote(ctx, noteItem.note, noteTime, noteItem.dur, noteItem.vol ?? 0.8);
      });
  } else if (arrangement === 'flute_lead') {
    // Wooden Flute plays the lead 8-bar melody
    section.mainMelody.forEach((noteItem) => {
      const noteTime =
        startTime + noteItem.bar * MEASURE_DURATION + noteItem.step * STEP_DURATION;
      scheduleFluteNote(ctx, noteItem.note, noteTime, noteItem.dur, noteItem.vol ?? 0.8);
    });
  } else if (arrangement === 'full_village') {
    // Full ensemble: Harp plays main melody
    section.mainMelody.forEach((noteItem) => {
      const noteTime =
        startTime + noteItem.bar * MEASURE_DURATION + noteItem.step * STEP_DURATION;
      scheduleHarpNote(ctx, noteItem.note, noteTime, noteItem.dur, noteItem.vol ?? 0.8);
    });

    // Wooden Flute joins with counter-melody / harmony in bars 4-7
    if (section.counterMelody) {
      section.counterMelody.forEach((item) => {
        const noteTime =
          startTime + item.bar * MEASURE_DURATION + item.step * STEP_DURATION;
        scheduleFluteNote(ctx, item.note, noteTime, item.dur, item.vol ?? 0.72);
      });
    }
  }
  // (In 'peaceful_breather', lead instruments rest, creating a relaxing ambient pause)

  cycleCount++;
}

/**
 * High-precision lookahead scheduler running every 350ms.
 */
function scheduleUpcomingMusic() {
  const ctx = getAudioContext();
  if (!ctx || !isPlaying) return;

  const lookahead = 2.0; // Queue up audio 2 seconds in advance

  while (nextSectionTime < ctx.currentTime + lookahead) {
    scheduleEightBarSection(ctx, nextSectionTime);
    nextSectionTime += EIGHT_BAR_DURATION;
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
    // Pleasant, unobtrusive background volume (~0.08)
    masterMusicGain.gain.linearRampToValueAtTime(0.08, now + 1.5);
  }

  const now = ctx.currentTime;
  nextSectionTime = now + 0.1;
  cycleCount = 0;

  if (schedulerTimer === null) {
    schedulerTimer = window.setInterval(scheduleUpcomingMusic, 350);
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
