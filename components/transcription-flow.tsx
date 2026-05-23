"use client";

import { useCallback, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import {
  AudioSourceCard,
  type AudioReadyMeta,
} from "@/components/audio-recorder";
import { PartitionPlayer } from "@/components/partition-player";
import { PartitionViewer } from "@/components/partition-viewer";
import { TranscriptionPanel } from "@/components/transcription-panel";
import { Button } from "@/components/ui/button";
import { transcribeAudio } from "@/lib/api/transcribe";
import { TranscribeError } from "@/lib/api/errors";
import type { PartitionResponse } from "@/lib/types/partition";

export function TranscriptionFlow() {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFilename, setAudioFilename] = useState<string | undefined>();
  const [partition, setPartition] = useState<PartitionResponse | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const handleAudioReady = useCallback((blob: Blob, meta?: AudioReadyMeta) => {
    setAudioBlob(blob);
    setAudioFilename(meta?.filename);
    setPartition(null);
    setTranscribeError(null);
  }, []);

  const handleAudioCleared = useCallback(() => {
    setAudioBlob(null);
    setAudioFilename(undefined);
  }, []);

  const handleTranscribe = useCallback(async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    setTranscribeError(null);

    try {
      const result = await transcribeAudio(audioBlob, {
        filename: audioFilename,
      });
      setPartition(result);
    } catch (error) {
      const message =
        error instanceof TranscribeError
          ? error.message
          : "Impossible de générer la partition.";
      setTranscribeError(message);
    } finally {
      setIsTranscribing(false);
    }
  }, [audioBlob, audioFilename]);

  const handleStartOver = () => {
    setAudioBlob(null);
    setAudioFilename(undefined);
    setPartition(null);
    setTranscribeError(null);
    setIsTranscribing(false);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {!partition && (
        <>
          <AudioSourceCard
            onAudioReady={handleAudioReady}
            onAudioCleared={handleAudioCleared}
          />
          <TranscriptionPanel
            audioBlob={audioBlob}
            audioFilename={audioFilename}
            disabled={!audioBlob}
            isLoading={isTranscribing}
            error={transcribeError}
            onTranscribe={() => void handleTranscribe()}
          />
        </>
      )}

      {partition && (
        <>
          <PartitionViewer partition={partition} />
          <PartitionPlayer partition={partition} />
          <Button
            type="button"
            variant="outline"
            className="min-h-12 w-full"
            onClick={handleStartOver}
          >
            <ArrowCounterClockwise className="size-4" />
            Nouvelle source
          </Button>
        </>
      )}
    </div>
  );
}
