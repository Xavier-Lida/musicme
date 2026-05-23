"use client";

import { useEffect, useRef, useState } from "react";
import {
  Microphone,
  Stop,
  ArrowCounterClockwise,
  Upload,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRecordingTime } from "@/lib/audio/recorder";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useAudioImport } from "@/hooks/use-audio-import";
import { cn } from "@/lib/utils";

type SourceMode = "record" | "import";

export interface AudioReadyMeta {
  filename?: string;
}

interface AudioSourceCardProps {
  onAudioReady?: (blob: Blob, meta?: AudioReadyMeta) => void;
  onAudioCleared?: () => void;
}

/** @deprecated Use AudioSourceCard */
export type AudioRecorderProps = AudioSourceCardProps;

function truncateFileName(name: string, maxLength = 32): string {
  if (name.length <= maxLength) return name;
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const baseMax = maxLength - ext.length - 1;
  return `${name.slice(0, baseMax)}…${ext}`;
}

export function AudioSourceCard({
  onAudioReady,
  onAudioCleared,
}: AudioSourceCardProps) {
  const [mode, setMode] = useState<SourceMode>("record");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recorder = useAudioRecorder();
  const audioImport = useAudioImport();

  const isRecordMode = mode === "record";
  const activeBlob = isRecordMode ? recorder.audioBlob : audioImport.audioBlob;
  const activePreviewUrl = isRecordMode
    ? recorder.previewUrl
    : audioImport.previewUrl;
  const activeError = isRecordMode ? recorder.error : audioImport.error;
  const hasAudio = isRecordMode ? recorder.hasRecording : audioImport.hasAudio;

  const handleModeChange = (nextMode: SourceMode) => {
    if (nextMode === mode) return;
    recorder.reset();
    audioImport.reset();
    onAudioCleared?.();
    setMode(nextMode);
  };

  const handleRecordReset = () => {
    recorder.reset();
    onAudioCleared?.();
  };

  const handleImportReset = () => {
    audioImport.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
    onAudioCleared?.();
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) audioImport.selectFile(file);
  };

  useEffect(() => {
    if (!hasAudio || !activeBlob) return;

    const meta: AudioReadyMeta | undefined = isRecordMode
      ? undefined
      : audioImport.fileName
        ? { filename: audioImport.fileName }
        : undefined;

    onAudioReady?.(activeBlob, meta);
  }, [
    activeBlob,
    audioImport.fileName,
    hasAudio,
    isRecordMode,
    onAudioReady,
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Source audio</CardTitle>
        <CardDescription>
          Enregistrez ou importez un extrait musical.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            type="button"
            variant={isRecordMode ? "default" : "outline"}
            className="min-h-11"
            onClick={() => handleModeChange("record")}
          >
            Enregistrer
          </Button>
          <Button
            type="button"
            variant={!isRecordMode ? "default" : "outline"}
            className="min-h-11"
            onClick={() => handleModeChange("import")}
          >
            Importer
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {isRecordMode && recorder.isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              REC {formatRecordingTime(recorder.elapsedSeconds)}
            </Badge>
          )}
          {hasAudio && (
            <Badge variant="secondary">Prêt à transcrire</Badge>
          )}
        </div>

        {isRecordMode ? (
          <div className="flex w-full flex-col items-center gap-4">
            {!recorder.isRecording && !recorder.hasRecording && (
              <Button
                type="button"
                size="icon-lg"
                className={cn(
                  "size-20 rounded-full",
                  recorder.status === "error" && "opacity-80",
                )}
                onClick={() => void recorder.startRecording()}
                aria-label="Démarrer l'enregistrement"
              >
                <Microphone className="size-8" weight="fill" />
              </Button>
            )}

            {recorder.isRecording && (
              <Button
                type="button"
                size="icon-lg"
                variant="destructive"
                className="size-20 rounded-full"
                onClick={() => recorder.stopRecording()}
                aria-label="Arrêter l'enregistrement"
              >
                <Stop className="size-8" weight="fill" />
              </Button>
            )}

            {recorder.hasRecording && recorder.previewUrl && (
              <audio
                controls
                src={recorder.previewUrl}
                className="w-full max-w-sm"
                preload="metadata"
              />
            )}

            {recorder.hasRecording && (
              <Button
                type="button"
                variant="outline"
                className="min-h-12 w-full"
                onClick={handleRecordReset}
              >
                <ArrowCounterClockwise className="size-4" />
                Réenregistrer
              </Button>
            )}

            {!recorder.hasRecording &&
              !recorder.error &&
              recorder.status === "idle" && (
                <p className="text-center text-sm text-muted-foreground">
                  Appuyez sur le micro pour commencer
                </p>
              )}
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.flac"
              className="sr-only"
              onChange={handleFileInputChange}
            />

            {!audioImport.hasAudio && (
              <Button
                type="button"
                variant="outline"
                className="min-h-12 w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" />
                Choisir un fichier
              </Button>
            )}

            {audioImport.hasAudio && activePreviewUrl && (
              <>
                {audioImport.fileName && (
                  <p
                    className="max-w-full truncate text-center text-sm text-muted-foreground"
                    title={audioImport.fileName}
                  >
                    {truncateFileName(audioImport.fileName)}
                  </p>
                )}
                <audio
                  controls
                  src={activePreviewUrl}
                  className="w-full max-w-sm"
                  preload="metadata"
                />
              </>
            )}

            {audioImport.hasAudio && (
              <Button
                type="button"
                variant="outline"
                className="min-h-12 w-full"
                onClick={handleImportReset}
              >
                <ArrowCounterClockwise className="size-4" />
                Changer de fichier
              </Button>
            )}

            {!audioImport.hasAudio && !audioImport.error && (
              <p className="text-center text-sm text-muted-foreground">
                MP3, WAV, M4A, OGG, WebM ou FLAC (max 25 Mo)
              </p>
            )}
          </div>
        )}

        {activeError && (
          <p className="text-center text-sm text-destructive" role="alert">
            {activeError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** @deprecated Use AudioSourceCard */
export function AudioRecorder(props: AudioSourceCardProps) {
  return <AudioSourceCard {...props} />;
}
