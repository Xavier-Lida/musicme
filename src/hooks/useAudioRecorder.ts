'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FIXED_BPM } from '@/types/transcription';

type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'stopping' | 'error';

interface UseAudioRecorderOptions {
  bpm?: number;
  click?: boolean;
}

interface UseAudioRecorderResult {
  status: RecorderStatus;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  isRecording: boolean;
}

/**
 * Capture mic audio against a fixed 120 BPM reference. The click track is a
 * simple WebAudio oscillator beep on every quarter note — frontend-only,
 * never bundled with the recorded blob sent to the backend.
 */
export function useAudioRecorder(opts: UseAudioRecorderOptions = {}): UseAudioRecorderResult {
  const bpm = opts.bpm ?? FIXED_BPM;
  const clickEnabled = opts.click ?? true;

  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stopPromiseRef = useRef<{ resolve: (b: Blob | null) => void } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const clickTimerRef = useRef<number | null>(null);

  const teardown = useCallback(() => {
    if (clickTimerRef.current !== null) {
      window.clearInterval(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const playClick = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
          : null;
        stopPromiseRef.current?.resolve(blob);
        stopPromiseRef.current = null;
        teardown();
        setStatus('idle');
      };

      if (clickEnabled) {
        audioCtxRef.current = new AudioContext();
        const quarterMs = 60_000 / bpm;
        clickTimerRef.current = window.setInterval(playClick, quarterMs);
        playClick();
      }

      recorder.start();
      setStatus('recording');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
      teardown();
    }
  }, [bpm, clickEnabled, playClick, teardown]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return null;
    setStatus('stopping');
    return new Promise<Blob | null>((resolve) => {
      stopPromiseRef.current = { resolve };
      recorder.stop();
    });
  }, []);

  return {
    status,
    error,
    start,
    stop,
    isRecording: status === 'recording',
  };
}
