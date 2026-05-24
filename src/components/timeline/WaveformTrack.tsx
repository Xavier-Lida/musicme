'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface WaveformTrackProps {
  peaks: number[];
  width: number;
  height?: number;
  className?: string;
  flat?: boolean;
}

export function WaveformTrack({
  peaks,
  width,
  height = 56,
  className,
  flat = false,
}: WaveformTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

    if (flat || peaks.length === 0) {
      ctx.strokeStyle = 'oklch(0.556 0 0 / 30%)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(width, mid);
      ctx.stroke();
      return;
    }

    const barWidth = width / peaks.length;
    ctx.fillStyle = 'oklch(0.556 0 0 / 60%)';
    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i];
      const barHeight = Math.max(2, peak * (height - 8));
      const x = i * barWidth;
      ctx.fillRect(x, mid - barHeight / 2, Math.max(1, barWidth - 0.5), barHeight);
    }
  }, [peaks, width, height, flat]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('block', className)}
      aria-hidden
    />
  );
}
