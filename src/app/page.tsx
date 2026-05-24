'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import NoteEditor from '@/components/NoteEditor';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import {
  DEFAULT_CLEANUP_OPTIONS,
  exportMidi,
  recleanupNotes,
  transcribeAudio,
} from '@/lib/api';
import { blobToWav, playMelody } from '@/lib/audio';
import {
  addNote,
  getNextAppendStart,
  removeNoteAt,
  sortNotesByStart,
} from '@/lib/music/note-editing';
import {
  getInstrumentLabel,
  type PlaybackInstrumentId,
} from '@/lib/music/partition-instruments';
import { sessionCache } from '@/lib/sessionCache';
import type {
  CleanupOptions,
  CleanupPreset,
  Note,
  TranscriptionResult,
} from '@/types/transcription';
import { FIXED_BPM, GRID_SUBDIVISION, SIXTEENTH_SECONDS } from '@/types/transcription';

const INSTRUMENT_OPTIONS: readonly PlaybackInstrumentId[] = [
  'piano',
  'guitar-acoustic',
];

const PRESET_OPTIONS: readonly { id: CleanupPreset; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'standard', label: 'Standard' },
  { id: 'expert', label: 'Expert' },
];

const SheetMusicRenderer = dynamic(() => import('@/components/SheetMusicRenderer'), { ssr: false });

function applyTranscriptionNotes(
  transcription: TranscriptionResult,
  sortedNotes: Note[],
): TranscriptionResult {
  return { ...transcription, notes: sortedNotes };
}

