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
} from 'lucide-react';
import { PRESETS, type Preset } from '@pixel-forge/shared/presets';
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
          /* Preset cards view */
          <div className="flex flex-col gap-2 p-3">
            {PRESETS.map((preset) => {
              const Icon = presetIcons[preset.id] || Rocket;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    'border-[var(--border-color)] bg-[var(--bg-tertiary)]',
                    'hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)]'
                  )}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                    <Icon className="h-5 w-5 text-[var(--accent)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-[var(--text-primary)]">
                      {preset.name}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {preset.description}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                      <span>
                        {preset.outputSize.width}×{preset.outputSize.height}
                      </span>
                      <span className="opacity-50">•</span>
                      <span className="uppercase">{preset.format}</span>
                      {preset.autoRemoveBg && (
                        <>
                          <span className="opacity-50">•</span>
                          <span>Auto BG</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
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
