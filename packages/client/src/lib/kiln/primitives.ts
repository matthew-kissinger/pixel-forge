/**
 * Kiln Primitives Library
 *
 * High-level helpers for 3D asset creation.
 * Claude generates code using these primitives to keep files small.
 */

import * as THREE from 'three';

// =============================================================================
// Geometry Helpers
// =============================================================================

/**
 * Creates the root Object3D for an asset.
 */
export function createRoot(name: string): THREE.Object3D {
  const root = new THREE.Object3D();
  root.name = name;
  return root;
}

/**
 * Creates a pivot (empty Object3D) for skeletal animation.
 * Pivots are the joints that get animated; meshes are children.
 */
export function createPivot(
  name: string,
  position: [number, number, number] = [0, 0, 0],
  parent?: THREE.Object3D
): THREE.Object3D {
  const pivot = new THREE.Object3D();
  pivot.name = `Joint_${name}`;
  pivot.position.set(...position);
  if (parent) parent.add(pivot);
  return pivot;
}

/**
 * Creates a mesh with automatic pivot wrapping for animation.
 * The mesh is automatically added to `parent` if provided.
 *
 * Returns the added Object3D (mesh or pivot) for reference.
 * NOTE: Do NOT call .add() on the return value - it's already added!
 */
export function createPart(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  options: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    pivot?: boolean; // Wrap in pivot for animation
    parent?: THREE.Object3D;
  } = {}
): THREE.Object3D {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `Mesh_${name}`;

  if (options.position) mesh.position.set(...options.position);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  if (options.scale) mesh.scale.set(...options.scale);

  if (options.pivot) {
    const pivot = new THREE.Object3D();
    pivot.name = `Joint_${name}`;
    pivot.add(mesh);
    mesh.position.set(0, 0, 0); // Reset - pivot controls position
    if (options.position) pivot.position.set(...options.position);
    if (options.parent) options.parent.add(pivot);
    return pivot; // Return the pivot (the animatable node)
  }

  if (options.parent) options.parent.add(mesh);
  return mesh; // Return the mesh
}

// =============================================================================
// Common Shapes (game-ready low-poly)
// =============================================================================

/**
 * Low-poly capsule (pill shape) - great for limbs.
 */
export function capsuleGeo(
  radius: number,
  height: number,
  segments = 6
): THREE.CapsuleGeometry {
  return new THREE.CapsuleGeometry(radius, height, 2, segments);
}

/**
 * Low-poly cylinder - torsos, limbs.
 */
export function cylinderGeo(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments = 8
): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
}

/**
 * Low-poly box - props, buildings.
 */
export function boxGeo(
  width: number,
  height: number,
  depth: number
): THREE.BoxGeometry {
  return new THREE.BoxGeometry(width, height, depth);
}

/**
 * Low-poly sphere - heads, balls.
 */
export function sphereGeo(
  radius: number,
  widthSegments = 8,
  heightSegments = 6
): THREE.SphereGeometry {
  return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
}

/**
 * Low-poly cone - hats, spikes.
 */
export function coneGeo(
  radius: number,
  height: number,
  segments = 8
): THREE.ConeGeometry {
  return new THREE.ConeGeometry(radius, height, segments);
}

/**
 * Low-poly torus - rings, donuts.
 */
export function torusGeo(
  radius: number,
  tube: number,
  radialSegments = 8,
  tubularSegments = 12
): THREE.TorusGeometry {
  return new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
}

/**
 * Flat plane - helipads, walls, doors, PSP planking, billboard quads.
 */
export function planeGeo(
  width: number,
  height: number,
  widthSegments = 1,
  heightSegments = 1
): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
}

// =============================================================================
// Materials
// =============================================================================

/**
 * Standard game material with flat shading (toony look).
 */
export function gameMaterial(
  color: number | string,
  options: {
    metalness?: number;
    roughness?: number;
    emissive?: number | string;
    emissiveIntensity?: number;
    flatShading?: boolean;
  } = {}
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: options.metalness ?? 0,
    roughness: options.roughness ?? 0.8,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 1,
    flatShading: options.flatShading ?? true,
  });
}

/**
 * Simple unlit material - VFX, UI elements.
 */
export function basicMaterial(
  color: number | string,
  options: { transparent?: boolean; opacity?: number } = {}
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
}

/**
 * Transparent glass/canopy material - cockpits, windshields, windows.
 */
export function glassMaterial(
  color: number | string,
  options: { opacity?: number; roughness?: number; metalness?: number } = {}
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: options.opacity ?? 0.35,
    roughness: options.roughness ?? 0.1,
    metalness: options.metalness ?? 0,
    side: THREE.DoubleSide,
  });
}

/**
 * Lambert material - lighter weight than standard.
 */
export function lambertMaterial(
  color: number | string,
  options: { flatShading?: boolean; emissive?: number | string } = {}
): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color,
    flatShading: options.flatShading ?? true,
    emissive: options.emissive ?? 0x000000,
  });
}

// =============================================================================
// Animation Helpers
// =============================================================================

/**
 * Creates a rotation keyframe track for a joint.
 * Uses quaternions internally but accepts angles in degrees for convenience.
 */
