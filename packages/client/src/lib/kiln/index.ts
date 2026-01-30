/**
 * Kiln v2 - AI-Driven 3D Asset Generation
 *
 * Single-file architecture with primitives library.
 * Two modes:
 * - GLB: Standard materials, exportable (MeshStandardMaterial)
 * - TSL: Node materials, real-time VFX only (MeshBasicNodeMaterial)
 *
 * Claude SDK generates TypeScript that renders in Three.js.
 */

export * from './types';
export * from './primitives';
export * from './prompt';
export { KilnRuntime, generateStarterCode } from './runtime';
