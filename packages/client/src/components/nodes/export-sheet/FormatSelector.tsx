/**
 * Format selection component for ExportSheetNode
 */

import type { ExportSheetNodeData, ExportSheetNodeCallbacks } from './types';

interface FormatSelectorProps {
  data: ExportSheetNodeData;
  callbacks: Pick<ExportSheetNodeCallbacks, 'onFormatChange' | 'onAtlasFormatChange'>;
}

export function FormatSelector({ data, callbacks }: FormatSelectorProps) {
  const format = data.format || 'png';
  const atlasFormat = data.atlasFormat || 'none';

  return (
    <>
      {/* Format Selection */}
      <div className="flex gap-1">
        {(['png', 'webp'] as const).map((f) => (
          <button
            key={f}
            onClick={() => callbacks.onFormatChange(f)}
            className={`flex-1 rounded px-2 py-1 text-xs uppercase ${
              format === f
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Atlas Format Selection */}
      <div>
        <label className="text-xs text-[var(--text-secondary)] mb-1 block">Atlas Format</label>
        <select
          value={atlasFormat}
          onChange={(e) =>
            callbacks.onAtlasFormatChange(e.target.value as 'none' | 'phaser' | 'unity' | 'godot')
          }
          className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
        >
          <option value="none">None</option>
          <option value="phaser">Phaser 3</option>
          <option value="unity">Unity</option>
          <option value="godot">Godot</option>
        </select>
      </div>
    </>
  );
}
