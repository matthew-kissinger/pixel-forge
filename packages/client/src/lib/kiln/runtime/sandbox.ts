/**
 * User code sandbox.
 *
 * Compiles generated GLB code into an `AssetModule` via the Function
 * constructor, then attaches the built scene graph (+ any animation
 * clips) to the runtime state. Validation + triangle count reported
 * back via `KilnOutput`.
 */

import * as THREE from 'three';
import * as primitives from '@pixel-forge/core/kiln/primitives';
import { logger } from '@pixel-forge/shared/logger';
import type { AssetModule, KilnOutput } from '../types';
import type { RuntimeState } from './state';
import { focusOnAsset } from './camera';

/**
 * Execute generated asset code and display the result in the current
 * scene. Returns structured success/error output so the UI can surface
 * compile errors, build-time exceptions, or validation warnings.
 */
export async function execute(state: RuntimeState, code: string): Promise<KilnOutput> {
  try {
    // Clear previous asset
    if (state.asset) {
      state.scene.remove(state.asset);
      state.asset = null;
    }
    if (state.mixer) {
      state.mixer.stopAllAction();
      state.mixer = null;
    }
    state.clips = [];

    // Create module from code
    const result = await compileModule(code);
    if ('error' in result) {
      return { success: false, errors: [`Compile error: ${result.error}`] };
    }
    const module = result.module;

    // Build the asset
    state.asset = module.build();
    if (!state.asset) {
      return { success: false, errors: ['build() returned null'] };
    }
    state.scene.add(state.asset);

    // Run animations if available
    if (module.animate) {
      state.clips = module.animate(state.asset) || [];
      if (state.clips.length > 0) {
        const mixer = new THREE.AnimationMixer(state.asset);
        state.mixer = mixer;
        state.clips.forEach((clip) => {
          const action = mixer.clipAction(clip);
          action.play();
        });
      }
    }

    // Validate
    const category = module.meta?.category || 'prop';
    const validation = primitives.validateAsset(state.asset, category);

    // Focus camera on asset
    focusOnAsset(state);

    return {
      success: true,
      code,
      triangleCount: primitives.countTriangles(state.asset),
      warnings: validation.warnings,
      errors: validation.errors.length > 0 ? validation.errors : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, errors: [message] };
  }
}

/**
 * Compile TypeScript/JavaScript code to an `AssetModule`. Uses the
 * Function constructor for sandboxed execution - THREE and the primitive
 * helpers are injected as arguments.
 */
export async function compileModule(
  code: string
): Promise<{ module: AssetModule } | { error: string }> {
  try {
    // Inject THREE and primitives into scope
    const wrappedCode = `
      const THREE = arguments[0];
      const primitives = arguments[1];
      const {
        createRoot, createPivot, createPart,
        capsuleGeo, cylinderGeo, boxGeo, sphereGeo, coneGeo, torusGeo, planeGeo,
        gameMaterial, basicMaterial, lambertMaterial, glassMaterial,
        rotationTrack, positionTrack, scaleTrack, createClip,
        idleBreathing, bobbingAnimation, spinAnimation,
        countTriangles, countMaterials, getJointNames, validateAsset
      } = primitives;

      ${code}

      return { meta, build, animate: typeof animate !== 'undefined' ? animate : undefined };
    `;

    const factory = new Function(wrappedCode);
    const module = factory(THREE, primitives);
    return { module };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Module compilation failed:', message, '\nCode:', code.slice(0, 500));
    return { error: message };
  }
}
