/**
 * Validation settings panel for QualityCheckNode
 */

import type { QualityCheckNodeData, QualityCheckNodeCallbacks } from './types';

interface ValidationSettingsProps {
  data: QualityCheckNodeData;
  callbacks: Pick<
    QualityCheckNodeCallbacks,
    | 'onMaxFileSizeChange'
    | 'onAllowedFormatsChange'
    | 'onRequirePowerOf2Change'
    | 'onRequireTransparencyChange'
    | 'onMinWidthChange'
    | 'onMaxWidthChange'
    | 'onMinHeightChange'
    | 'onMaxHeightChange'
  >;
}

export function ValidationSettings({ data, callbacks }: ValidationSettingsProps) {
  const maxFileSize = data.maxFileSize ?? 51200;
  const allowedFormats = data.allowedFormats ?? ['png', 'webp', 'jpeg'];
  const requirePowerOf2 = data.requirePowerOf2 ?? true;
  const requireTransparency = data.requireTransparency ?? false;
  const minWidth = data.minWidth ?? 0;
  const maxWidth = data.maxWidth ?? 4096;
  const minHeight = data.minHeight ?? 0;
  const maxHeight = data.maxHeight ?? 4096;

  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2">
      <div>
        <label className="text-xs text-[var(--text-secondary)]">Max File Size (bytes)</label>
        <input
          type="number"
          value={maxFileSize}
          onChange={(e) => callbacks.onMaxFileSizeChange(parseInt(e.target.value, 10) || 51200)}
          className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-sm"
          min={0}
        />
      </div>
      <div>
        <label className="text-xs text-[var(--text-secondary)]">Allowed Formats (comma-separated)</label>
        <input
          type="text"
          value={allowedFormats.join(', ')}
          onChange={(e) =>
            callbacks.onAllowedFormatsChange(
              e.target.value.split(',').map((f) => f.trim().toLowerCase())
            )
          }
          className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-sm"
          placeholder="png, webp, jpeg"
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={requirePowerOf2}
          onChange={() => callbacks.onRequirePowerOf2Change(!requirePowerOf2)}
          className="accent-[var(--accent)]"
        />
        <span className="text-xs text-[var(--text-secondary)]">Require Power of 2</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={requireTransparency}
          onChange={() => callbacks.onRequireTransparencyChange(!requireTransparency)}
          className="accent-[var(--accent)]"
        />
        <span className="text-xs text-[var(--text-secondary)]">Require Transparency</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Min Width</label>
          <input
            type="number"
            value={minWidth}
            onChange={(e) => callbacks.onMinWidthChange(parseInt(e.target.value, 10) || 0)}
            className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-sm"
            min={0}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Max Width</label>
          <input
            type="number"
            value={maxWidth}
            onChange={(e) => callbacks.onMaxWidthChange(parseInt(e.target.value, 10) || 4096)}
            className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-sm"
            min={1}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Min Height</label>
          <input
            type="number"
            value={minHeight}
            onChange={(e) => callbacks.onMinHeightChange(parseInt(e.target.value, 10) || 0)}
            className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-sm"
            min={0}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Max Height</label>
          <input
            type="number"
            value={maxHeight}
            onChange={(e) => callbacks.onMaxHeightChange(parseInt(e.target.value, 10) || 4096)}
            className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-sm"
            min={1}
          />
        </div>
      </div>
    </div>
  );
}
