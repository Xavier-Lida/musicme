'use client';

import { useState, type ReactNode } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { TransportBar } from '@/components/layout/TransportBar';
import type { ProjectMetadata } from '@/hooks/useProjectMetadata';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
  infoPanel: ReactNode;
  metadata: ProjectMetadata;
  onFieldChange: <K extends keyof ProjectMetadata>(
    key: K,
    value: ProjectMetadata[K],
  ) => void;
  onExportPdf?: () => void;
  exportPdfDisabled?: boolean;
  transport: {
    isPlaying: boolean;
    disabled?: boolean;
    onTogglePlayPause: () => void;
    onSkipBack: () => void;
    onSkipForward: () => void;
    currentTime?: number;
    statusLabel?: string;
    statusClass?: string;
  };
}

export function AppShell({
  children,
  infoPanel,
  metadata,
  onFieldChange,
  onExportPdf,
  exportPdfDisabled,
  transport,
}: AppShellProps) {
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <div className="app-shell">
      <AppHeader
        metadata={metadata}
        onFieldChange={onFieldChange}
        showMobileMenu
        onOpenDrawer={() => setPanelOpen((v) => !v)}
        onExportPdf={onExportPdf}
        exportPdfDisabled={exportPdfDisabled}
      />

      <div className="daw-content">
        <aside
          className={cn('daw-left', !panelOpen && 'daw-left--hidden')}
          aria-label="Panneau de configuration"
        >
          {infoPanel}
        </aside>

        <main className="daw-main">
          {children}
        </main>
      </div>

      {panelOpen && (
        <div
          className="fixed inset-0 z-[69] bg-black/50 md:hidden"
          onClick={() => setPanelOpen(false)}
          aria-hidden="true"
        />
      )}

      <TransportBar
        isPlaying={transport.isPlaying}
        disabled={transport.disabled}
        onTogglePlayPause={transport.onTogglePlayPause}
        onSkipBack={transport.onSkipBack}
        onSkipForward={transport.onSkipForward}
        currentTime={transport.currentTime}
        statusLabel={transport.statusLabel}
        statusClass={transport.statusClass}
      />
    </div>
  );
}
