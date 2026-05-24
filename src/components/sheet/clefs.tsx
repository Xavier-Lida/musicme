interface ClefProps {
  x?: number;
  y: number;
}

export function TrebleClef({ x = 12, y }: ClefProps) {
  return (
    <text
      x={x}
      y={y}
      fontSize="42"
      fontFamily="Georgia, 'Times New Roman', serif"
      fill="#1a1a1a"
      aria-hidden
    >
      𝄞
    </text>
  );
}

export function BassClef({ x = 14, y }: ClefProps) {
  return (
    <text
      x={x}
      y={y}
      fontSize="34"
      fontFamily="Georgia, 'Times New Roman', serif"
      fill="#1a1a1a"
      aria-hidden
    >
      𝄢
    </text>
  );
}

export function GrandStaffBrace({ x, y, height }: { x: number; y: number; height: number }) {
  const mid = y + height / 2;
  return (
    <path
      d={`M ${x + 6} ${y} Q ${x} ${mid} ${x + 6} ${y + height}`}
      fill="none"
      stroke="#333"
      strokeWidth="2"
      aria-hidden
    />
  );
}
