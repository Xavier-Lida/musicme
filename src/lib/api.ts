import type { Note, TranscriptionResult } from '@/types/transcription';

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

export async function transcribeAudio(blob: Blob): Promise<TranscriptionResult> {
  const extension = blob.type.includes('wav')
    ? 'wav'
    : blob.type.includes('webm')
      ? 'webm'
      : 'bin';
  const form = new FormData();
  form.append('file', blob, `recording.${extension}`);

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
