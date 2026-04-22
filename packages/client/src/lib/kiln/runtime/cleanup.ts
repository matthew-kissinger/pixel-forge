/**
 * Resource cleanup.
 *
 * Cancels the render loop, disconnects the resize observer, disposes
 * Three.js GPU resources, and removes the canvas from the DOM. Called by
 * the orchestrator's `dispose()`.
 */

import type { RuntimeState } from './state';

/**
 * Tear down all renderer-owned resources. Idempotent: state fields are
 * checked before use so calling dispose twice is safe.
 */
export function dispose(state: RuntimeState): void {
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
    state.animationId = null;
  }
  if (state.resizeObserver) {
    state.resizeObserver.disconnect();
    state.resizeObserver = null;
  }
  if (state.renderer) {
    state.renderer.dispose();
    state.renderer.domElement.remove();
    state.renderer = null;
  }
  if (state.controls) {
    state.controls.dispose();
    state.controls = null;
  }
}
