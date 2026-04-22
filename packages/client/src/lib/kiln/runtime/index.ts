/**
 * Kiln runtime - public surface.
 *
 * Existing call sites import `KilnRuntime` and `generateStarterCode` from
 * `'../lib/kiln'` (or `'./runtime'`). The barrel here keeps that contract
 * intact while the implementation is split across the sibling files in
 * this directory.
 */

export { KilnRuntime } from './runtime';
export { generateStarterCode } from './templates';
export { DEFAULT_CONFIG, type RuntimeConfig } from './config';
