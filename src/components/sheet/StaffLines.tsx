import { staffLineYs } from '@/lib/music/staff-geometry';

interface StaffLinesProps {
  staveTop: number;
  width: number;
  x?: number;
}

export function StaffLines({ staveTop, width, x = 0 }: StaffLinesProps) {
  const lines = staffLineYs(staveTop);
  return (
    <g aria-hidden>
      {lines.map((y) => (
        <line
          key={y}
          x1={x}
          y1={y}
          x2={x + width}
          y2={y}
          stroke="#333"
          strokeWidth="1"
        />
      ))}
    </g>
  );
}

interface TimeSignatureProps {
  x: number;
  staveTop: number;
}

export function TimeSignature({ x, staveTop }: TimeSignatureProps) {
  const centerY = staveTop + 20;
  return (
    <g aria-hidden fontSize="14" fontFamily="serif" fill="#333" textAnchor="middle">
      <text x={x} y={centerY - 4}>4</text>
      <text x={x} y={centerY + 12}>4</text>
    </g>
  );
}
