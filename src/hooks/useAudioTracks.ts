'use client';

import { useState, useCallback } from 'react';
import type { CachedTrack } from '@/lib/sessionCache';
import { decodeAudioDuration, extractWaveformPeaks } from '@/lib/audio';

export function useAudioTracks() {
  const [tracks, setTracks] = useState<CachedTrack[]>([]);

  const addTrack = useCallback(async (blob: Blob, name: string) => {
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

  const clearTracks = useCallback(() => {
    setTracks([]);
  }, []);

  return {
    tracks,
    setTracks,
    addTrack,
    deleteTrack,
    toggleMute,
    clearTracks,
  };
}
