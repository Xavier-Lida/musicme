'use client';

import { useRef, useState } from 'react';
import { midiToTab } from '@/lib/music/guitar-tab';

const DRAG_THRESHOLD = 4;

interface TabNoteProps {
  x: number;
  pitch: number;
  tabTop: number;
  selected: boolean;
  onPitchPreview: (pitch: number) => void;
  onPitchCommit: (pitch: number) => void;
  onEditRequest: (clientX: number, clientY: number) => void;
  yToPitch: (clientY: number) => number;
}

export function TabNote({
  x,
  pitch,
  tabTop,
  selected,
  onPitchPreview,
  onPitchCommit,
  onEditRequest,
  yToPitch,
}: TabNoteProps) {
  const [dragging, setDragging] = useState(false);
  const [previewPitch, setPreviewPitch] = useState<number | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  const displayPitch = previewPitch ?? pitch;
  const { stringIndex, fret } = midiToTab(displayPitch);
  const y = tabTop + stringIndex * 10;
  const fill = selected || dragging ? '#5b8def' : '#fff';
  const stroke = selected || dragging ? '#3a6ad1' : '#333';
  const textFill = selected || dragging ? '#fff' : '#1a1a1a';

  function handlePointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerStart.current = { x: e.clientX, y: e.clientY };
    didDrag.current = false;
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (!didDrag.current && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      didDrag.current = true;
    }
    if (didDrag.current) {
      const newPitch = yToPitch(e.clientY);
      onPitchPreview(newPitch);
      setPreviewPitch(newPitch);
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    e.stopPropagation();
    if (didDrag.current) {
      onPitchCommit(yToPitch(e.clientY));
    } else {
      onEditRequest(e.clientX, e.clientY);
    }
    pointerStart.current = null;
    didDrag.current = false;
    setDragging(false);
    setPreviewPitch(null);
  }

  return (
    <g
      className={`sheet-tab-number${selected ? ' sheet-note--selected' : ''}`}
      style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={(e) => e.stopPropagation()}
    >
      <rect x={x - 10} y={y - 10} width={20} height={20} fill="transparent" />
      <circle cx={x} cy={y} r={8} fill={fill} stroke={stroke} strokeWidth="1.2" />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize="10"
        fontFamily="monospace"
        fontWeight="600"
        fill={textFill}
      >
        {fret}
      </text>
    </g>
  );
}
