import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { logger } from '@pixel-forge/shared/logger';
import { ServiceUnavailableError, BadRequestError } from '../lib/errors';

let genai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!genai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    genai = new GoogleGenAI({ apiKey });
  }
  return genai;
}

// ===========================================
// TYPES
// ===========================================

export interface SpriteOptions {
  style: 'pixel-art' | 'pixel-art-16bit' | 'pixel-art-32bit' | 'hand-drawn' | 'vector' | 'hyper-realistic';
  size: string; // e.g. "64x64", "128x128", "2048x2048"
  background: 'transparent' | 'red-screen' | 'green-screen' | 'white' | 'black';
  perspective: 'top-down' | 'side-view' | 'isometric' | '3/4-view';
  consistency?: string; // consistency phrase to repeat across generations
}

export interface GenerateImageResult {
  image: string; // base64 data URL (PNG with alpha if background removal applied)
  raw?: string;  // original before processing
}

// ===========================================
// STYLE PRESETS
// ===========================================

const STYLE_PROMPTS: Record<SpriteOptions['style'], string> = {
  'pixel-art': 'pixel art style, crisp pixels, limited color palette, retro game aesthetic, clean pixel edges, no anti-aliasing',
  'pixel-art-16bit': '16-bit pixel art style, SNES/Genesis era graphics, 64 color palette, detailed pixel shading, clean edges',
  'pixel-art-32bit': '32-bit pixel art style, PlayStation 1 era, rich colors, detailed sprites, smooth gradients within pixels',
  'hand-drawn': 'hand-drawn game art style, clean lines, cel-shaded, vibrant colors, cartoon aesthetic',
  'vector': 'clean vector art style, flat colors, sharp edges, modern mobile game aesthetic',
  'hyper-realistic': 'hyper realistic style, photorealistic, detailed textures, lifelike rendering',
};

const PERSPECTIVE_PROMPTS: Record<SpriteOptions['perspective'], string> = {
  'top-down': 'top-down view, bird\'s eye perspective, looking straight down',
  'side-view': 'side view, profile view, 2D platformer perspective',
  'isometric': 'isometric view, 30 degree angle, classic strategy game perspective',
  '3/4-view': '3/4 view, slight angle from above, RPG perspective',
};

const BACKGROUND_PROMPTS: Record<SpriteOptions['background'], string> = {
  'transparent': 'on a solid bright red (#FF0000) background, uniform red, no shadows on background, no variation in red tone',
  'red-screen': 'on a solid bright red (#FF0000) background, uniform red, chroma key red, no shadows on background, no variation in red tone',
  'green-screen': 'on a solid bright green (#00FF00) background, uniform green, chroma key green, no shadows on background',
  'white': 'on a pure white (#FFFFFF) background',
  'black': 'on a pure black (#000000) background',
};

// ===========================================
// PROMPT BUILDER
// ===========================================

export function buildSpritePrompt(
  subject: string,
  options: SpriteOptions
): string {
  const parts: string[] = [];

  // Consistency prefix (helps maintain style across generations)
  if (options.consistency) {
    parts.push(`[Style: ${options.consistency}]`);
  }

  // Main subject
  parts.push(subject);

  // Size specification
  parts.push(`${options.size} pixels`);

  // Style
  parts.push(STYLE_PROMPTS[options.style]);

  // Perspective
  parts.push(PERSPECTIVE_PROMPTS[options.perspective]);

  // Background - critical for transparency workflow
  parts.push(BACKGROUND_PROMPTS[options.background]);

  // Quality modifiers
  parts.push('game sprite, single isolated object, centered in frame, no text, no watermarks');

  return parts.join('. ') + '.';
}

// ===========================================
// CHROMA KEY REMOVAL (Alpha Extraction)
// ===========================================

type ChromaColor = 'red' | 'green';

