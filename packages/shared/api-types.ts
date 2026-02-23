export type ArtStyle = 'pixel-art' | 'painted' | 'vector' | 'anime' | 'realistic' | 'isometric';
export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
export type ImageSize = '1K' | '2K' | '4K';

/**
 * Generic API response envelope
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: number; details?: any };

// --- Image Generation ---

export interface GenerateImageOptions {
  prompt: string;
  style?: ArtStyle;
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
  removeBackground?: boolean;
  presetId?: string;
  referenceImage?: string;  // single reference image (legacy)
  referenceImages?: string[]; // up to 6 reference images for style consistency
}

export interface GenerateImageResponse {
  image: string; // base64 data URL
}

export interface SmartGenerateResponse {
  image: string; // base64 data URL
  selectedAspectRatio?: AspectRatio;
  metadata?: {
    category?: string;
    estimatedSize?: string;
  };
}

export interface BatchGenerateRequest {
  subjects: string[];
  presetId?: string;
  consistencyPhrase?: string;
  seed?: number;
}

export interface BatchGenerateResponse {
  images: string[];
  errors?: string[];
  successCount: number;
  totalCount: number;
}

// --- Image Processing ---

export interface RemoveBgResponse {
  image: string; // base64 data URL
}

export interface CompressImageResponse {
  image: string; // base64 data URL
  originalSize: number;
  compressedSize: number;
  format: 'png' | 'webp' | 'jpeg';
}

export interface SliceSheetResponse {
  sprites: string[]; // base64 data URLs
}

// --- 3D Models (Model Router) ---

export type Model3DStyle = 'low-poly' | 'realistic' | 'sculpture';

export interface GenerateModelResponse {
  requestId: string;
}

export interface ModelStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  modelUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

// --- Kiln (3D Code Generation) ---

export type KilnRenderMode = 'glb' | 'tsl' | 'both';
export type KilnAssetCategory = 'character' | 'prop' | 'vfx' | 'environment';
export type KilnAssetStyle = 'low-poly' | 'stylized' | 'voxel' | 'detailed' | 'realistic';

export interface GenerateKilnCodeOptions {
  prompt: string;
  mode?: KilnRenderMode;
  category?: KilnAssetCategory;
  style?: KilnAssetStyle;
  includeAnimation?: boolean;
  existingCode?: string;
  referenceImageUrl?: string;
}

export interface GenerateKilnCodeResponse {
  success: boolean;
  code?: string;
  effectCode?: string;
  outputDir?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
}

// --- Tileable Textures (FLUX + Seamless LoRA) ---

export interface GenerateTextureRequest {
  description: string;
  size?: number;
  loraScale?: number;
  steps?: number;
  guidance?: number;
  pixelate?: boolean;
  pixelateTarget?: number;
  paletteColors?: number;
}

export interface GenerateTextureResponse {
  image: string; // base64 data URL
  size: number; // bytes
  dimensions: { width: number; height: number };
}

// --- Export / Save ---

export interface ExportToFileOptions {
  image: string; // base64 data URL
  path: string; // relative path
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
}

export interface ExportToFileResponse {
  success: boolean;
  path: string;
  size: number;
}

export interface BatchExportToFileOptions {
  images: ExportToFileOptions[];
}

export interface BatchExportToFileResponse {
  success: boolean;
  results: Array<{
    success: boolean;
    path?: string;
    size?: number;
    error?: string;
  }>;
  successCount: number;
  totalCount: number;
}