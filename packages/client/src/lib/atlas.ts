/**
 * Atlas Format Generators
 * 
 * Generates sprite sheet atlas metadata in formats compatible with game engines:
 * - Phaser 3 JSON Hash
 * - Unity Sprite Atlas (JSON)
 * - Godot AtlasTexture (.tres)
 */

export type AtlasFormat = 'phaser' | 'unity' | 'godot';

export interface AtlasGenerationOptions {
  columns: number;
  rows: number;
  sheetWidth: number;
  sheetHeight: number;
  imageFileName: string;
}

/**
 * Generate Phaser 3 JSON Hash atlas format
 */
export function generatePhaserAtlas(options: AtlasGenerationOptions): string {
  const { columns, rows, sheetWidth, sheetHeight, imageFileName } = options;
  const frameWidth = sheetWidth / columns;
  const frameHeight = sheetHeight / rows;
  
  const frames: Record<string, {
    frame: { x: number; y: number; w: number; h: number };
    sourceSize: { w: number; h: number };
  }> = {};
  
  let frameIndex = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const frameName = `sprite_${frameIndex}`;
      frames[frameName] = {
        frame: {
          x: col * frameWidth,
          y: row * frameHeight,
          w: frameWidth,
          h: frameHeight,
        },
        sourceSize: {
          w: frameWidth,
          h: frameHeight,
        },
      };
      frameIndex++;
    }
  }
  
  const atlas = {
    frames,
    meta: {
      image: imageFileName,
      size: {
        w: sheetWidth,
        h: sheetHeight,
      },
      format: 'RGBA8888',
    },
  };
  
  return JSON.stringify(atlas, null, 2);
}

/**
 * Generate Unity Sprite Atlas JSON format
 */
export function generateUnityAtlas(options: AtlasGenerationOptions): string {
  const { columns, rows, sheetWidth, sheetHeight, imageFileName } = options;
  const frameWidth = sheetWidth / columns;
  const frameHeight = sheetHeight / rows;
  
  const sprites: Array<{
    name: string;
    rect: { x: number; y: number; width: number; height: number };
    pivot: { x: number; y: number };
  }> = [];
  
  let frameIndex = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      sprites.push({
        name: `sprite_${frameIndex}`,
        rect: {
          x: col * frameWidth,
          y: row * frameHeight,
          width: frameWidth,
          height: frameHeight,
        },
        pivot: {
          x: 0.5,
          y: 0.5,
        },
      });
      frameIndex++;
    }
  }
  
  const atlas = {
    sprites,
    texture: imageFileName,
    width: sheetWidth,
    height: sheetHeight,
  };
  
  return JSON.stringify(atlas, null, 2);
}

/**
 * Generate Godot AtlasTexture .tres format
 * 
 * Note: Godot uses a resource file format. This generates a .tres file
 * that can be imported into Godot. Each sprite gets its own AtlasTexture resource.
 */
export function generateGodotAtlas(options: AtlasGenerationOptions): string {
  const { columns, rows, sheetWidth, sheetHeight, imageFileName } = options;
  const frameWidth = sheetWidth / columns;
  const frameHeight = sheetHeight / rows;
  
  // Godot uses Y-down coordinate system, but we'll use standard Y-up
  // The user may need to adjust region coordinates if their sprite sheet
  // uses a different origin
  
  const resources: string[] = [];
  
  let frameIndex = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = col * frameWidth;
      const y = row * frameHeight;
      
      // Godot .tres format for AtlasTexture
      const resource = `[gd_resource type="AtlasTexture" load_steps=2 format=3]

[ext_resource type="Texture2D" path="res://${imageFileName}" id="1_${frameIndex}"]

[resource]
texture = ExtResource("1_${frameIndex}")
region = Rect2(${x}, ${y}, ${frameWidth}, ${frameHeight})
`;
      resources.push(resource);
      frameIndex++;
    }
  }
  
  // Return all resources concatenated (user can split into separate files if needed)
  // Or return as a single file with multiple resources
  return resources.join('\n---\n\n');
}

/**
 * Generate atlas metadata based on format
 */
export function generateAtlas(
  format: AtlasFormat,
  options: AtlasGenerationOptions
): string {
  switch (format) {
    case 'phaser':
      return generatePhaserAtlas(options);
    case 'unity':
      return generateUnityAtlas(options);
    case 'godot':
      return generateGodotAtlas(options);
    default:
      throw new Error(`Unsupported atlas format: ${format}`);
  }
}

/**
 * Get file extension for atlas format
 */
export function getAtlasFileExtension(format: AtlasFormat): string {
  switch (format) {
    case 'phaser':
    case 'unity':
      return 'json';
    case 'godot':
      return 'tres';
    default:
      throw new Error(`Unsupported atlas format: ${format}`);
  }
}
