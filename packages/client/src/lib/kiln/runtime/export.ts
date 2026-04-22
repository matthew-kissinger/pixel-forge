/**
 * Asset export: GLB + screenshot.
 *
 * GLB export routes through `@pixel-forge/core/kiln/render`'s shared bridge
 * (W2.1.7). Replaces the old Three.js `GLTFExporter` path so the editor
 * and headless `core.kiln.renderGLB(code)` produce byte-for-byte identical
 * GLBs - no two-paths drift, one canonical pipeline.
 *
 * The core helper uses WebIO from `@gltf-transform/core`, which is safe in
 * both browser and Node and only touches network APIs on the read side -
 * `writeBinary()` is pure bytes-in/bytes-out.
 */

import { renderSceneToGLB } from '@pixel-forge/core/kiln/render';
import { logger } from '@pixel-forge/shared/logger';
import type { RuntimeState } from './state';

/**
 * Serialize the currently-loaded asset (plus any animation clips) to a
 * GLB blob URL. Returns null if no asset is loaded or serialization
 * fails (errors are logged).
 */
export async function exportGLB(state: RuntimeState): Promise<string | null> {
  if (!state.asset) return null;

  try {
    const result = await renderSceneToGLB(state.asset, {
      sceneName: state.asset.name || 'Scene',
      clips: state.clips,
    });

    // Wrap the platform-agnostic Uint8Array in a Blob and hand back a
    // browser-friendly object URL. The caller is responsible for
    // revoking it via URL.revokeObjectURL when done.
    //
    // Slice into a fresh ArrayBuffer so the BlobPart type checks (the
    // gltf-transform Uint8Array's underlying ArrayBufferLike could in
    // principle be a SharedArrayBuffer; Blob requires ArrayBuffer).
    const arrayBuffer = result.bytes.buffer.slice(
      result.bytes.byteOffset,
      result.bytes.byteOffset + result.bytes.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
    return URL.createObjectURL(blob);
  } catch (error) {
    logger.error('GLB export failed:', error);
    return null;
  }
}

/**
 * Capture the current renderer view as a PNG data URL. Forces a render
 * pass first so the screenshot reflects the latest scene state (rather
 * than whatever was on the framebuffer between animation frames).
 */
export function takeScreenshot(state: RuntimeState): string | null {
  if (!state.renderer) return null;
  state.renderer.render(state.scene, state.camera);
  return state.renderer.domElement.toDataURL('image/png');
}
