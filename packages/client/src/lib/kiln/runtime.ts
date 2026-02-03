/**
 * Kiln Runtime
 *
 * Executes generated asset code and renders with WebGPU (WebGL fallback).
 * Supports two modes:
 * - GLB: Standard materials, exportable to GLB
 * - TSL: Node materials, real-time effects only
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { AssetModule, KilnOutput } from './types';
import * as primitives from './primitives';
import type { RenderMode } from './prompt';
import type { WebGPURenderer as WebGPURendererType } from 'three/webgpu';

// WebGPU imports (dynamic to allow fallback)
let WebGPURenderer: typeof import('three/webgpu').WebGPURenderer | null = null;
let TSL: typeof import('three/tsl') | null = null;

// Try to load WebGPU support
async function loadWebGPU(): Promise<boolean> {
  try {
    const webgpuModule = await import('three/webgpu');
    WebGPURenderer = webgpuModule.WebGPURenderer;
    TSL = await import('three/tsl');
    return true;
  } catch (e) {
    console.warn('WebGPU not available, TSL effects disabled:', e);
    return false;
  }
}

// =============================================================================
// Runtime Configuration
// =============================================================================

interface RuntimeConfig {
  antialias?: boolean;
  background?: number;
  ambientIntensity?: number;
  directionalIntensity?: number;
  mode?: RenderMode;
}

const DEFAULT_CONFIG: RuntimeConfig = {
  antialias: true,
  background: 0x1a1a1a,
  ambientIntensity: 0.6,
  directionalIntensity: 0.8,
  mode: 'glb',
};

// =============================================================================
// Kiln Runtime Class
// =============================================================================

export class KilnRuntime {
  private renderer: THREE.WebGLRenderer | WebGPURendererType | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clock: THREE.Clock;
  private animationId: number | null = null;
  private container: HTMLElement | null = null;
  private asset: THREE.Object3D | null = null;
  private clips: THREE.AnimationClip[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private webgpuAvailable = false;
  private usingWebGPU = false;
  private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();

  private config: RuntimeConfig;

  constructor(config: RuntimeConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.background ?? 0x1a1a1a);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(3, 2, 3);

    this.clock = new THREE.Clock();
    this.setupLighting();

    // Check WebGPU availability
    loadWebGPU().then((available) => {
      this.webgpuAvailable = available;
    });
  }

  private setupLighting(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(
      0xffffff,
      this.config.ambientIntensity
    );
    this.scene.add(ambient);

    // Main directional light
    const directional = new THREE.DirectionalLight(
      0xffffff,
      this.config.directionalIntensity
    );
    directional.position.set(5, 10, 5);
    directional.castShadow = true;
    this.scene.add(directional);

    // Fill light
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-5, 5, -5);
    this.scene.add(fill);

    // Ground grid
    const grid = new THREE.GridHelper(10, 10, 0x444444, 0x333333);
    this.scene.add(grid);
  }

  /**
   * Mount the renderer to a DOM element.
   */
  mount(container: HTMLElement): void {
    this.container = container;

    // Create WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.config.antialias,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Style canvas to fill container
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    // Initial size - use requestAnimationFrame to ensure layout is complete
    requestAnimationFrame(() => {
      this.handleResize();
    });

    // Orbit controls with proper configuration
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0.5, 0);
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 20;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.8;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 1.0;
    this.controls.update();

    // Start render loop
    this.animate();

    // Handle resize with ResizeObserver
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);
  }

  private handleResize(): void {
    if (!this.container || !this.renderer) return;

    // Use clientWidth/Height for accurate container dimensions
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Avoid division by zero and invalid sizes
    if (width === 0 || height === 0) return;

    // Update renderer size (false = don't update style, we handle that with CSS)
    this.renderer.setSize(width, height, false);

    // Update camera aspect ratio
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    if (this.mixer) {
      this.mixer.update(delta);
    }
    if (this.controls) {
      this.controls.update();
    }
    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  /**
   * Execute generated asset code and display result.
   */
  async execute(code: string): Promise<KilnOutput> {
    try {
      // Clear previous asset
      if (this.asset) {
        this.scene.remove(this.asset);
        this.asset = null;
      }
      if (this.mixer) {
        this.mixer.stopAllAction();
        this.mixer = null;
      }
      this.clips = [];

      // Create module from code
      const result = await this.compileModule(code);
      if ('error' in result) {
        return { success: false, errors: [`Compile error: ${result.error}`] };
      }
      const module = result.module;

      // Build the asset
      this.asset = module.build();
      if (!this.asset) {
        return { success: false, errors: ['build() returned null'] };
      }
      this.scene.add(this.asset);

      // Run animations if available
      if (module.animate) {
        this.clips = module.animate(this.asset) || [];
        if (this.clips.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.asset);
          this.clips.forEach((clip) => {
            const action = this.mixer!.clipAction(clip);
            action.play();
          });
        }
      }

      // Validate
      const category = module.meta?.category || 'prop';
      const validation = primitives.validateAsset(this.asset, category);

      // Focus camera on asset
      this.focusOnAsset();

      return {
        success: true,
        code,
        triangleCount: primitives.countTriangles(this.asset),
        warnings: validation.warnings,
        errors: validation.errors.length > 0 ? validation.errors : undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, errors: [message] };
    }
  }

  /**
   * Compile TypeScript/JavaScript code to a module.
   * Uses Function constructor for sandboxed execution.
   */
  private async compileModule(code: string): Promise<{ module: AssetModule } | { error: string }> {
    try {
      // Inject THREE and primitives into scope
      const wrappedCode = `
        const THREE = arguments[0];
        const primitives = arguments[1];
        const {
          createRoot, createPivot, createPart,
          capsuleGeo, cylinderGeo, boxGeo, sphereGeo, coneGeo, torusGeo,
          gameMaterial, basicMaterial, lambertMaterial,
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
      console.error('Module compilation failed:', message, '\nCode:', code.slice(0, 500));
      return { error: message };
    }
  }

  /**
   * Apply TSL effect code to the current asset.
   * Requires WebGPU - will switch renderer if needed.
   */
  async applyEffect(effectCode: string): Promise<{ success: boolean; error?: string }> {
    if (!this.asset) {
      return { success: false, error: 'No asset loaded' };
    }

    if (!this.webgpuAvailable || !TSL) {
      return { success: false, error: 'WebGPU not available - TSL effects require WebGPU' };
    }

    try {
      // Switch to WebGPU renderer if not already
      if (!this.usingWebGPU) {
        await this.switchToWebGPU();
      }

      // Compile TSL effect code
      const material = await this.compileTSLEffect(effectCode);
      if (!material) {
        return { success: false, error: 'Failed to compile TSL effect' };
      }

      // Store original materials and apply TSL material
      this.asset.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Store original material if not already stored
          if (!this.originalMaterials.has(child)) {
            this.originalMaterials.set(child, child.material);
          }
          // Apply TSL material
          child.material = material;
        }
      });

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('TSL effect application failed:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Remove TSL effect and restore original materials.
   */
  removeEffect(): void {
    if (!this.asset) return;

    this.asset.traverse((child) => {
      if (child instanceof THREE.Mesh && this.originalMaterials.has(child)) {
        child.material = this.originalMaterials.get(child)!;
      }
    });

  }

  /**
   * Check if TSL effects are available.
   */
  get canUseTSL(): boolean {
    return this.webgpuAvailable;
  }

  /**
   * Check if currently using WebGPU.
   */
  get isWebGPU(): boolean {
    return this.usingWebGPU;
  }

  /**
   * Switch to WebGPU renderer.
   */
  private async switchToWebGPU(): Promise<void> {
    if (!this.container || !WebGPURenderer) return;

    // Stop current animation loop
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Dispose old renderer
    if (this.renderer) {
      this.renderer.dispose();
      const oldCanvas = this.container.querySelector('canvas');
      if (oldCanvas) oldCanvas.remove();
    }

    // Create WebGPU renderer
    const renderer = new WebGPURenderer({ antialias: this.config.antialias });
    await renderer.init();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    this.container.appendChild(canvas);

    this.renderer = renderer;
    this.usingWebGPU = true;

    // Recreate controls
    if (this.controls) {
      this.controls.dispose();
    }
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0.5, 0);
    this.controls.update();

    // Resize and restart animation
    this.handleResize();
    this.animate();
  }

  /**
   * Compile TSL effect code into a material.
   */
  private async compileTSLEffect(code: string): Promise<THREE.Material | null> {
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
      console.error('TSL compilation failed:', err, '\nCode:', code.slice(0, 500));
      return null;
    }
  }

  /**
   * Focus camera on the current asset with proper framing.
   */
  private focusOnAsset(): void {
    if (!this.asset) return;

    const box = new THREE.Box3().setFromObject(this.asset);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Calculate distance needed to fit object in view based on camera FOV
    const fov = this.camera.fov * (Math.PI / 180);
    const fitDistance = maxDim / (2 * Math.tan(fov / 2));
    const distance = fitDistance * 2.5; // Add some padding

    // Position camera at a nice angle
    this.camera.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.5,
      center.z + distance * 0.7
    );
    this.camera.lookAt(center);

    if (this.controls) {
      this.controls.target.copy(center);
      this.controls.update();
    }
  }

  /**
   * Export current asset as GLB.
   */
  async exportGLB(): Promise<string | null> {
    if (!this.asset) return null;

    return new Promise((resolve) => {
      const exporter = new GLTFExporter();
      exporter.parse(
        this.asset!,
        (result) => {
          const blob = new Blob([result as ArrayBuffer], {
            type: 'model/gltf-binary',
          });
          const url = URL.createObjectURL(blob);
          resolve(url);
        },
        (error) => {
          console.error('GLB export failed:', error);
          resolve(null);
        },
        {
          binary: true,
          animations: this.clips,
        }
      );
    });
  }

  /**
   * Take a screenshot of the current view.
   */
  takeScreenshot(): string | null {
    if (!this.renderer) return null;
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  /**
   * Play a specific animation by name.
   */
  playAnimation(name: string): void {
    if (!this.mixer) return;
    const clip = this.clips.find((c) => c.name === name);
    if (clip) {
      this.mixer.stopAllAction();
      const action = this.mixer.clipAction(clip);
      action.reset().play();
    }
  }

  /**
   * Get list of animation names.
   */
  getAnimationNames(): string[] {
    return this.clips.map((c) => c.name);
  }

  /**
   * Reset camera to default position focused on asset.
   */
  resetCamera(): void {
    if (this.asset) {
      this.focusOnAsset();
    } else {
      // Default position when no asset
      this.camera.position.set(3, 2, 3);
      if (this.controls) {
        this.controls.target.set(0, 0.5, 0);
        this.controls.update();
      }
    }
  }

  /**
   * Zoom camera in (move closer to target).
   */
  zoomIn(): void {
    if (!this.controls) return;
    const direction = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls.target)
      .normalize();
    const distance = this.camera.position.distanceTo(this.controls.target);
    const newDistance = Math.max(0.5, distance * 0.8); // Zoom in by 20%, min 0.5
    this.camera.position
      .copy(this.controls.target)
      .addScaledVector(direction, newDistance);
    this.controls.update();
  }

  /**
   * Zoom camera out (move further from target).
   */
  zoomOut(): void {
    if (!this.controls) return;
    const direction = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls.target)
      .normalize();
    const distance = this.camera.position.distanceTo(this.controls.target);
    const newDistance = Math.min(50, distance * 1.25); // Zoom out by 25%, max 50
    this.camera.position
      .copy(this.controls.target)
      .addScaledVector(direction, newDistance);
    this.controls.update();
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    if (this.controls) {
      this.controls.dispose();
    }
  }
}

// =============================================================================
// Code Templates
// =============================================================================

/**
 * Generate starter code for a new asset.
 */
export function generateStarterCode(
  category: 'character' | 'prop' | 'vfx' | 'environment',
  name: string
): string {
  const templates: Record<string, string> = {
    prop: `// ${name} - Prop Asset
const meta = {
  name: '${name}',
  category: 'prop',
};

function build() {
  const root = createRoot('${name}');

  // Main body
  const body = createPart('Body', boxGeo(0.5, 0.5, 0.5), gameMaterial(0x4488ff), {
    parent: root,
    pivot: true,
  });

  return root;
}

function animate(root) {
  return [
    bobbingAnimation(root.name, 2, 0.05),
  ];
}`,

    character: `// ${name} - Character Asset
const meta = {
  name: '${name}',
  category: 'character',
};

function build() {
  const root = createRoot('${name}');

  // Body pivot at y=1.0 (ground at 0)
  const body = createPivot('Body', [0, 1.0, 0], root);

  // Torso
  createPart('Torso', cylinderGeo(0.15, 0.12, 0.4, 8), gameMaterial(0x4488ff), {
    parent: body,
  });

  // Head
  const head = createPart('Head', sphereGeo(0.12, 8, 6), gameMaterial(0xffcc99), {
    position: [0, 0.3, 0],
    parent: body,
    pivot: true,
  });

  // Arms
  createPart('LeftArm', capsuleGeo(0.04, 0.2, 6), gameMaterial(0xffcc99), {
    position: [-0.2, 0.1, 0],
    rotation: [0, 0, Math.PI / 6],
    parent: body,
  });
  createPart('RightArm', capsuleGeo(0.04, 0.2, 6), gameMaterial(0xffcc99), {
    position: [0.2, 0.1, 0],
    rotation: [0, 0, -Math.PI / 6],
    parent: body,
  });

  // Legs
  createPart('LeftLeg', capsuleGeo(0.05, 0.3, 6), gameMaterial(0x333333), {
    position: [-0.08, -0.35, 0],
    parent: body,
  });
  createPart('RightLeg', capsuleGeo(0.05, 0.3, 6), gameMaterial(0x333333), {
    position: [0.08, -0.35, 0],
    parent: body,
  });

  return root;
}

function animate(root) {
  return [
    idleBreathing('Joint_Body', 2, 0.02),
  ];
}`,

    vfx: `// ${name} - VFX Asset
const meta = {
  name: '${name}',
  category: 'vfx',
};

function build() {
  const root = createRoot('${name}');

  // Glowing orb
  const orb = createPart('Orb', sphereGeo(0.2, 12, 8),
    gameMaterial(0x00ffff, { emissive: 0x00ffff, emissiveIntensity: 2 }), {
    parent: root,
    pivot: true,
  });

  // Ring
  createPart('Ring', torusGeo(0.3, 0.02, 6, 16),
    gameMaterial(0xff00ff, { emissive: 0xff00ff, emissiveIntensity: 1 }), {
    rotation: [Math.PI / 2, 0, 0],
    parent: root,
  });

  return root;
}

function animate(root) {
  return [
    spinAnimation('Joint_Orb', 3, 'y'),
    bobbingAnimation(root.name, 2, 0.1),
  ];
}`,

    environment: `// ${name} - Environment Asset
const meta = {
  name: '${name}',
  category: 'environment',
};

function build() {
  const root = createRoot('${name}');

  // Base platform
  createPart('Base', boxGeo(2, 0.1, 2), gameMaterial(0x557755), {
    position: [0, -0.05, 0],
    parent: root,
  });

  // Tree trunk
  const trunk = createPart('Trunk', cylinderGeo(0.08, 0.1, 0.6, 6), gameMaterial(0x885533), {
    position: [0.3, 0.3, 0.3],
    parent: root,
  });

  // Tree foliage
  createPart('Foliage', coneGeo(0.25, 0.4, 6), gameMaterial(0x228833), {
    position: [0.3, 0.7, 0.3],
    parent: root,
  });

  // Rock
  createPart('Rock', sphereGeo(0.15, 5, 4), gameMaterial(0x666666), {
    position: [-0.4, 0.1, -0.3],
    scale: [1, 0.6, 0.8],
    parent: root,
  });

  return root;
}`,
  };

  return templates[category] || templates.prop;
}
