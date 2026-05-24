'use client';

import { useEffect, useRef } from 'react';
import {
  Renderer,
  Stave,
  StaveNote,
  StaveTie,
  Voice,
  Formatter,
  Accidental,
} from 'vexflow';
import type { Note } from '@/types/transcription';
import { SIXTEENTH_SECONDS } from '@/types/transcription';
import {
  STAVE_LEFT,
  STAVE_Y,
  staffClickToStart,
  yToMidiPitch,
} from '@/lib/music/note-editing';
import {
  buildTickableSpecs,
  secondsToVexDuration,
} from '@/lib/music/vexflow-layout';

interface Props {
  notes: Note[];
  width?: number;
  height?: number;
  timelineDuration: number;
  selectedIndex?: number | null;
  onNoteSelect?: (index: number) => void;
  onStaffClick?: (pitch: number, start: number) => void;
  onSvgReady?: (svg: SVGSVGElement | null) => void;
}

// MIDI pitch → VexFlow key string (e.g. 60 -> "c/4", 61 -> "c#/4")
const SHARP_PITCH_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

function midiToVexKey(midi: number): { key: string; needsAccidental: boolean } {
  const name = SHARP_PITCH_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { key: `${name}/${octave}`, needsAccidental: name.includes('#') };
}

export default function SheetMusicRenderer({
  notes,
  width = 800,
  height = 220,
  timelineDuration,
  selectedIndex = null,
  onNoteSelect,
  onStaffClick,
  onSvgReady,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onNoteSelectRef = useRef(onNoteSelect);
  const onStaffClickRef = useRef(onStaffClick);
  const onSvgReadyRef = useRef(onSvgReady);
  const timelineDurationRef = useRef(timelineDuration);
  const noteAreaRef = useRef({ left: 0, width: 0 });

  onNoteSelectRef.current = onNoteSelect;
  onStaffClickRef.current = onStaffClick;
  onSvgReadyRef.current = onSvgReady;
  timelineDurationRef.current = timelineDuration;

  const staveWidth = width - 20;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.innerHTML = '';

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const ctx = renderer.getContext();
    const svg = host.querySelector('svg') as SVGSVGElement | null;
    onSvgReadyRef.current?.(svg);

    const stave = new Stave(STAVE_LEFT, STAVE_Y, staveWidth);
    stave.addClef('treble').addTimeSignature('4/4');
    stave.setContext(ctx).draw();

    const noteStartX = stave.getNoteStartX();
    const noteAreaLeft = noteStartX - STAVE_LEFT;
    const noteAreaWidth = Math.max(1, staveWidth - noteAreaLeft);
    noteAreaRef.current = { left: noteAreaLeft, width: noteAreaWidth };

    const cleanups: Array<() => void> = [];

    if (notes.length > 0) {
      const specs = buildTickableSpecs(notes);
      const staveNotes: StaveNote[] = [];
      const noteIndicesForStaveNote: number[] = [];

      for (const spec of specs) {
        if (spec.kind === 'rest') {
          const dur = `${secondsToVexDuration(spec.durationSec)}r`;
          staveNotes.push(
            new StaveNote({ keys: ['b/4'], duration: dur, type: 'r' }),
          );
          noteIndicesForStaveNote.push(-1);
          continue;
        }

        const { key, needsAccidental } = midiToVexKey(spec.note.pitch);
        const duration = secondsToVexDuration(
          Math.max(spec.note.end - spec.note.start, SIXTEENTH_SECONDS),
        );
        const sn = new StaveNote({ keys: [key], duration });
        if (needsAccidental) sn.addModifier(new Accidental('#'), 0);
        if (spec.noteIndex === selectedIndex) {
          sn.setStyle({ fillStyle: '#5b8def', strokeStyle: '#3a6ad1' });
        }
        staveNotes.push(sn);
        noteIndicesForStaveNote.push(spec.noteIndex);
      }

      try {
        const voice = new Voice({ num_beats: staveNotes.length, beat_value: 4 }).setStrict(false);
        voice.addTickables(staveNotes);
        new Formatter().joinVoices([voice]).format([voice], width - 80);
        voice.draw(ctx, stave);

        for (let i = 0; i < specs.length; i++) {
          const spec = specs[i];
          if (spec.kind !== 'note' || !spec.note.tied_to_next) continue;
          let nextNoteStaveIdx = -1;
          for (let j = i + 1; j < specs.length; j++) {
            if (specs[j].kind === 'note') {
              nextNoteStaveIdx = j;
              break;
            }
          }
          if (nextNoteStaveIdx < 0) continue;
          const tie = new StaveTie({
            first_note: staveNotes[i],
            last_note: staveNotes[nextNoteStaveIdx],
            first_indices: [0],
            last_indices: [0],
          });
          tie.setContext(ctx).draw();
        }

        staveNotes.forEach((sn, staveIdx) => {
          const noteIndex = noteIndicesForStaveNote[staveIdx];
          if (noteIndex < 0) return;
          const el = sn.getSVGElement?.();
          if (!el) return;
          el.style.cursor = 'pointer';
          const handler = (e: Event) => {
            e.stopPropagation();
            onNoteSelectRef.current?.(noteIndex);
          };
          el.addEventListener('click', handler);
          cleanups.push(() => el.removeEventListener('click', handler));
        });
      } catch (err) {
        ctx.setFont('sans-serif', 12).fillText(
          `Render error: ${(err as Error).message}`,
          30,
          100,
        );
      }
    }

    if (svg && onStaffClickRef.current) {
      svg.style.cursor = 'crosshair';
      const staffHandler = (e: MouseEvent) => {
        const target = e.target as Element;
        if (target.closest('.vf-stavenote')) return;
        const rect = svg.getBoundingClientRect();
        const scrollParent = host.closest('.daw-sheet-inner');
        const scrollLeft = scrollParent?.scrollLeft ?? 0;
        const y = e.clientY - rect.top;
        const xOnStave = e.clientX - rect.left + scrollLeft - STAVE_LEFT;
        const pitch = yToMidiPitch(y, STAVE_Y);
        const { left, width: areaWidth } = noteAreaRef.current;
        const start = staffClickToStart(
          xOnStave,
          left,
          areaWidth,
          timelineDurationRef.current,
        );
        onStaffClickRef.current?.(pitch, start);
      };
      svg.addEventListener('click', staffHandler);
      cleanups.push(() => svg.removeEventListener('click', staffHandler));
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
      onSvgReadyRef.current?.(null);
    };
  }, [notes, width, height, selectedIndex, staveWidth, timelineDuration]);

  return <div ref={hostRef} aria-label="Sheet music" className="sheet-renderer" />;
}
