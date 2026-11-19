/**
 * Tiny software synthesizer used to generate Pixel Quest's audio at runtime.
 *
 * Every sound is original and generated from scratch, so the game ships with
 * zero external audio files (and cannot crash on a missing asset). Output is
 * standard 16-bit PCM WAV, decoded by Howler.js.
 */

const SAMPLE_RATE = 22050;

type Wave = 'square' | 'triangle' | 'saw' | 'noise' | 'sine';

interface NoteSpec {
  /** Start time, seconds. */
  t: number;
  /** Duration, seconds. */
  dur: number;
  /** Start frequency in Hz (noise uses this as low-pass cutoff). */
  freq: number;
  /** Optional end frequency for pitch slides. */
  freq2?: number;
  wave: Wave;
  /** 0..1 amplitude. */
  vol: number;
  /** Attack seconds (default 0.004). */
  attack?: number;
  /** Release seconds at the end of the note (default 0.02). */
  release?: number;
  /** Exponential decay toward ~8% over the note (default 0 = flat). */
  decay?: number;
}

const NOTE_SEMITONES: Record<string, number> = {
  C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2,
};

/** 'A4' -> 440 */
export function noteFreq(name: string): number {
  const match = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!match) return 440;
  const semis = NOTE_SEMITONES[match[1]] + (parseInt(match[2], 10) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
}

/** White-noise generator with a simple one-pole low-pass (cutoff in Hz). */
function makeNoise(cutoff: number): () => number {
  const alpha = Math.min(1, (2 * Math.PI * cutoff) / SAMPLE_RATE);
  let last = 0;
  return () => {
    const white = Math.random() * 2 - 1;
    last += alpha * (white - last);
    return last;
  };
}

/** Render a set of notes into a mono Float32Array. */
function render(notes: NoteSpec[], totalSeconds: number): Float32Array {
  const length = Math.max(1, Math.ceil(totalSeconds * SAMPLE_RATE));
  const out = new Float32Array(length);

  for (const note of notes) {
    const start = Math.floor(note.t * SAMPLE_RATE);
    const count = Math.floor(note.dur * SAMPLE_RATE);
    const attack = Math.max(1, Math.floor((note.attack ?? 0.004) * SAMPLE_RATE));
    const release = Math.max(1, Math.floor((note.release ?? 0.02) * SAMPLE_RATE));
    const decay = note.decay ?? 0;
    const noiseGen = note.wave === 'noise' ? makeNoise(note.freq) : null;
    let phase = 0;

    for (let i = 0; i < count; i++) {
      const index = start + i;
      if (index >= length) break;

      const progress = i / count;
      const slideProgress = note.freq2 !== undefined ? progress : 0;
      const freq = note.freq2 !== undefined ? note.freq + (note.freq2 - note.freq) * slideProgress : note.freq;
      phase += freq / SAMPLE_RATE;
      if (phase >= 1) phase -= Math.floor(phase);

      let sample = 0;
      if (noiseGen) {
        sample = noiseGen();
      } else {
        switch (note.wave) {
          case 'square':
            sample = phase < 0.5 ? 1 : -1;
            break;
          case 'triangle':
            sample = 4 * Math.abs(phase - 0.5) - 1;
            break;
          case 'saw':
            sample = 2 * phase - 1;
            break;
          case 'sine':
            sample = Math.sin(2 * Math.PI * phase);
            break;
          default:
            sample = 0;
        }
      }

      // Envelope: attack ramp, optional decay, release tail.
      let envelope = 1;
      if (i < attack) envelope = i / attack;
      if (decay > 0) envelope *= Math.exp(-decay * progress * 4);
      const remaining = count - i;
      if (remaining < release) envelope *= remaining / release;

      out[index] += sample * envelope * note.vol;
    }
  }

  // Soft limit + normalize to ~0.85 peak.
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0.0001) {
    const gain = 0.85 / peak;
    for (let i = 0; i < length; i++) {
      const v = out[i] * gain;
      out[i] = Math.tanh(v * 1.1) * 0.95;
    }
  }
  return out;
}

