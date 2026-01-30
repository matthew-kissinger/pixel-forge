import { useCallback, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { ImageIcon, Sparkles, Eraser, ChevronDown } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '../../stores/workflow';
import { generateImage, removeBackground, type ArtStyle, type AspectRatio } from '../../lib/api';

// Style presets with descriptions
const STYLE_PRESETS: { value: ArtStyle; label: string; description: string }[] = [
  { value: 'pixel-art', label: 'Pixel Art', description: 'Retro pixel-style graphics' },
  { value: 'painted', label: 'Painted', description: 'Digital painting style' },
  { value: 'vector', label: 'Vector', description: 'Clean vector graphics' },
  { value: 'anime', label: 'Anime', description: 'Japanese animation style' },
  { value: 'realistic', label: 'Realistic', description: 'Photorealistic rendering' },
  { value: 'isometric', label: 'Isometric', description: 'Isometric game art (26.565°)' },
];

// Aspect ratio presets
const ASPECT_RATIOS: { value: AspectRatio | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Auto (Smart)' },
  { value: '1:1', label: '1:1 Square' },
  { value: '4:3', label: '4:3 Landscape' },
  { value: '3:4', label: '3:4 Portrait' },
  { value: '16:9', label: '16:9 Wide' },
  { value: '9:16', label: '9:16 Tall' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
];

interface ImageGenNodeData {
  label: string;
  style?: ArtStyle;
  aspectRatio?: AspectRatio | 'auto';
  autoRemoveBg?: boolean;
}

export function ImageGenNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ImageGenNodeData;

  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';

  // Local state for expanded settings
  const [showSettings, setShowSettings] = useState(false);

  // Get current values with defaults
  const currentStyle = nodeData.style ?? 'pixel-art';
  const currentAspectRatio = nodeData.aspectRatio ?? 'auto';
  const autoRemoveBg = nodeData.autoRemoveBg ?? false;

  const handleGenerate = useCallback(async () => {
    const inputs = getInputsForNode(id);
    const promptInput = inputs.find((i) => i.type === 'text');

    if (!promptInput) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');

    try {
      // Build the styled prompt
      const stylePrefix = getStylePrefix(currentStyle);
      const styledPrompt = stylePrefix ? `${stylePrefix} ${promptInput.data}` : promptInput.data;

      // Generate the image
      const result = await generateImage({
        prompt: styledPrompt,
        style: currentStyle,
        aspectRatio: currentAspectRatio === 'auto' ? undefined : currentAspectRatio,
      });

      let finalImage = result.image;

      // Auto remove background if enabled
      if (autoRemoveBg) {
        try {
          const bgResult = await removeBackground(result.image);
          finalImage = bgResult.image;
        } catch (bgError) {
          console.warn('Background removal failed, using original image:', bgError);
        }
      }

      setNodeOutput(id, {
        type: 'image',
        data: finalImage,
        timestamp: Date.now(),
      });
      setNodeStatus(id, 'success');
    } catch (error) {
      console.error('Image generation failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [
    id,
    getInputsForNode,
    setNodeOutput,
    setNodeStatus,
    currentStyle,
    currentAspectRatio,
    autoRemoveBg,
  ]);

  const updateStyle = (style: ArtStyle) => {
    updateNodeData(id, { style });
  };

  const updateAspectRatio = (aspectRatio: AspectRatio | 'auto') => {
    updateNodeData(id, { aspectRatio });
  };

  const toggleAutoRemoveBg = () => {
    updateNodeData(id, { autoRemoveBg: !autoRemoveBg });
  };

  return (
    <BaseNode
      {...props}
      data={nodeData}
      hasInput
      hasOutput
      inputLabel="Prompt"
      outputLabel="Image"
    >
      <div className="flex flex-col gap-2">
        {/* Header with style indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <ImageIcon className="h-4 w-4" />
            <span>Nano Banana Pro</span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
          >
            <span>{STYLE_PRESETS.find((s) => s.value === currentStyle)?.label}</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showSettings ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Expanded settings */}
        {showSettings && (
          <div className="flex flex-col gap-2 rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2">
            {/* Style selector */}
            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">Style</label>
              <select
                value={currentStyle}
                onChange={(e) => updateStyle(e.target.value as ArtStyle)}
                className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]"
              >
                {STYLE_PRESETS.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
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
          <Sparkles className="h-4 w-4" />
          {status === 'running' ? 'Generating...' : 'Generate'}
        </button>

        {/* Error message */}
        {status === 'error' && (
          <p className="text-xs text-[var(--error)]">
            Generation failed. Check console for details.
          </p>
        )}
      </div>
    </BaseNode>
  );
}

/**
 * Get a style prefix to add to the prompt for better results
 */
function getStylePrefix(style: ArtStyle): string {
  switch (style) {
    case 'pixel-art':
      return 'Pixel art style, 8-bit retro game graphics,';
    case 'painted':
      return 'Digital painting, painterly style, brush strokes,';
    case 'vector':
      return 'Clean vector art, flat design, sharp edges,';
    case 'anime':
      return 'Anime style, Japanese animation, cel-shaded,';
    case 'realistic':
      return 'Photorealistic, highly detailed, realistic rendering,';
    case 'isometric':
      return 'TRUE ISOMETRIC DIMETRIC PROJECTION at 26.565 degrees, game asset, centered, complete visibility, 25-35% ground base,';
    default:
      return '';
  }
}
