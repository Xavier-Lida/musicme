export interface Note {
  pitch: number;
  start: number;
  end: number;
  velocity: number;
}

export interface TranscriptionResult {
  bpm: number;
  subdivision: number;
  time_signature: '4/4';
  notes: Note[];
}

export const FIXED_BPM = 120;
export const GRID_SUBDIVISION = 16;
export const SIXTEENTH_SECONDS = 60 / FIXED_BPM / 4; // 0.125 s
