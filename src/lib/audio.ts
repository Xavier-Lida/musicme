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

interface PlayableNote {
  pitch: number;
  start: number;
  end: number;
}

let sharedSampler: Tone.Sampler | null = null;
let samplerReady: Promise<Tone.Sampler> | null = null;

/**
 * Load the Salamander Grand Piano sample set from the Tone.js CDN once and
 * reuse the sampler for all subsequent playbacks. Samples are cached by the
 * browser after the first load.
 */
function getSampler(): Promise<Tone.Sampler> {
  if (sharedSampler) return Promise.resolve(sharedSampler);
  if (samplerReady) return samplerReady;

  samplerReady = new Promise((resolve, reject) => {
    const sampler = new Tone.Sampler({
      urls: {
        A0: 'A0.mp3',
        C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', A1: 'A1.mp3',
        C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', A2: 'A2.mp3',
        C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', A3: 'A3.mp3',
        C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', A4: 'A4.mp3',
        C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', A5: 'A5.mp3',
        C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', A6: 'A6.mp3',
        C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3', A7: 'A7.mp3',
        C8: 'C8.mp3',
      },
      release: 1,
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
      onload: () => {
        sharedSampler = sampler;
        resolve(sampler);
      },
      onerror: (err) => reject(err),
    }).toDestination();
  });

  return samplerReady;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiToNoteName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/**
 * Play a sequence of notes through the Salamander Grand Piano sampler.
 * Resolves when playback finishes so callers can re-enable controls.
 */
export async function playMelody(notes: PlayableNote[]): Promise<void> {
  if (notes.length === 0) return;

  // Web Audio policies require a user gesture before starting; the click that
  // triggers playMelody satisfies that, but we still need to call start().
  await Tone.start();
  const sampler = await getSampler();

  const lastEnd = notes[notes.length - 1].end;
  const startAt = Tone.now() + 0.1;

  for (const note of notes) {
    const duration = Math.max(0.08, note.end - note.start);
    sampler.triggerAttackRelease(
      midiToNoteName(note.pitch),
      duration,
      startAt + note.start,
    );
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, (lastEnd + 0.6) * 1000);
  });
}

