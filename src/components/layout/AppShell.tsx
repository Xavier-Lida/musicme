'use client';

import { type ReactNode } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { TransportBar } from '@/components/layout/TransportBar';
import type { ProjectMetadata } from '@/hooks/useProjectMetadata';

interface AppShellProps {
  children: ReactNode;
  metadata: ProjectMetadata;
  onFieldChange: <K extends keyof ProjectMetadata>(
    key: K,
    value: ProjectMetadata[K],
  ) => void;
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
  metadata,
  onFieldChange,
  transport,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <AppHeader metadata={metadata} onFieldChange={onFieldChange} />

      <div className="daw-content">
        <main className="daw-main">
          {children}
        </main>
      </div>

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
