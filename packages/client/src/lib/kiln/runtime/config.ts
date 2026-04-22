/**
 * Runtime configuration + scene/camera/lighting setup.
 *
 * Plain data + small factory functions. No class state here - the runtime
 * orchestrator wires these together.
 */

import * as THREE from 'three';
import type { RenderMode } from '../prompt';

// =============================================================================
// Runtime Configuration
// =============================================================================

export interface RuntimeConfig {
  antialias?: boolean;
  background?: number;
  ambientIntensity?: number;
  directionalIntensity?: number;
  mode?: RenderMode;
}

export const DEFAULT_CONFIG: RuntimeConfig = {
  antialias: true,
  background: 0x1a1a1a,
  ambientIntensity: 0.6,
  directionalIntensity: 0.8,
  mode: 'glb',
};

// =============================================================================
// Scene + camera factory
// =============================================================================

/**
 * Create a Three.js scene and camera pre-populated with lights and a grid
 * helper. Returned objects are owned by the runtime - dispose them there.
 */
export function createSceneAndCamera(
  config: RuntimeConfig
): { scene: THREE.Scene; camera: THREE.PerspectiveCamera } {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(config.background ?? 0x1a1a1a);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(3, 2, 3);

  setupLighting(scene, config);

  return { scene, camera };
}

/**
 * Add ambient, directional, fill lights, and a grid helper to the scene.
 * Matches the original runtime's layout - 3-point lighting with a ground
 * reference grid.
 */
export function setupLighting(scene: THREE.Scene, config: RuntimeConfig): void {
  // Ambient light
  const ambient = new THREE.AmbientLight(
    0xffffff,
    config.ambientIntensity
  );
  scene.add(ambient);

  // Main directional light
  const directional = new THREE.DirectionalLight(
    0xffffff,
    config.directionalIntensity
  );
  directional.position.set(5, 10, 5);
  directional.castShadow = true;
  scene.add(directional);

  // Fill light
  const fill = new THREE.DirectionalLight(0xffffff, 0.3);
  fill.position.set(-5, 5, -5);
  scene.add(fill);

  // Ground grid
  const grid = new THREE.GridHelper(10, 10, 0x444444, 0x333333);
  scene.add(grid);
}