/** Encode mono Float32 samples as a 16-bit PCM WAV Blob. */
function encodeWav(samples: Float32Array): Blob {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/* ------------------------------------------------------------------ */
/* Sound effects                                                       */
/* ------------------------------------------------------------------ */

function sfxNotes(name: string): { notes: NoteSpec[]; total: number } {
  switch (name) {
    case 'coin':
      return {
        notes: [
          { t: 0, dur: 0.07, freq: noteFreq('B5'), wave: 'square', vol: 0.4, decay: 0.4 },
          { t: 0.07, dur: 0.18, freq: noteFreq('E6'), wave: 'square', vol: 0.4, decay: 0.8 },
        ],
        total: 0.3,
      };
    case 'sword':
      return {
        notes: [
          { t: 0, dur: 0.14, freq: 900, freq2: 3800, wave: 'noise', vol: 0.5, attack: 0.002, decay: 1.2 },
          { t: 0.01, dur: 0.1, freq: 700, freq2: 220, wave: 'square', vol: 0.18, decay: 1.4 },
        ],
        total: 0.22,
      };
    case 'hit':
      return {
        notes: [
          { t: 0, dur: 0.12, freq: 260, freq2: 90, wave: 'square', vol: 0.45, decay: 1.4 },
          { t: 0, dur: 0.08, freq: 2600, wave: 'noise', vol: 0.3, decay: 2 },
        ],
        total: 0.2,
      };
    case 'hurt':
      return {
        notes: [
          { t: 0, dur: 0.26, freq: 430, freq2: 140, wave: 'square', vol: 0.5, decay: 0.7 },
          { t: 0, dur: 0.2, freq: 215, freq2: 70, wave: 'triangle', vol: 0.4, decay: 0.7 },
        ],
        total: 0.32,
      };
    case 'jump':
      return {
        notes: [{ t: 0, dur: 0.1, freq: 300, freq2: 720, wave: 'square', vol: 0.22, decay: 0.6 }],
        total: 0.14,
      };
    case 'crystal':
      return {
        notes: [
          { t: 0, dur: 0.1, freq: noteFreq('E6'), wave: 'triangle', vol: 0.5 },
          { t: 0.08, dur: 0.1, freq: noteFreq('G6'), wave: 'triangle', vol: 0.5 },
          { t: 0.16, dur: 0.1, freq: noteFreq('B6'), wave: 'triangle', vol: 0.5 },
          { t: 0.24, dur: 0.4, freq: noteFreq('E7'), wave: 'triangle', vol: 0.45, decay: 0.6 },
          { t: 0.24, dur: 0.4, freq: noteFreq('E6'), wave: 'sine', vol: 0.3, decay: 0.6 },
        ],
        total: 0.72,
      };
    case 'checkpoint':
      return {
        notes: [
          { t: 0, dur: 0.09, freq: noteFreq('A4'), wave: 'square', vol: 0.4 },
          { t: 0.09, dur: 0.09, freq: noteFreq('C5'), wave: 'square', vol: 0.4 },
          { t: 0.18, dur: 0.09, freq: noteFreq('E5'), wave: 'square', vol: 0.4 },
          { t: 0.27, dur: 0.32, freq: noteFreq('A5'), wave: 'square', vol: 0.4, decay: 0.5 },
          { t: 0.27, dur: 0.32, freq: noteFreq('A4'), wave: 'triangle', vol: 0.35, decay: 0.5 },
        ],
        total: 0.66,
      };
    case 'victory':
      return {
        notes: [
          { t: 0, dur: 0.12, freq: noteFreq('C5'), wave: 'square', vol: 0.45 },
          { t: 0.12, dur: 0.12, freq: noteFreq('E5'), wave: 'square', vol: 0.45 },
          { t: 0.24, dur: 0.12, freq: noteFreq('G5'), wave: 'square', vol: 0.45 },
          { t: 0.36, dur: 0.5, freq: noteFreq('C6'), wave: 'square', vol: 0.45, decay: 0.4 },
          { t: 0.36, dur: 0.5, freq: noteFreq('C5'), wave: 'triangle', vol: 0.4, decay: 0.4 },
          { t: 0.36, dur: 0.5, freq: noteFreq('G4'), wave: 'triangle', vol: 0.3, decay: 0.4 },
        ],
        total: 0.95,
      };
    case 'gameover':
      return {
        notes: [
          { t: 0, dur: 0.2, freq: noteFreq('A4'), wave: 'square', vol: 0.42 },
          { t: 0.2, dur: 0.2, freq: noteFreq('G4'), wave: 'square', vol: 0.42 },
          { t: 0.4, dur: 0.2, freq: noteFreq('F4'), wave: 'square', vol: 0.42 },
          { t: 0.6, dur: 0.6, freq: noteFreq('E4'), wave: 'square', vol: 0.42, decay: 0.5 },
          { t: 0.6, dur: 0.6, freq: noteFreq('A3'), wave: 'triangle', vol: 0.4, decay: 0.5 },
        ],
        total: 1.3,
      };
    case 'click':
      return {
        notes: [{ t: 0, dur: 0.05, freq: 820, wave: 'square', vol: 0.28, decay: 0.8 }],
        total: 0.08,
      };
    case 'select':
      return {
        notes: [
          { t: 0, dur: 0.05, freq: 660, wave: 'square', vol: 0.3 },
          { t: 0.05, dur: 0.08, freq: 990, wave: 'square', vol: 0.3, decay: 0.5 },
        ],
        total: 0.16,
      };
    case 'locked':
      return {
        notes: [
          { t: 0, dur: 0.09, freq: 170, wave: 'square', vol: 0.35 },
          { t: 0.1, dur: 0.14, freq: 130, wave: 'square', vol: 0.35 },
        ],
        total: 0.28,
      };
    case 'powerup':
      return {
        notes: [
          { t: 0, dur: 0.07, freq: noteFreq('C5'), wave: 'square', vol: 0.4 },
          { t: 0.07, dur: 0.07, freq: noteFreq('E5'), wave: 'square', vol: 0.4 },
          { t: 0.14, dur: 0.07, freq: noteFreq('G5'), wave: 'square', vol: 0.4 },
          { t: 0.21, dur: 0.07, freq: noteFreq('B5'), wave: 'square', vol: 0.42 },
          { t: 0.28, dur: 0.34, freq: noteFreq('E6'), wave: 'triangle', vol: 0.45, decay: 0.6 },
          { t: 0.28, dur: 0.34, freq: noteFreq('B5'), wave: 'sine', vol: 0.3, decay: 0.6 },
        ],
        total: 0.64,
      };
    case 'heal':
      return {
        notes: [
          { t: 0, dur: 0.1, freq: noteFreq('E5'), wave: 'sine', vol: 0.4 },
          { t: 0.09, dur: 0.1, freq: noteFreq('G5'), wave: 'sine', vol: 0.4 },
          { t: 0.18, dur: 0.3, freq: noteFreq('B5'), wave: 'sine', vol: 0.42, decay: 0.7 },
          { t: 0.18, dur: 0.3, freq: noteFreq('E6'), wave: 'triangle', vol: 0.2, decay: 0.7 },
        ],
        total: 0.52,
      };
    case 'crack':
      return {
        notes: [
          { t: 0, dur: 0.06, freq: 3200, freq2: 1500, wave: 'noise', vol: 0.34, decay: 2.4 },
          { t: 0.05, dur: 0.07, freq: 2100, freq2: 800, wave: 'noise', vol: 0.3, decay: 2.6 },
        ],
        total: 0.16,
      };
    case 'shatter':
      return {
        notes: [
          { t: 0, dur: 0.12, freq: 4200, freq2: 1200, wave: 'noise', vol: 0.5, decay: 1.6 },
          { t: 0.02, dur: 0.2, freq: 900, freq2: 260, wave: 'square', vol: 0.24, decay: 1.8 },
          { t: 0.1, dur: 0.3, freq: 2600, freq2: 700, wave: 'noise', vol: 0.3, decay: 2.2 },
          { t: 0.16, dur: 0.3, freq: noteFreq('E6'), wave: 'triangle', vol: 0.2, decay: 1.4 },
        ],
        total: 0.52,
      };
    default:
      return { notes: [], total: 0.1 };
  }
}

/* ------------------------------------------------------------------ */
/* Music                                                               */
/* ------------------------------------------------------------------ */

type BeatNote = { beat: number; beats: number; note: string; vol: number; wave: Wave };

/** Level theme: driving 8-bar loop in A minor. */
function levelTrack(): { notes: NoteSpec[]; total: number } {
  const bpm = 112;
  const spb = 60 / bpm;
  const bars = 8;
  const totalBeats = bars * 4;

  // Chord roots per bar: Am F C G Am F G Am
  const roots = ['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'G2', 'A2'];

  const spec: NoteSpec[] = [];

  // Bass: driving 8ths.
  for (let bar = 0; bar < bars; bar++) {
    for (let step = 0; step < 8; step++) {
      const beat = bar * 4 + step * 0.5;
      spec.push({
        t: beat * spb,
        dur: 0.42 * spb,
        freq: noteFreq(roots[bar]),
        wave: 'triangle',
        vol: step % 2 === 0 ? 0.5 : 0.32,
        attack: 0.004,
        release: 0.03,
        decay: 0.9,
      });
    }
  }

  // Lead melody (A minor pentatonic phrasing).
  const melody: BeatNote[] = [
    { beat: 0, beats: 1, note: 'A4', vol: 0.4, wave: 'square' },
    { beat: 1, beats: 1, note: 'C5', vol: 0.4, wave: 'square' },
    { beat: 2, beats: 1, note: 'E5', vol: 0.4, wave: 'square' },
    { beat: 3, beats: 1, note: 'D5', vol: 0.4, wave: 'square' },
    { beat: 4, beats: 1.5, note: 'C5', vol: 0.4, wave: 'square' },
    { beat: 5.5, beats: 0.5, note: 'A4', vol: 0.36, wave: 'square' },
    { beat: 6, beats: 2, note: 'G4', vol: 0.4, wave: 'square' },
    { beat: 8, beats: 1, note: 'F4', vol: 0.4, wave: 'square' },
    { beat: 9, beats: 1, note: 'A4', vol: 0.4, wave: 'square' },
    { beat: 10, beats: 1, note: 'C5', vol: 0.4, wave: 'square' },
    { beat: 11, beats: 1, note: 'A4', vol: 0.4, wave: 'square' },
    { beat: 12, beats: 2, note: 'G4', vol: 0.4, wave: 'square' },
    { beat: 14, beats: 2, note: 'E4', vol: 0.4, wave: 'square' },
    { beat: 16, beats: 1, note: 'A4', vol: 0.4, wave: 'square' },
    { beat: 17, beats: 1, note: 'C5', vol: 0.4, wave: 'square' },
    { beat: 18, beats: 1, note: 'E5', vol: 0.4, wave: 'square' },
    { beat: 19, beats: 1, note: 'G5', vol: 0.4, wave: 'square' },
    { beat: 20, beats: 1.5, note: 'E5', vol: 0.4, wave: 'square' },
    { beat: 21.5, beats: 0.5, note: 'D5', vol: 0.36, wave: 'square' },
    { beat: 22, beats: 2, note: 'C5', vol: 0.4, wave: 'square' },
    { beat: 24, beats: 1, note: 'D5', vol: 0.4, wave: 'square' },
    { beat: 25, beats: 1, note: 'C5', vol: 0.4, wave: 'square' },
    { beat: 26, beats: 1, note: 'A4', vol: 0.4, wave: 'square' },
    { beat: 27, beats: 1, note: 'G4', vol: 0.4, wave: 'square' },
    { beat: 28, beats: 3, note: 'A4', vol: 0.42, wave: 'square' },
  ];
  for (const m of melody) {
    spec.push({
      t: m.beat * spb,
      dur: m.beats * spb * 0.95,
      freq: noteFreq(m.note),
      wave: m.wave,
      vol: m.vol,
      attack: 0.005,
      release: 0.04,
      decay: m.beats >= 2 ? 0.3 : 0.7,
    });
  }

  // Light hats on off-beats.
  for (let beat = 0; beat < totalBeats; beat += 1) {
    spec.push({ t: (beat + 0.5) * spb, dur: 0.05, freq: 6500, wave: 'noise', vol: 0.1, attack: 0.001, decay: 2.5 });
  }

  return { notes: spec, total: totalBeats * spb };
}

/** Menu theme: calm 8-bar arpeggio loop. */
function menuTrack(): { notes: NoteSpec[]; total: number } {
  const bpm = 78;
  const spb = 60 / bpm;
  const bars = 8;
  const totalBeats = bars * 4;

  const chords = [
    ['A3', 'C4', 'E4', 'A4'],
    ['F3', 'A3', 'C4', 'F4'],
    ['C4', 'E4', 'G4', 'C5'],
    ['G3', 'B3', 'D4', 'G4'],
    ['A3', 'C4', 'E4', 'A4'],
    ['F3', 'A3', 'C4', 'F4'],
    ['D4', 'F4', 'A4', 'D5'],
    ['E3', 'G#3', 'B3', 'E4'],
  ];
  const roots = ['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'D3', 'E2'];

  const spec: NoteSpec[] = [];

  for (let bar = 0; bar < bars; bar++) {
    const chord = chords[bar];
    // 16th arpeggio, up then down.
    const pattern = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 2, 3, 2, 1];
    for (let step = 0; step < 16; step++) {
      const beat = bar * 4 + step * 0.25;
      spec.push({
        t: beat * spb,
        dur: 0.22 * spb,
        freq: noteFreq(chord[pattern[step]]),
        wave: 'triangle',
        vol: 0.24,
        attack: 0.004,
        release: 0.05,
        decay: 0.5,
      });
    }
    // Root bass on beats 1 and 3.
    for (const beat of [0, 2]) {
      spec.push({
        t: (bar * 4 + beat) * spb,
        dur: 1.6 * spb,
        freq: noteFreq(roots[bar]),
        wave: 'triangle',
        vol: 0.4,
        attack: 0.01,
        release: 0.2,
        decay: 0.35,
      });
    }
  }

  // Sparse melody in the second half.
  const melody: BeatNote[] = [
    { beat: 16, beats: 2, note: 'E5', vol: 0.3, wave: 'square' },
    { beat: 18, beats: 1, note: 'C5', vol: 0.3, wave: 'square' },
    { beat: 19, beats: 1, note: 'A4', vol: 0.3, wave: 'square' },
    { beat: 20, beats: 2, note: 'D5', vol: 0.3, wave: 'square' },
    { beat: 22, beats: 2, note: 'C5', vol: 0.3, wave: 'square' },
    { beat: 24, beats: 2, note: 'B4', vol: 0.3, wave: 'square' },
    { beat: 26, beats: 2, note: 'G#4', vol: 0.3, wave: 'square' },
    { beat: 28, beats: 4, note: 'A4', vol: 0.32, wave: 'square' },
  ];
  for (const m of melody) {
    spec.push({
      t: m.beat * spb,
      dur: m.beats * spb * 0.95,
      freq: noteFreq(m.note),
      wave: m.wave,
      vol: m.vol,
      attack: 0.01,
      release: 0.1,
      decay: 0.3,
    });
  }

  return { notes: spec, total: totalBeats * spb };
}

/** Forest ambience loop: wind bed + distant bird chirps. */
function ambienceTrack(): { notes: NoteSpec[]; total: number } {
  const total = 14;
  const notes: NoteSpec[] = [];
  // Wind: slow, quiet noise swells.
  for (let i = 0; i < 4; i++) {
    notes.push({
      t: i * 3.5,
      dur: 3.6,
      freq: 480,
      wave: 'noise',
      vol: 0.1,
      attack: 1.4,
      release: 1.5,
    });
  }
  // Distant birds.
  const chirps: Array<[number, number]> = [
    [1.2, 2400],
    [4.7, 2900],
    [8.1, 2200],
    [11.4, 3100],
  ];
  for (const [t, base] of chirps) {
    notes.push({ t, dur: 0.1, freq: base, freq2: base * 1.35, wave: 'sine', vol: 0.16, attack: 0.02, release: 0.04 });
    notes.push({ t: t + 0.14, dur: 0.12, freq: base * 1.3, freq2: base * 0.9, wave: 'sine', vol: 0.14, attack: 0.02, release: 0.05 });
  }
  return { notes, total };
}

/** Public: render a named sound to a WAV blob (memoised by the caller). */
export function renderSound(name: string): Blob {
  let rendered: { notes: NoteSpec[]; total: number };
  switch (name) {
    case 'music_menu':
      rendered = menuTrack();
      break;
    case 'music_level':
      rendered = levelTrack();
      break;
    case 'music_ambience':
      rendered = ambienceTrack();
      break;
    default:
      rendered = sfxNotes(name);
  }
  return encodeWav(render(rendered.notes, Math.max(0.05, rendered.total)));
}
