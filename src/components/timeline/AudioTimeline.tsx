'use client';

import { useEffect, useMemo, useRef } from 'react';
import { PlusIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { NotesTrack } from '@/components/timeline/NotesTrack';
import { WaveformTrack } from '@/components/timeline/WaveformTrack';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FIXED_BPM } from '@/types/transcription';
import type { Note } from '@/types/transcription';
import { cn } from '@/lib/utils';

const TRACK_LABEL_WIDTH = 72;
const RULER_HEIGHT = 24;
const TRACK_HEIGHT = 56;
const PIXELS_PER_SECOND = 80;
const MEASURE_SECONDS = (60 / FIXED_BPM) * 4;

interface AudioTimelineProps {
  notes: Note[];
  peaks: number[];
  duration: number;
  currentTime: number;
  selectedIndex?: number | null;
  onNoteSelect?: (index: number) => void;
  onSeek?: (seconds: number) => void;
  className?: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioTimeline({
  notes,
  peaks,
  duration,
  currentTime,
  selectedIndex = null,
  onNoteSelect,
  onSeek,
  className,
}: AudioTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineWidth = Math.max(duration * PIXELS_PER_SECOND, 320);

  const rulerTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let t = 0; t <= duration; t += MEASURE_SECONDS) {
      ticks.push(t);
    }
    if (ticks[ticks.length - 1] !== duration) {
      ticks.push(duration);
    }
    return ticks;
  }, [duration]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || currentTime <= 0) return;

    const playheadX = TRACK_LABEL_WIDTH + currentTime * PIXELS_PER_SECOND;
    const { scrollLeft, clientWidth } = container;
    const margin = 48;

    if (playheadX < scrollLeft + margin) {
      container.scrollLeft = Math.max(0, playheadX - margin);
    } else if (playheadX > scrollLeft + clientWidth - margin) {
      container.scrollLeft = playheadX - clientWidth + margin;
    }
  }, [currentTime]);

  function handleTimelineClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const seconds = Math.max(0, Math.min(duration, x / PIXELS_PER_SECOND));
    onSeek(seconds);
  }

  const playheadLeft = currentTime * PIXELS_PER_SECOND;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-none border border-border bg-muted/30"
      >
        <div style={{ width: timelineWidth + TRACK_LABEL_WIDTH, minWidth: '100%' }}>
          <div className="flex border-b border-border">
            <div
              className="shrink-0 border-r border-border bg-muted/50"
              style={{ width: TRACK_LABEL_WIDTH, height: RULER_HEIGHT }}
            />
            <div className="relative" style={{ width: timelineWidth, height: RULER_HEIGHT }}>
              {rulerTicks.map((tick) => (
                <div
                  key={tick}
                  className="absolute top-0 flex h-full flex-col justify-end border-l border-border/60 pl-1"
                  style={{ left: tick * PIXELS_PER_SECOND }}
                >
                  <span className="pb-0.5 text-[10px] text-muted-foreground">
                    {formatTime(tick)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-primary"
              style={{ left: TRACK_LABEL_WIDTH + playheadLeft }}
            />
            <div
              className="pointer-events-none absolute top-0 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-primary"
              style={{ left: TRACK_LABEL_WIDTH + playheadLeft }}
            />

            <div className="flex border-b border-border">
              <div
                className="flex shrink-0 items-center border-r border-border bg-muted/50 px-2 text-xs text-muted-foreground"
                style={{ width: TRACK_LABEL_WIDTH, height: TRACK_HEIGHT }}
              >
                Audio
              </div>
              <div
                className="relative cursor-pointer"
                style={{ width: timelineWidth, height: TRACK_HEIGHT }}
                onClick={handleTimelineClick}
                role="presentation"
              >
                <WaveformTrack peaks={peaks} width={timelineWidth} height={TRACK_HEIGHT} />
              </div>
            </div>

            <div className="flex">
              <div
                className="flex shrink-0 items-center border-r border-border bg-muted/50 px-2 text-xs text-muted-foreground"
                style={{ width: TRACK_LABEL_WIDTH, height: TRACK_HEIGHT }}
              >
                Partition
              </div>
              <div
                className="relative cursor-pointer"
                style={{ width: timelineWidth, height: TRACK_HEIGHT }}
                onClick={handleTimelineClick}
                role="presentation"
              >
                <NotesTrack
                  notes={notes}
                  duration={duration}
                  width={timelineWidth}
                  height={TRACK_HEIGHT}
                  selectedIndex={selectedIndex}
                  onNoteSelect={onNoteSelect}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" disabled className="w-fit">
            <PlusIcon data-icon="inline-start" />
            Ajouter une piste
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ajout de pistes — bientôt disponible</TooltipContent>
      </Tooltip>
    </div>
  );
}
