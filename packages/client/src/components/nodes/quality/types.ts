/**
 * Shared types for QualityCheckNode sub-components
 */

import type { QualityCheckNodeData } from '../../../types/nodes';

export interface ValidationResult {
  passed: boolean;
  checks: {
    dimensionRange: { passed: boolean; message: string };
    powerOf2: { passed: boolean; message: string };
    fileSize: { passed: boolean; message: string };
    format: { passed: boolean; message: string };
    transparency: { passed: boolean; message: string };
  };
}

export interface QualityCheckNodeCallbacks {
  onMaxFileSizeChange: (size: number) => void;
  onAllowedFormatsChange: (formats: string[]) => void;
  onRequirePowerOf2Change: (require: boolean) => void;
  onRequireTransparencyChange: (require: boolean) => void;
  onMinWidthChange: (width: number) => void;
  onMaxWidthChange: (width: number) => void;
  onMinHeightChange: (height: number) => void;
  onMaxHeightChange: (height: number) => void;
  onValidate: () => void;
  onToggleSettings: () => void;
}

export type { QualityCheckNodeData };
