/**
 * Kiln Runtime
 *
 * Executes generated asset code and renders with WebGPU (WebGL fallback).
 * Supports two modes:
 * - GLB: Standard materials, exportable to GLB
 * - TSL: Node materials, real-time effects only
 *
 * This file is a thin orchestrator. Each concern (lifecycle, sandbox,
 * tsl, camera, export, animation, cleanup) lives in its own sub-module
 * under this directory. The class holds the shared `RuntimeState` and
 * delegates calls to the sub-module functions.
 */

import type { KilnOutput } from '../types';
import { DEFAULT_CONFIG, createSceneAndCamera, type RuntimeConfig } from './config';
import type { RuntimeState } from './state';
import { mount as mountFn } from './lifecycle';
import { execute as executeFn } from './sandbox';
import {
  loadWebGPU,
  applyEffect as applyEffectFn,
  removeEffect as removeEffectFn,
} from './tsl-effects';
import {
  resetCamera as resetCameraFn,
  zoomIn as zoomInFn,
  zoomOut as zoomOutFn,
} from './camera';
import { exportGLB as exportGLBFn, takeScreenshot as takeScreenshotFn } from './export';
import {
  playAnimation as playAnimationFn,
  getAnimationNames as getAnimationNamesFn,
} from './animation';
import { dispose as disposeFn } from './cleanup';
import * as THREE from 'three';

export class KilnRuntime {
  private state: RuntimeState;

  constructor(config: RuntimeConfig = DEFAULT_CONFIG) {
    const { scene, camera } = createSceneAndCamera(config);

    this.state = {
      config,
      scene,
      camera,
      clock: new THREE.Clock(),
      renderer: null,
      controls: null,
      container: null,
      resizeObserver: null,
      animationId: null,
      asset: null,
      mixer: null,
      clips: [],
      webgpuAvailable: false,
      usingWebGPU: false,
      originalMaterials: new Map(),
    };

    // Probe WebGPU asynchronously; TSL effects gate on this flag.
    loadWebGPU().then((available) => {
      this.state.webgpuAvailable = available;
    });
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /** Mount the renderer to a DOM element. */
  mount(container: HTMLElement): void {
    mountFn(this.state, container);
  }

  // ===========================================================================
  // Sandbox / execution
  // ===========================================================================

  /** Execute generated asset code and display result. */
  execute(code: string): Promise<KilnOutput> {
    return executeFn(this.state, code);
  }

  // ===========================================================================
  // TSL effects
  // ===========================================================================

  /** Apply TSL effect code to the current asset. Requires WebGPU. */
  applyEffect(effectCode: string): Promise<{ success: boolean; error?: string }> {
    return applyEffectFn(this.state, effectCode);
  }

  /** Remove TSL effect and restore original materials. */
  removeEffect(): void {
    removeEffectFn(this.state);
  }

  /** Whether TSL effects are available (WebGPU detected). */
  get canUseTSL(): boolean {
    return this.state.webgpuAvailable;
  }

  /** Whether the runtime is currently using the WebGPU renderer. */
  get isWebGPU(): boolean {
    return this.state.usingWebGPU;
  }

  // ===========================================================================
  // Camera
  // ===========================================================================

  /** Reset camera to default position focused on asset. */
  resetCamera(): void {
    resetCameraFn(this.state);
  }

  /** Zoom camera in (move closer to target). */
  zoomIn(): void {
    zoomInFn(this.state);
  }

  /** Zoom camera out (move further from target). */
  zoomOut(): void {
    zoomOutFn(this.state);
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  /**
   * Export current asset as GLB (blob URL). Routes through the canonical
   * `@pixel-forge/core/kiln` bridge - same bytes as headless `renderGLB`.
   */
  exportGLB(): Promise<string | null> {
    return exportGLBFn(this.state);
  }

  /** Take a screenshot of the current view (PNG data URL). */
  takeScreenshot(): string | null {
    return takeScreenshotFn(this.state);
  }

  // ===========================================================================
  // Animation
  // ===========================================================================

  /** Play a specific animation by name. */
  playAnimation(name: string): void {
    playAnimationFn(this.state, name);
  }

  /** Get list of animation names. */
  getAnimationNames(): string[] {
    return getAnimationNamesFn(this.state);
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /** Cleanup all renderer + observer resources. */
  dispose(): void {
    disposeFn(this.state);
  }
}
