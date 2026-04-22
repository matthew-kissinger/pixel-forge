/**
 * TSL (Three Shading Language) effect support.
 *
 * WebGPU-only. Lazily loads `three/webgpu` + `three/tsl` on first use to
 * keep the WebGL-only bundle path lean. Falls back gracefully when WebGPU
 * is unavailable.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { logger } from '@pixel-forge/shared/logger';
import type { RuntimeState } from './state';
import { handleResize, animate } from './lifecycle';

// WebGPU imports (dynamic to allow fallback)
let WebGPURenderer: typeof import('three/webgpu').WebGPURenderer | null = null;
let TSL: typeof import('three/tsl') | null = null;

/**
 * Probe for WebGPU support. Returns true on success; on failure, logs
 * a warning and returns false (TSL effects will be disabled but the
 * editor keeps rendering in WebGL).
 */
export async function loadWebGPU(): Promise<boolean> {
  try {
    const webgpuModule = await import('three/webgpu');
    WebGPURenderer = webgpuModule.WebGPURenderer;
    TSL = await import('three/tsl');
    return true;
  } catch (e) {
    logger.warn('WebGPU not available, TSL effects disabled:', e);
    return false;
  }
}

/**
 * Apply a TSL effect shader to every mesh in the loaded asset. Swaps the
 * WebGL renderer for a WebGPU renderer on first use. Original materials
 * are preserved so `removeEffect()` can restore them.
 */
export async function applyEffect(
  state: RuntimeState,
  effectCode: string
): Promise<{ success: boolean; error?: string }> {
  if (!state.asset) {
    return { success: false, error: 'No asset loaded' };
  }

  if (!state.webgpuAvailable || !TSL) {
    return { success: false, error: 'WebGPU not available - TSL effects require WebGPU' };
  }

  try {
    // Switch to WebGPU renderer if not already
    if (!state.usingWebGPU) {
      await switchToWebGPU(state);
    }

    // Compile TSL effect code
    const material = await compileTSLEffect(effectCode);
    if (!material) {
      return { success: false, error: 'Failed to compile TSL effect' };
    }

    // Store original materials and apply TSL material
    state.asset.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Store original material if not already stored
        if (!state.originalMaterials.has(child)) {
          state.originalMaterials.set(child, child.material);
        }
        // Apply TSL material
        child.material = material;
      }
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('TSL effect application failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Remove the TSL effect and restore each mesh's original material.
 */
export function removeEffect(state: RuntimeState): void {
  if (!state.asset) return;

  state.asset.traverse((child) => {
    if (child instanceof THREE.Mesh && state.originalMaterials.has(child)) {
      child.material = state.originalMaterials.get(child)!;
    }
  });
}

/**
 * Tear down the current WebGL renderer and stand up a WebGPU renderer in
 * its place. Preserves the scene, camera, and controls - only the
 * renderer + its canvas swap out.
 */
export async function switchToWebGPU(state: RuntimeState): Promise<void> {
  if (!state.container || !WebGPURenderer) return;

  // Stop current animation loop
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
  }

  // Dispose old renderer
  if (state.renderer) {
    state.renderer.dispose();
    const oldCanvas = state.container.querySelector('canvas');
    if (oldCanvas) oldCanvas.remove();
  }

  // Create WebGPU renderer
  const renderer = new WebGPURenderer({ antialias: state.config.antialias });
  await renderer.init();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  state.container.appendChild(canvas);

  state.renderer = renderer;
  state.usingWebGPU = true;

  // Recreate controls
  if (state.controls) {
    state.controls.dispose();
  }
  const controls = new OrbitControls(state.camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0.5, 0);
  controls.update();
  state.controls = controls;

  // Resize and restart animation
  handleResize(state);
  animate(state);
}

/**
 * Compile TSL effect code into a WebGPU node material. The effect code
 * expects to receive `MeshStandardNodeMaterial`, TSL helpers (color, float,
 * vec3, time, Fn, etc.) and must assign `material = new ...NodeMaterial(...)`.
 */
export async function compileTSLEffect(code: string): Promise<THREE.Material | null> {
  if (!TSL) return null;

  try {
    // The effect code expects these imports:
    // import { MeshStandardNodeMaterial } from 'three/webgpu';
    // import { color, float, time, ... } from 'three/tsl';
    //
    // We need to provide them via the sandbox

    const webgpuModule = await import('three/webgpu');
    const tslModule = await import('three/tsl');

    // Build the execution context
    const wrappedCode = `
      const { MeshStandardNodeMaterial, MeshBasicNodeMaterial, MeshPhysicalNodeMaterial } = arguments[0];
      const {
        color, float, vec2, vec3, vec4,
        time, deltaTime,
        positionLocal, positionWorld, positionView,
        normalLocal, normalWorld, normalView,
        uv, cameraPosition,
        Fn, attribute, uniform, varying
      } = arguments[1];

      ${code.replace(/^import\s+.*$/gm, '').replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '')}

      return material;
    `;

    const factory = new Function(wrappedCode);
    const material = factory(webgpuModule, tslModule);
    return material;
  } catch (err) {
    logger.error('TSL compilation failed:', err, '\nCode:', code.slice(0, 500));
    return null;
  }
}
