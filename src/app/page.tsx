'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { ProjectInfoPanel } from '@/components/project/ProjectInfoPanel';
import { TrackWorkspace } from '@/components/workspace/TrackWorkspace';
import NoteEditor from '@/components/NoteEditor';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useMelodyPlayback } from '@/hooks/useMelodyPlayback';
import { useProjectMetadata } from '@/hooks/useProjectMetadata';
import {
  DEFAULT_CLEANUP_OPTIONS,
  exportMidi,
  recleanupNotes,
  transcribeAudio,
} from '@/lib/api';
import { blobToWav, decodeAudioDuration, extractWaveformPeaks } from '@/lib/audio';
import {
  addNote,
  findNoteAtSlot,
  removeNoteAt,
  sortNotesByStart,
} from '@/lib/music/note-editing';
import type { PlaybackInstrumentId } from '@/lib/music/partition-instruments';
import { sessionCache } from '@/lib/sessionCache';
import type {
  CleanupOptions,
  CleanupPreset,
  Note,
  TranscriptionResult,
} from '@/types/transcription';
import { GRID_SUBDIVISION, SIXTEENTH_SECONDS, FIXED_BPM } from '@/types/transcription';

const EMPTY_NOTES: Note[] = [];

function applyTranscriptionNotes(
  transcription: TranscriptionResult,
  sortedNotes: Note[],
): TranscriptionResult {
  return { ...transcription, notes: sortedNotes };
}

import { useAudioTracks } from '@/hooks/useAudioTracks';