export function rotationTrack(
  jointName: string,
  keyframes: Array<{ time: number; rotation: [number, number, number] }>
): THREE.QuaternionKeyframeTrack {
  const times: number[] = [];
  const values: number[] = [];
  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();

  for (const kf of keyframes) {
    times.push(kf.time);
    euler.set(
      THREE.MathUtils.degToRad(kf.rotation[0]),
      THREE.MathUtils.degToRad(kf.rotation[1]),
      THREE.MathUtils.degToRad(kf.rotation[2])
    );
    quat.setFromEuler(euler);
    values.push(quat.x, quat.y, quat.z, quat.w);
  }

  return new THREE.QuaternionKeyframeTrack(
    `${jointName}.quaternion`,
    times,
    values
  );
}

/**
 * Creates a position keyframe track for bobbing/movement.
 */
export function positionTrack(
  jointName: string,
  keyframes: Array<{ time: number; position: [number, number, number] }>
): THREE.VectorKeyframeTrack {
  const times: number[] = [];
  const values: number[] = [];

  for (const kf of keyframes) {
    times.push(kf.time);
    values.push(...kf.position);
  }

  return new THREE.VectorKeyframeTrack(
    `${jointName}.position`,
    times,
    values
  );
}

/**
 * Creates a scale keyframe track.
 */
export function scaleTrack(
  jointName: string,
  keyframes: Array<{ time: number; scale: [number, number, number] }>
): THREE.VectorKeyframeTrack {
  const times: number[] = [];
  const values: number[] = [];

  for (const kf of keyframes) {
    times.push(kf.time);
    values.push(...kf.scale);
  }

  return new THREE.VectorKeyframeTrack(`${jointName}.scale`, times, values);
}

/**
 * Creates an animation clip from tracks.
 */
export function createClip(
  name: string,
  duration: number,
  tracks: THREE.KeyframeTrack[]
): THREE.AnimationClip {
  return new THREE.AnimationClip(name, duration, tracks);
}

// =============================================================================
// Common Animation Patterns
// =============================================================================

/**
 * Creates a simple idle breathing animation.
 */
export function idleBreathing(
  bodyJoint: string,
  duration = 2,
  amount = 0.02
): THREE.AnimationClip {
  const y = 0; // Base Y position
  return createClip('Idle', duration, [
    positionTrack(bodyJoint, [
      { time: 0, position: [0, y, 0] },
      { time: duration / 2, position: [0, y + amount, 0] },
      { time: duration, position: [0, y, 0] },
    ]),
  ]);
}

/**
 * Creates a simple bobbing animation (for props).
 */
export function bobbingAnimation(
  rootName: string,
  duration = 2,
  height = 0.1
): THREE.AnimationClip {
  return createClip('Bob', duration, [
    positionTrack(rootName, [
      { time: 0, position: [0, 0, 0] },
      { time: duration / 2, position: [0, height, 0] },
      { time: duration, position: [0, 0, 0] },
    ]),
  ]);
}

/**
 * Creates a spinning animation.
 */
export function spinAnimation(
  jointName: string,
  duration = 2,
  axis: 'x' | 'y' | 'z' = 'y'
): THREE.AnimationClip {
  const rotation: [number, number, number] = [0, 0, 0];
  const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  const rotations: Array<{ time: number; rotation: [number, number, number] }> =
    [];

  for (let i = 0; i <= 4; i++) {
    const r: [number, number, number] = [...rotation];
    r[idx] = (i * 90) % 360;
    rotations.push({ time: (i * duration) / 4, rotation: r });
  }

  return createClip('Spin', duration, [rotationTrack(jointName, rotations)]);
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Counts triangles in a scene.
 */
export function countTriangles(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry;
      if (geometry.index) {
        count += geometry.index.count / 3;
      } else {
        const position = geometry.getAttribute('position');
        if (position) count += position.count / 3;
      }
    }
  });
  return Math.floor(count);
}

/**
 * Counts unique materials in a scene.
 */
export function countMaterials(root: THREE.Object3D): number {
  const materials = new Set<THREE.Material>();
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => materials.add(m));
      } else {
        materials.add(child.material);
      }
    }
  });
  return materials.size;
}

/**
 * Gets all joint names for animation.
 */
export function getJointNames(root: THREE.Object3D): string[] {
  const joints: string[] = [];
  root.traverse((child) => {
    if (child.name.startsWith('Joint_')) {
      joints.push(child.name);
    }
  });
  return joints;
}

/**
 * Validates asset against constraints.
 * Returns warnings for guidance but doesn't block on limits.
 */
export function validateAsset(
  root: THREE.Object3D,
  category: 'character' | 'prop' | 'vfx' | 'environment'
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Soft limits for guidance only
  const guidelines = {
    character: { suggestedTris: 5000, suggestedMats: 8 },
    prop: { suggestedTris: 3000, suggestedMats: 6 },
    vfx: { suggestedTris: 2000, suggestedMats: 4 },
    environment: { suggestedTris: 15000, suggestedMats: 12 },
  };

  const limits = guidelines[category];
  const tris = countTriangles(root);
  const mats = countMaterials(root);

  // Just informational warnings, never errors for counts
  if (tris > limits.suggestedTris) {
    warnings.push(`High triangle count: ${tris} (suggested: ${limits.suggestedTris})`);
  }

  if (mats > limits.suggestedMats) {
    warnings.push(`High material count: ${mats} (suggested: ${limits.suggestedMats})`);
  }

  // Always valid - limits are just guidelines
  return { valid: true, errors, warnings };
}
