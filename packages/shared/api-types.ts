export type ArtStyle = 'pixel-art' | 'painted' | 'vector' | 'anime' | 'realistic' | 'isometric';
export type AspectRatio = '21:9' | '16:9' | '3:2' | '4:3' | '5:4' | '1:1' | '4:5' | '3:4' | '2:3' | '9:16';

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
  removeBackground?: boolean;
  presetId?: string;
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