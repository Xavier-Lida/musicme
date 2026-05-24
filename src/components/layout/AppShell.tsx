'use client';

import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { TransportBar } from '@/components/layout/TransportBar';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
  infoPanel: ReactNode;
  transport: {
    isPlaying: boolean;
    disabled?: boolean;
    onTogglePlayPause: () => void;
    onSkipBack: () => void;
    onSkipForward: () => void;
  };
}

export function AppShell({ children, infoPanel, transport }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AppHeader className="fixed inset-x-0 top-0 z-40" />

      <main className="flex flex-1 flex-col gap-4 px-4 pb-20 pt-16 lg:flex-row lg:gap-6 lg:px-6">
        {infoPanel}
        <div className={cn('flex min-w-0 flex-1 flex-col gap-4')}>{children}</div>
      </main>

      <TransportBar
        className="fixed inset-x-0 bottom-0 z-40"
        isPlaying={transport.isPlaying}
        disabled={transport.disabled}
        onTogglePlayPause={transport.onTogglePlayPause}
        onSkipBack={transport.onSkipBack}
        onSkipForward={transport.onSkipForward}
      />
    </div>
  );
}
