'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface WaveformTrackProps {
  peaks: number[];
  width: number;
  height?: number;
  className?: string;
}

export function WaveformTrack({
  peaks,
  width,
  height = 56,
  className,
}: WaveformTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const mid = height / 2;
    const barWidth = width / peaks.length;

    ctx.fillStyle = 'oklch(0.556 0 0 / 60%)';
    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i];
      const barHeight = Math.max(2, peak * (height - 8));
      const x = i * barWidth;
      ctx.fillRect(x, mid - barHeight / 2, Math.max(1, barWidth - 0.5), barHeight);
    }
  }, [peaks, width, height]);

  if (peaks.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-xs text-muted-foreground',
          className,
        )}
        style={{ width, height }}
      >
        Aucun audio
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn('block', className)}
      aria-hidden
    />
  );
}
