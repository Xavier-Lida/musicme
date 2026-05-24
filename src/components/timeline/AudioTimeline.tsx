'use client';

import { useEffect, useMemo, useRef } from 'react';
import { WaveformTrack } from '@/components/timeline/WaveformTrack';
import { FIXED_BPM } from '@/types/transcription';
import type { Note } from '@/types/transcription';
import { cn } from '@/lib/utils';
import type { CachedTrack } from '@/lib/sessionCache';
import { SpeakerHigh, SpeakerSlash, Trash } from '@phosphor-icons/react';

const TRACK_LABEL_WIDTH = 80;
const TRACK_HEIGHT = 54;
const PIXELS_PER_SECOND = 80;
const MEASURE_SECONDS = (60 / FIXED_BPM) * 4;

interface AudioTimelineProps {
  tracks: CachedTrack[];
  duration: number;
  currentTime: number;
  notes?: Note[];
  onSeek?: (seconds: number) => void;
  onToggleMute?: (id: string) => void;
  onDeleteTrack?: (id: string) => void;
  className?: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioTimeline({
  tracks,
  duration,
  currentTime,
  notes = [],
  onSeek,
  onToggleMute,
  onDeleteTrack,
  className,
}: AudioTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineWidth = Math.max(duration * PIXELS_PER_SECOND, 320);

  const rulerTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let t = 0; t <= duration; t += MEASURE_SECONDS) {
      ticks.push(t);
    }
    if (ticks.length > 0 && ticks[ticks.length - 1] !== duration) {
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
    <div className={cn('daw-tracks-viewport border border-border bg-muted/10 flex-1 min-h-[180px]', className)}>
      <div ref={scrollRef} className="daw-tracks-scroll">
        <div style={{ width: timelineWidth + TRACK_LABEL_WIDTH, minWidth: '100%', position: 'relative' }}>
          
          {/* DAW Ruler (Timeline Bar Headers) */}
          <div className="daw-ruler">
            <div className="daw-ruler-label-col" />
            <div className="daw-ruler-ticks">
              {rulerTicks.map((tick) => (
                <div
                  key={tick}
                  className="daw-ruler-tick"
                  style={{ left: tick * PIXELS_PER_SECOND }}
                >
                  <span>{formatTime(tick)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {/* Playhead */}
            <div
              className="daw-playhead"
              style={{ left: TRACK_LABEL_WIDTH + playheadLeft }}
            />

            {/* Audio Tracks */}
            {tracks.map((track) => (
              <div key={track.id} className="daw-track-row">
                <div className="daw-track-label flex flex-col justify-between py-1.5 px-2 h-full border-r border-border bg-background/50 select-none">
                  <span className="font-semibold text-[10px] text-muted-foreground truncate w-full" title={track.name}>
                    {track.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMute?.(track.id);
                      }}
                      className={cn(
                        'p-0.5 rounded hover:bg-muted transition-colors',
                        track.muted ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'
                      )}
                      title={track.muted ? 'Activer le son' : 'Couper le son'}
                    >
                      {track.muted ? <SpeakerSlash className="size-3.5" /> : <SpeakerHigh className="size-3.5" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Supprimer la piste "${track.name}" ?`)) {
                          onDeleteTrack?.(track.id);
                        }
                      }}
                      className="p-0.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                      title="Supprimer la piste"
                    >
                      <Trash className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div
                  className={cn('daw-track-lane relative', track.muted && 'opacity-40')}
                  onClick={handleTimelineClick}
                  role="presentation"
                >
                  <WaveformTrack
                    peaks={track.peaks}
                    width={timelineWidth}
                    height={TRACK_HEIGHT}
                    flat={notes.length === 0} // no waveform amplitude if no notes
                  />
                </div>
              </div>
            ))}

            {/* Default Empty Audio Track if none exists */}
            {tracks.length === 0 && (
              <div className="daw-track-row">
                <div className="daw-track-label flex flex-col justify-center py-1.5 px-2 h-full border-r border-border bg-background/50">
                  <span className="font-semibold text-[10px] text-muted-foreground truncate w-full">
                    Audio
                  </span>
                </div>
                <div
                  className="daw-track-lane relative flex items-center justify-center text-xs text-muted-foreground/60"
                  onClick={handleTimelineClick}
                  role="presentation"
                >
                  Glissez un fichier audio ou enregistrez pour commencer
                </div>
              </div>
            )}

            {/* Track 2: MIDI Notes representation */}
            <div className="daw-track-row">
              <div className="daw-track-label">
                <span className="daw-track-dot bg-purple-500 animate-pulse" />
                Notes MIDI
              </div>
              <div className="daw-track-lane relative" onClick={handleTimelineClick} role="presentation">
                {notes.map((note, index) => {
                  const noteLeft = note.start * PIXELS_PER_SECOND;
                  const noteWidth = (note.end - note.start) * PIXELS_PER_SECOND;
                  return (
                    <div
                      key={index}
                      className="daw-track-clip bg-purple-500/40 border border-purple-500/60 rounded text-[9px] font-mono flex items-center justify-center overflow-hidden"
                      style={{
                        left: noteLeft,
                        width: Math.max(12, noteWidth),
                      }}
                    >
                      {note.pitch}
                    </div>
                  );
                })}
                {notes.length === 0 && (
                  <div className="daw-track-empty">Aucune note transcrite</div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
