/**
 * Constants and lookup maps for PresetLauncher sub-components
 */
import {
  Rocket,
  ImageIcon,
  Grid3X3,
  Film,
  Wand2,
  Box,
  Sparkles,
  FileImage,
} from 'lucide-react';
import type { Preset, PresetCategory } from '@pixel-forge/shared/presets';

export const presetIcons: Record<string, typeof Rocket> = {
  'planet-texture': ImageIcon,
  'enemy-sprite': Rocket,
  'game-icon': Sparkles,
  'isometric-sheet': Grid3X3,
  'vegetation-sprite': Wand2,
  'effect-strip': Film,
  'soldier-sprite': Box,
};

export const categoryInfo: Record<
  PresetCategory,
  { label: string; color: string; bgColor: string }
> = {
  sprite: {
    label: 'Sprite',
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/50 border-blue-800/50',
  },
  texture: {
    label: 'Texture',
    color: 'text-green-400',
    bgColor: 'bg-green-950/50 border-green-800/50',
  },
  icon: {
    label: 'Icon',
    color: 'text-purple-400',
    bgColor: 'bg-purple-950/50 border-purple-800/50',
  },
  sheet: {
    label: 'Sheet',
    color: 'text-orange-400',
    bgColor: 'bg-orange-950/50 border-orange-800/50',
  },
};

export const outputTypeIcons: Record<Preset['format'], typeof FileImage> = {
  png: FileImage,
  jpeg: FileImage,
  webp: FileImage,
};

export function getNodeCount(preset: Preset): number {
  return 4 + (preset.autoRemoveBg ? 1 : 0);
}
