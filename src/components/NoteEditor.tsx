'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Note } from '@/types/transcription';
import { SIXTEENTH_SECONDS } from '@/types/transcription';
import { midiToPitch } from '@/lib/music/pitch';
import {
  DURATION_OPTIONS,
  getNextAppendStart,
  secondsToSixteenthSlot,
  sixteenthSlotToSeconds,
} from '@/lib/music/note-editing';
import { cn } from '@/lib/utils';

interface Props {
  notes: Note[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onAdd: (pitch: number, start: number, duration: number) => void;
}

const PITCH_OPTIONS = Array.from({ length: 37 }, (_, i) => 48 + i);

export default function NoteEditor({
  notes,
  selectedIndex,
  onSelect,
  onRemove,
  onAdd,
}: Props) {
  const [pitch, setPitch] = useState(60);
  const [startSlot, setStartSlot] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(SIXTEENTH_SECONDS);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onAdd(pitch, sixteenthSlotToSeconds(startSlot), durationSeconds);
    setStartSlot(secondsToSixteenthSlot(getNextAppendStart(notes)) + 1);
  }

  function formatDuration(note: Note): string {
    const sixteenths = Math.round((note.end - note.start) / SIXTEENTH_SECONDS);
    if (sixteenths >= 4) return 'noire';
    if (sixteenths >= 2) return 'croche';
    return 'double-croche';
  }

  return (
    <section className="mt-4 flex flex-col gap-4" aria-label="Éditeur de notes">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Notes ({notes.length})</h2>
        <p className="text-xs text-muted-foreground">
          Cliquez sur une note dans la liste ou sur la partition pour la sélectionner.
        </p>
      </div>

      {notes.length > 0 ? (
        <div className="overflow-x-auto rounded-none border border-border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Hauteur</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Début</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Durée</th>
                <th className="px-3 py-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {notes.map((note, index) => (
                <tr
                  key={`${index}-${note.start}-${note.pitch}`}
                  className={cn(
                    'cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/30',
                    selectedIndex === index && 'bg-primary/15',
                  )}
                  onClick={() => onSelect(index)}
                >
                  <td className="px-3 py-2">{index + 1}</td>
                  <td className="px-3 py-2">{midiToPitch(note.pitch)}</td>
                  <td className="px-3 py-2">{secondsToSixteenthSlot(note.start)}</td>
                  <td className="px-3 py-2">{formatDuration(note)}</td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(index);
                      }}
                      aria-label={`Supprimer la note ${midiToPitch(note.pitch)}`}
                    >
                      Supprimer
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Aucune note — ajoutez-en une ci-dessous ou cliquez sur la portée.
        </p>
      )}

      <form className="flex flex-col gap-3 border-t border-border pt-4" onSubmit={handleSubmit}>
        <h3 className="text-sm font-medium">Ajouter une note</h3>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor="note-pitch">Hauteur</FieldLabel>
            <Select value={String(pitch)} onValueChange={(v) => setPitch(Number(v))}>
              <SelectTrigger id="note-pitch">
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
            <FieldLabel htmlFor="note-start">Début (case 16e)</FieldLabel>
            <Input
              id="note-start"
              type="number"
              min={0}
              value={startSlot}
              onChange={(e) => setStartSlot(Math.max(0, Number(e.target.value)))}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="note-duration">Durée</FieldLabel>
            <Select
              value={String(durationSeconds)}
              onValueChange={(v) => setDurationSeconds(Number(v))}
            >
              <SelectTrigger id="note-duration">
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

          <Button type="submit">Ajouter</Button>
        </FieldGroup>
      </form>
    </section>
  );
}