export default function Page() {
  const { start, stop, status, error, isRecording } = useAudioRecorder({ click: true });
  const { metadata, updateField } = useProjectMetadata();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    tracks,
    setTracks,
    addTrack,
    deleteTrack,
    toggleMute,
    clearTracks,
  } = useAudioTracks();
  const [instrument, setInstrument] = useState<PlaybackInstrumentId>('piano');
  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null);
  const [cleanupOptions, setCleanupOptions] = useState<CleanupOptions>(DEFAULT_CLEANUP_OPTIONS);
  const [recleanupAvailable, setRecleanupAvailable] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const originalNotesRef = useRef<Note[] | null>(null);

  const notes = result?.notes ?? EMPTY_NOTES;
  const activePreset = cleanupOptions.preset ?? 'standard';

  // Playback uses raw_notes (matches Spotify demo quality) until the user
  // edits a note — once they touch the sheet, playback follows their edits.
  const originalSnapshot = originalNotesRef.current;
  const playbackEdited = !!(
    result && originalSnapshot &&
    JSON.stringify(result.notes) !== JSON.stringify(originalSnapshot)
  );
  const playbackNotes =
    playbackEdited || !result?.raw_notes ? notes : result.raw_notes;

  const playback = useMelodyPlayback({
    notes: playbackNotes,
    instrument,
    tracks,
  });
  const stopPlaybackRef = useRef(playback.stop);
  stopPlaybackRef.current = playback.stop;
  const pausePlaybackRef = useRef(playback.pause);
  pausePlaybackRef.current = playback.pause;

  const handleInstrumentChange = useCallback((id: PlaybackInstrumentId) => {
    pausePlaybackRef.current();
    setInstrument(id);
  }, []);

  const updateNotes = useCallback((nextNotes: Note[], selected: number | null) => {
    setResult((prev) => (prev ? { ...prev, notes: nextNotes } : prev));
    setSelectedNoteIndex(selected);
  }, []);

  const handleRemoveNote = useCallback(
    (index: number) => {
      if (!result) return;
      const { notes: updated, selectedIndex } = removeNoteAt(result.notes, index);
      updateNotes(updated, selectedIndex);
    },
    [result, updateNotes],
  );

  const handleAddNote = useCallback(
    (pitch: number, start: number, duration: number) => {
      if (!result) return;
      const { notes: updated, selectedIndex } = addNote(result.notes, {
        pitch,
        start,
        duration,
      });
      updateNotes(updated, selectedIndex);
    },
    [result, updateNotes],
  );

  const handleStaffClick = useCallback(
    (pitch: number, start: number) => {
      if (!result) return;
      const existingIndex = findNoteAtSlot(result.notes, start, pitch);
      if (existingIndex !== null) {
        setSelectedNoteIndex(existingIndex);
        return;
      }
      const { notes: updated, selectedIndex } = addNote(result.notes, {
        pitch,
        start,
        duration: SIXTEENTH_SECONDS,
      });
      updateNotes(updated, selectedIndex);
    },
    [result, updateNotes],
  );

  const handleResetNotes = useCallback(() => {
    if (!result || !originalNotesRef.current) return;
    updateNotes([...originalNotesRef.current], null);
  }, [result, updateNotes]);

  const processTranscription = useCallback(
    async (wav: Blob, name: string) => {
      setBusy(true);
      setApiError(null);
      stopPlaybackRef.current();

      try {
        const newTrack = await addTrack(wav, name);
        const transcription = await transcribeAudio(wav, cleanupOptions);
        const sortedNotes = sortNotesByStart(transcription.notes);
        const rawNotes = transcription.raw_notes;
        const hasRawNotes = rawNotes !== undefined;
        const effectiveRaw = rawNotes ?? transcription.notes;

        originalNotesRef.current = sortedNotes;
        setResult(applyTranscriptionNotes(transcription, sortedNotes));
        setRecleanupAvailable(hasRawNotes);
        setSelectedNoteIndex(null);

        const cached = await sessionCache.load();
        const existingTracks = cached?.tracks || [];
        const nextTracks = [...existingTracks, newTrack];

        await sessionCache.save({
          tracks: nextTracks,
          rawNotes: effectiveRaw,
          cleanedNotes: sortedNotes,
          options: cleanupOptions,
          createdAt: Date.now(),
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setApiError(message);
        toast.error('Erreur de transcription', { description: message });
      } finally {
        setBusy(false);
      }
    },
    [cleanupOptions, addTrack],
  );

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const cached = await sessionCache.load();
        if (cancelled || !cached) {
          setSessionRestored(true);
          return;
        }

        if (cached.tracks && cached.tracks.length > 0) {
          setTracks(cached.tracks);
        } else if (cached.audio) {
          const duration = await decodeAudioDuration(cached.audio);
          const peaks = await extractWaveformPeaks(cached.audio);
          const legacyTrack = {
            id: 'legacy-track',
            name: 'Piste Audio',
            blob: cached.audio,
            peaks,
            duration,
            muted: false,
          };
          setTracks([legacyTrack]);
        }

        setCleanupOptions(cached.options);
        const sorted = sortNotesByStart(cached.cleanedNotes);
        originalNotesRef.current = sorted;
        setResult({
          bpm: FIXED_BPM,
          subdivision: GRID_SUBDIVISION,
          time_signature: '4/4',
          notes: sorted,
          raw_notes: cached.rawNotes,
        });
        setRecleanupAvailable(cached.rawNotes.length > 0);
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : String(e);
          setApiError(message);
        }
      } finally {
        if (!cancelled) setSessionRestored(true);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [setTracks]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (noteEditorOpen) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteIndex !== null && result) {
        e.preventDefault();
        handleRemoveNote(selectedNoteIndex);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNoteIndex, result, handleRemoveNote, noteEditorOpen]);

  useEffect(() => {
    if (error) {
      toast.error('Erreur micro', { description: error });
    }
  }, [error]);

  const handleToggleMute = useCallback(
    async (id: string) => {
      toggleMute(id);
      const cached = await sessionCache.load();
      if (cached) {
        const nextTracks = (cached.tracks || []).map((t) =>
          t.id === id ? { ...t, muted: !t.muted } : t
        );
        await sessionCache.save({ ...cached, tracks: nextTracks });
      }
    },
    [toggleMute],
  );

  const handleDeleteTrack = useCallback(
    async (id: string) => {
      deleteTrack(id);
      const cached = await sessionCache.load();
      if (cached) {
        const nextTracks = (cached.tracks || []).filter((t) => t.id !== id);
        await sessionCache.save({ ...cached, tracks: nextTracks });
      }
    },
    [deleteTrack],
  );

  async function handleStopRecording() {
    const blob = await stop();
    if (!blob) return;
    const wav = await blobToWav(blob);
    const trackIndex = tracks.length + 1;
    await processTranscription(wav, `Enregistrement ${trackIndex}`);
  }

  async function handleUploadAudio(file: File) {
    const wav = file.type.includes('wav') ? file : await blobToWav(file);
    await processTranscription(wav, file.name);
  }

  const handlePresetChange = useCallback(
    async (preset: CleanupPreset) => {
      if (preset === activePreset || !recleanupAvailable) return;

      const cached = await sessionCache.load();
      if (!cached) return;

      setBusy(true);
      setApiError(null);
      const nextOptions: CleanupOptions = { ...cleanupOptions, preset };

      try {
        const { notes: cleaned } = await recleanupNotes(cached.rawNotes, nextOptions);
        const sortedNotes = sortNotesByStart(cleaned);
        originalNotesRef.current = sortedNotes;
        setCleanupOptions(nextOptions);
        setResult((prev) =>
          prev ? applyTranscriptionNotes(prev, sortedNotes) : prev,
        );
        setSelectedNoteIndex(null);

        await sessionCache.save({
          ...cached,
          cleanedNotes: sortedNotes,
          options: nextOptions,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setApiError(message);
        toast.error('Erreur de nettoyage', { description: message });
      } finally {
        setBusy(false);
      }
    },
    [activePreset, cleanupOptions, recleanupAvailable],
  );

  const handleClearNotes = useCallback(async () => {
    if (!result) return;
    playback.stop();
    updateNotes([], null);
    const cached = await sessionCache.load();
    if (cached) {
      await sessionCache.save({ ...cached, cleanedNotes: [] });
    }
  }, [result, playback, updateNotes]);

  async function handleClearSession() {
    playback.stop();
    await sessionCache.clear();
    clearTracks();
    setResult(null);
    setCleanupOptions(DEFAULT_CLEANUP_OPTIONS);
    setRecleanupAvailable(false);
    originalNotesRef.current = null;
    setSelectedNoteIndex(null);
    setApiError(null);
    toast.success('Session réinitialisée');
  }

  async function handleDownloadMidi() {
    if (!result) return;
    const blob = await exportMidi(result.notes, result.bpm);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.mid';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadRecording() {
    const firstTrack = tracks[0];
    if (!firstTrack) return;
    const url = URL.createObjectURL(firstTrack.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${firstTrack.name || 'enregistrement'}-${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // playbackEdited (computed above) doubles as notesEdited for UI props.
  const notesEdited = playbackEdited;

  const presetPickerDisabled = !recleanupAvailable || busy || isRecording || playback.isPlaying;
  const transportDisabled = busy || isRecording || notes.length === 0;

  let statusLabel = 'Prêt';
  let statusClass = '';
  if (isRecording) {
    statusLabel = 'Enregistrement';
    statusClass = 'recording';
  } else if (playback.isPlaying) {
    statusLabel = 'Lecture';
    statusClass = 'playing';
  } else if (busy) {
    statusLabel = 'Transcription';
    statusClass = 'busy';
  }

  return (
    <AppShell
      infoPanel={
        <ProjectInfoPanel metadata={metadata} onFieldChange={updateField} />
      }
      transport={{
        isPlaying: playback.isPlaying,
        disabled: transportDisabled,
        onTogglePlayPause: () => playback.togglePlayPause(),
        onSkipBack: () => playback.skipBack(),
        onSkipForward: () => playback.skipForward(),
        currentTime: playback.currentTime,
        statusLabel,
        statusClass,
      }}
    >
      {apiError && (
        <Alert variant="destructive">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <TrackWorkspace
        notes={notes}
        timelineDuration={playback.duration}
        tracks={tracks}
        duration={playback.duration}
        currentTime={playback.currentTime}
        selectedIndex={selectedNoteIndex}
        isRecording={isRecording}
        isRequestingMic={status === 'requesting'}
        busy={busy}
        playing={playback.isPlaying}
        instrument={instrument}
        activePreset={activePreset}
        presetPickerDisabled={presetPickerDisabled}
        recleanupAvailable={recleanupAvailable}
        hasResult={!!result}
        hasRecording={tracks.length > 0}
        notesEdited={!!notesEdited}
        onNoteSelect={setSelectedNoteIndex}
        onStaffClick={handleStaffClick}
        onSeek={playback.seek}
        onStartRecording={start}
        onStopRecording={handleStopRecording}
        onUploadAudio={handleUploadAudio}
        onInstrumentChange={handleInstrumentChange}
        onPresetChange={handlePresetChange}
        onDeleteSelected={() =>
          selectedNoteIndex !== null && handleRemoveNote(selectedNoteIndex)
        }
        onResetNotes={handleResetNotes}
        onDownloadMidi={handleDownloadMidi}
        onDownloadRecording={handleDownloadRecording}
        onClearNotes={handleClearNotes}
        onClearSession={handleClearSession}
        onOpenNoteEditor={() => setNoteEditorOpen(true)}
        onToggleMute={handleToggleMute}
        onDeleteTrack={handleDeleteTrack}
      />

      <Sheet open={noteEditorOpen} onOpenChange={setNoteEditorOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Éditeur de notes</SheetTitle>
          </SheetHeader>
          {result && (
            <NoteEditor
              notes={result.notes}
              selectedIndex={selectedNoteIndex}
              onSelect={setSelectedNoteIndex}
              onRemove={handleRemoveNote}
              onAdd={handleAddNote}
            />
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
