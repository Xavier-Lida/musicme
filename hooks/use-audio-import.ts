"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioValidationError, validateAudioFile } from "@/lib/audio/validate";

export function useAudioImport() {
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const fileNameRef = useRef<string | null>(null);

  const clearPreviewUrl = useCallback(() => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  const reset = useCallback(() => {
    clearPreviewUrl();
    setAudioBlob(null);
    setFileName(null);
    fileNameRef.current = null;
    setError(null);
  }, [clearPreviewUrl]);

  const selectFile = useCallback(
    (file: File) => {
      reset();
      try {
        validateAudioFile(file);
        const url = URL.createObjectURL(file);
        fileNameRef.current = file.name;
        setFileName(file.name);
        setAudioBlob(file);
        setPreviewUrl(url);
      } catch (err) {
        const message =
          err instanceof AudioValidationError
            ? err.message
            : "Impossible d'importer ce fichier.";
        setError(message);
      }
    },
    [reset],
  );

  useEffect(() => {
    return () => {
      clearPreviewUrl();
    };
  }, [clearPreviewUrl]);

  return {
    error,
    audioBlob,
    previewUrl,
    fileName,
    selectFile,
    reset,
    hasAudio: audioBlob !== null && error === null,
  };
}
