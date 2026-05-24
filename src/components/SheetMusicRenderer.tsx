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
import { secondsToVexDuration } from '@/lib/music/vexflow-layout';
import type { DisplayNote, SelectedNoteRef } from '@/types/display';

interface Props {
  displayNotes: DisplayNote[];
  width?: number;
  height?: number;
  timelineDuration: number;
  selectedNoteRef?: SelectedNoteRef | null;
  onNoteSelect?: (trackId: string, indexInTrack: number) => void;
  onNotePitchChange?: (trackId: string, indexInTrack: number, newPitch: number) => void;
  onStaffClick?: (pitch: number, start: number) => void;
  onSvgReady?: (svg: SVGSVGElement | null) => void;
}

const SHARP_PITCH_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

function midiToVexKey(midi: number): { key: string; needsAccidental: boolean } {
  const name = SHARP_PITCH_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { key: `${name}/${octave}`, needsAccidental: name.includes('#') };
}

// Build a flat list of {kind: 'note'|'rest', ...} where rests fill gaps between
// merged notes so VexFlow spacing reflects timing across all tracks at once.
interface MergedSpec {
  kind: 'note' | 'rest';
  durationSec: number;
  displayIndex?: number;
  display?: DisplayNote;
}

function buildMergedSpecs(displayNotes: DisplayNote[]): MergedSpec[] {
  if (displayNotes.length === 0) return [];
  const specs: MergedSpec[] = [];
  let cursor = 0;
  const minGap = SIXTEENTH_SECONDS / 2;

  for (let i = 0; i < displayNotes.length; i++) {
    const d = displayNotes[i];
    const gap = d.note.start - cursor;
    if (gap > minGap) {
      specs.push({ kind: 'rest', durationSec: gap });
    }
    specs.push({
      kind: 'note',
      durationSec: Math.max(d.note.end - d.note.start, SIXTEENTH_SECONDS),
      displayIndex: i,
      display: d,
    });
    cursor = Math.max(cursor, d.note.end);
  }
  return specs;
}

export default function SheetMusicRenderer({
  displayNotes,
  width = 800,
  height = 220,
  timelineDuration,
  selectedNoteRef = null,
  onNoteSelect,
  onNotePitchChange,
  onStaffClick,
  onSvgReady,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onNoteSelectRef = useRef(onNoteSelect);
  const onNotePitchChangeRef = useRef(onNotePitchChange);
  const onStaffClickRef = useRef(onStaffClick);
  const onSvgReadyRef = useRef(onSvgReady);
  const timelineDurationRef = useRef(timelineDuration);
  const noteAreaRef = useRef({ left: 0, width: 0 });

  onNoteSelectRef.current = onNoteSelect;
  onNotePitchChangeRef.current = onNotePitchChange;
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

    if (displayNotes.length > 0) {
      const specs = buildMergedSpecs(displayNotes);
      const staveNotes: StaveNote[] = [];
      // Map each stave-note index back to its DisplayNote (or null for rests)
      const specMeta: Array<{ display: DisplayNote | null }> = [];

      for (const spec of specs) {
        if (spec.kind === 'rest') {
          const dur = `${secondsToVexDuration(spec.durationSec)}r`;
          staveNotes.push(
            new StaveNote({ keys: ['b/4'], duration: dur, type: 'r' }),
          );
          specMeta.push({ display: null });
          continue;
        }

        const display = spec.display!;
        const { key, needsAccidental } = midiToVexKey(display.note.pitch);
        const duration = secondsToVexDuration(spec.durationSec);
        const sn = new StaveNote({ keys: [key], duration });
        if (needsAccidental) sn.addModifier(new Accidental('#'), 0);

        const isSelected =
          selectedNoteRef?.trackId === display.trackId &&
          selectedNoteRef.indexInTrack === display.indexInTrack;

        sn.setStyle({
          fillStyle: isSelected ? '#0b3aa8' : display.color,
          strokeStyle: isSelected ? '#0b3aa8' : display.color,
        });
        staveNotes.push(sn);
        specMeta.push({ display });
      }

      try {
        const voice = new Voice({ num_beats: staveNotes.length, beat_value: 4 }).setStrict(false);
        voice.addTickables(staveNotes);
        new Formatter().joinVoices([voice]).format([voice], staveWidth - 80);
        voice.draw(ctx, stave);

        // Ties for tied_to_next within a single track (consecutive same-track notes)
        for (let i = 0; i < specs.length; i++) {
          const meta = specMeta[i];
          if (!meta.display || !meta.display.note.tied_to_next) continue;
          // Find next stave note belonging to the same track
          let nextIdx = -1;
          for (let j = i + 1; j < specMeta.length; j++) {
            if (specMeta[j].display?.trackId === meta.display.trackId) {
              nextIdx = j;
              break;
            }
          }
          if (nextIdx < 0) continue;
          const tie = new StaveTie({
            first_note: staveNotes[i],
            last_note: staveNotes[nextIdx],
            first_indices: [0],
            last_indices: [0],
          });
          tie.setContext(ctx).draw();
        }

        // Wire click + drag interactions per note
        staveNotes.forEach((sn, idx) => {
          const meta = specMeta[idx];
          if (!meta.display) return;
          const el = sn.getSVGElement?.();
          if (!el) return;
          el.style.cursor = 'grab';

          const display = meta.display;
          let dragState: {
            startY: number;
            startPitch: number;
            currentPitch: number;
            moved: boolean;
          } | null = null;

          const onMouseDown = (e: MouseEvent) => {
            e.stopPropagation();
            dragState = {
              startY: e.clientY,
              startPitch: display.note.pitch,
              currentPitch: display.note.pitch,
              moved: false,
            };
            el.style.cursor = 'grabbing';

            const onMove = (ev: MouseEvent) => {
              if (!dragState) return;
              // One semitone per 5px of vertical drag (drag UP raises pitch).
              const dy = ev.clientY - dragState.startY;
              const semitones = Math.round(-dy / 5);
              const newPitch = Math.max(36, Math.min(96, dragState.startPitch + semitones));
              if (Math.abs(dy) > 3) dragState.moved = true;
              if (newPitch !== dragState.currentPitch) {
                dragState.currentPitch = newPitch;
              }
            };

            const onUp = () => {
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
              el.style.cursor = 'grab';
              if (!dragState) return;
              const ds = dragState;
              dragState = null;
              if (!ds.moved) {
                // Treat as click: select the note
                onNoteSelectRef.current?.(display.trackId, display.indexInTrack);
                return;
              }
              if (ds.currentPitch !== ds.startPitch) {
                onNotePitchChangeRef.current?.(
                  display.trackId,
                  display.indexInTrack,
                  ds.currentPitch,
                );
              }
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          };

          el.addEventListener('mousedown', onMouseDown);
          cleanups.push(() => el.removeEventListener('mousedown', onMouseDown));
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
  }, [displayNotes, width, height, selectedNoteRef, staveWidth]);

  return <div ref={hostRef} aria-label="Sheet music" className="sheet-renderer" />;
}
