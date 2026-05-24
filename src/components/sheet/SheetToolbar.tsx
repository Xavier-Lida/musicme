'use client';

import { ArrowCounterClockwise, ArrowClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SheetToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
}

export function SheetToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  className,
}: SheetToolbarProps) {
  return (
    <div className={cn('sheet-toolbar flex items-center gap-1 px-1 pb-2', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={!canUndo}
        onClick={onUndo}
        aria-label="Annuler"
        title="Annuler (⌘Z)"
      >
        <ArrowCounterClockwise className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={!canRedo}
        onClick={onRedo}
        aria-label="Rétablir"
        title="Rétablir (⌘⇧Z)"
      >
        <ArrowClockwise className="size-4" />
      </Button>
    </div>
  );
}
