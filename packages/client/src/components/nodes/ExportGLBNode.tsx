import { useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Download, FileBox, CheckSquare, Square } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';

export interface ExportGLBData extends BaseNodeData {
  includeAnimations: boolean;
  embedTextures: boolean;
  fileName?: string;
}

export function ExportGLBNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ExportGLBData;
  const { getInputsForNode, updateNodeData } = useWorkflowStore();

  const fileName = nodeData.fileName || 'model';
  const includeAnimations = nodeData.includeAnimations ?? true;
  const embedTextures = nodeData.embedTextures ?? true;

  const inputs = getInputsForNode(id);
  const latestInput = inputs[inputs.length - 1];

  const handleDownload = useCallback(() => {
    if (!latestInput || latestInput.type !== 'model') return;

    const link = document.createElement('a');
    link.download = `${fileName}.glb`;
    link.href = latestInput.data;
    link.target = '_blank';
    link.click();
  }, [latestInput, fileName]);

  return (
    <BaseNode {...props} data={nodeData} hasInput inputLabel="Model">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <FileBox className="h-4 w-4" />
          <span>Export GLB</span>
        </div>

        {/* File Name */}
        <input
          type="text"
          value={fileName}
          onChange={(e) => updateNodeData<ExportGLBData>(id, { fileName: e.target.value })}
          placeholder="File name"
          className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
        />

        {/* Options */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => updateNodeData<ExportGLBData>(id, { includeAnimations: !includeAnimations })}
            className="nodrag flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-[var(--bg-tertiary)]"
          >
            {includeAnimations ? (
              <CheckSquare className="h-4 w-4 text-[var(--accent)]" />
            ) : (
              <Square className="h-4 w-4 text-[var(--text-secondary)]" />
            )}
            <span className="text-[var(--text-primary)]">Include Animations</span>
          </button>

          <button
            onClick={() => updateNodeData<ExportGLBData>(id, { embedTextures: !embedTextures })}
            className="nodrag flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-[var(--bg-tertiary)]"
          >
            {embedTextures ? (
              <CheckSquare className="h-4 w-4 text-[var(--accent)]" />
            ) : (
              <Square className="h-4 w-4 text-[var(--text-secondary)]" />
            )}
            <span className="text-[var(--text-primary)]">Embed Textures</span>
          </button>
        </div>

        {/* Input Status */}
        {latestInput && latestInput.type === 'model' && (
          <div className="rounded bg-[var(--bg-tertiary)] p-2 text-xs text-[var(--text-secondary)]">
            3D Model ready (GLB)
          </div>
        )}

        {latestInput && latestInput.type !== 'model' && (
          <div className="rounded border border-dashed border-[var(--error)] p-2 text-center text-xs text-[var(--error)]">
            Wrong input type - expects 3D model
          </div>
        )}

        {!latestInput && (
          <div className="rounded border border-dashed border-[var(--border-color)] p-2 text-center text-xs text-[var(--text-secondary)]">
            Connect a 3D model input
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={!latestInput || latestInput.type !== 'model'}
          className="w-full rounded bg-[var(--success)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="mr-1 inline h-4 w-4" />
          Export GLB
        </button>
      </div>
    </BaseNode>
  );
}
