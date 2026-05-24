import type { Note } from '@/types/transcription';

export interface SelectedNoteRef {
  trackId: string;
  indexInTrack: number;
}

// A note tagged with its origin track for the merged partition view.
export interface DisplayNote {
  note: Note;
  trackId: string;
  indexInTrack: number;
  color: string;
}
