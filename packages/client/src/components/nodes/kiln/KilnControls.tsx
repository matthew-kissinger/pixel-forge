/**
 * Controls panel for KilnGenNode (prompt, animation toggle, actions)
 */

import { Play, Edit3, Download, RotateCcw } from 'lucide-react';
import type { KilnGenNodeData, KilnGenNodeCallbacks } from './types';

interface KilnControlsProps {
  data: KilnGenNodeData;
  callbacks: Pick<
    KilnGenNodeCallbacks,
    'onAnimationToggle' | 'onPromptChange' | 'onGenerate' | 'onDownload' | 'onToggleCodeEditor'
  >;
  isRunning: boolean;
}

export function KilnControls({
  data,
  callbacks,
  isRunning,
}: KilnControlsProps) {
  return (
    <>
      {/* Animation toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={data.includeAnimation ?? true}
          onChange={(e) => callbacks.onAnimationToggle(e.target.checked)}
          className="w-3 h-3 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
        />
        <span className="text-xs text-zinc-400">Include animations</span>
      </label>

      {/* Inline prompt input */}
      <textarea
        value={data.prompt || ''}
        onChange={(e) => callbacks.onPromptChange(e.target.value)}
        placeholder="Describe what to generate..."
        className="nodrag nowheel w-full h-16 p-2 text-xs bg-zinc-950 text-zinc-300 rounded border border-zinc-700 resize-none placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
      />

      {/* Stats */}
      {data.triangleCount != null && (
        <div className="text-xs text-zinc-500">
          Triangles: {data.triangleCount.toLocaleString()}
        </div>
      )}

      {/* Errors */}
      {data.errors?.length > 0 && (
        <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded">
          {data.errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={callbacks.onGenerate}
          disabled={isRunning}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs rounded"
        >
          {isRunning ? (
            <RotateCcw className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          Generate
        </button>

        <button
          onClick={callbacks.onToggleCodeEditor}
          className="px-2 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded"
        >
          <Edit3 className="w-3 h-3" />
        </button>

        {(data.mode === 'glb' || data.mode === 'both') && data.glbUrl && (
          <button
            onClick={callbacks.onDownload}
            className="px-2 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded"
          >
            <Download className="w-3 h-3" />
          </button>
        )}
      </div>
    </>
  );
}
