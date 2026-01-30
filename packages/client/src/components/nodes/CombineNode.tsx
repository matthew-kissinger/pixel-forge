import { useCallback } from 'react';
import { type NodeProps, Handle, Position } from '@xyflow/react';
import { Layers } from 'lucide-react';
import { useWorkflowStore, type BaseNodeData, type NodeOutput } from '../../stores/workflow';
import { cn } from '../../lib/utils';

export interface CombineData extends BaseNodeData {
  mode: 'overlay' | 'side-by-side' | 'grid' | 'stack';
  alignment: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  spacing: number;
}

export function CombineNode(props: NodeProps) {
  const { id, data, selected } = props;
  const nodeData = data as CombineData;
  const { edges, nodeOutputs, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';

  const mode = nodeData.mode || 'overlay';
  const alignment = nodeData.alignment || 'center';
  const spacing = nodeData.spacing ?? 0;

  // Get all inputs connected to this node
  const getInputs = useCallback((): NodeOutput[] => {
    const incomingEdges = edges.filter((e) => e.target === id);
    return incomingEdges
      .map((e) => nodeOutputs[e.source])
      .filter((output): output is NodeOutput => output !== undefined && output.type === 'image');
  }, [id, edges, nodeOutputs]);

  const handleCombine = useCallback(async () => {
    const inputs = getInputs();

    if (inputs.length < 2) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');

    try {
      // Load all images
      const images = await Promise.all(
        inputs.map(
          (input) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = input.data;
            })
        )
      );

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      if (mode === 'overlay') {
        // Find max dimensions
        const maxWidth = Math.max(...images.map((img) => img.width));
        const maxHeight = Math.max(...images.map((img) => img.height));
        canvas.width = maxWidth;
        canvas.height = maxHeight;

        // Draw each image on top
        for (const img of images) {
          let x = 0,
            y = 0;
          if (alignment === 'center') {
            x = (maxWidth - img.width) / 2;
            y = (maxHeight - img.height) / 2;
          } else if (alignment === 'top-right') {
            x = maxWidth - img.width;
          } else if (alignment === 'bottom-left') {
            y = maxHeight - img.height;
          } else if (alignment === 'bottom-right') {
            x = maxWidth - img.width;
            y = maxHeight - img.height;
          }
          ctx.drawImage(img, x, y);
        }
      } else if (mode === 'side-by-side') {
        // Horizontal arrangement
        const totalWidth = images.reduce((sum, img) => sum + img.width, 0) + spacing * (images.length - 1);
        const maxHeight = Math.max(...images.map((img) => img.height));
        canvas.width = totalWidth;
        canvas.height = maxHeight;

        let x = 0;
        for (const img of images) {
          const y = alignment.includes('top') ? 0 : alignment.includes('bottom') ? maxHeight - img.height : (maxHeight - img.height) / 2;
          ctx.drawImage(img, x, y);
          x += img.width + spacing;
        }
      } else if (mode === 'stack') {
        // Vertical arrangement
        const maxWidth = Math.max(...images.map((img) => img.width));
        const totalHeight = images.reduce((sum, img) => sum + img.height, 0) + spacing * (images.length - 1);
        canvas.width = maxWidth;
        canvas.height = totalHeight;

        let y = 0;
        for (const img of images) {
          const x = alignment.includes('left') ? 0 : alignment.includes('right') ? maxWidth - img.width : (maxWidth - img.width) / 2;
          ctx.drawImage(img, x, y);
          y += img.height + spacing;
        }
      } else if (mode === 'grid') {
        // Grid arrangement (2 columns)
        const cols = 2;
        const rows = Math.ceil(images.length / cols);
        const cellWidth = Math.max(...images.map((img) => img.width));
        const cellHeight = Math.max(...images.map((img) => img.height));
        canvas.width = cellWidth * cols + spacing * (cols - 1);
        canvas.height = cellHeight * rows + spacing * (rows - 1);

        images.forEach((img, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = col * (cellWidth + spacing) + (cellWidth - img.width) / 2;
          const y = row * (cellHeight + spacing) + (cellHeight - img.height) / 2;
          ctx.drawImage(img, x, y);
        });
      }

      setNodeOutput(id, {
        type: 'image',
        data: canvas.toDataURL('image/png'),
        timestamp: Date.now(),
      });
      setNodeStatus(id, 'success');
    } catch (error) {
      console.error('Combine failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [id, mode, alignment, spacing, getInputs, setNodeOutput, setNodeStatus]);

  const inputs = getInputs();

  return (
    <div
      className={cn(
        'min-w-[200px] rounded-lg border-2 bg-[var(--bg-secondary)] shadow-lg',
        status === 'running' ? 'border-[var(--accent)]' : 'border-[var(--border-color)]',
        selected && 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-primary)]'
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-3 py-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">{nodeData.label}</span>
      </div>

      <div className="p-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Layers className="h-4 w-4" />
            <span>Combine Images</span>
          </div>

          {/* Mode */}
          <select
            value={mode}
            onChange={(e) => updateNodeData<CombineData>(id, { mode: e.target.value as CombineData['mode'] })}
            className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
          >
            <option value="overlay">Overlay (stack)</option>
            <option value="side-by-side">Side by Side</option>
            <option value="stack">Vertical Stack</option>
            <option value="grid">Grid (2 cols)</option>
          </select>

          {/* Alignment */}
          <select
            value={alignment}
            onChange={(e) => updateNodeData<CombineData>(id, { alignment: e.target.value as CombineData['alignment'] })}
            className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
          >
            <option value="center">Center</option>
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
          </select>

          {/* Spacing */}
          {mode !== 'overlay' && (
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Spacing: {spacing}px</label>
              <input
                type="range"
                min={0}
                max={50}
                value={spacing}
                onChange={(e) => updateNodeData<CombineData>(id, { spacing: parseInt(e.target.value) })}
                className="nodrag w-full"
              />
            </div>
          )}

          {/* Input count */}
          <div className="rounded bg-[var(--bg-tertiary)] p-2 text-xs text-[var(--text-secondary)]">
            {inputs.length} image{inputs.length !== 1 ? 's' : ''} connected
            {inputs.length < 2 && ' (need 2+)'}
          </div>

          <button
            onClick={handleCombine}
            disabled={status === 'running' || inputs.length < 2}
            className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'running' ? 'Processing...' : 'Combine'}
          </button>
        </div>
      </div>

      {/* Multiple input handles */}
      <Handle type="target" position={Position.Left} id="input1" style={{ top: '30%' }} title="Image 1" />
      <Handle type="target" position={Position.Left} id="input2" style={{ top: '50%' }} title="Image 2" />
      <Handle type="target" position={Position.Left} id="input3" style={{ top: '70%' }} title="Image 3" />
      <Handle type="source" position={Position.Right} title="Combined" />
    </div>
  );
}
