export const PLAYBACK_INSTRUMENT_IDS = [
  "piano",
  "guitar-acoustic",
  "bass-electric",
  "flute",
] as const;

export type PlaybackInstrumentId = (typeof PLAYBACK_INSTRUMENT_IDS)[number];

export type NotationKind = "grand-staff" | "treble" | "bass" | "tab";

export interface SamplerConfig {
  urls: Record<string, string>;
  baseUrl: string;
  reverb: { decay: number; wet: number };
  release: number;
}

export interface FallbackSynthConfig {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface InstrumentDefinition {
  id: PlaybackInstrumentId;
  label: string;
  notationKind: NotationKind;
  pitchMin: number;
  pitchMax: number;
  sampler: SamplerConfig;
  fallback: FallbackSynthConfig;
}

const TONEJS_BASE = "https://nbrosowsky.github.io/tonejs-instruments/samples/";

const SALAMANDER_BASE_URL = "https://tonejs.github.io/audio/salamander/";

const SALAMANDER_URLS: Record<string, string> = {
  A0: "A0.mp3",
  C1: "C1.mp3",
  "D#1": "Ds1.mp3",
  "F#1": "Fs1.mp3",
  A1: "A1.mp3",
  C2: "C2.mp3",
  "D#2": "Ds2.mp3",
  "F#2": "Fs2.mp3",
  A2: "A2.mp3",
  C3: "C3.mp3",
  "D#3": "Ds3.mp3",
  "F#3": "Fs3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  "F#4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  "D#5": "Ds5.mp3",
  "F#5": "Fs5.mp3",
  A5: "A5.mp3",
  C6: "C6.mp3",
  "D#6": "Ds6.mp3",
  "F#6": "Fs6.mp3",
  A6: "A6.mp3",
  C7: "C7.mp3",
  "D#7": "Ds7.mp3",
  "F#7": "Fs7.mp3",
  A7: "A7.mp3",
  C8: "C8.mp3",
};

const GUITAR_ACOUSTIC_URLS: Record<string, string> = {
  E2: "E2.mp3",
  "F#2": "Fs2.mp3",
  A2: "A2.mp3",
  B2: "B2.mp3",
  C3: "C3.mp3",
  "D#3": "Ds3.mp3",
  D3: "D3.mp3",
  E3: "E3.mp3",
  "F#3": "Fs3.mp3",
  G3: "G3.mp3",
  "A#3": "As3.mp3",
  B3: "B3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  E4: "E4.mp3",
  "F#4": "Fs4.mp3",
  G4: "G4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
};

const BASS_ELECTRIC_URLS: Record<string, string> = {
  E1: "E1.mp3",
  G1: "G1.mp3",
  "A#1": "As1.mp3",
  "C#2": "Cs2.mp3",
  E2: "E2.mp3",
  G2: "G2.mp3",
  "A#2": "As2.mp3",
  "C#3": "Cs3.mp3",
  E3: "E3.mp3",
  G3: "G3.mp3",
  "A#3": "As3.mp3",
  "C#4": "Cs4.mp3",
  E4: "E4.mp3",
  G4: "G4.mp3",
  "A#4": "As4.mp3",
  "C#5": "Cs5.mp3",
};

const FLUTE_URLS: Record<string, string> = {
  C4: "C4.mp3",
  E4: "E4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  E5: "E5.mp3",
  A5: "A5.mp3",
  C6: "C6.mp3",
  E6: "E6.mp3",
  A6: "A6.mp3",
  C7: "C7.mp3",
};

export const INSTRUMENTS: Record<PlaybackInstrumentId, InstrumentDefinition> = {
  piano: {
    id: "piano",
    label: "piano",
    notationKind: "grand-staff",
    pitchMin: 36,
    pitchMax: 84,
    sampler: {
      urls: SALAMANDER_URLS,
      baseUrl: SALAMANDER_BASE_URL,
      reverb: { decay: 2, wet: 0.25 },
      release: 1.2,
    },
    fallback: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.4 },
  },
  "guitar-acoustic": {
    id: "guitar-acoustic",
    label: "guitare",
    notationKind: "tab",
    pitchMin: 40,
    pitchMax: 88,
    sampler: {
      urls: GUITAR_ACOUSTIC_URLS,
      baseUrl: `${TONEJS_BASE}guitar-acoustic/`,
      reverb: { decay: 1.5, wet: 0.15 },
      release: 0.8,
    },
    fallback: { attack: 0.001, decay: 0.35, sustain: 0.05, release: 0.6 },
  },
  "bass-electric": {
    id: "bass-electric",
    label: "basse",
    notationKind: "bass",
    pitchMin: 28,
    pitchMax: 55,
    sampler: {
      urls: BASS_ELECTRIC_URLS,
      baseUrl: `${TONEJS_BASE}bass-electric/`,
      reverb: { decay: 1.2, wet: 0.12 },
      release: 0.6,
    },
    fallback: { attack: 0.005, decay: 0.25, sustain: 0.15, release: 0.5 },
  },
  flute: {
    id: "flute",
    label: "flûte",
    notationKind: "treble",
    pitchMin: 60,
    pitchMax: 96,
    sampler: {
      urls: FLUTE_URLS,
      baseUrl: `${TONEJS_BASE}flute/`,
      reverb: { decay: 1.8, wet: 0.2 },
      release: 0.35,
    },
    fallback: { attack: 0.08, decay: 0.15, sustain: 0.5, release: 0.25 },
  },
};

export function getInstrumentDefinition(
  id: PlaybackInstrumentId,
): InstrumentDefinition {
  return INSTRUMENTS[id];
}

export function getInstrumentLabel(id: PlaybackInstrumentId): string {
  return INSTRUMENTS[id].label;
}

export function getInstrumentOptions(): { id: PlaybackInstrumentId; label: string }[] {
  return PLAYBACK_INSTRUMENT_IDS.map((id) => ({
    id,
    label: INSTRUMENTS[id].label,
  }));
}

export function getNotationKind(id: PlaybackInstrumentId): NotationKind {
  return INSTRUMENTS[id].notationKind;
}

export function isPlaybackInstrumentId(value: string): value is PlaybackInstrumentId {
  return (PLAYBACK_INSTRUMENT_IDS as readonly string[]).includes(value);
}