export default function Page() {
  const { start, stop, status, error, isRecording } = useAudioRecorder({ click: true });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [lastWav, setLastWav] = useState<Blob | null>(null);
  const [instrument, setInstrument] = useState<PlaybackInstrumentId>('piano');
  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null);
  const [cleanupOptions, setCleanupOptions] = useState<CleanupOptions>(DEFAULT_CLEANUP_OPTIONS);
  const [recleanupAvailable, setRecleanupAvailable] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const originalNotesRef = useRef<Note[] | null>(null);

  const activePreset = cleanupOptions.preset ?? 'standard';

  const updateNotes = useCallback((notes: Note[], selected: number | null) => {
    setResult((prev) => (prev ? { ...prev, notes } : prev));
    setSelectedNoteIndex(selected);
  }, []);

  const handleRemoveNote = useCallback(
    (index: number) => {
      if (!result) return;
      const { notes, selectedIndex } = removeNoteAt(result.notes, index);
      updateNotes(notes, selectedIndex);
    },
    [result, updateNotes],
  );

  const handleAddNote = useCallback(
    (pitch: number, start: number, duration: number) => {
      if (!result) return;
      const { notes, selectedIndex } = addNote(result.notes, { pitch, start, duration });
      updateNotes(notes, selectedIndex);
    },
    [result, updateNotes],
  );

  const handleStaffClick = useCallback(
    (pitch: number) => {
      if (!result) return;
      const startTime = getNextAppendStart(result.notes);
      const { notes, selectedIndex } = addNote(result.notes, {
        pitch,
        start: startTime,
        duration: SIXTEENTH_SECONDS,
      });
      updateNotes(notes, selectedIndex);
    },
    [result, updateNotes],
  );

  const handleResetNotes = useCallback(() => {
    if (!result || !originalNotesRef.current) return;
    updateNotes([...originalNotesRef.current], null);
  }, [result, updateNotes]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const cached = await sessionCache.load();
        if (cancelled || !cached) {
          setSessionRestored(true);
          return;
        }

        setLastWav(cached.audio);
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
          setApiError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setSessionRestored(true);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteIndex !== null && result) {
        e.preventDefault();
        handleRemoveNote(selectedNoteIndex);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNoteIndex, result, handleRemoveNote]);

  async function handleStop() {
    const blob = await stop();
    if (!blob) return;
    setBusy(true);
    setApiError(null);
    try {
      const wav = await blobToWav(blob);
      setLastWav(wav);
      const transcription = await transcribeAudio(wav, cleanupOptions);
      const sortedNotes = sortNotesByStart(transcription.notes);
      const rawNotes = transcription.raw_notes;
      const hasRawNotes = rawNotes !== undefined;
      const effectiveRaw = rawNotes ?? transcription.notes;

      originalNotesRef.current = sortedNotes;
      setResult(applyTranscriptionNotes(transcription, sortedNotes));
      setRecleanupAvailable(hasRawNotes);
      setSelectedNoteIndex(null);

      await sessionCache.save({
        audio: wav,
        rawNotes: effectiveRaw,
        cleanedNotes: sortedNotes,
        options: cleanupOptions,
        createdAt: Date.now(),
      });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
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
        const { notes } = await recleanupNotes(cached.rawNotes, nextOptions);
        const sortedNotes = sortNotesByStart(notes);
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
        setApiError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [activePreset, cleanupOptions, recleanupAvailable],
  );

  async function handleClearSession() {
    await sessionCache.clear();
    setLastWav(null);
    setResult(null);
    setCleanupOptions(DEFAULT_CLEANUP_OPTIONS);
    setRecleanupAvailable(false);
    originalNotesRef.current = null;
    setSelectedNoteIndex(null);
    setApiError(null);
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
    if (!lastWav) return;
    const url = URL.createObjectURL(lastWav);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hum-${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handlePlay() {
    if (!result || result.notes.length === 0) return;
    setPlaying(true);
    try {
      await playMelody(result.notes, instrument);
    } finally {
      setPlaying(false);
    }
  }

  const notesEdited =
    result &&
    originalNotesRef.current &&
    JSON.stringify(result.notes) !== JSON.stringify(originalNotesRef.current);

  const presetPickerDisabled = !recleanupAvailable || busy || isRecording || playing;

  return (
    <main>
      <h1>musicMe</h1>
      <p className="subtitle">Hum into the mic — locked at 120 BPM, quantized to 16th notes.</p>

      <div className="controls">
        {!isRecording ? (
          <button onClick={start} disabled={busy || status === 'requesting'}>
            {status === 'requesting' ? 'Requesting mic…' : 'Record'}
          </button>
        ) : (
          <button onClick={handleStop} className="secondary">
            Stop
          </button>
        )}
        <button
          onClick={handlePlay}
          disabled={!result || result.notes.length === 0 || playing}
          className="secondary"
        >
          {playing ? 'Playing…' : `Play (${getInstrumentLabel(instrument)})`}
        </button>
        <div
          className="instrument-picker"
          role="radiogroup"
          aria-label="Instrument"
        >
          {INSTRUMENT_OPTIONS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={instrument === id}
              className={`segment ${instrument === id ? 'active' : ''}`}
              onClick={() => setInstrument(id)}
              disabled={playing}
            >
              {getInstrumentLabel(id)}
            </button>
          ))}
        </div>
        <div
          className="instrument-picker preset-picker"
          role="radiogroup"
          aria-label="Cleanup preset"
          title={
            recleanupAvailable
              ? 'Re-clean notes without re-transcribing'
              : 'Presets require an updated API (raw_notes + /api/recleanup)'
          }
        >
          {PRESET_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={activePreset === id}
              className={`segment ${activePreset === id ? 'active' : ''}`}
              onClick={() => handlePresetChange(id)}
              disabled={presetPickerDisabled}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => selectedNoteIndex !== null && handleRemoveNote(selectedNoteIndex)}
          disabled={selectedNoteIndex === null || playing}
          className="secondary"
        >
          Delete selected
        </button>
        <button
          onClick={handleResetNotes}
          disabled={!notesEdited || playing}
          className="secondary"
        >
          Reset notes
        </button>
        <button onClick={handleDownloadMidi} disabled={!result || result.notes.length === 0} className="secondary">
          Download MIDI
        </button>
        <button onClick={handleDownloadRecording} disabled={!lastWav} className="secondary">
          Download recording (.wav)
        </button>
        <button
          onClick={handleClearSession}
          disabled={!result && !lastWav}
          className="secondary"
        >
          Clear session
        </button>
        <span className="status">
          {busy ? 'Transcribing…' : isRecording ? 'Recording with click track…' : 'Idle'}
        </span>
      </div>

      {sessionRestored && !recleanupAvailable && result && (
        <p className="status hint">Presets require an updated API (raw_notes + /api/recleanup).</p>
      )}

      {error && <p className="error">Mic error: {error}</p>}
      {apiError && <p className="error">{apiError}</p>}

      <div className="sheet-frame">
        <SheetMusicRenderer
          notes={result?.notes ?? []}
          selectedIndex={selectedNoteIndex}
          onNoteSelect={setSelectedNoteIndex}
          onStaffClick={result ? handleStaffClick : undefined}
        />
      </div>

      {result && (
        <NoteEditor
          notes={result.notes}
          selectedIndex={selectedNoteIndex}
          onSelect={setSelectedNoteIndex}
          onRemove={handleRemoveNote}
          onAdd={handleAddNote}
        />
      )}
    </main>
  );
}
