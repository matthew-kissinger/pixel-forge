/**
 * Kiln v2 - AI-Driven 3D Asset Generation
 *
 * Single-file architecture with primitives library.
 * Two modes:
 * - GLB: Standard materials, exportable (MeshStandardMaterial)
 * - TSL: Node materials, real-time VFX only (MeshBasicNodeMaterial)
 *
 * Claude SDK generates TypeScript that renders in Three.js.
 *
 * GLB primitives live in `@pixel-forge/core/kiln/primitives` - re-exported
 * here so existing editor imports keep working without touching call sites.
 * TSL/WebGPU paths (runtime.ts, prompt.ts) stay client-only.
 */

export * from './types';
export * from '@pixel-forge/core/kiln/primitives';
export * from './prompt';
export { KilnRuntime, generateStarterCode } from './runtime';
