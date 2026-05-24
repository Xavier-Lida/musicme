/**
 * Convert a browser MediaRecorder Blob (typically WebM/Opus) into a 16-bit
 * PCM mono WAV. This keeps the backend ffmpeg-free — librosa/soundfile only
 * need to handle WAV.
 */
export async function blobToWav(blob: Blob, targetSampleRate = 22050): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();

  // Decode using a temporary AudioContext (browser handles the codec).
  const decodeCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    decodeCtx.close().catch(() => undefined);
  }

  // Resample + downmix to mono via OfflineAudioContext.
  const lengthAtTarget = Math.ceil(decoded.duration * targetSampleRate);
  const offline = new OfflineAudioContext(1, lengthAtTarget, targetSampleRate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();

  return encodeWav(rendered.getChannelData(0), targetSampleRate);
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

import * as Tone from 'tone';
import {
  getPartitionInstrument,
  type PlaybackInstrumentId,
} from '@/lib/music/partition-instruments';
import { midiToPitch } from '@/lib/music/pitch';

interface PlayableNote {
  pitch: number;
  start: number;
  end: number;
  velocity?: number;
}

export interface MelodyPlayerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

export interface MelodyPlayer {
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (seconds: number) => void;
  skipBack: (delta?: number) => void;
  skipForward: (delta?: number) => void;
  subscribe: (listener: (state: MelodyPlayerState) => void) => () => void;
  dispose: () => void;
}

export async function decodeAudioDuration(blob: Blob): Promise<number> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return decoded.duration;
  } finally {
    ctx.close().catch(() => undefined);
  }
}

export async function extractWaveformPeaks(blob: Blob, peakCount = 512): Promise<number[]> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channel = decoded.getChannelData(0);
    const blockSize = Math.floor(channel.length / peakCount);
    const peaks: number[] = [];

    for (let i = 0; i < peakCount; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const abs = Math.abs(channel[start + j] ?? 0);
        if (abs > max) max = abs;
      }
      peaks.push(max);
    }

    return peaks;
  } finally {
    ctx.close().catch(() => undefined);
  }
}

export async function createMelodyPlayer(
  notes: PlayableNote[],
  instrumentId: PlaybackInstrumentId,
  duration: number,
): Promise<MelodyPlayer> {
  await Tone.start();
  const instrument = await getPartitionInstrument(instrumentId);

  let offsetSeconds = 0;
  let isPlaying = false;
  let rafId: number | null = null;
  const listeners = new Set<(state: MelodyPlayerState) => void>();

  function emit() {
    const state: MelodyPlayerState = {
      currentTime: isPlaying ? offsetSeconds + Tone.Transport.seconds : offsetSeconds,
      duration,
      isPlaying,
    };
    for (const listener of listeners) listener(state);
  }

  function stopRaf() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function startRaf() {
    stopRaf();
    const tick = () => {
      emit();
      if (isPlaying) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function clearSchedule() {
    Tone.Transport.cancel(0);
    Tone.Transport.stop();
    instrument.releaseAll();
  }

  function scheduleFrom(time: number) {
    clearSchedule();
    Tone.Transport.seconds = 0;

    for (const note of notes) {
      if (note.end <= time) continue;
      const transportTime = note.start - time;
      const noteDuration = Math.max(0.08, note.end - note.start);
      const velocity =
        typeof note.velocity === 'number' ? note.velocity / 127 : undefined;

      Tone.Transport.scheduleOnce((when) => {
        instrument.triggerAttackRelease(
          midiToPitch(note.pitch),
          noteDuration,
          when,
          velocity,
        );
      }, transportTime);
    }

    Tone.Transport.scheduleOnce(() => {
      isPlaying = false;
      offsetSeconds = duration;
      stopRaf();
      emit();
    }, duration - time);
  }

  function play(): Promise<void> {
    if (isPlaying || notes.length === 0) return Promise.resolve();
    if (offsetSeconds >= duration) offsetSeconds = 0;

    scheduleFrom(offsetSeconds);
    Tone.Transport.start();
    isPlaying = true;
    startRaf();
    emit();
    return Promise.resolve();
  }

  function pause() {
    if (!isPlaying) return;
    offsetSeconds = Math.min(duration, offsetSeconds + Tone.Transport.seconds);
    clearSchedule();
    isPlaying = false;
    stopRaf();
    emit();
  }

  function stop() {
    clearSchedule();
    offsetSeconds = 0;
    isPlaying = false;
    stopRaf();
    emit();
  }

  function seek(seconds: number) {
    const wasPlaying = isPlaying;
    if (isPlaying) pause();
    offsetSeconds = Math.max(0, Math.min(seconds, duration));
    emit();
    if (wasPlaying) play();
  }

  function skipBack(delta = 2) {
    seek(Math.max(0, offsetSeconds - delta));
  }

  function skipForward(delta = 2) {
    seek(Math.min(duration, offsetSeconds + delta));
  }

  function subscribe(listener: (state: MelodyPlayerState) => void) {
    listeners.add(listener);
    emit();
    return () => listeners.delete(listener);
  }

  function dispose() {
    stop();
    listeners.clear();
  }

  return {
    play,
    pause,
    stop,
    seek,
    skipBack,
    skipForward,
    subscribe,
    dispose,
  };
}

/**
 * Play a sequence of notes through the selected instrument. The instrument is
 * loaded lazily on first use and cached for subsequent calls, so switching
 * back and forth between piano and guitar only pays the network cost once per
 * instrument.
 */
export async function playMelody(
  notes: PlayableNote[],
  instrumentId: PlaybackInstrumentId = 'piano',
): Promise<void> {
  if (notes.length === 0) return;

  const lastEnd = notes[notes.length - 1].end;
  const player = await createMelodyPlayer(notes, instrumentId, lastEnd + 0.6);
  await player.play();

  await new Promise<void>((resolve) => {
  const unsub = player.subscribe((state) => {
      if (!state.isPlaying && state.currentTime >= state.duration - 0.01) {
        unsub();
        player.dispose();
        resolve();
      }
    });
  });
}
