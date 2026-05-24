'use client';

import { useRef, useState } from 'react';
import {
  FileArrowUpIcon,
  FilePdfIcon,
  MicrophoneIcon,
  StopIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface ActionToolbarProps {
  className?: string;
  isRecording: boolean;
  isRequestingMic: boolean;
  busy: boolean;
  playing: boolean;
  hasResult: boolean;
  hasNotes: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onUploadAudio: (file: File) => void;
  onClearNotes: () => void;
  onExportPdf: () => void;
}

export function ActionToolbar({
  className,
  isRecording,
  isRequestingMic,
  busy,
  playing,
  hasResult,
  hasNotes,
  onStartRecording,
  onStopRecording,
  onUploadAudio,
  onClearNotes,
  onExportPdf,
}: ActionToolbarProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  function handleAudioFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUploadAudio(file);
    e.target.value = '';
  }

  const actionsDisabled = busy || playing || isRecording;
  const clearDisabled = !hasNotes || !hasResult || actionsDisabled;

  function handleConfirmClear() {
    setClearDialogOpen(false);
    onClearNotes();
  }

  return (
    <div className={cn('daw-track-toolbar', className)}>
      <div className="w-[80px] shrink-0 flex items-center">
        <span className="daw-track-toolbar-label text-xs font-semibold text-muted-foreground truncate">Pistes</span>
      </div>

      <div className="flex flex-1 items-center justify-center gap-3">
        {!isRecording ? (
          <Button
            size="sm"
            onClick={onStartRecording}
            disabled={actionsDisabled || isRequestingMic}
            className="h-8 gap-1.5 bg-red-600/90 hover:bg-red-600 text-white font-medium"
          >
            {isRequestingMic ? (
              <Spinner className="size-3.5" />
            ) : (
              <MicrophoneIcon className="size-4" />
            )}
            {isRequestingMic ? 'Accès…' : 'Enregistrer'}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            onClick={onStopRecording}
            className="h-8 gap-1.5 animate-pulse bg-red-500 hover:bg-red-600 text-white font-medium"
          >
            <StopIcon className="size-4" />
            Arrêter
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          disabled={actionsDisabled}
          onClick={() => audioInputRef.current?.click()}
          className="h-8 gap-1.5 border-border bg-secondary hover:bg-secondary/80 text-foreground"
        >
          <FileArrowUpIcon className="size-4" />
          Audio
        </Button>
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="sr-only"
          onChange={handleAudioFileChange}
        />

        <Button
          size="sm"
          variant="outline"
          disabled={clearDisabled || !hasNotes}
          onClick={onExportPdf}
          className="h-8 gap-1.5 border-border bg-secondary hover:bg-secondary/80 text-foreground"
        >
          <FilePdfIcon className="size-4" />
          Exporter PDF
        </Button>

        <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={clearDisabled}
              className="h-8 gap-1.5 border-border bg-secondary hover:bg-secondary/80 text-foreground"
            >
              <TrashIcon className="size-4" />
              Clear track
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Effacer la piste ?</AlertDialogTitle>
              <AlertDialogDescription>
                Toutes les notes de la piste active seront supprimées. Cette action
                est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleConfirmClear}
              >
                Effacer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="w-[80px] shrink-0" aria-hidden="true" />
    </div>
  );
}
