/**
 * Shared types for PresetLauncher sub-components
 */
import type { Preset } from '@pixel-forge/shared/presets';

export interface PresetLauncherProps {
  isVisible: boolean;
  onToggle: () => void;
  isMobileOverlay?: boolean;
}

export interface PresetCardGridProps {
  onPresetClick: (preset: Preset) => void;
}

export interface PresetDetailFormProps {
  preset: Preset;
  subject: string;
  onSubjectChange: (value: string) => void;
  onGenerate: () => void;
  onCancel: () => void;
}
