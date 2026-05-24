import type { Note } from '@/types/transcription';
import { FIXED_BPM, SIXTEENTH_SECONDS } from '@/types/transcription';
import { sortNotesByStart } from '@/lib/music/note-editing';

export function secondsToVexDuration(seconds: number): string {
  const quarters = seconds / (60 / FIXED_BPM);
  if (quarters >= 4) return 'w';
  if (quarters >= 2) return 'h';
  if (quarters >= 1) return 'q';
  if (quarters >= 0.5) return '8';
  return '16';
}

export type TickableSpec =
  | { kind: 'rest'; durationSec: number }
  | { kind: 'note'; noteIndex: number; note: Note };

/** Build note + rest specs so VexFlow spacing reflects note.start gaps. */
export function buildTickableSpecs(notes: Note[]): TickableSpec[] {
  if (notes.length === 0) return [];

  const sortedIndices = notes
    .map((_, i) => i)
    .sort((a, b) => notes[a].start - notes[b].start || notes[a].pitch - notes[b].pitch);

  const specs: TickableSpec[] = [];
  let cursor = 0;
  const minGap = SIXTEENTH_SECONDS / 2;

  for (const noteIndex of sortedIndices) {
    const note = notes[noteIndex];
    const gap = note.start - cursor;
    if (gap > minGap) {
      specs.push({ kind: 'rest', durationSec: gap });
    }
    specs.push({ kind: 'note', noteIndex, note });
    cursor = note.end;
  }

  return specs;
}
