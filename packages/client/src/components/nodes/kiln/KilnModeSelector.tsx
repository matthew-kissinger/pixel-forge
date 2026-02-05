/**
 * Mode and category selector for KilnGenNode
 */

import type { KilnGenNodeData, KilnGenNodeCallbacks } from './types';

interface KilnModeSelectorProps {
  data: KilnGenNodeData;
  callbacks: Pick<KilnGenNodeCallbacks, 'onModeChange' | 'onCategoryChange'>;
}

export function KilnModeSelector({ data, callbacks }: KilnModeSelectorProps) {
  return (
    <>
      {/* Mode selector */}
      <div className="flex gap-1">
        <button
          onClick={() => callbacks.onModeChange('glb')}
          className={`flex-1 px-2 py-1 text-xs rounded ${
            data.mode === 'glb'
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          GLB
        </button>
        <button
          onClick={() => callbacks.onModeChange('tsl')}
          className={`flex-1 px-2 py-1 text-xs rounded ${
            data.mode === 'tsl'
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          TSL
        </button>
        <button
          onClick={() => callbacks.onModeChange('both')}
          className={`flex-1 px-2 py-1 text-xs rounded ${
            data.mode === 'both'
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Both
        </button>
      </div>

      {/* Category selector */}
      <div className="flex gap-1">
        {(['character', 'prop', 'vfx', 'environment'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => callbacks.onCategoryChange(cat)}
            className={`flex-1 px-1 py-1 text-xs rounded capitalize ${
              data.category === cat
                ? 'bg-zinc-600 text-white'
                : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
            }`}
          >
            {cat.slice(0, 4)}
          </button>
        ))}
      </div>
    </>
  );
}
