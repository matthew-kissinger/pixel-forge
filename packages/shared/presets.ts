export type PresetCategory = 'sprite' | 'texture' | 'icon' | 'sheet';
export type PresetBackground = 'red' | 'green' | 'black' | 'white';
export type PresetFormat = 'png' | 'jpeg' | 'webp';

export interface Preset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  promptPrefix: string;
  promptSuffix: string;
  background: PresetBackground;
  outputSize: { width: number; height: number };
  autoRemoveBg: boolean;
  format: PresetFormat;
}

export const PRESETS: Preset[] = [
  {
    id: 'planet-texture',
    name: 'Planet Texture',
    description: 'Equirectangular planet surfaces for spherical mapping.',
    category: 'texture',
    promptPrefix: 'Seamless spherical planet texture, equirectangular projection, tileable horizontally',
    promptSuffix: 'Photorealistic surface details, no stars in background',
    background: 'black',
    outputSize: { width: 2048, height: 1024 },
    autoRemoveBg: false,
    format: 'jpeg',
  },
  {
    id: 'enemy-sprite',
    name: 'Enemy Sprite',
    description: 'Top-down sci-fi enemy spacecraft sprite.',
    category: 'sprite',
    promptPrefix: 'Sci-fi enemy spacecraft, top-down view, symmetrical design',
    promptSuffix: 'Game-ready asset, clean edges, centered, glowing energy core, metallic hull',
    background: 'red',
    outputSize: { width: 512, height: 512 },
    autoRemoveBg: true,
    format: 'png',
  },
  {
    id: 'game-icon',
    name: 'Game Icon',
    description: 'Small UI icon with high contrast and readable silhouette.',
    category: 'icon',
    promptPrefix: 'Game UI icon, simple silhouette, high contrast, glowing edges',
    promptSuffix: 'Readable at small scale, centered in frame',
    background: 'red',
    outputSize: { width: 64, height: 64 },
    autoRemoveBg: true,
    format: 'png',
  },
  {
    id: 'isometric-sheet',
    name: 'Isometric Sheet',
    description: 'Multi-view isometric asset sheet for sprite slicing.',
    category: 'sheet',
    promptPrefix: 'Isometric asset sheet, 6 rows x 5 columns, each row one asset, first 4 isometric views, last special view',
    promptSuffix: 'Hyper-realistic style, no shadows, consistent lighting',
    background: 'red',
    outputSize: { width: 2048, height: 2048 },
    autoRemoveBg: true,
    format: 'png',
  },
];

export const PRESET_BY_ID = new Map(PRESETS.map((preset) => [preset.id, preset]));

export function getPresetById(id: string): Preset | undefined {
  return PRESET_BY_ID.get(id);
}

export function buildPresetPrompt(preset: Preset, subject: string): string {
  const subjectText = subject.trim();
  const sizeText = `${preset.outputSize.width}x${preset.outputSize.height} pixels`;
  const backgroundText = backgroundToPrompt(preset.background);

  const parts = [
    preset.promptPrefix,
    subjectText,
    preset.promptSuffix,
    sizeText,
    backgroundText,
  ].filter((part) => part && part.trim().length > 0);

  return `${parts.join('. ')}.`;
}

export function backgroundToPrompt(background: PresetBackground): string {
  switch (background) {
    case 'red':
      return 'Solid bright red (#FF0000) background, uniform red, no shadows on background';
    case 'green':
      return 'Solid bright green (#00FF00) background, uniform green, no shadows on background';
    case 'white':
      return 'Solid white (#FFFFFF) background';
    case 'black':
      return 'Solid black (#000000) background';
    default:
      return '';
  }
}
