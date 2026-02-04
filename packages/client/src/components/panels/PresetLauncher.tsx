import { useState } from 'react';
import {
  Rocket,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  ImageIcon,
  Box,
  Grid3X3,
  Film,
  Wand2,
  Zap,
  Layers,
  FileImage,
} from 'lucide-react';
import { PRESETS, type Preset, type PresetCategory } from '@pixel-forge/shared/presets';
import { createWorkflowFromPreset } from '../../lib/templates';
import { useWorkflowStore } from '../../stores/workflow';
import { toast } from '../ui/Toast';
import { cn } from '../../lib/utils';

const presetIcons: Record<string, typeof Rocket> = {
  'planet-texture': ImageIcon,
  'enemy-sprite': Rocket,
  'game-icon': Sparkles,
  'isometric-sheet': Grid3X3,
  'vegetation-sprite': Wand2,
  'effect-strip': Film,
  'soldier-sprite': Box,
};

const categoryInfo: Record<PresetCategory, { label: string; color: string; bgColor: string }> = {
  sprite: { label: 'Sprite', color: 'text-blue-400', bgColor: 'bg-blue-950/50 border-blue-800/50' },
  texture: { label: 'Texture', color: 'text-green-400', bgColor: 'bg-green-950/50 border-green-800/50' },
  icon: { label: 'Icon', color: 'text-purple-400', bgColor: 'bg-purple-950/50 border-purple-800/50' },
  sheet: { label: 'Sheet', color: 'text-orange-400', bgColor: 'bg-orange-950/50 border-orange-800/50' },
};

const outputTypeIcons: Record<Preset['format'], typeof FileImage> = {
  png: FileImage,
  jpeg: FileImage,
  webp: FileImage,
};

interface PresetLauncherProps {
  isVisible: boolean;
  onToggle: () => void;
}

export function PresetLauncher({ isVisible, onToggle }: PresetLauncherProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [subject, setSubject] = useState('');
  const { reset, addNode, onConnect } = useWorkflowStore();

  if (!isVisible) return null;

  const handlePresetClick = (preset: Preset) => {
    setSelectedPreset(preset);
    setSubject('');
  };

  const handleGenerate = () => {
    if (!selectedPreset) return;
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    const workflow = createWorkflowFromPreset(selectedPreset.id, subject);
    if (!workflow) {
      toast.error('Failed to create workflow');
      return;
    }

    // Clear existing workflow
    reset();

    // Add nodes
    for (const node of workflow.nodes) {
      addNode(node);
    }

    // Add edges
    for (const edge of workflow.edges) {
      onConnect({
        source: edge.source,
        target: edge.target,
        sourceHandle: null,
        targetHandle: null,
      });
    }

    toast.success(`Generated workflow for "${subject}"`);
    setSelectedPreset(null);
    setSubject('');
  };

  const handleCancel = () => {
    setSelectedPreset(null);
    setSubject('');
  };

  // Collapsed view - just show icon
  if (isCollapsed) {
    return (
      <div className="absolute right-4 top-20 z-10 flex flex-col overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center justify-center p-2 hover:bg-[var(--bg-tertiary)]"
          title="Expand preset launcher"
        >
          <ChevronLeft className="h-5 w-5 text-[var(--text-secondary)]" />
        </button>
        <div className="border-t border-[var(--border-color)]">
          <div className="flex items-center justify-center p-2" title="Preset Launcher">
            <Rocket className="h-4 w-4 text-[var(--accent)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-4 top-20 z-10 flex max-h-[calc(100vh-120px)] w-80 flex-col overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-3 py-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Rocket className="h-4 w-4 text-[var(--accent)]" />
            Preset Launcher
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">Quick-start workflows</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(true)}
            className="rounded p-1 hover:bg-[var(--bg-tertiary)]"
            title="Collapse panel"
          >
            <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={onToggle}
            className="rounded p-1 hover:bg-[var(--bg-tertiary)]"
            title="Close panel"
          >
            <X className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedPreset ? (
          /* Form view when preset is selected */
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="rounded p-1 hover:bg-[var(--bg-tertiary)]"
                title="Back to presets"
              >
                <ChevronLeft className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  {selectedPreset.name}
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  {selectedPreset.description}
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
                onChange={(e) => setSubject(e.target.value)}
                placeholder={`e.g. ${selectedPreset.id === 'planet-texture' ? 'lava world' : selectedPreset.id === 'enemy-sprite' ? 'scout drone' : 'magic sword'}`}
                className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
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
                {selectedPreset.outputSize.width} × {selectedPreset.outputSize.height} px
                {' • '}
                {selectedPreset.format.toUpperCase()}
                {selectedPreset.autoRemoveBg && ' • Auto-remove BG'}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!subject.trim()}
              className="w-full flex items-center justify-center gap-2 rounded bg-[var(--accent)] py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              Generate Workflow
            </button>
          </div>
        ) : (
          /* Preset cards view - organized by category */
          <div className="flex flex-col gap-4 p-3">
            {(['sprite', 'texture', 'icon', 'sheet'] as PresetCategory[]).map((category) => {
              const presetsInCategory = PRESETS.filter((p) => p.category === category);
              if (presetsInCategory.length === 0) return null;

              const catInfo = categoryInfo[category];

              return (
                <div key={category} className="flex flex-col gap-2">
                  {/* Category header */}
                  <div className="flex items-center gap-2 px-1">
                    <div className={cn('text-xs font-semibold uppercase tracking-wider', catInfo.color)}>
                      {catInfo.label}
                    </div>
                    <div className="h-px flex-1 bg-[var(--border-color)]" />
                    <div className="text-[10px] text-[var(--text-secondary)]">
                      {presetsInCategory.length}
                    </div>
                  </div>

                  {/* Preset cards */}
                  {presetsInCategory.map((preset) => {
                    const Icon = presetIcons[preset.id] || Rocket;
                    const OutputIcon = outputTypeIcons[preset.format];
                    const nodeCount = 4 + (preset.autoRemoveBg ? 1 : 0); // Estimate: prompt + gen + resize + preview + save (+ removeBg if needed)

                    return (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetClick(preset)}
                        className={cn(
                          'group flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
                          'border-[var(--border-color)] bg-[var(--bg-tertiary)]',
                          'hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)] hover:shadow-md'
                        )}
                      >
                        {/* Icon */}
                        <div className={cn(
                          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded',
                          'bg-[var(--bg-secondary)] border transition-colors',
                          'group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)]/10',
                          catInfo.bgColor
                        )}>
                          <Icon className={cn('h-5 w-5 transition-colors', catInfo.color)} />
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
                              <span>{preset.outputSize.width}×{preset.outputSize.height}</span>
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
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {!selectedPreset && (
        <div className="border-t border-[var(--border-color)] px-3 py-2">
          <p className="text-[10px] text-[var(--text-secondary)]">
            Select a preset to create a pre-configured workflow
          </p>
        </div>
      )}
    </div>
  );
}
