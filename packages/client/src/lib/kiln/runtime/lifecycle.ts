/**
 * Renderer lifecycle: mount, resize, animate loop.
 *
 * Operates on the shared `RuntimeState` so the orchestrator can coordinate
 * renderer/controls/resize-observer state with the other sub-modules.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { RuntimeState } from './state';

/**
 * Create the WebGL renderer, attach to the container, configure controls,
 * and start the render loop. Idempotent-ish: callers should not mount
 * twice without disposing first.
 */
export function mount(state: RuntimeState, container: HTMLElement): void {
  state.container = container;

  // Create WebGL renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: state.config.antialias,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  state.renderer = renderer;

  // Style canvas to fill container
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  // Initial size - use requestAnimationFrame to ensure layout is complete
  requestAnimationFrame(() => {
    handleResize(state);
  });

  // Orbit controls with proper configuration
  const controls = new OrbitControls(state.camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0.5, 0);
  controls.minDistance = 0.5;
  controls.maxDistance = 20;
  controls.enablePan = true;
  controls.panSpeed = 0.8;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 1.0;
  controls.update();
  state.controls = controls;

  // Start render loop
  animate(state);

  // Handle resize with ResizeObserver
  state.resizeObserver = new ResizeObserver(() => handleResize(state));
  state.resizeObserver.observe(container);
}

/**
 * Resize the renderer and update camera aspect ratio to match the
 * container's client dimensions. No-op if container or renderer missing,
 * or if dimensions are zero.
 */
export function handleResize(state: RuntimeState): void {
  if (!state.container || !state.renderer) return;

  // Use clientWidth/Height for accurate container dimensions
  const width = state.container.clientWidth;
  const height = state.container.clientHeight;

  // Avoid division by zero and invalid sizes
  if (width === 0 || height === 0) return;

  // Update renderer size (false = don't update style, we handle that with CSS)
  state.renderer.setSize(width, height, false);

  // Update camera aspect ratio
  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();
}

/**
 * Animation render loop. Sets `state.animationId` and reschedules itself.
 * Callers cancel via `cancelAnimationFrame(state.animationId)` when
 * disposing or switching renderers.
 */
export function animate(state: RuntimeState): void {
  const step = (): void => {
    state.animationId = requestAnimationFrame(step);

    const delta = state.clock.getDelta();
    if (state.mixer) {
      state.mixer.update(delta);
    }
    if (state.controls) {
      state.controls.update();
    }
    if (state.renderer) {
      state.renderer.render(state.scene, state.camera);
    }
  };

  state.animationId = requestAnimationFrame(step);
}
