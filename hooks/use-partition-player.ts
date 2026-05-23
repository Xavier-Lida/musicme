"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import {
  disposePianoInstrument,
  getPianoInstrument,
  type PartitionInstrument,
} from "@/lib/music/piano-instrument";
import {
  clearScheduledEvents,
  getPlaybackDurationSeconds,
  schedulePartitionOnTransport,
} from "@/lib/music/partition-to-tone";
import type { PartitionResponse } from "@/lib/types/partition";

function clearTransport(
  eventIds: number[],
  instrument: PartitionInstrument | null,
): void {
  clearScheduledEvents(eventIds);
  Tone.Transport.stop();
  Tone.Transport.cancel();
  Tone.Transport.seconds = 0;
  instrument?.releaseAll();
}

export function usePartitionPlayer(partition: PartitionResponse | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isInstrumentLoading, setIsInstrumentLoading] = useState(true);
  const [isInstrumentReady, setIsInstrumentReady] = useState(false);

  const instrumentRef = useRef<PartitionInstrument | null>(null);
  const eventIdsRef = useRef<number[]>([]);
  const durationRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const stopProgressLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startProgressLoop = useCallback(() => {
    stopProgressLoop();

    const tick = () => {
      const duration = durationRef.current;
      if (duration > 0) {
        const value = Math.min(Tone.Transport.seconds / duration, 1);
        setProgress(value);
        if (value >= 1) {
          setIsPlaying(false);
          stopProgressLoop();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [stopProgressLoop]);

  const resetPlaybackState = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
  }, []);

  const setupTransport = useCallback(() => {
    if (!partition || !instrumentRef.current) return;

    clearTransport(eventIdsRef.current, instrumentRef.current);
    eventIdsRef.current = [];

    durationRef.current = getPlaybackDurationSeconds(partition);
    eventIdsRef.current = schedulePartitionOnTransport(
      partition,
      instrumentRef.current,
    );
  }, [partition]);

  useEffect(() => {
    let cancelled = false;

    void getPianoInstrument().then((instrument) => {
      if (cancelled) return;
      instrumentRef.current = instrument;
      setIsInstrumentReady(true);
      setIsInstrumentLoading(false);
    });

    return () => {
      cancelled = true;
      stopProgressLoop();
      clearTransport(eventIdsRef.current, instrumentRef.current);
      eventIdsRef.current = [];
      disposePianoInstrument();
      instrumentRef.current = null;
    };
  }, [stopProgressLoop]);

  useEffect(() => {
    if (!isInstrumentReady) return;
    setupTransport();
  }, [isInstrumentReady, setupTransport]);

  const play = useCallback(async () => {
    if (!partition) return;

    await Tone.start();
    const instrument = await getPianoInstrument();
    instrumentRef.current = instrument;
    setIsInstrumentReady(true);
    setIsInstrumentLoading(false);

    setupTransport();
    Tone.Transport.seconds = 0;
    setProgress(0);
    Tone.Transport.start();
    setIsPlaying(true);
    startProgressLoop();
  }, [partition, setupTransport, startProgressLoop]);

  const pause = useCallback(() => {
    Tone.Transport.pause();
    setIsPlaying(false);
    stopProgressLoop();
  }, [stopProgressLoop]);

  const stop = useCallback(() => {
    setupTransport();
    resetPlaybackState();
  }, [resetPlaybackState, setupTransport]);

  return {
    isPlaying,
    progress,
    play,
    pause,
    stop,
    isInstrumentLoading,
    isInstrumentReady,
    durationSeconds: partition ? getPlaybackDurationSeconds(partition) : 0,
  };
}
