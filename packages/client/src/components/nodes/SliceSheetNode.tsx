import { useCallback, useState, useEffect } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Scissors, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import JSZip from 'jszip';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';
import { sliceSheet } from '../../lib/api';

export interface SliceSheetData extends BaseNodeData {
  rows: number;
  cols: number;
  sprites?: string[];
  currentSpriteIndex?: number;
}

export function SliceSheetNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as SliceSheetData;
  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [previewGrid, setPreviewGrid] = useState<string | null>(null);

  const rows = nodeData.rows ?? 6;
  const cols = nodeData.cols ?? 5;
  const sprites = nodeData.sprites ?? [];
  const currentSpriteIndex = nodeData.currentSpriteIndex ?? 0;

  // Get source image dimensions and generate preview grid
  useEffect(() => {
    const inputs = getInputsForNode(id);
    const imageInput = inputs.find((i) => i.type === 'image');
    if (imageInput) {
      const img = new Image();
      img.onload = () => {
        setSourceSize({ width: img.width, height: img.height });
        
        // Generate preview grid overlay
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        
        const cellWidth = img.width / cols;
        const cellHeight = img.height / rows;
        
        // Vertical lines
        for (let i = 1; i < cols; i++) {
          ctx.beginPath();
          ctx.moveTo(i * cellWidth, 0);
          ctx.lineTo(i * cellWidth, img.height);
          ctx.stroke();
        }
        
        // Horizontal lines
        for (let i = 1; i < rows; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * cellHeight);
          ctx.lineTo(img.width, i * cellHeight);
          ctx.stroke();
        }
        
        setPreviewGrid(canvas.toDataURL('image/png'));
      };
      img.src = imageInput.data;
    } else {
      setSourceSize({ width: 0, height: 0 });
      setPreviewGrid(null);
    }
  }, [id, rows, cols, getInputsForNode]);

  const handleSlice = useCallback(async () => {
    const inputs = getInputsForNode(id);
    const imageInput = inputs.find((i) => i.type === 'image');

    if (!imageInput) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');

    try {
      const result = await sliceSheet(imageInput.data, rows, cols);
      
      if (result.sprites && result.sprites.length > 0) {
        updateNodeData<SliceSheetData>(id, {
          sprites: result.sprites,
          currentSpriteIndex: 0,
        });
        
        setNodeOutput(id, {
          type: 'image',
          data: result.sprites[0],
          timestamp: Date.now(),
        });
        setNodeStatus(id, 'success');
      } else {
        throw new Error('No sprites returned');
      }
    } catch (error) {
      logger.error('Slice sheet failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [id, rows, cols, getInputsForNode, setNodeOutput, setNodeStatus, updateNodeData]);

  const handlePrev = () => {
    if (sprites.length === 0) return;
    const newIndex = (currentSpriteIndex - 1 + sprites.length) % sprites.length;
    updateNodeData<SliceSheetData>(id, { currentSpriteIndex: newIndex });
    setNodeOutput(id, {
      type: 'image',
      data: sprites[newIndex],
      timestamp: Date.now(),
    });
  };

  const handleNext = () => {
    if (sprites.length === 0) return;
    const newIndex = (currentSpriteIndex + 1) % sprites.length;
    updateNodeData<SliceSheetData>(id, { currentSpriteIndex: newIndex });
    setNodeOutput(id, {
      type: 'image',
      data: sprites[newIndex],
      timestamp: Date.now(),
    });
  };

  const downloadZip = async () => {
    if (sprites.length === 0) return;
    
    const zip = new JSZip();
    const folder = zip.folder('sprites');
    
    sprites.forEach((dataUrl, index) => {
      const base64Data = dataUrl.split(',')[1];
      folder?.file(`sprite_${index + 1}.png`, base64Data, { base64: true });
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'spritesheet_slices.zip';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <BaseNode
      {...props}
      data={nodeData}
      hasInput
      hasOutput
      inputLabel="Sheet"
      outputLabel="Sprite"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Scissors className="h-4 w-4" />
          <span>Slice Sheet</span>
        </div>

        {/* Grid Preview or Sprite Selection */}
        {sprites.length > 0 ? (
          <div className="rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2">
            <div className="relative group">
              <img
                src={sprites[currentSpriteIndex]}
                alt={`Sprite ${currentSpriteIndex + 1}`}
                className="max-h-32 w-full object-contain pixelated"
              />
              <div className="absolute inset-0 flex items-center justify-between px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={handlePrev}
                  className="rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button 
                  onClick={handleNext}
                  className="rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>{currentSpriteIndex + 1} / {sprites.length}</span>
              <button 
                onClick={downloadZip}
                className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                title="Download all as ZIP"
              >
                <Download className="h-3 w-3" />
                ZIP
              </button>
            </div>
          </div>
        ) : previewGrid && (
          <div className="rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2">
            <img
              src={previewGrid}
              alt="Grid preview"
              className="max-h-32 w-full object-contain"
            />
            <div className="mt-1 text-center text-xs text-[var(--text-secondary)]">
              {rows} × {cols} = {rows * cols} sprites
            </div>
          </div>
        )}

        {/* Rows */}
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Rows</label>
          <input
            type="number"
            value={rows}
            onChange={(e) =>
              updateNodeData<SliceSheetData>(id, {
                rows: Math.max(1, parseInt(e.target.value) || 1),
              })
            }
            className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
            min={1}
            max={50}
          />
        </div>

        {/* Columns */}
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Columns</label>
          <input
            type="number"
            value={cols}
            onChange={(e) =>
              updateNodeData<SliceSheetData>(id, {
                cols: Math.max(1, parseInt(e.target.value) || 1),
              })
            }
            className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
            min={1}
            max={50}
          />
        </div>

        {/* Source info */}
        {sourceSize.width > 0 && (
          <div className="text-xs text-[var(--text-secondary)]">
            Sheet: {sourceSize.width}×{sourceSize.height}
            <br />
            Cell: {Math.floor(sourceSize.width / cols)}×{Math.floor(sourceSize.height / rows)}
          </div>
        )}

        <button
          onClick={handleSlice}
          disabled={status === 'running' || (!previewGrid && !sprites.length)}
          className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'running' ? 'Slicing...' : `Slice into ${rows * cols} sprites`}
        </button>
        {status === 'error' && (
          <p className="text-xs text-[var(--error)]">
            Failed. Connect a sprite sheet image.
          </p>
        )}
      </div>
    </BaseNode>
  );
}
