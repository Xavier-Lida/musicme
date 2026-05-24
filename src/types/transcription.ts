export type CleanupPreset = 'beginner' | 'standard' | 'expert';

export interface CleanupOptions {
  preset?: CleanupPreset;
  repeat_strategy?: 'merge' | 'tie' | 'split';
  max_gap?: number;
}

export interface Note {
  pitch: number;
  start: number;
  end: number;
  velocity: number;
  tied_to_next?: boolean;
}

export interface TranscriptionResult {
  bpm: number;
  subdivision: number;
  time_signature: '4/4';
  notes: Note[];
  raw_notes?: Note[];
}

export interface RecleanupResult {
  notes: Note[];
}

export const FIXED_BPM = 120;
export const GRID_SUBDIVISION = 16;
export const SIXTEENTH_SECONDS = 60 / FIXED_BPM / 4; // 0.125 s
