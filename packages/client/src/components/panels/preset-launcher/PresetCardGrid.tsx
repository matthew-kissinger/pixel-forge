/**
 * Preset card grid - displays presets organized by category
 */
import { ImageIcon, Layers } from 'lucide-react';
import { PRESETS, type PresetCategory } from '@pixel-forge/shared/presets';
import { cn } from '../../../lib/utils';
import {
  presetIcons,
  categoryInfo,
  outputTypeIcons,
  getNodeCount,
} from './constants';
import type { PresetCardGridProps } from './types';

export function PresetCardGrid({ onPresetClick }: PresetCardGridProps) {
  return (
    <div className="flex flex-col gap-4 p-3">
      {(['sprite', 'texture', 'icon', 'sheet'] as PresetCategory[]).map(
        (category) => {
          const presetsInCategory = PRESETS.filter(
            (p) => p.category === category
          );
          if (presetsInCategory.length === 0) return null;

          const catInfo = categoryInfo[category];

          return (
            <div key={category} className="flex flex-col gap-2">
              {/* Category header */}
              <div className="flex items-center gap-2 px-1">
                <div
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    catInfo.color
                  )}
                >
                  {catInfo.label}
                </div>
                <div className="h-px flex-1 bg-[var(--border-color)]" />
                <div className="text-[10px] text-[var(--text-secondary)]">
                  {presetsInCategory.length}
                </div>
              </div>

              {/* Preset cards */}
              {presetsInCategory.map((preset) => {
                const Icon = presetIcons[preset.id] || presetIcons['enemy-sprite'];
                const OutputIcon = outputTypeIcons[preset.format];
                const nodeCount = getNodeCount(preset);

                return (
                  <button
                    key={preset.id}
                    onClick={() => onPresetClick(preset)}
                    className={cn(
                      'group flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
                      'border-[var(--border-color)] bg-[var(--bg-tertiary)]',
                      'hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)] hover:shadow-md'
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded',
                        'bg-[var(--bg-secondary)] border transition-colors',
                        'group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)]/10',
                        catInfo.bgColor
                      )}
                    >
                      <Icon
                        className={cn('h-5 w-5 transition-colors', catInfo.color)}
                      />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {/* Name and category badge */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-sm text-[var(--text-primary)]">
                          {preset.name}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
                        {preset.description}
                      </div>

                      {/* Metadata row */}
                      <div className="flex items-center gap-3">
                        {/* Size */}
                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                          <ImageIcon className="h-3 w-3" />
                          <span>
                            {preset.outputSize.width}×{preset.outputSize.height}
                          </span>
                        </div>

                        {/* Format */}
                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                          <OutputIcon className="h-3 w-3" />
                          <span className="uppercase">{preset.format}</span>
                        </div>

                        {/* Node count */}
                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                          <Layers className="h-3 w-3" />
                          <span>{nodeCount} nodes</span>
                        </div>

                        {/* Auto BG badge */}
                        {preset.autoRemoveBg && (
                          <div className="ml-auto">
                            <div className="rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 px-2 py-0.5 text-[9px] font-medium text-[var(--accent)]">
                              Auto BG
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        }
      )}
    </div>
  );
}
