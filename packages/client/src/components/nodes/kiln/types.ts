/**
 * Shared types for KilnGenNode sub-components
 */

import type { RenderMode } from '../../../lib/kiln';

export interface KilnGenNodeData {
  nodeType: 'kilnGen';
  label: string;
  prompt: string;
  mode: RenderMode;
  category: 'character' | 'prop' | 'vfx' | 'environment';
  includeAnimation: boolean;
  code: string | null;
  effectCode: string | null;
  glbUrl: string | null;
  triangleCount: number | null;
  errors: string[];
}

export interface KilnGenNodeCallbacks {
  onModeChange: (mode: RenderMode) => void;
  onCategoryChange: (category: 'character' | 'prop' | 'vfx' | 'environment') => void;
  onAnimationToggle: (include: boolean) => void;
  onPromptChange: (prompt: string) => void;
  onCodeChange: (code: string) => void;
  onGenerate: () => void;
  onDownload: () => void;
  onToggleCodeEditor: () => void;
}
