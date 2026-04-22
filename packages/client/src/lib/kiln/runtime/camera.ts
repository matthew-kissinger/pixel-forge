/**
 * Camera controls: framing, reset, and zoom.
 *
 * Pure geometry over the shared `RuntimeState`. All functions are no-ops
 * when prerequisites (asset, controls) are missing so callers can invoke
 * them without guards.
 */

import * as THREE from 'three';
import type { RuntimeState } from './state';

/**
 * Frame the camera on the current asset based on its bounding box. Adds
 * ~2.5x padding past the FOV-fit distance for a comfortable viewing
 * angle. No-op if no asset is loaded.
 */
export function focusOnAsset(state: RuntimeState): void {
  if (!state.asset) return;

  const box = new THREE.Box3().setFromObject(state.asset);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  // Calculate distance needed to fit object in view based on camera FOV
  const fov = state.camera.fov * (Math.PI / 180);
  const fitDistance = maxDim / (2 * Math.tan(fov / 2));
  const distance = fitDistance * 2.5; // Add some padding

  // Position camera at a nice angle
  state.camera.position.set(
    center.x + distance * 0.7,
    center.y + distance * 0.5,
    center.z + distance * 0.7
  );
  state.camera.lookAt(center);

  if (state.controls) {
    state.controls.target.copy(center);
    state.controls.update();
  }
}

/**
 * Reset camera to its default framing. Re-runs `focusOnAsset` if an asset
 * is loaded; otherwise resets to the original neutral position.
 */
export function resetCamera(state: RuntimeState): void {
  if (state.asset) {
    focusOnAsset(state);
  } else {
    // Default position when no asset
    state.camera.position.set(3, 2, 3);
    if (state.controls) {
      state.controls.target.set(0, 0.5, 0);
      state.controls.update();
    }
  }
}

/**
 * Zoom camera in 20% toward the controls target, clamped to a minimum
 * distance of 0.5 units so the camera never clips inside the asset.
 */
export function zoomIn(state: RuntimeState): void {
  if (!state.controls) return;
  const direction = new THREE.Vector3()
    .subVectors(state.camera.position, state.controls.target)
    .normalize();
  const distance = state.camera.position.distanceTo(state.controls.target);
  const newDistance = Math.max(0.5, distance * 0.8); // Zoom in by 20%, min 0.5
  state.camera.position
    .copy(state.controls.target)
    .addScaledVector(direction, newDistance);
  state.controls.update();
}

/**
 * Zoom camera out 25% from the controls target, clamped to a maximum
 * distance of 50 units.
 */
export function zoomOut(state: RuntimeState): void {
  if (!state.controls) return;
  const direction = new THREE.Vector3()
    .subVectors(state.camera.position, state.controls.target)
    .normalize();
  const distance = state.camera.position.distanceTo(state.controls.target);
  const newDistance = Math.min(50, distance * 1.25); // Zoom out by 25%, max 50
  state.camera.position
    .copy(state.controls.target)
    .addScaledVector(direction, newDistance);
  state.controls.update();
}
