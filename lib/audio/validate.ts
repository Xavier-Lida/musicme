import { TranscribeError } from "@/lib/api/errors";

/** Matches backend settings.MAX_UPLOAD_BYTES (25 MB). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const SUPPORTED_EXTENSIONS = new Set([
  "webm",
  "mp3",
  "mpeg",
  "ogg",
  "wav",
  "mp4",
  "m4a",
  "aac",
  "flac",
]);

const SUPPORTED_MIME_SUBSTRINGS = [
  "webm",
  "mpeg",
  "mp3",
  "ogg",
  "wav",
  "mp4",
  "m4a",
  "aac",
  "flac",
  "x-m4a",
  "x-wav",
];

export class AudioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AudioValidationError";
  }
}

function validateAudioSize(audio: Blob): string | null {
  if (audio.size === 0) {
    return "Le fichier audio est vide.";
  }
  if (audio.size > MAX_UPLOAD_BYTES) {
    return `Fichier trop volumineux (max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} Mo).`;
  }
  return null;
}

function extensionFromFilename(filename: string): string | undefined {
  const parts = filename.split(".");
  if (parts.length < 2) return undefined;
  return parts.at(-1)?.toLowerCase();
}

function isSupportedMimeType(mimeType: string): boolean {
  const type = mimeType.toLowerCase();
  if (!type.startsWith("audio/")) return false;
  return SUPPORTED_MIME_SUBSTRINGS.some((part) => type.includes(part));
}

export function isSupportedAudioFile(file: File): boolean {
  const extension = extensionFromFilename(file.name);
  if (extension && SUPPORTED_EXTENSIONS.has(extension)) return true;
  if (file.type && isSupportedMimeType(file.type)) return true;
  return false;
}

export function validateAudioBlob(audio: Blob): void {
  const sizeError = validateAudioSize(audio);
  if (sizeError) {
    throw new TranscribeError(sizeError);
  }
}

export function validateAudioFile(file: File): void {
  const sizeError = validateAudioSize(file);
  if (sizeError) {
    throw new AudioValidationError(sizeError);
  }
  if (!isSupportedAudioFile(file)) {
    throw new AudioValidationError(
      "Format non supporté. Utilisez MP3, WAV, M4A, OGG, WebM ou FLAC.",
    );
  }
}
