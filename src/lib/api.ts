import type {
  CleanupOptions,
  Note,
  RecleanupResult,
  TranscriptionResult,
} from '@/types/transcription';

function resolveApiBase(): string {
  const useProxy = process.env.NEXT_PUBLIC_USE_API_PROXY !== 'false';
  if (useProxy) {
    return '';
  }

  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

const API_BASE = resolveApiBase();

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export const DEFAULT_CLEANUP_OPTIONS: CleanupOptions = { preset: 'standard' };

export async function transcribeAudio(
  blob: Blob,
  options: CleanupOptions = DEFAULT_CLEANUP_OPTIONS,
): Promise<TranscriptionResult> {
  const extension = blob.type.includes('wav')
    ? 'wav'
    : blob.type.includes('webm')
      ? 'webm'
      : 'bin';
  const form = new FormData();
  form.append('file', blob, `recording.${extension}`);
  form.append('options', JSON.stringify(options));

  const res = await fetch(apiUrl('/api/transcribe'), {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Transcription failed: ${res.status} ${detail}`);
  }
  return res.json();
}

export async function recleanupNotes(
  rawNotes: Note[],
  options: CleanupOptions,
): Promise<RecleanupResult> {
  const res = await fetch(apiUrl('/api/recleanup'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_notes: rawNotes, options }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Recleanup failed: ${res.status} ${detail}`);
  }
  return res.json();
}

export async function exportMidi(notes: Note[], bpm = 120): Promise<Blob> {
  const res = await fetch(apiUrl('/api/export-midi'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes, bpm }),
  });

  if (!res.ok) {
    throw new Error(`MIDI export failed: ${res.status}`);
  }
  return res.blob();
}
