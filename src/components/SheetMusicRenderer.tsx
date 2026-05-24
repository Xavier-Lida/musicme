'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractiveNote } from '@/components/sheet/InteractiveNote';
import { NoteEditPopover } from '@/components/sheet/NoteEditPopover';
import { StaffLines, TimeSignature } from '@/components/sheet/StaffLines';
import { BassClef, GrandStaffBrace, TrebleClef } from '@/components/sheet/clefs';
import { staffClickToStart } from '@/lib/music/note-editing';
import {
  BASS_STAVE_Y,
  NOTE_AREA_LEFT,
  TREBLE_STAVE_Y,
  computeGrandStaffLayout,
  computeSheetWidth,
  pitchToGrandStaffY,
  splitNoteForPiano,
  timeToX,
  yToGrandStaffPitch,
} from '@/lib/music/staff-geometry';
import type { DisplayNote, SelectedNoteRef } from '@/types/display';

interface Props {
  displayNotes: DisplayNote[];
  width?: number;
  timelineDuration: number;
  selectedNoteRef?: SelectedNoteRef | null;
  onNoteSelect?: (trackId: string, indexInTrack: number) => void;
  onNotePitchChange?: (trackId: string, indexInTrack: number, newPitch: number) => void;
  onNoteUpdate?: (
    trackId: string,
    indexInTrack: number,
    patch: { pitch?: number; end?: number },
  ) => void;
  onNoteRemove?: (trackId: string, indexInTrack: number) => void;
  onStaffClick?: (pitch: number, start: number) => void;
  onSvgReady?: (svg: SVGSVGElement | null) => void;
}

function noteKey(d: DisplayNote): string {
  return `${d.trackId}-${d.indexInTrack}`;
}

function clientYToSvgY(svg: SVGSVGElement, clientY: number): number {
  const pt = svg.createSVGPoint();
  pt.x = 0;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return clientY;
  return pt.matrixTransform(ctm.inverse()).y;
}

