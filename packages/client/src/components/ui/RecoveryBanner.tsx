import { useEffect, useRef } from 'react';

interface RecoveryBannerProps {
  onRecover: () => void;
  onDiscard: () => void;
}

/**
 * Inline recovery prompt shown when unsaved workflow is found on load.
 * Replaces window.confirm for mobile-friendly UX (44px touch targets, styled).
 */
export function RecoveryBanner({ onRecover, onDiscard }: RecoveryBannerProps) {
  const recoverRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    recoverRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onDiscard();
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="recovery-banner-title"
      aria-describedby="recovery-banner-desc"
      className="fixed top-0 left-0 right-0 z-[100] border-b border-zinc-700 bg-zinc-900 px-4 py-3 shadow-lg"
      onKeyDown={handleKeyDown}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2
            id="recovery-banner-title"
            className="text-sm font-semibold text-zinc-100"
          >
            Recover unsaved workflow?
          </h2>
          <p
            id="recovery-banner-desc"
            className="mt-0.5 text-sm text-zinc-400"
          >
            We found a workflow from your last session. Recover it or start fresh.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            ref={recoverRef}
            type="button"
            onClick={onRecover}
            className="min-h-[44px] min-w-[44px] touch-manipulation rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            aria-label="Recover unsaved workflow"
          >
            Recover
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="min-h-[44px] min-w-[44px] touch-manipulation rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            aria-label="Discard and start fresh"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
