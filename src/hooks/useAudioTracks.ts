'use client';

import { useState, useCallback } from 'react';
import type { CachedTrack } from '@/lib/sessionCache';
import { decodeAudioDuration, extractWaveformPeaks } from '@/lib/audio';
import type { PlaybackInstrumentId } from '@/lib/music/partition-instruments';
import type { Note } from '@/types/transcription';

// Distinct colors cycled across tracks so the partition can render each
// track's notes in its own color without coordination from the page.
export const TRACK_COLORS = [
  '#5b8def', // blue
  '#e7567a', // pink/red
  '#41b27c', // green
  '#e0a93b', // amber
  '#9d6cff', // purple
  '#3ab8c2', // teal
];

// Stable color for a given track id — hashing avoids race conditions when
// addTrack is invoked twice (e.g. React strict mode) with the same prev.
export function colorForTrackId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash * 31) + id.charCodeAt(i)) | 0;
  }
  return TRACK_COLORS[Math.abs(hash) % TRACK_COLORS.length];
}

interface AddTrackParams {
  blob: Blob;
  name: string;
  notes?: Note[];
  rawNotes?: Note[];
  instrument?: PlaybackInstrumentId;
}

export function useAudioTracks() {
  const [tracks, setTracks] = useState<CachedTrack[]>([]);

  const addTrack = useCallback(async (params: AddTrackParams) => {
    const { blob, name, notes = [], rawNotes = [], instrument = 'piano' } = params;
    const id = crypto.randomUUID();
    let duration = 0;
    let peaks: number[] = [];

    try {
      duration = await decodeAudioDuration(blob);
      peaks = await extractWaveformPeaks(blob);
    } catch (e) {
      console.error('Failed to decode track assets', e);
    }

    const newTrack: CachedTrack = {
      id,
      name,
      blob,
      peaks,
      duration,
      muted: false,
      notes,
      rawNotes,
      instrument,
      color: colorForTrackId(id),
    };
    setTracks((prev) => [...prev, newTrack]);
    return newTrack;
  }, []);

  const deleteTrack = useCallback((id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleMute = useCallback((id: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, muted: !t.muted } : t))
    );
  }, []);

  const setTrackInstrument = useCallback(
    (id: string, instrument: PlaybackInstrumentId) => {
      setTracks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, instrument } : t))
      );
    },
    [],
  );

  const setTrackNotes = useCallback(
    (id: string, notes: Note[], rawNotes?: Note[]) => {
      setTracks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, notes, rawNotes: rawNotes ?? t.rawNotes }
            : t,
        ),
      );
    },
    [],
  );

  const toggleHidden = useCallback((id: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, hidden: !t.hidden } : t)),
    );
  }, []);

  const renameTrack = useCallback((id: string, name: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name } : t)),
    );
  }, []);

  const clearTracks = useCallback(() => {
    setTracks([]);
  }, []);

  return {
    tracks,
    setTracks,
    addTrack,
    deleteTrack,
    toggleMute,
    toggleHidden,
    renameTrack,
    setTrackInstrument,
    setTrackNotes,
    clearTracks,
  };
}
