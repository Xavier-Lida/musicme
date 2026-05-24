'use client';

import { GearIcon, InfoIcon, FilePdfIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ProjectInfoPanel } from '@/components/project/ProjectInfoPanel';
import type { ProjectMetadata } from '@/hooks/useProjectMetadata';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  className?: string;
  metadata: ProjectMetadata;
  onFieldChange: <K extends keyof ProjectMetadata>(
    key: K,
    value: ProjectMetadata[K],
  ) => void;
  showMobileMenu?: boolean;
  onOpenDrawer?: () => void;
  onExportPdf?: () => void;
  exportPdfDisabled?: boolean;
}

export function AppHeader({
  className,
  metadata,
  onFieldChange,
  showMobileMenu,
  onOpenDrawer,
  onExportPdf,
  exportPdfDisabled,
}: AppHeaderProps) {
  return (
    <header className={cn('daw-header', className)}>
      {showMobileMenu && (
        <button
          type="button"
          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          onClick={onOpenDrawer}
          aria-label="Menu"
        >
          ☰
        </button>
      )}

      <div className="daw-logo" aria-hidden="true">M</div>
      <span className="daw-header-title">MusicMe</span>
      <p className="daw-header-subtitle">
        Fredonnez ou importez un audio — obtenez une partition à 120 BPM
      </p>

      {onExportPdf && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Exporter la partition en PDF"
              onClick={onExportPdf}
              disabled={exportPdfDisabled}
              className="ml-auto shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <FilePdfIcon className="size-4" />
              <span className="hidden sm:inline">Exporter PDF</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Exporter la partition (avec les infos du projet)
          </TooltipContent>
        </Tooltip>
      )}

      <Popover>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Informations de la partition"
                className={cn('shrink-0 text-muted-foreground', !onExportPdf && 'ml-auto')}
              >
                <InfoIcon />
              </Button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent>
            Informations de la partition (titre, auteur, instruments)
          </TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-72 p-0">
          <ProjectInfoPanel metadata={metadata} onFieldChange={onFieldChange} />
        </PopoverContent>
      </Popover>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Réglages"
            className="shrink-0 text-muted-foreground"
          >
            <GearIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Réglages (bientôt)</TooltipContent>
      </Tooltip>
    </header>
  );
}
