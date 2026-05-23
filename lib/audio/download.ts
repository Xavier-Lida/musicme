import { getAudioFilename } from "@/lib/audio/blob";

export function downloadAudioBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadRecordingBlob(
  blob: Blob,
  preferredName?: string,
): void {
  downloadAudioBlob(blob, getAudioFilename(blob, preferredName));
}
