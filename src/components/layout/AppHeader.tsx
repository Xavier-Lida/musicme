'use client';

import { GearIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  className?: string;
}

export function AppHeader({ className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-4 sm:px-6',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
        <h1 className="shrink-0 text-base font-semibold tracking-tight sm:text-lg">MusicMe</h1>
        <p className="truncate text-xs text-muted-foreground sm:text-sm">
          Fredonnez ou importez un audio — obtenez une partition à 120 BPM
        </p>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Réglages">
            <GearIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Réglages (bientôt)</TooltipContent>
      </Tooltip>
    </header>
  );
}
