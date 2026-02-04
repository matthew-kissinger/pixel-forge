import { useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Download, FileImage, FileBox } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';

export interface SaveData extends BaseNodeData {
  fileName: string;
  format: 'png' | 'jpg' | 'webp';
  quality: number;
}

export function SaveNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as SaveData;
  const { getInputsForNode, updateNodeData } = useWorkflowStore();

  const fileName = nodeData.fileName || 'output';
  const format = nodeData.format || 'png';
  const quality = nodeData.quality || 90;

  const inputs = getInputsForNode(id);
  const latestInput = inputs[inputs.length - 1];

  const handleDownload = useCallback(() => {
    if (!latestInput) return;

    const link = document.createElement('a');
    link.download = `${fileName}.${latestInput.type === 'model' ? 'glb' : format}`;

    if (latestInput.type === 'model') {
      // For 3D models, download the GLB URL
      link.href = latestInput.data;
      link.target = '_blank';
    } else if (latestInput.type === 'image') {
      // For images, convert to desired format
      if (format === 'png') {
        link.href = latestInput.data;
      } else {
        // Convert to jpg/webp with quality
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;

          // Fill white background for jpg (no transparency)
          if (format === 'jpg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.drawImage(img, 0, 0);
          const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/webp';
          link.href = canvas.toDataURL(mimeType, quality / 100);
          link.click();
        };
        img.src = latestInput.data;
        return;
      }
    } else if (latestInput.type === 'text') {
      // For text, create a text file
      link.download = `${fileName}.txt`;
      link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(latestInput.data)}`;
    }

    link.click();
  }, [latestInput, fileName, format, quality]);

  const Icon = !latestInput ? Download : latestInput.type === 'model' ? FileBox : FileImage;

  return (
    <BaseNode {...props} data={nodeData} hasInput inputLabel="Any">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Icon className="h-4 w-4" />
          <span>Save / Download</span>
        </div>

        {/* File Name */}
        <input
          type="text"
          value={fileName}
          onChange={(e) => updateNodeData<SaveData>(id, { fileName: e.target.value })}
          placeholder="File name"
          className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
        />

        {/* Format (only for images) */}
        {(!latestInput || latestInput.type === 'image') && (
          <div className="flex gap-1">
            {(['png', 'jpg', 'webp'] as const).map((f) => (
              <button
                key={f}
                onClick={() => updateNodeData<SaveData>(id, { format: f })}
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
        )}

        {/* Quality (only for jpg/webp) */}
        {format !== 'png' && (!latestInput || latestInput.type === 'image') && (
          <div>
            <label className="text-xs text-[var(--text-secondary)]">
              Quality: {quality}%
            </label>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => updateNodeData<SaveData>(id, { quality: parseInt(e.target.value) })}
              className="nodrag w-full"
            />
          </div>
        )}

        {/* Input Info */}
        {latestInput && (
          <div className="rounded bg-[var(--bg-tertiary)] p-2 text-xs text-[var(--text-secondary)]">
            {latestInput.type === 'image' && 'Image ready'}
            {latestInput.type === 'model' && '3D Model ready (GLB)'}
            {latestInput.type === 'text' && 'Text ready'}
          </div>
        )}

        {!latestInput && (
          <div className="rounded border border-dashed border-[var(--border-color)] p-2 text-center text-xs text-[var(--text-secondary)]">
            Connect an input
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={!latestInput}
          className="w-full rounded bg-[var(--success)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="mr-1 inline h-4 w-4" />
          Download
        </button>
      </div>
    </BaseNode>
  );
}
