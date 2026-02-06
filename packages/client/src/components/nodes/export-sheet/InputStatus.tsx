/**
 * Input status display component for ExportSheetNode
 */

interface InputStatusProps {
  hasInput: boolean;
  inputType: 'image' | 'text' | 'model' | 'number' | 'metadata' | null;
}

export function InputStatus({ hasInput, inputType }: InputStatusProps) {
  if (!hasInput) {
    return (
      <div className="rounded border border-dashed border-[var(--border-color)] p-2 text-center text-xs text-[var(--text-secondary)]">
        Connect a sprite sheet input
      </div>
    );
  }

  if (inputType === 'image') {
    return (
      <div className="rounded bg-[var(--bg-tertiary)] p-2 text-xs text-[var(--text-secondary)]">
        Sprite sheet ready
      </div>
    );
  }

  return (
    <div className="rounded border border-dashed border-[var(--error)] p-2 text-center text-xs text-[var(--error)]">
      Wrong input type - expects image
    </div>
  );
}
