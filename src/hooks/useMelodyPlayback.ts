'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createMelodyPlayer,
  type MelodyPlayer,
  type MelodyPlayerState,
  type TrackPlayback,
} from '@/lib/audio';
import type { Note } from '@/types/transcription';

import type { CachedTrack } from '@/lib/sessionCache';

interface UseMelodyPlaybackOptions {
  // Per-track playback data. Each entry contributes its notes through its
  // own instrument when not muted. Audio overlay also follows mute state.
  tracks: CachedTrack[];
  // When tracks were edited (raw vs cleaned), the page passes the playback-time
  // notes per track. Falls back to track.notes otherwise.
  playbackNotesByTrack?: Map<string, Note[]>;
}

interface UseMelodyPlaybackResult {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  play: () => Promise<void>;
  pause: () => void;
  togglePlayPause: () => Promise<void>;
  stop: () => void;
  seek: (seconds: number) => void;
  skipBack: (delta?: number) => void;
  skipForward: (delta?: number) => void;
}

function computeDuration(
  allNotes: { end: number }[],
  audioDuration = 0,
): number {
  const lastNoteEnd = allNotes.length > 0 ? Math.max(...allNotes.map((n) => n.end)) : 0;
  return Math.max(lastNoteEnd + 0.5, audioDuration, 4);
}

export function useMelodyPlayback({
  tracks,
  playbackNotesByTrack,
}: UseMelodyPlaybackOptions): UseMelodyPlaybackResult {
  const trackPlaybacks = useMemo<TrackPlayback[]>(
    () =>
      tracks.map((t) => ({
        id: t.id,
        notes: playbackNotesByTrack?.get(t.id) ?? t.notes,
        instrument: t.instrument,
        audioBlob: t.blob,
        muted: t.muted,
      })),
    [tracks, playbackNotesByTrack],
  );

  const allNotes = useMemo(
    () => trackPlaybacks.flatMap((t) => t.notes),
    [trackPlaybacks],
  );
  const maxAudioDuration = tracks.length > 0 ? Math.max(...tracks.map((t) => t.duration)) : 0;
  const duration = computeDuration(allNotes, maxAudioDuration);

  const [state, setState] = useState<MelodyPlayerState>({
    currentTime: 0,
    duration,
    isPlaying: false,
  });

  const playerRef = useRef<MelodyPlayer | null>(null);
  const genRef = useRef(0);

  useEffect(() => {
    setState((prev) => ({ ...prev, duration }));
  }, [duration]);

  const syncPlayer = useCallback(async () => {
    const gen = ++genRef.current;
    playerRef.current?.dispose();
    playerRef.current = null;

    const hasUnmutedAudio = trackPlaybacks.some((t) => !t.muted && t.audioBlob);
    const hasUnmutedNotes = trackPlaybacks.some((t) => !t.muted && t.notes.length > 0);
    if (!hasUnmutedAudio && !hasUnmutedNotes) {
      if (gen === genRef.current) {
        setState({ currentTime: 0, duration, isPlaying: false });
      }
      return;
    }

    const player = await createMelodyPlayer(trackPlaybacks, duration);
    if (gen !== genRef.current) {
      player.dispose();
      return;
    }
    playerRef.current = player;
    player.subscribe((next) => setState(next));
  }, [duration, trackPlaybacks]);

  useEffect(() => {
    syncPlayer();
    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, [syncPlayer]);

  const play = useCallback(async () => {
    if (!playerRef.current) {
      await syncPlayer();
    }
    await playerRef.current?.play();
  }, [syncPlayer]);

  const pause = useCallback(() => {
    playerRef.current?.pause();
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (state.isPlaying) {
      pause();
      return;
    }
    await play();
  }, [state.isPlaying, play, pause]);

  const stop = useCallback(() => {
    playerRef.current?.stop();
  }, []);

  const seek = useCallback((seconds: number) => {
    playerRef.current?.seek(seconds);
  }, []);

  const skipBack = useCallback(
    (delta = 2) => {
      playerRef.current?.seek(Math.max(0, state.currentTime - delta));
    },
    [state.currentTime],
  );

  const skipForward = useCallback(
    (delta = 2) => {
      playerRef.current?.seek(Math.min(duration, state.currentTime + delta));
    },
    [state.currentTime, duration],
  );

  return {
    currentTime: state.currentTime,
    duration: state.duration,
    isPlaying: state.isPlaying,
    play,
    pause,
    togglePlayPause,
    stop,
    seek,
    skipBack,
    skipForward,
  };
}