export default function SheetMusicRenderer({
  displayNotes,
  width = 800,
  timelineDuration,
  selectedNoteRef = null,
  onNoteSelect,
  onNotePitchChange,
  onNoteUpdate,
  onNoteRemove,
  onStaffClick,
  onSvgReady,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [editRef, setEditRef] = useState<SelectedNoteRef | null>(null);
  const [anchorPoint, setAnchorPoint] = useState<{ x: number; y: number } | null>(null);
  const [previewPitches, setPreviewPitches] = useState<Record<string, number>>({});

  const sheetWidth = computeSheetWidth(width, timelineDuration);

  const displayedPitches = useMemo(
    () =>
      displayNotes.map((d) => previewPitches[noteKey(d)] ?? d.note.pitch),
    [displayNotes, previewPitches],
  );

  const { offsetY, height } = useMemo(
    () => computeGrandStaffLayout(displayedPitches),
    [displayedPitches],
  );

  useEffect(() => {
    onSvgReady?.(svgRef.current);
    return () => onSvgReady?.(null);
  }, [onSvgReady, displayNotes, sheetWidth, height, offsetY, selectedNoteRef, timelineDuration]);

  const closePopover = useCallback(() => {
    setEditRef(null);
    setAnchorPoint(null);
  }, []);

  const yToPitchAtOffset = useCallback(
    (svgY: number) => yToGrandStaffPitch(svgY - offsetY),
    [offsetY],
  );

  const handleStaffBackgroundClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if ((e.target as Element).closest('.sheet-note')) return;
      if (!onStaffClick || !svgRef.current) return;

      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      const scrollParent = svg.closest('.daw-sheet-inner');
      const scrollLeft = scrollParent?.scrollLeft ?? 0;
      const x = e.clientX - rect.left + scrollLeft;
      const y = e.clientY - rect.top;
      const start = staffClickToStart(x, timelineDuration);
      const pitch = yToPitchAtOffset(y);
      onStaffClick(pitch, start);
    },
    [onStaffClick, timelineDuration, yToPitchAtOffset],
  );

  const makeYToPitch = useCallback(
    (svg: SVGSVGElement) => {
      return (clientY: number) => {
        const y = clientYToSvgY(svg, clientY);
        return yToPitchAtOffset(y);
      };
    },
    [yToPitchAtOffset],
  );

  function openEditPopover(
    ref: SelectedNoteRef,
    clientX: number,
    clientY: number,
  ) {
    onNoteSelect?.(ref.trackId, ref.indexInTrack);
    setEditRef(ref);
    setAnchorPoint({ x: clientX, y: clientY });
  }

  function renderPianoStaff() {
    const staffWidth = sheetWidth - NOTE_AREA_LEFT;

    return (
      <>
        <GrandStaffBrace
          x={NOTE_AREA_LEFT - 8}
          y={TREBLE_STAVE_Y - 4}
          height={BASS_STAVE_Y - TREBLE_STAVE_Y + 44}
        />
        <StaffLines staveTop={TREBLE_STAVE_Y} width={staffWidth} x={NOTE_AREA_LEFT} />
        <StaffLines staveTop={BASS_STAVE_Y} width={staffWidth} x={NOTE_AREA_LEFT} />
        <TrebleClef y={TREBLE_STAVE_Y + 32} />
        <BassClef y={BASS_STAVE_Y + 28} />
        <TimeSignature x={52} staveTop={TREBLE_STAVE_Y} />
        <TimeSignature x={52} staveTop={BASS_STAVE_Y} />

        {displayNotes.map((d) => {
          const key = noteKey(d);
          const pitch = previewPitches[key] ?? d.note.pitch;
          const clef = splitNoteForPiano(pitch);
          const x = timeToX(d.note.start);
          const y = pitchToGrandStaffY(pitch);
          const svg = svgRef.current;
          if (!svg) return null;

          const selected =
            selectedNoteRef?.trackId === d.trackId &&
            selectedNoteRef.indexInTrack === d.indexInTrack;

          return (
            <InteractiveNote
              key={`${key}-${d.note.start}-${d.note.pitch}`}
              x={x}
              y={y}
              pitch={pitch}
              clef={clef}
              selected={selected}
              noteColor={d.color}
              yToPitch={makeYToPitch(svg)}
              onPitchPreview={(p) =>
                setPreviewPitches((prev) => ({ ...prev, [key]: p }))
              }
              onPitchCommit={(p) => {
                setPreviewPitches((prev) => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                });
                onNotePitchChange?.(d.trackId, d.indexInTrack, p);
              }}
              onEditRequest={(clientX, clientY) =>
                openEditPopover(
                  { trackId: d.trackId, indexInTrack: d.indexInTrack },
                  clientX,
                  clientY,
                )
              }
            />
          );
        })}
      </>
    );
  }

  const editDisplay =
    editRef !== null
      ? displayNotes.find(
          (d) =>
            d.trackId === editRef.trackId && d.indexInTrack === editRef.indexInTrack,
        )
      : null;

  return (
    <>
      <svg
        ref={svgRef}
        width={sheetWidth}
        height={height}
        className="sheet-renderer-svg"
        aria-label="Partition"
        onClick={handleStaffBackgroundClick}
        style={{ cursor: onStaffClick ? 'crosshair' : 'default' }}
      >
        <rect width={sheetWidth} height={height} fill="#fff" />
        <g transform={`translate(0, ${offsetY})`}>{renderPianoStaff()}</g>
      </svg>

      {editDisplay && editRef && anchorPoint && (
        <NoteEditPopover
          note={editDisplay.note}
          open
          onOpenChange={(open) => {
            if (!open) closePopover();
          }}
          anchorPoint={anchorPoint}
          onApply={(patch) => {
            onNoteUpdate?.(editRef.trackId, editRef.indexInTrack, patch);
            closePopover();
          }}
          onRemove={() => {
            onNoteRemove?.(editRef.trackId, editRef.indexInTrack);
            closePopover();
          }}
        />
      )}
    </>
  );
}
