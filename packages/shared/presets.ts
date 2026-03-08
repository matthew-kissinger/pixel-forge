export type PresetCategory = 'sprite' | 'texture' | 'icon' | 'sheet';
export type PresetBackground = 'red' | 'green' | 'blue' | 'magenta' | 'black' | 'white';
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
    background: 'magenta',
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
    background: 'blue',
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
    background: 'magenta',
    outputSize: { width: 2048, height: 2048 },
    autoRemoveBg: true,
    format: 'png',
  },
  {
    id: 'vegetation-sprite',
    name: 'Vegetation Sprite',
    description: 'Pixel art plant sprites for billboard rendering in 3D scenes.',
    category: 'sprite',
    promptPrefix: 'Pixel art vegetation sprite, top-down angled view for 3D billboard, tropical aesthetic, vibrant greens, clean edges',
    promptSuffix: 'Game-ready sprite, no ground shadow, centered, suitable for billboard rendering',
    background: 'magenta',
    outputSize: { width: 256, height: 256 },
    autoRemoveBg: true,
    format: 'png',
  },
  {
    id: 'effect-strip',
    name: 'Effect Animation Strip',
    description: 'Horizontal animation strip for VFX sprites (8 frames).',
    category: 'sheet',
    promptPrefix: 'Pixel art animation strip, 8 frames in a horizontal row, each frame showing progressive animation stage',
    promptSuffix: 'Bright colors, high contrast, game-ready VFX, evenly spaced frames',
    background: 'magenta',
    outputSize: { width: 1024, height: 128 },
    autoRemoveBg: true,
    format: 'png',
  },
  {
    id: 'soldier-sprite',
    name: 'Soldier Billboard Sprite',
    description: 'Pixel art soldier sprite for billboard rendering.',
    category: 'sprite',
    promptPrefix: 'Pixel art soldier character, military uniform, front-facing pose, clean pixel art style',
    promptSuffix: 'Game-ready sprite, centered, clean edges, suitable for billboard rendering in 3D scene',
    background: 'magenta',
    outputSize: { width: 64, height: 64 },
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
    case 'blue':
      return 'Solid bright blue (#0000FF) background, uniform blue, no shadows on background';
    case 'magenta':
      return 'Solid magenta (#FF00FF) background, entire background is flat solid magenta with no gradients, no shadows on background';
    case 'white':
      return 'Solid white (#FFFFFF) background';
    case 'black':
      return 'Solid black (#000000) background';
    default:
      return '';
  }
}
