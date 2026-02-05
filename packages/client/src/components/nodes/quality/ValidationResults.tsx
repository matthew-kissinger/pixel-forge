/**
 * Validation results display for QualityCheckNode
 */

import { CheckCircle2, XCircle } from 'lucide-react';
import type { ValidationResult } from './types';

interface ValidationResultsProps {
  result: ValidationResult;
}

export function ValidationResults({ result }: ValidationResultsProps) {
  return (
    <div className="rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2 text-xs">
      <div className="mb-2 flex items-center gap-2">
        {result.passed ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
            <span className="font-medium text-[var(--success)]">All checks passed</span>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-[var(--error)]" />
            <span className="font-medium text-[var(--error)]">Validation failed</span>
          </>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {Object.entries(result.checks).map(([key, check]) => (
          <div key={key} className="flex items-center gap-2">
            {check.passed ? (
              <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-[var(--success)]" />
            ) : (
              <XCircle className="h-3 w-3 flex-shrink-0 text-[var(--error)]" />
            )}
            <span className={check.passed ? 'text-[var(--text-primary)]' : 'text-[var(--error)]'}>
              {check.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
