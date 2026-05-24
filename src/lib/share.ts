import type { CachedTrack } from '@/lib/sessionCache';
import type { ProjectMetadata } from '@/hooks/useProjectMetadata';
import type { Note } from '@/types/transcription';
import type { PlaybackInstrumentId } from '@/lib/music/partition-instruments';

// Wire format kept tiny — no audio blobs, no peaks, no UUIDs that don't matter.
// Just enough to reconstruct the visible partition + multi-track playback.
interface SharePayloadV1 {
  v: 1;
  meta: ProjectMetadata;
  tracks: Array<{
    id: string;
    name: string;
    color: string;
    instrument: PlaybackInstrumentId;
    muted: boolean;
    hidden: boolean;
    notes: Note[];
  }>;
}

function utf8ToBase64Url(s: string): string {
  // btoa expects latin-1, so encode UTF-8 → bytes → binary string first.
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUtf8(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeShareUrl(
  origin: string,
  metadata: ProjectMetadata,
  tracks: CachedTrack[],
): string {
  const payload: SharePayloadV1 = {
    v: 1,
    meta: metadata,
    tracks: tracks.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      instrument: t.instrument,
      muted: !!t.muted,
      hidden: !!t.hidden,
      notes: t.notes,
    })),
  };
  const encoded = utf8ToBase64Url(JSON.stringify(payload));
  return `${origin}/#s=${encoded}`;
}

export interface DecodedShare {
  metadata: ProjectMetadata;
  // Rehydrated as CachedTrack[] with empty audio fields so the rest of the app
  // (which expects CachedTrack[]) Just Works™ — playback skips trackless audio.
  tracks: CachedTrack[];
}

export function decodeShareFromHash(hash: string): DecodedShare | null {
  if (!hash || !hash.startsWith('#')) return null;
  const params = new URLSearchParams(hash.slice(1));
  const raw = params.get('s');
  if (!raw) return null;
  try {
    const json = base64UrlToUtf8(raw);
    const payload = JSON.parse(json) as SharePayloadV1;
    if (payload.v !== 1) return null;
    return {
      metadata: payload.meta,
      tracks: payload.tracks.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        instrument: t.instrument,
        muted: t.muted,
        hidden: t.hidden,
        notes: t.notes,
        rawNotes: t.notes,
        peaks: [],
        duration: t.notes.length > 0 ? Math.max(...t.notes.map((n) => n.end)) : 0,
      })),
    };
  } catch (e) {
    console.error('Failed to decode share payload', e);
    return null;
  }
}