async function removeChromaKey(
  imageBuffer: Buffer,
  color: ChromaColor = 'red',
  tolerance: number = 30
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // Create RGBA buffer
  const rgbaData = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * channels;
    const dstIdx = i * 4;

    const r = data[srcIdx] ?? 0;
    const g = data[srcIdx + 1] ?? 0;
    const b = data[srcIdx + 2] ?? 0;

    // Check if pixel is chroma key color
    let isChromaKey = false;

    if (color === 'red') {
      // Red screen: high red, low green and blue
      isChromaKey = r > 200 && g < (r - tolerance) && b < (r - tolerance);
    } else {
      // Green screen: high green, low red and blue
      isChromaKey = g > 200 && r < (g - tolerance) && b < (g - tolerance);
    }

    if (isChromaKey) {
      // Transparent pixel
      rgbaData[dstIdx] = 0;
      rgbaData[dstIdx + 1] = 0;
      rgbaData[dstIdx + 2] = 0;
      rgbaData[dstIdx + 3] = 0; // Alpha = 0
    } else {
      // Keep original pixel
      rgbaData[dstIdx] = r;
      rgbaData[dstIdx + 1] = g;
      rgbaData[dstIdx + 2] = b;
      rgbaData[dstIdx + 3] = 255; // Alpha = 255
    }
  }

  return sharp(rgbaData, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

// Backwards compatibility alias
async function removeRedScreen(imageBuffer: Buffer, tolerance: number = 30): Promise<Buffer> {
  return removeChromaKey(imageBuffer, 'red', tolerance);
}

// ===========================================
// IMAGE GENERATION
// ===========================================

// Timeout constants
const GEMINI_TIMEOUT_MS = 60000; // 60 seconds

/**
 * Create timeout-wrapped promise
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new ServiceUnavailableError(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export interface ImageGenConfig {
  referenceImage?: string;  // legacy single image
  referenceImages?: string[]; // up to 6 reference images
  aspectRatio?: string;
  imageSize?: string; // '1K' | '2K' | '4K'
}

async function generateRawImage(prompt: string, config?: ImageGenConfig): Promise<Buffer> {
  // Input validation
  if (!prompt || prompt.trim().length === 0) {
    throw new BadRequestError('Prompt cannot be empty');
  }
  if (prompt.length > 10000) {
    throw new BadRequestError('Prompt exceeds maximum length of 10000 characters');
  }

  const client = getClient();

  // Collect all reference images (array takes priority over legacy single)
  const refs = config?.referenceImages ?? (config?.referenceImage ? [config.referenceImage] : []);

  // Build contents: text-only or multimodal with reference images
  type Part = { text?: string; inlineData?: { mimeType: string; data: string } };
  let contents: string | Part[];
  if (refs.length > 0) {
    const imageParts: Part[] = refs.map((ref) => {
      const base64Match = ref.match(/^data:(image\/\w+);base64,(.+)$/);
      return { inlineData: { mimeType: base64Match?.[1] ?? 'image/png', data: base64Match?.[2] ?? ref } };
    });
    contents = [...imageParts, { text: prompt }];
  } else {
    contents = prompt;
  }

  // Build imageConfig for Gemini API
  const imageConfig: Record<string, string> = {};
  if (config?.aspectRatio) {
    imageConfig.aspectRatio = config.aspectRatio;
  }
  if (config?.imageSize) {
    imageConfig.imageSize = config.imageSize;
  }

  try {
    const response = await withTimeout(
      client.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents,
        config: {
          responseModalities: ['image', 'text'],
          ...(Object.keys(imageConfig).length > 0 ? { imageConfig } : {}),
        },
      }),
      GEMINI_TIMEOUT_MS,
      'Gemini image generation'
    );

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new ServiceUnavailableError('No response from Gemini');
    }

    for (const part of parts) {
      if (part.inlineData) {
        const { data } = part.inlineData;
        return Buffer.from(data ?? '', 'base64');
      }
    }

    throw new ServiceUnavailableError('No image in Gemini response');
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof BadRequestError || error instanceof ServiceUnavailableError) {
      throw error;
    }

    // Handle Gemini API errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Rate limit errors
      if (message.includes('quota') || message.includes('rate limit')) {
        throw new ServiceUnavailableError('Gemini API rate limit exceeded');
      }

      // Authentication errors
      if (message.includes('api key') || message.includes('auth')) {
        throw new ServiceUnavailableError('Gemini API authentication failed');
      }

      // Network errors
      if (message.includes('network') || message.includes('fetch') || message.includes('enotfound')) {
        throw new ServiceUnavailableError('Network error connecting to Gemini API');
      }

      // Generic API error
      throw new ServiceUnavailableError(`Gemini API error: ${error.message}`);
    }

    throw new ServiceUnavailableError('Unknown error occurred during image generation');
  }
}

// ===========================================
// PUBLIC API
// ===========================================

/**
 * Generate a game sprite with proper transparency
 */
export async function generateSprite(
  subject: string,
  options: Partial<SpriteOptions> = {}
): Promise<GenerateImageResult> {
  const opts: SpriteOptions = {
    style: options.style || 'pixel-art',
    size: options.size || '128x128',
    background: options.background || 'green-screen',
    perspective: options.perspective || 'top-down',
    consistency: options.consistency,
  };

  // Build prompt with red screen background (better for sprites with green tones)
  const prompt = buildSpritePrompt(subject, {
    ...opts,
    background: 'red-screen', // Red screen avoids conflicts with green game assets
  });

  logger.debug('[generateSprite] Prompt:', prompt);

  // Generate raw image
  const rawBuffer = await generateRawImage(prompt);

  // Remove red screen to create actual PNG transparency
  const transparentBuffer = await removeRedScreen(rawBuffer);

  // Resize to exact dimensions
  const [width, height] = opts.size.split('x').map(Number);
  const finalBuffer = await sharp(transparentBuffer)
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const base64 = finalBuffer.toString('base64');

  return {
    image: `data:image/png;base64,${base64}`,
    raw: `data:image/png;base64,${rawBuffer.toString('base64')}`,
  };
}

/**
 * Generate multiple variations of a sprite for selection
 */
export async function generateSpriteVariations(
  subject: string,
  count: number = 5,
  options: Partial<SpriteOptions> = {}
): Promise<GenerateImageResult[]> {
  const results: GenerateImageResult[] = [];

  for (let i = 0; i < count; i++) {
    // Add variation number to prompt for diversity
    const variedSubject = `${subject} (variation ${i + 1} of ${count}, unique design)`;

    try {
      const result = await generateSprite(variedSubject, options);
      results.push(result);
    } catch (error) {
      logger.error(`[generateSpriteVariations] Variation ${i + 1} failed:`, error);
    }
  }

  return results;
}

/**
 * Generate a seamless tileable background
 */
export async function generateTileableBackground(
  description: string,
  size: string = '512x512'
): Promise<GenerateImageResult> {
  const prompt = `Seamless tileable texture pattern: ${description}. ${size} pixels. The pattern must tile perfectly horizontally and vertically with no visible seams. Game background texture, repeating pattern.`;

  const rawBuffer = await generateRawImage(prompt);

  // Resize to exact dimensions
  const [width, height] = size.split('x').map(Number);
  const finalBuffer = await sharp(rawBuffer)
    .resize(width, height)
    .png()
    .toBuffer();

  return {
    image: `data:image/png;base64,${finalBuffer.toString('base64')}`,
  };
}

/**
 * Simple image generation (backwards compatible)
 */
export async function generateImage(prompt: string, config?: ImageGenConfig): Promise<GenerateImageResult> {
  const rawBuffer = await generateRawImage(prompt, config);
  const base64 = rawBuffer.toString('base64');

  return {
    image: `data:image/png;base64,${base64}`,
  };
}

// ===========================================
// ISOMETRIC SPRITE SHEET GENERATION
// ===========================================

export interface SpriteSheetOptions {
  rows: number; // Number of asset rows (default 6)
  cols: number; // Number of columns (default 5)
  size: string; // Output size (e.g. "2048x2048")
  style: SpriteOptions['style'];
  assetDescriptions: string[]; // Description for each row
  specialViewDescription?: string; // What column 5 shows
}

/**
 * Generate an isometric sprite sheet with multiple assets
 * Format: 6 rows x 5 columns
 * Columns 1-4: NW, NE, SE, SW isometric views
 * Column 5: Special view (varies by asset type)
 */
export async function generateIsometricSpriteSheet(
  assetType: string,
  options: Partial<SpriteSheetOptions> = {}
): Promise<GenerateImageResult> {
  const opts: SpriteSheetOptions = {
    rows: options.rows || 6,
    cols: options.cols || 5,
    size: options.size || '2048x2048',
    style: options.style || 'hyper-realistic',
    assetDescriptions: options.assetDescriptions || [],
    specialViewDescription: options.specialViewDescription || '3/4 front isometric view',
  };

  const stylePrompt = STYLE_PROMPTS[opts.style] || STYLE_PROMPTS['hyper-realistic'];
  const rowDescriptions = opts.assetDescriptions.length > 0
    ? opts.assetDescriptions.map((desc, i) => `Row ${i + 1}: ${desc}`).join('. ')
    : '';

  const prompt = `Red background (#FF0000), ${opts.rows} rows, ${opts.cols} columns - asset sheet with ${assetType} for isometric game.

Each row should be ONE ${assetType}. The first 4 items should be the ${assetType} isometrically projected 4 times for facing north west, north east, south east, and then south west. The last one should be ${opts.specialViewDescription}.

${stylePrompt}. ${rowDescriptions}

NO SHADOWS. No variation in red background tone. Full size, ${opts.size} square.`;

  logger.info('[generateIsometricSpriteSheet] Prompt:', prompt);

  const rawBuffer = await generateRawImage(prompt);

  // Remove red screen for transparency
  const transparentBuffer = await removeRedScreen(rawBuffer);

  const [width, height] = opts.size.split('x').map(Number);
  const finalBuffer = await sharp(transparentBuffer)
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return {
    image: `data:image/png;base64,${finalBuffer.toString('base64')}`,
    raw: `data:image/png;base64,${rawBuffer.toString('base64')}`,
  };
}

/**
 * Extract individual sprites from a sprite sheet
 */
export async function extractSpritesFromSheet(
  sheetBuffer: Buffer,
  rows: number = 6,
  cols: number = 5
): Promise<Buffer[]> {
  const image = sharp(sheetBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not get image dimensions');
  }

  const cellWidth = Math.floor(metadata.width / cols);
  const cellHeight = Math.floor(metadata.height / rows);

  const sprites: Buffer[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const sprite = await sharp(sheetBuffer)
        .extract({
          left: col * cellWidth,
          top: row * cellHeight,
          width: cellWidth,
          height: cellHeight,
        })
        .png()
        .toBuffer();

      sprites.push(sprite);
    }
  }

  return sprites;
}

