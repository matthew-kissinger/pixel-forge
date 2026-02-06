/**
 * Export actions component for ExportSheetNode
 */

import { Download } from 'lucide-react';
import type { ExportSheetNodeCallbacks } from './types';

interface ExportActionsProps {
  canExport: boolean;
  callbacks: Pick<ExportSheetNodeCallbacks, 'onExport'>;
}

export function ExportActions({ canExport, callbacks }: ExportActionsProps) {
  return (
    <button
      onClick={callbacks.onExport}
      disabled={!canExport}
      className="w-full rounded bg-[var(--success)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download className="mr-1 inline h-4 w-4" />
      Export Sheet
    </button>
  );
}
