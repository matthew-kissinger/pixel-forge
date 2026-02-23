import { useCallback, useState } from 'react';
import { type NodeProps, Handle, Position, useEdges } from '@xyflow/react';
import { ImageIcon, Sparkles, Eraser, ChevronDown, Loader2, Image as ImageLucide } from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';
import { PRESETS, getPresetById } from '@pixel-forge/shared/presets';
import type { AspectRatio, ImageSize } from '@pixel-forge/shared';
import { generateImage } from '../../lib/api';
import { cn } from '../../lib/utils';
import type { NodeOutput, NodeStatus } from '../../stores/workflow';

// Gemini-supported aspect ratios
const ASPECT_RATIOS: { value: AspectRatio | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '1:1', label: '1:1 Square' },
  { value: '4:3', label: '4:3 Landscape' },
  { value: '3:4', label: '3:4 Portrait' },
  { value: '16:9', label: '16:9 Wide' },
  { value: '9:16', label: '9:16 Tall' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
  { value: '4:5', label: '4:5' },
  { value: '5:4', label: '5:4' },
  { value: '21:9', label: '21:9 Ultrawide' },
];

// Gemini-supported image sizes (uppercase K required)
const IMAGE_SIZES: { value: ImageSize | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

const statusColors: Record<NodeStatus, string> = {
  idle: 'border-[var(--border-color)]',
  running: 'border-[var(--accent)]',
  success: 'border-[var(--success)]',
  error: 'border-[var(--error)]',
};

interface ImageGenNodeData {
  label: string;
  aspectRatio?: AspectRatio | 'auto';
  imageSize?: ImageSize | 'auto';
  autoRemoveBg?: boolean;
  presetId?: string;
  [key: string]: unknown;
}

export function ImageGenNode(props: NodeProps) {
  const { id, data, selected } = props;
  const nodeData = data as ImageGenNodeData;

  const { nodeOutputs, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData, retryNode, nodeErrors } =
    useWorkflowStore();
  const edges = useEdges();
  const status = nodeStatus[id] ?? 'idle';
  const error = nodeErrors[id];

  // Local state for expanded settings
  const [showSettings, setShowSettings] = useState(false);

  // Get current values with defaults
  const currentAspectRatio = nodeData.aspectRatio ?? 'auto';
  const currentImageSize = nodeData.imageSize ?? 'auto';
  const autoRemoveBg = nodeData.autoRemoveBg ?? false;
  const currentPresetId = nodeData.presetId;
  const currentPreset = currentPresetId ? getPresetById(currentPresetId) : undefined;

  // Resolve inputs by target handle ID
  const incomingEdges = edges.filter((e) => e.target === id);
  const promptEdge = incomingEdges.find((e) => e.targetHandle === 'prompt' || !e.targetHandle);
  const promptInput: NodeOutput | undefined = promptEdge ? nodeOutputs[promptEdge.source] : undefined;

  // Collect up to 3 reference image inputs (image, image-1, image-2)
  const imageHandleIds = ['image', 'image-1', 'image-2'];
  const refImageOutputs = imageHandleIds
    .map((hid) => {
      const edge = incomingEdges.find((e) => e.targetHandle === hid);
      return edge ? nodeOutputs[edge.source] : undefined;
    })
    .filter((o): o is NodeOutput => o?.type === 'image');

  // Also check: if only one edge and no handle specified, try to use it as prompt
  const hasImageEdges = imageHandleIds.some((hid) => incomingEdges.some((e) => e.targetHandle === hid));
  const fallbackPrompt = !promptInput && !hasImageEdges && incomingEdges.length === 1
    ? nodeOutputs[incomingEdges[0].source]
    : undefined;
  const effectivePrompt = promptInput ?? (fallbackPrompt?.type === 'text' ? fallbackPrompt : undefined);

  const handleGenerate = useCallback(async () => {
    if (!effectivePrompt) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');

    try {
      const result = await generateImage({
        prompt: effectivePrompt.data,
        aspectRatio: currentAspectRatio === 'auto' ? undefined : currentAspectRatio,
        imageSize: currentImageSize === 'auto' ? undefined : currentImageSize,
        removeBackground: autoRemoveBg,
        presetId: currentPreset?.id,
        referenceImages: refImageOutputs.length > 0 ? refImageOutputs.map((o) => o.data) : undefined,
      });

      setNodeOutput(id, {
        type: 'image',
        data: result.image,
        timestamp: Date.now(),
      });
      setNodeStatus(id, 'success');
    } catch (err) {
      logger.error('Image generation failed:', err);
      setNodeStatus(id, 'error');
    }
  }, [
    id,
    effectivePrompt,
    refImageOutputs,
    setNodeOutput,
    setNodeStatus,
    currentAspectRatio,
    currentImageSize,
    autoRemoveBg,
    currentPreset,
  ]);

  const updateAspectRatio = (aspectRatio: AspectRatio | 'auto') => {
    updateNodeData(id, { aspectRatio });
  };

  const updateImageSize = (imageSize: ImageSize | 'auto') => {
    updateNodeData(id, { imageSize });
  };

  const updatePreset = (presetId: string) => {
    if (presetId === 'custom') {
      updateNodeData(id, { presetId: undefined });
      return;
    }

    const preset = getPresetById(presetId);
    if (!preset) {
      updateNodeData(id, { presetId: undefined });
      return;
    }

    const nextData: Partial<ImageGenNodeData> = {
      presetId: preset.id,
      autoRemoveBg: preset.autoRemoveBg,
    };

    const presetAspectRatio = getAspectRatioFromSize(preset.outputSize);
    if (presetAspectRatio) {
      nextData.aspectRatio = presetAspectRatio;
    }

    updateNodeData(id, nextData);
  };

  const toggleAutoRemoveBg = () => {
    updateNodeData(id, { autoRemoveBg: !autoRemoveBg });
  };

  // Build a short summary of current config for the settings toggle
  const configSummary = [
    currentAspectRatio !== 'auto' ? currentAspectRatio : null,
    currentImageSize !== 'auto' ? currentImageSize : null,
    currentPreset ? currentPreset.name : null,
  ].filter(Boolean).join(' / ') || 'Default';

  return (
    <div
      className={cn(
        'min-w-[200px] rounded-lg border-2 bg-[var(--bg-secondary)] shadow-lg transition-all duration-150',
        'active:scale-[0.99] active:shadow-md touch-manipulation',
        statusColors[status],
        selected && 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-primary)]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-3 py-2 [@media(pointer:coarse)]:py-3">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {nodeData.label}
        </span>
        {status === 'running' && (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
        )}
      </div>

      {/* Error bar */}
      {status === 'error' && error && (
        <div
          className="flex items-center gap-2 bg-[var(--error)] px-3 py-1 text-[10px] text-white"
          title={error}
        >
          <div className="flex-1 line-clamp-2 leading-tight">{error}</div>
          <button
            onClick={() => retryNode(id)}
            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded hover:bg-white/20 active:bg-white/30"
            aria-label="Retry this node"
            type="button"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <div className="flex flex-col gap-2">
          {/* Header with config summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <ImageIcon className="h-4 w-4" />
              <span>Gemini 3 Pro Image</span>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            >
              <span>{configSummary}</span>
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showSettings ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Input status indicators */}
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
            <span className={effectivePrompt ? 'text-[var(--success)]' : 'opacity-50'}>
              Prompt {effectivePrompt ? 'connected' : 'needed'}
            </span>
            {refImageOutputs.length > 0 && (
              <span className="flex items-center gap-0.5 text-[var(--accent)]">
                <ImageLucide className="h-2.5 w-2.5" />
                {refImageOutputs.length} ref {refImageOutputs.length === 1 ? 'image' : 'images'}
              </span>
            )}
          </div>

          {/* Expanded settings */}
          {showSettings && (
            <div className="flex flex-col gap-2 rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2">
              {/* Preset selector */}
              <div>
                <label className="mb-1 block text-xs text-[var(--text-secondary)]">Preset</label>
                <select
                  value={currentPreset?.id ?? 'custom'}
                  onChange={(e) => updatePreset(e.target.value)}
                  className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]"
                >
                  <option value="custom">Custom (No Preset)</option>
                  {PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
                {currentPreset && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {currentPreset.outputSize.width}x{currentPreset.outputSize.height} - {currentPreset.background} bg - {currentPreset.format.toUpperCase()}
                  </p>
                )}
              </div>

              {/* Aspect ratio selector */}
              <div>
                <label className="mb-1 block text-xs text-[var(--text-secondary)]">
                  Aspect Ratio
                </label>
                <select
                  value={currentAspectRatio}
                  onChange={(e) => updateAspectRatio(e.target.value as AspectRatio | 'auto')}
                  className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]"
                >
                  {ASPECT_RATIOS.map((ratio) => (
                    <option key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image size / resolution selector */}
              <div>
                <label className="mb-1 block text-xs text-[var(--text-secondary)]">
                  Resolution
                </label>
                <select
                  value={currentImageSize}
                  onChange={(e) => updateImageSize(e.target.value as ImageSize | 'auto')}
                  className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]"
                >
                  {IMAGE_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto remove background toggle */}
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRemoveBg}
                  onChange={toggleAutoRemoveBg}
                  className="h-4 w-4 rounded border-[var(--border-color)] accent-[var(--accent)]"
                />
                <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                  <Eraser className="h-3 w-3" />
                  Auto Remove BG
                </span>
              </label>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={status === 'running'}
            className="flex w-full items-center justify-center gap-2 rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'running' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {status === 'running' ? 'Generating...' : 'Generate'}
          </button>

          {/* Error message */}
          {status === 'error' && !error && (
            <p className="text-xs text-[var(--error)]">
              Generation failed. Check console for details.
            </p>
          )}
        </div>
      </div>

      {/* Four input handles on the left: prompt + up to 3 reference images */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        className="react-flow__handle-left"
        style={{ top: '35%' }}
        title="Prompt (text)"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        className="react-flow__handle-left"
        style={{ top: '55%' }}
        title="Reference Image 1 (optional)"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="image-1"
        className="react-flow__handle-left"
        style={{ top: '70%' }}
        title="Reference Image 2 (optional)"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="image-2"
        className="react-flow__handle-left"
        style={{ top: '85%' }}
        title="Reference Image 3 (optional)"
      />

      {/* Output handle on the right */}
      <Handle
        type="source"
        position={Position.Right}
        className="react-flow__handle-right"
        title="Image"
      />
    </div>
  );
}

function getAspectRatioFromSize(size: { width: number; height: number }): AspectRatio | undefined {
  if (size.width === size.height) {
    return '1:1';
  }

  return undefined;
}