// ===========================================
// PRESET PROMPTS FOR SPACE LASER
// ===========================================

export const SPACE_LASER_PRESETS = {
  style: 'bioluminescent sci-fi cephalopod theme, sleek design, glowing accents, purple magenta cyan orange color palette',

  alien: (type: string) => `Space ${type} alien creature, bioluminescent, glowing eyes, tentacles, menacing but elegant, sci-fi game enemy`,

  hive: (variant: number) => `Alien hive spawner structure variant ${variant}, organic coral-like growth, pulsing egg sacs, bioluminescent veins, sci-fi game building`,

  spaceship: () => `Sleek space fighter ship, angular futuristic design, cyan glowing engines, cockpit visible, player spacecraft`,

  base: () => `Space station defensive base, circular design, multiple docking bays, shield generators, cyan and white lighting`,

  powerup: (type: string) => `${type} power-up orb, glowing sphere, game pickup item, sci-fi style`,

  projectile: (color: string) => `Energy laser bolt projectile, ${color} glow, elongated beam shape, sci-fi weapon fire`,

  explosion: () => `Explosion effect sprite sheet, 4 frames horizontal, orange yellow fire, space explosion, game VFX`,

  shield: () => `Energy shield bubble effect, hexagonal pattern, cyan glow, protective barrier, semi-transparent`,
};
