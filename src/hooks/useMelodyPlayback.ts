'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createMelodyPlayer,
  type MelodyPlayer,
  type MelodyPlayerState,
} from '@/lib/audio';
import type { PlaybackInstrumentId } from '@/lib/music/partition-instruments';
import type { Note } from '@/types/transcription';

import type { CachedTrack } from '@/lib/sessionCache';

interface UseMelodyPlaybackOptions {
  notes: Note[];
  instrument: PlaybackInstrumentId;
  tracks?: CachedTrack[];
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

function computeDuration(notes: Note[], audioDuration = 0): number {
  const lastNoteEnd = notes.length > 0 ? notes[notes.length - 1].end : 0;
  return Math.max(lastNoteEnd + 0.5, audioDuration, 4);
}

export function useMelodyPlayback({
  notes,
  instrument,
  tracks = [],
}: UseMelodyPlaybackOptions): UseMelodyPlaybackResult {
  const maxAudioDuration = tracks.length > 0 ? Math.max(...tracks.map((t) => t.duration)) : 0;
  const duration = computeDuration(notes, maxAudioDuration);

  const [state, setState] = useState<MelodyPlayerState>({
    currentTime: 0,
    duration,
    isPlaying: false,
  });

  const playerRef = useRef<MelodyPlayer | null>(null);
  const genRef = useRef(0);
  const notesRef = useRef(notes);
  const instrumentRef = useRef(instrument);

  notesRef.current = notes;
  instrumentRef.current = instrument;

  useEffect(() => {
    setState((prev) => ({ ...prev, duration }));
  }, [duration]);

  const syncPlayer = useCallback(async () => {
    const gen = ++genRef.current;
    playerRef.current?.dispose();
    playerRef.current = null;

    const hasUnmutedTracks = tracks.some((t) => !t.muted);
    if (notesRef.current.length === 0 && !hasUnmutedTracks) {
      if (gen === genRef.current) {
        setState({ currentTime: 0, duration, isPlaying: false });
      }
      return;
    }

    const player = await createMelodyPlayer(
      notesRef.current,
      instrumentRef.current,
      duration,
      tracks,
    );
    if (gen !== genRef.current) {
      player.dispose();
      return;
    }
    playerRef.current = player;
    player.subscribe((next) => setState(next));
  }, [duration, tracks]);

  useEffect(() => {
    syncPlayer();
    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, [syncPlayer, instrument, notes, tracks]);

  const play = useCallback(async () => {
    const hasUnmutedTracks = tracks.some((t) => !t.muted);
    if (!playerRef.current && (notes.length > 0 || hasUnmutedTracks)) {
      await syncPlayer();
    }
    await playerRef.current?.play();
  }, [notes.length, syncPlayer, tracks]);

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
