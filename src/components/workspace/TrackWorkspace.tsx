'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { AudioTimeline } from '@/components/timeline/AudioTimeline';
import { ActionToolbar } from '@/components/workspace/ActionToolbar';
import type { PlaybackInstrumentId } from '@/lib/music/partition-instruments';
import type { CleanupPreset } from '@/types/transcription';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import type { CachedTrack } from '@/lib/sessionCache';
import type { DisplayNote, SelectedNoteRef } from '@/types/display';

const SheetMusicRenderer = dynamic(() => import('@/components/SheetMusicRenderer'), {
  ssr: false,
});

interface TrackWorkspaceProps {
  className?: string;
  displayNotes: DisplayNote[];
  tracks: CachedTrack[];
  duration: number;
  currentTime: number;
  selectedNoteRef: SelectedNoteRef | null;
  activeTrackId: string | null;
  isRecording: boolean;
  isRequestingMic: boolean;
  busy: boolean;
  playing: boolean;
  activePreset: CleanupPreset;
  presetPickerDisabled: boolean;
  recleanupAvailable: boolean;
  hasResult: boolean;
  hasRecording: boolean;
  onNoteSelect: (trackId: string, indexInTrack: number) => void;
  onNotePitchChange: (trackId: string, indexInTrack: number, newPitch: number) => void;
  timelineDuration: number;
  onStaffClick?: (pitch: number, start: number) => void;
  onSeek: (seconds: number) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onUploadAudio: (file: File) => void;
  onPresetChange: (preset: CleanupPreset) => void;
  onDeleteSelected: () => void;
  onResetNotes: () => void;
  onDownloadMidi: () => void;
  onDownloadRecording: () => void;
  onClearNotes: () => void;
  onClearSession: () => void;
  onOpenNoteEditor: () => void;
  onExportPdf: () => void;
  onSheetSvgReady?: (svg: SVGSVGElement | null) => void;
  onToggleMute: (id: string) => void;
  onDeleteTrack: (id: string) => void;
  onSelectActiveTrack: (id: string) => void;
  onTrackInstrumentChange: (id: string, instrument: PlaybackInstrumentId) => void;
}

export function TrackWorkspace({
  className,
  displayNotes,
  tracks,
  duration,
  currentTime,
  selectedNoteRef,
  activeTrackId,
  isRecording,
  isRequestingMic,
  busy,
  playing,
  hasResult,
  onNoteSelect,
  onNotePitchChange,
  timelineDuration,
  onStaffClick,
  onSeek,
  onStartRecording,
  onStopRecording,
  onUploadAudio,
  onClearNotes,
  onExportPdf,
  onSheetSvgReady,
  onToggleMute,
  onDeleteTrack,
  onSelectActiveTrack,
  onTrackInstrumentChange,
}: TrackWorkspaceProps) {
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const [sheetWidth, setSheetWidth] = useState(800);

  useEffect(() => {
    const container = sheetContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSheetWidth(Math.max(320, Math.floor(entry.contentRect.width - 32)));
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const notesCount = displayNotes.length;
  // Make partition grow with note count so users can horizontally scroll long pieces.
  const minWidthForNotes = Math.max(sheetWidth, notesCount * 36 + 160);

  return (
    <div className={cn('flex flex-col flex-1 h-full overflow-hidden', className)}>
      <div ref={sheetContainerRef} className="daw-sheet-section">
        <div className="daw-sheet-inner">
          <div className="daw-sheet-frame p-4" style={{ width: minWidthForNotes }}>
            <SheetMusicRenderer
              displayNotes={displayNotes}
              width={minWidthForNotes - 32}
              timelineDuration={timelineDuration}
              selectedNoteRef={selectedNoteRef}
              onNoteSelect={onNoteSelect}
              onNotePitchChange={onNotePitchChange}
              onStaffClick={hasResult ? onStaffClick : undefined}
              onSvgReady={onSheetSvgReady}
            />
          </div>
        </div>
      </div>

      <div className="daw-track-section">
        <ActionToolbar
          isRecording={isRecording}
          isRequestingMic={isRequestingMic}
          busy={busy}
          playing={playing}
          hasResult={hasResult}
          hasNotes={notesCount > 0}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
          onUploadAudio={onUploadAudio}
          onClearNotes={onClearNotes}
          onExportPdf={onExportPdf}
        />

        <AudioTimeline
          tracks={tracks}
          duration={duration}
          currentTime={currentTime}
          activeTrackId={activeTrackId}
          onSeek={onSeek}
          onToggleMute={onToggleMute}
          onDeleteTrack={onDeleteTrack}
          onSelectActiveTrack={onSelectActiveTrack}
          onTrackInstrumentChange={onTrackInstrumentChange}
        />

        {busy && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-30">
            <div className="bg-card border border-border p-4 rounded-md shadow-md flex items-center gap-3">
              <Spinner className="size-5" />
              <span className="text-sm font-medium">Transcription en cours…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
