const VALID_EXTENSIONS = [
  "webm",
  "mp3",
  "mpeg",
  "ogg",
  "wav",
  "mp4",
  "m4a",
  "aac",
  "flac",
] as const;

function extensionFromBlobType(blob: Blob): string {
  const type = blob.type.toLowerCase();
  if (type.includes("mp4") || type.includes("m4a")) return "m4a";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  if (type.includes("flac")) return "flac";
  if (type.includes("aac")) return "aac";
  return "webm";
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\]/g, "_").trim() || "import";
}

export function getAudioFilename(blob: Blob, preferredName?: string): string {
  if (preferredName) {
    const sanitized = sanitizeFilename(preferredName);
    const ext = sanitized.split(".").pop()?.toLowerCase();
    if (ext && VALID_EXTENSIONS.includes(ext as (typeof VALID_EXTENSIONS)[number])) {
      return sanitized;
    }
    const base = sanitized.includes(".")
      ? sanitized.replace(/\.[^.]+$/, "")
      : sanitized;
    return `${base}.${extensionFromBlobType(blob)}`;
  }

  const type = blob.type.toLowerCase();
  if (type.includes("mp4") || type.includes("m4a")) return "recording.m4a";
  if (type.includes("mpeg") || type.includes("mp3")) return "recording.mp3";
  if (type.includes("ogg")) return "recording.ogg";
  if (type.includes("wav")) return "recording.wav";
  if (type.includes("flac")) return "recording.flac";
  if (type.includes("aac")) return "recording.aac";
  return "recording.webm";
}
