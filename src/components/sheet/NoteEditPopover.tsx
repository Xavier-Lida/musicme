'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DURATION_OPTIONS } from '@/lib/music/note-editing';
import { midiToPitch } from '@/lib/music/pitch';
import type { Note } from '@/types/transcription';

const PITCH_OPTIONS = Array.from({ length: 49 }, (_, i) => 40 + i);

interface NoteEditPopoverProps {
  note: Note;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorPoint: { x: number; y: number } | null;
  onApply: (patch: { pitch: number; end: number }) => void;
  onRemove: () => void;
}

function noteDurationSeconds(note: Note): number {
  return note.end - note.start;
}

export function NoteEditPopover({
  note,
  open,
  onOpenChange,
  anchorPoint,
  onApply,
  onRemove,
}: NoteEditPopoverProps) {
  const [pitch, setPitch] = useState(note.pitch);
  const [duration, setDuration] = useState(noteDurationSeconds(note));

  useEffect(() => {
    setPitch(note.pitch);
    setDuration(noteDurationSeconds(note));
  }, [note]);

  function handleApply() {
    onApply({ pitch, end: note.start + duration });
    onOpenChange(false);
  }

  function handleRemove() {
    onRemove();
    onOpenChange(false);
  }

  if (!anchorPoint) return null;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <span
          aria-hidden
          style={{
            position: 'fixed',
            left: anchorPoint.x,
            top: anchorPoint.y,
            width: 1,
            height: 1,
            pointerEvents: 'none',
          }}
        />
      </PopoverAnchor>
      <PopoverContent className="w-64" align="center" side="bottom" sideOffset={8}>
        <PopoverHeader>
          <PopoverTitle className="text-sm">Modifier la note</PopoverTitle>
        </PopoverHeader>
        <FieldGroup className="gap-3 pt-2">
          <Field>
            <FieldLabel htmlFor="popover-pitch">Hauteur</FieldLabel>
            <Select value={String(pitch)} onValueChange={(v) => setPitch(Number(v))}>
              <SelectTrigger id="popover-pitch" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PITCH_OPTIONS.map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      {midiToPitch(p)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="popover-duration">Durée</FieldLabel>
            <Select
              value={String(duration)}
              onValueChange={(v) => setDuration(Number(v))}
            >
              <SelectTrigger id="popover-duration" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d.label} value={String(d.seconds)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" className="flex-1" onClick={handleApply}>
              Appliquer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleRemove}
            >
              Supprimer
            </Button>
          </div>
        </FieldGroup>
      </PopoverContent>
    </Popover>
  );
}
