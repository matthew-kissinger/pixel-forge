/**
 * Action buttons for QualityCheckNode
 */

import { CheckCircle2, Settings, AlertCircle } from 'lucide-react';
import type { QualityCheckNodeCallbacks } from './types';

interface QualityActionsProps {
  status: 'idle' | 'running' | 'success' | 'error';
  showSettings: boolean;
  callbacks: Pick<QualityCheckNodeCallbacks, 'onValidate' | 'onToggleSettings'>;
}

export function QualityActions({ status, showSettings, callbacks }: QualityActionsProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <CheckCircle2 className="h-4 w-4" />
          <span>Quality Check</span>
        </div>
        <button
          onClick={callbacks.onToggleSettings}
          className={`rounded p-1 hover:bg-[var(--bg-tertiary)] ${showSettings ? 'bg-[var(--bg-tertiary)]' : ''}`}
        >
          <Settings className={`h-3 w-3 ${showSettings ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`} />
        </button>
      </div>

      <button
        onClick={callbacks.onValidate}
        disabled={status === 'running'}
        className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === 'running' ? 'Validating...' : 'Validate'}
      </button>

      {status === 'error' && (
        <div className="flex items-center gap-2 text-xs text-[var(--error)]">
          <AlertCircle className="h-4 w-4" />
          <span>Validation failed. Check settings and try again.</span>
        </div>
      )}
    </>
  );
}
