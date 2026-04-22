/**
 * Shared state shape for the runtime sub-modules.
 *
 * The `KilnRuntime` class in ./runtime.ts owns an instance of this shape
 * and passes itself to the sub-module functions that operate on it. This
 * keeps the class a thin orchestrator while each concern (lifecycle,
 * sandbox, tsl, camera, export, animation, cleanup) lives in its own
 * file with a single responsibility.
 */

import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { WebGPURenderer as WebGPURendererType } from 'three/webgpu';
import type { RuntimeConfig } from './config';

export interface RuntimeState {
  config: RuntimeConfig;

  // Three.js scene graph
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  clock: THREE.Clock;

  // Render + interaction
  renderer: THREE.WebGLRenderer | WebGPURendererType | null;
  controls: OrbitControls | null;
  container: HTMLElement | null;
  resizeObserver: ResizeObserver | null;
  animationId: number | null;

  // Loaded asset + animations
  asset: THREE.Object3D | null;
  mixer: THREE.AnimationMixer | null;
  clips: THREE.AnimationClip[];

  // WebGPU / TSL
  webgpuAvailable: boolean;
  usingWebGPU: boolean;
  originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
}
