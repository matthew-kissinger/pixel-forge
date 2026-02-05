/**
 * Code editor section for KilnGenNode
 */

import type { KilnGenNodeData, KilnGenNodeCallbacks } from './types';

interface KilnCodeEditorProps {
  data: KilnGenNodeData;
  callbacks: Pick<KilnGenNodeCallbacks, 'onCodeChange'>;
  showCode: boolean;
}

export function KilnCodeEditor({ data, callbacks, showCode }: KilnCodeEditorProps) {
  if (!showCode) return null;

  return (
    <textarea
      value={data.code || ''}
      onChange={(e) => callbacks.onCodeChange(e.target.value)}
      className="w-full h-32 p-2 text-xs font-mono bg-zinc-950 text-zinc-300 rounded border border-zinc-700 resize-none"
      placeholder="// Generated code will appear here"
    />
  );
}
