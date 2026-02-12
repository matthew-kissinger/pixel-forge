/**
 * Preset detail form - subject input, output size, generate button
 */
import { ChevronLeft, Zap } from 'lucide-react';
import type { PresetDetailFormProps } from './types';

function getSubjectPlaceholder(presetId: string): string {
  if (presetId === 'planet-texture') return 'lava world';
  if (presetId === 'enemy-sprite') return 'scout drone';
  return 'magic sword';
}

export function PresetDetailForm({
  preset,
  subject,
  onSubjectChange,
  onGenerate,
  onCancel,
}: PresetDetailFormProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="rounded p-1 hover:bg-[var(--bg-tertiary)]"
          title="Back to presets"
        >
          <ChevronLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            {preset.name}
          </h4>
          <p className="text-xs text-[var(--text-secondary)]">
            {preset.description}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder={`e.g. ${getSubjectPlaceholder(preset.id)}`}
          className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && onGenerate()}
          autoFocus
        />
        <p className="mt-1.5 text-[10px] text-[var(--text-secondary)]">
          What do you want to generate?
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
          Output Size
        </label>
        <div className="rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          {preset.outputSize.width} × {preset.outputSize.height} px
          {' • '}
          {preset.format.toUpperCase()}
          {preset.autoRemoveBg && ' • Auto-remove BG'}
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={!subject.trim()}
        className="w-full flex items-center justify-center gap-2 rounded bg-[var(--accent)] py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Zap className="h-4 w-4" />
        Generate Workflow
      </button>
    </div>
  );
}
