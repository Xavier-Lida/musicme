'use client';

import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  PauseIcon,
  PlayIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TransportBarProps {
  className?: string;
  isPlaying: boolean;
  disabled?: boolean;
  onTogglePlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
}

export function TransportBar({
  className,
  isPlaying,
  disabled = false,
  onTogglePlayPause,
  onSkipBack,
  onSkipForward,
}: TransportBarProps) {
  return (
    <footer
      className={cn(
        'flex h-16 shrink-0 items-center justify-center gap-2 border-t border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-3',
        className,
      )}
    >
      <Button
        variant="outline"
        size="icon-lg"
        aria-label="Reculer"
        disabled={disabled}
        onClick={onSkipBack}
      >
        <CaretDoubleLeftIcon />
      </Button>

      <Button
        size="icon-lg"
        aria-label={isPlaying ? 'Pause' : 'Lecture'}
        disabled={disabled}
        onClick={onTogglePlayPause}
        className="size-11"
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </Button>

      <Button
        variant="outline"
        size="icon-lg"
        aria-label="Avancer"
        disabled={disabled}
        onClick={onSkipForward}
      >
        <CaretDoubleRightIcon />
      </Button>
    </footer>
  );
}
