'use client';

import { useState, type ReactNode } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { TransportBar } from '@/components/layout/TransportBar';
import type { ProjectMetadata } from '@/hooks/useProjectMetadata';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
  infoPanel: ReactNode;
  metadata?: ProjectMetadata;
  onFieldChange?: <K extends keyof ProjectMetadata>(key: K, value: ProjectMetadata[K]) => void;
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

export function AppShell({ children, infoPanel, transport }: AppShellProps) {
  // Panel open by default — hamburger TOGGLES the SAME left panel (no duplicate drawer)
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <div className="app-shell">
      {/* Fixed App Header */}
      <AppHeader
        showMobileMenu={true}
        onOpenDrawer={() => setPanelOpen((v) => !v)}
      />

      {/* Main Content Area */}
      <div className="daw-content">
        {/* Left panel — toggled by hamburger on all screen sizes */}
        <aside
          className={cn('daw-left', !panelOpen && 'daw-left--hidden')}
          aria-label="Panneau de configuration"
        >
          {infoPanel}
        </aside>

        {/* Main Work Panel */}
        <main className="daw-main">
          {children}
        </main>
      </div>

      {/* Mobile backdrop — only shown on small screens when panel is open */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-[69] bg-black/50 md:hidden"
          onClick={() => setPanelOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Fixed Transport Footer */}
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
