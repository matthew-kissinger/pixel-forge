/**
 * Kiln v2 - Simplified Types
 *
 * Single-file asset generation with primitives library.
 * WebGPU-first with WebGL fallback via Three.js r171+.
 */

import type * as THREE from 'three';

// =============================================================================
// Core Types
// =============================================================================

export type AssetCategory = 'character' | 'prop' | 'vfx' | 'environment';

export interface AssetMeta {
  name: string;
  category: AssetCategory;
  version?: string;
  author?: string;
  tags?: string[];
}

export interface AssetModule {
  meta: AssetMeta;
  build: () => THREE.Object3D;
  animate?: (root: THREE.Object3D) => THREE.AnimationClip[];
}

// =============================================================================
// Generation Types
// =============================================================================

export interface KilnInput {
  prompt: string;
  referenceImage?: string; // Base64 or URL
  category?: AssetCategory;
  style?: 'low-poly' | 'stylized' | 'voxel' | 'realistic';
  maxTriangles?: number;
  includeAnimations?: boolean;
}

export interface KilnOutput {
  success: boolean;
  code?: string; // Generated TypeScript
  glbUrl?: string; // Exported GLB blob URL
  previewUrl?: string; // Preview image
  triangleCount?: number;
  errors?: string[];
  warnings?: string[];
}

// =============================================================================
// Primitives Types
// =============================================================================

export interface PartOptions {
  name: string;
  geometry: THREE.BufferGeometry;
  material?: THREE.Material;
  position?: [number, number, number];
  rotation?: [number, number, number]; // Euler angles in radians
  scale?: [number, number, number];
  parent?: THREE.Object3D;
  createPivot?: boolean; // Creates parent Object3D for animation
}

export interface MaterialOptions {
  color: number | string;
  metalness?: number;
  roughness?: number;
  emissive?: number | string;
  emissiveIntensity?: number;
  flatShading?: boolean;
}

export interface AnimationOptions {
  name: string;
  duration: number;
  loop?: boolean;
}

// =============================================================================
// Constraints
// =============================================================================

export const CONSTRAINTS = {
  character: { maxTris: 5000, maxMaterials: 5, maxBones: 32 },
  prop: { maxTris: 2000, maxMaterials: 4, maxBones: 0 },
  vfx: { maxTris: 1000, maxMaterials: 2, maxBones: 0 },
  environment: { maxTris: 10000, maxMaterials: 8, maxBones: 0 },
} as const;

// =============================================================================
// Runtime State
// =============================================================================

export interface KilnState {
  code: string | null;
  asset: THREE.Object3D | null;
  animations: THREE.AnimationClip[];
  errors: string[];
  isExecuting: boolean;
  lastExport: string | null;
}
