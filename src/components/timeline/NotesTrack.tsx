'use client';

import type { Note } from '@/types/transcription';
import { midiToPitch } from '@/lib/music/pitch';
import { cn } from '@/lib/utils';

interface NotesTrackProps {
  notes: Note[];
  duration: number;
  width: number;
  height?: number;
  selectedIndex?: number | null;
  onNoteSelect?: (index: number) => void;
  className?: string;
}

export function NotesTrack({
  notes,
  duration,
  width,
  height = 56,
  selectedIndex = null,
  onNoteSelect,
  className,
}: NotesTrackProps) {
  if (notes.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-xs text-muted-foreground',
          className,
        )}
        style={{ width, height }}
      >
        Aucune note
      </div>
    );
  }

  const scale = duration > 0 ? width / duration : 1;

  return (
    <div className={cn('relative', className)} style={{ width, height }}>
      {notes.map((note, index) => {
        const left = note.start * scale;
        const noteWidth = Math.max(4, (note.end - note.start) * scale);
        const isSelected = selectedIndex === index;

        return (
          <button
            key={`${index}-${note.start}-${note.pitch}`}
            type="button"
            className={cn(
              'absolute top-1 rounded-none border border-primary/40 bg-primary/50 transition-colors hover:bg-primary/70',
              isSelected && 'ring-1 ring-primary bg-primary/80',
            )}
            style={{
              left,
              width: noteWidth,
              height: height - 8,
            }}
            title={`${midiToPitch(note.pitch)} (${note.start.toFixed(2)}s)`}
            onClick={() => onNoteSelect?.(index)}
            aria-label={`Note ${midiToPitch(note.pitch)}`}
          />
        );
      })}
    </div>
  );
}
