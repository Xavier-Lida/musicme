"use client";

import { Download, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { downloadRecordingBlob } from "@/lib/audio/download";

interface TranscriptionPanelProps {
  audioBlob?: Blob | null;
  audioFilename?: string;
  disabled?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onTranscribe: () => void;
}

export function TranscriptionPanel({
  audioBlob,
  audioFilename,
  disabled,
  isLoading,
  error,
  onTranscribe,
}: TranscriptionPanelProps) {
  const canExport = Boolean(audioBlob) && !isLoading;

  const handleDownload = () => {
    if (!audioBlob) return;
    downloadRecordingBlob(audioBlob, audioFilename);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcription</CardTitle>
        <CardDescription>
          Générez une partition à partir de votre enregistrement ou fichier
          importé.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button
          type="button"
          variant="outline"
          className="min-h-12 w-full"
          disabled={!canExport}
          onClick={handleDownload}
        >
          <Download className="size-4" />
          Télécharger l&apos;audio
        </Button>

        <Button
          type="button"
          className="min-h-12 w-full"
          disabled={disabled || isLoading}
          onClick={onTranscribe}
        >
          <Sparkle className="size-4" weight="fill" />
          {isLoading ? "Génération en cours…" : "Générer la partition"}
        </Button>

        {isLoading && <Progress value={undefined} className="h-1" />}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
