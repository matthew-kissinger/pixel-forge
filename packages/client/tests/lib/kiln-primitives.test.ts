import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('three', () => {
  const createTransform = (initial: [number, number, number]) => {
    const transform = {
      x: initial[0],
      y: initial[1],
      z: initial[2],
      set: vi.fn((x: number, y: number, z: number) => {
        transform.x = x;
        transform.y = y;
        transform.z = z;
      }),
    };
    return transform;
  };

  const Object3D = vi.fn(function Object3D(this: any) {
    this.name = '';
    this.children = [];
    this.parent = undefined;
    this.position = createTransform([0, 0, 0]);
    this.rotation = createTransform([0, 0, 0]);
    this.scale = createTransform([1, 1, 1]);
    this.add = vi.fn((child: any) => {
      this.children.push(child);
      child.parent = this;
    });
    this.traverse = vi.fn((cb: (obj: any) => void) => {
      cb(this);
      for (const child of this.children) {
        if (child && typeof child.traverse === 'function') {
          child.traverse(cb);
        } else {
          cb(child);
        }
      }
    });
  });

  const Mesh = vi.fn(function Mesh(this: any, geometry: any, material: any) {
    Object3D.call(this);
    this.geometry = geometry;
    this.material = material;
    this.isMesh = true;
  });
  Mesh.prototype = Object.create(Object3D.prototype);
  Mesh.prototype.constructor = Mesh;

  const BoxGeometry = vi.fn(function BoxGeometry(this: any, ...args: number[]) {
    this.args = args;
  });
  const SphereGeometry = vi.fn(function SphereGeometry(
    this: any,
    ...args: number[]
  ) {
    this.args = args;
  });
  const CylinderGeometry = vi.fn(function CylinderGeometry(
    this: any,
    ...args: number[]
  ) {
    this.args = args;
  });
  const CapsuleGeometry = vi.fn(function CapsuleGeometry(
    this: any,
    ...args: number[]
  ) {
    this.args = args;
  });
  const ConeGeometry = vi.fn(function ConeGeometry(this: any, ...args: number[]) {
    this.args = args;
  });
  const TorusGeometry = vi.fn(function TorusGeometry(
    this: any,
    ...args: number[]
  ) {
    this.args = args;
  });

  const MeshStandardMaterial = vi.fn(function MeshStandardMaterial(
    this: any,
    options: any
  ) {
    Object.assign(this, options);
    this.type = 'MeshStandardMaterial';
  });
  const MeshBasicMaterial = vi.fn(function MeshBasicMaterial(
    this: any,
    options: any
  ) {
    Object.assign(this, options);
    this.type = 'MeshBasicMaterial';
  });
  const MeshLambertMaterial = vi.fn(function MeshLambertMaterial(
    this: any,
    options: any
  ) {
    Object.assign(this, options);
    this.type = 'MeshLambertMaterial';
  });

  const Euler = vi.fn(function Euler(this: any, x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.order = 'XYZ';
    this.set = vi.fn((nextX: number, nextY: number, nextZ: number) => {
      this.x = nextX;
      this.y = nextY;
      this.z = nextZ;
      return this;
    });
  });

  const Quaternion = vi.fn(function Quaternion(this: any) {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 1;
    this.setFromEuler = vi.fn((euler: any) => {
      this.x = euler.x;
      this.y = euler.y;
      this.z = euler.z;
      this.w = 1;
      return this;
    });
    this.toArray = vi.fn(() => [this.x, this.y, this.z, this.w]);
  });

  const QuaternionKeyframeTrack = vi.fn(function QuaternionKeyframeTrack(
    this: any,
    name: string,
    times: number[],
    values: number[]
  ) {
    this.name = name;
    this.times = times;
    this.values = values;
  });

  const VectorKeyframeTrack = vi.fn(function VectorKeyframeTrack(
    this: any,
    name: string,
    times: number[],
    values: number[]
  ) {
    this.name = name;
    this.times = times;
    this.values = values;
  });

  const AnimationClip = vi.fn(function AnimationClip(
    this: any,
    name: string,
    duration: number,
    tracks: any[]
  ) {
    this.name = name;
    this.duration = duration;
    this.tracks = tracks;
  });

  const Color = vi.fn(function Color(this: any, color: number | string) {
    this.value = color;
  });

  return {
    Object3D,
    Mesh,
    BoxGeometry,
    SphereGeometry,
    CylinderGeometry,
    CapsuleGeometry,
    ConeGeometry,
    TorusGeometry,
    MeshStandardMaterial,
    MeshBasicMaterial,
    MeshLambertMaterial,
    Euler,
    Quaternion,
    QuaternionKeyframeTrack,
    VectorKeyframeTrack,
    AnimationClip,
    Color,
    InterpolateDiscrete: 2300,
    InterpolateLinear: 2301,
    MathUtils: {
      degToRad: (deg: number) => deg * (Math.PI / 180),
    },
  };
});

import * as THREE from 'three';
import {
  basicMaterial,
  bobbingAnimation,
  boxGeo,
  capsuleGeo,
  coneGeo,
  countMaterials,
  countTriangles,
  createClip,
  createPart,
  createPivot,
  createRoot,
  cylinderGeo,
  gameMaterial,
  getJointNames,
  idleBreathing,
  lambertMaterial,
  positionTrack,
  rotationTrack,
  scaleTrack,
  sphereGeo,
  spinAnimation,
  torusGeo,
  validateAsset,
} from '@pixel-forge/core/kiln/primitives';

function makeGeometry(options: { indexCount?: number; positionCount?: number } = {}) {
  return {
    index: options.indexCount ? { count: options.indexCount } : null,
    getAttribute: vi.fn((name: string) => {
      if (name !== 'position') return null;
      if (!options.positionCount) return null;
      return { count: options.positionCount };
    }),
  };
}

describe('kiln/primitives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('geometry helpers', () => {
    it('createRoot creates an Object3D with the provided name', () => {
      const root = createRoot('Robot');

      expect(THREE.Object3D).toHaveBeenCalledTimes(1);
      expect(root.name).toBe('Robot');
    });

    it('createPivot prefixes name with Joint_', () => {
      const pivot = createPivot('Arm');

      expect(pivot.name).toBe('Joint_Arm');
    });

    it('createPivot sets default position to origin', () => {
      const pivot = createPivot('Body');

      expect(pivot.position.set).toHaveBeenCalledWith(0, 0, 0);
    });

    it('createPivot applies custom position', () => {
      const pivot = createPivot('Leg', [1, 2, 3]);

      expect(pivot.position.set).toHaveBeenCalledWith(1, 2, 3);
    });

    it('createPivot adds to parent when provided', () => {
      const parent = new THREE.Object3D();
      const pivot = createPivot('Head', [0, 1, 0], parent);

      expect(parent.add).toHaveBeenCalledWith(pivot);
      expect(parent.children).toContain(pivot);
    });

    it('createPart creates a mesh with Mesh_ prefix', () => {
      const mesh = createPart('Hull', {} as any, {} as any);

      expect(THREE.Mesh).toHaveBeenCalledWith(expect.anything(), expect.anything());
      expect(mesh.name).toBe('Mesh_Hull');
    });

    it('createPart applies position/rotation/scale options', () => {
      const mesh = createPart('Hull', {} as any, {} as any, {
        position: [1, 2, 3],
        rotation: [0.1, 0.2, 0.3],
        scale: [2, 2, 2],
      }) as any;

      expect(mesh.position.set).toHaveBeenCalledWith(1, 2, 3);
      // createPart converts rotation values from degrees to radians
      expect(mesh.rotation.set).toHaveBeenCalledWith(
        THREE.MathUtils.degToRad(0.1),
        THREE.MathUtils.degToRad(0.2),
        THREE.MathUtils.degToRad(0.3),
      );
      expect(mesh.scale.set).toHaveBeenCalledWith(2, 2, 2);
    });

    it('createPart adds mesh to parent when pivot is false', () => {
      const parent = new THREE.Object3D();
      const mesh = createPart('Hull', {} as any, {} as any, { parent });

      expect(parent.add).toHaveBeenCalledWith(mesh);
      expect(parent.children).toContain(mesh);
    });

    it('createPart wraps mesh in pivot when pivot is true', () => {
      const result = createPart('Arm', {} as any, {} as any, { pivot: true }) as any;

      expect(result.name).toBe('Joint_Arm');
      expect(result.children).toHaveLength(1);
      expect(result.children[0].name).toBe('Mesh_Arm');
    });

    it('createPart sets pivot position and resets mesh local position', () => {
      const result = createPart('Arm', {} as any, {} as any, {
        pivot: true,
        position: [2, 3, 4],
      }) as any;
      const mesh = result.children[0];

      expect(result.position.set).toHaveBeenCalledWith(2, 3, 4);
      expect(mesh.position.set).toHaveBeenLastCalledWith(0, 0, 0);
    });

    it('createPart adds pivot to parent when pivot is true', () => {
      const parent = new THREE.Object3D();
      const pivot = createPart('Arm', {} as any, {} as any, {
        pivot: true,
        parent,
      });

      expect(parent.add).toHaveBeenCalledWith(pivot);
      expect(parent.children).toContain(pivot);
    });
  });

  describe('shape factories', () => {
    it('capsuleGeo uses defaults', () => {
      capsuleGeo(0.2, 1.5);

      expect(THREE.CapsuleGeometry).toHaveBeenCalledWith(0.2, 1.5, 2, 6);
    });

    it('capsuleGeo accepts custom segments', () => {
      capsuleGeo(0.2, 1.5, 10);

      expect(THREE.CapsuleGeometry).toHaveBeenCalledWith(0.2, 1.5, 2, 10);
    });

    it('cylinderGeo uses default segments', () => {
      cylinderGeo(0.2, 0.3, 2);

      expect(THREE.CylinderGeometry).toHaveBeenCalledWith(0.2, 0.3, 2, 8);
    });

    it('cylinderGeo accepts custom segments', () => {
      cylinderGeo(0.2, 0.3, 2, 16);

      expect(THREE.CylinderGeometry).toHaveBeenCalledWith(0.2, 0.3, 2, 16);
    });

    it('boxGeo forwards width/height/depth', () => {
      boxGeo(1, 2, 3);

      expect(THREE.BoxGeometry).toHaveBeenCalledWith(1, 2, 3);
    });

    it('sphereGeo uses default segment counts', () => {
      sphereGeo(0.5);

      expect(THREE.SphereGeometry).toHaveBeenCalledWith(0.5, 8, 6);
    });

    it('sphereGeo accepts custom segment counts', () => {
      sphereGeo(0.5, 12, 10);

      expect(THREE.SphereGeometry).toHaveBeenCalledWith(0.5, 12, 10);
    });

    it('coneGeo uses default segments', () => {
      coneGeo(0.4, 1.2);

      expect(THREE.ConeGeometry).toHaveBeenCalledWith(0.4, 1.2, 8);
    });

    it('coneGeo accepts custom segments', () => {
      coneGeo(0.4, 1.2, 14);

      expect(THREE.ConeGeometry).toHaveBeenCalledWith(0.4, 1.2, 14);
    });

    it('torusGeo uses default radial/tubular segments', () => {
      torusGeo(1, 0.2);

      expect(THREE.TorusGeometry).toHaveBeenCalledWith(1, 0.2, 8, 12);
    });

    it('torusGeo accepts custom radial/tubular segments', () => {
      torusGeo(1, 0.2, 16, 24);

      expect(THREE.TorusGeometry).toHaveBeenCalledWith(1, 0.2, 16, 24);
    });
  });

  describe('material factories', () => {
    it('gameMaterial applies defaults including flatShading true', () => {
      const material = gameMaterial(0xff0000) as any;

      expect(THREE.MeshStandardMaterial).toHaveBeenCalledWith({
        color: 0xff0000,
        metalness: 0,
        roughness: 0.8,
        emissive: 0x000000,
        emissiveIntensity: 1,
        flatShading: true,
      });
      expect(material.type).toBe('MeshStandardMaterial');
    });

    it('gameMaterial allows option overrides', () => {
      gameMaterial(0x00ff00, {
        metalness: 0.5,
        roughness: 0.2,
        emissive: 0x111111,
        emissiveIntensity: 2,
        flatShading: false,
      });

      expect(THREE.MeshStandardMaterial).toHaveBeenCalledWith({
        color: 0x00ff00,
        metalness: 0.5,
        roughness: 0.2,
        emissive: 0x111111,
        emissiveIntensity: 2,
        flatShading: false,
      });
    });

    it('basicMaterial applies defaults', () => {
      basicMaterial('red');

      expect(THREE.MeshBasicMaterial).toHaveBeenCalledWith({
        color: 'red',
        transparent: false,
        opacity: 1,
      });
    });

    it('basicMaterial forwards transparent/opacity options', () => {
      basicMaterial(0xffffff, { transparent: true, opacity: 0.25 });

      expect(THREE.MeshBasicMaterial).toHaveBeenCalledWith({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
      });
    });

    it('lambertMaterial applies defaults', () => {
      lambertMaterial(0x333333);

      expect(THREE.MeshLambertMaterial).toHaveBeenCalledWith({
        color: 0x333333,
        flatShading: true,
        emissive: 0x000000,
      });
    });

    it('lambertMaterial forwards flatShading/emissive options', () => {
      lambertMaterial(0x333333, { flatShading: false, emissive: 0x999999 });

      expect(THREE.MeshLambertMaterial).toHaveBeenCalledWith({
        color: 0x333333,
        flatShading: false,
        emissive: 0x999999,
      });
    });
  });

  describe('animation helpers', () => {
    it('rotationTrack builds quaternion track path and times', () => {
      const track = rotationTrack('Joint_Arm', [
        { time: 0, rotation: [0, 0, 0] },
        { time: 1, rotation: [90, 180, 270] },
      ]) as any;

      expect(THREE.QuaternionKeyframeTrack).toHaveBeenCalledTimes(1);
      expect(track.name).toBe('Joint_Arm.quaternion');
      expect(track.times).toEqual([0, 1]);
    });

    it('rotationTrack converts degrees using MathUtils.degToRad', () => {
      const track = rotationTrack('Joint_Arm', [
        { time: 0, rotation: [90, 180, 270] },
      ]) as any;

      expect(track.values).toEqual([Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 1]);
    });

    it('positionTrack builds vector track with flattened values', () => {
      const track = positionTrack('Joint_Root', [
        { time: 0, position: [0, 0, 0] },
        { time: 2, position: [1, 2, 3] },
      ]) as any;

      expect(THREE.VectorKeyframeTrack).toHaveBeenCalledWith(
        'Joint_Root.position',
        [0, 2],
        [0, 0, 0, 1, 2, 3],
        THREE.InterpolateLinear
      );
      expect(track.name).toBe('Joint_Root.position');
    });

    it('scaleTrack builds vector track with flattened values', () => {
      const track = scaleTrack('Joint_Root', [
        { time: 0, scale: [1, 1, 1] },
        { time: 2, scale: [2, 3, 4] },
      ]) as any;

      expect(THREE.VectorKeyframeTrack).toHaveBeenCalledWith(
        'Joint_Root.scale',
        [0, 2],
        [1, 1, 1, 2, 3, 4],
        THREE.InterpolateLinear
      );
      expect(track.name).toBe('Joint_Root.scale');
    });

    it('createClip wraps tracks into AnimationClip', () => {
      const fakeTrack = { id: 't1' } as any;
      const clip = createClip('Run', 1.5, [fakeTrack]) as any;

      expect(THREE.AnimationClip).toHaveBeenCalledWith('Run', 1.5, [fakeTrack]);
      expect(clip.name).toBe('Run');
      expect(clip.duration).toBe(1.5);
      expect(clip.tracks).toEqual([fakeTrack]);
    });

    it('idleBreathing creates Idle clip with body joint position track', () => {
      const clip = idleBreathing('Joint_Body', 4, 0.1) as any;

      expect(clip.name).toBe('Idle');
      expect(clip.duration).toBe(4);
      expect(clip.tracks).toHaveLength(1);
      expect(clip.tracks[0].name).toBe('Joint_Body.position');
      expect(clip.tracks[0].times).toEqual([0, 2, 4]);
      expect(clip.tracks[0].values).toEqual([0, 0, 0, 0, 0.1, 0, 0, 0, 0]);
    });

    it('bobbingAnimation creates Bob clip for root movement', () => {
      const clip = bobbingAnimation('Root', 3, 0.6) as any;

      expect(clip.name).toBe('Bob');
      expect(clip.duration).toBe(3);
      expect(clip.tracks[0].name).toBe('Root.position');
      expect(clip.tracks[0].times).toEqual([0, 1.5, 3]);
      expect(clip.tracks[0].values).toEqual([0, 0, 0, 0, 0.6, 0, 0, 0, 0]);
    });

    it('spinAnimation creates 5 keyframes over default y axis', () => {
      const clip = spinAnimation('Joint_Wheel', 2) as any;
      const values = clip.tracks[0].values;

      expect(clip.name).toBe('Spin');
      expect(clip.duration).toBe(2);
      expect(clip.tracks[0].name).toBe('Joint_Wheel.quaternion');
      expect(clip.tracks[0].times).toEqual([0, 0.5, 1, 1.5, 2]);
      expect(values).toEqual([
        0,
        0,
        0,
        1,
        0,
        Math.PI / 2,
        0,
        1,
        0,
        Math.PI,
        0,
        1,
        0,
        (3 * Math.PI) / 2,
        0,
        1,
        0,
        0,
        0,
        1,
      ]);
    });

    it('spinAnimation supports x axis rotation', () => {
      const clip = spinAnimation('Joint_Wheel', 2, 'x') as any;

      expect(clip.tracks[0].values.slice(0, 8)).toEqual([
        0,
        0,
        0,
        1,
        Math.PI / 2,
        0,
        0,
        1,
      ]);
    });

    it('spinAnimation supports z axis rotation', () => {
      const clip = spinAnimation('Joint_Wheel', 2, 'z') as any;

      expect(clip.tracks[0].values.slice(0, 8)).toEqual([
        0,
        0,
        0,
        1,
        0,
        0,
        Math.PI / 2,
        1,
      ]);
    });
  });

  describe('utilities', () => {
    it('countTriangles sums indexed geometry triangles', () => {
      const root = new THREE.Object3D();
      const mesh = new THREE.Mesh(makeGeometry({ indexCount: 12 }), {} as any);
      root.add(mesh);

      expect(countTriangles(root)).toBe(4);
    });

    it('countTriangles sums non-indexed geometry triangles', () => {
      const root = new THREE.Object3D();
      const mesh = new THREE.Mesh(
        makeGeometry({ positionCount: 9 }),
        {} as any
      );
      root.add(mesh);

      expect(countTriangles(root)).toBe(3);
    });

    it('countTriangles floors fractional totals', () => {
      const root = new THREE.Object3D();
      root.add(new THREE.Mesh(makeGeometry({ indexCount: 4 }), {} as any));

      expect(countTriangles(root)).toBe(1);
    });

    it('countTriangles ignores non-mesh nodes', () => {
      const root = new THREE.Object3D();
      root.add(new THREE.Object3D());

      expect(countTriangles(root)).toBe(0);
    });

    it('countMaterials counts unique single materials', () => {
      const root = new THREE.Object3D();
      const matA = { id: 'a' };
      root.add(new THREE.Mesh(makeGeometry(), matA));
      root.add(new THREE.Mesh(makeGeometry(), matA));

      expect(countMaterials(root)).toBe(1);
    });

    it('countMaterials supports material arrays and deduplicates', () => {
      const root = new THREE.Object3D();
      const matA = { id: 'a' };
      const matB = { id: 'b' };
      root.add(new THREE.Mesh(makeGeometry(), [matA, matB]));
      root.add(new THREE.Mesh(makeGeometry(), [matA]));

      expect(countMaterials(root)).toBe(2);
    });

    it('getJointNames returns only nodes with Joint_ prefix', () => {
      const root = new THREE.Object3D();
      const a = new THREE.Object3D();
      const b = new THREE.Object3D();
      const c = new THREE.Object3D();
      a.name = 'Joint_Root';
      b.name = 'Mesh_Body';
      c.name = 'Joint_Arm';
      root.add(a);
      root.add(b);
      b.add(c);

      expect(getJointNames(root)).toEqual(['Joint_Root', 'Joint_Arm']);
    });

    it('validateAsset is always valid and has no errors', () => {
      const root = new THREE.Object3D();
      const result = validateAsset(root, 'prop');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('validateAsset warns for high triangle count by category', () => {
      const root = new THREE.Object3D();
      root.add(new THREE.Mesh(makeGeometry({ indexCount: 18000 }), {} as any));

      const result = validateAsset(root, 'character');

      expect(result.warnings).toContain(
        'High triangle count: 6000 (suggested: 5000)'
      );
    });

    it('validateAsset warns for high material count by category', () => {
      const root = new THREE.Object3D();
      for (let i = 0; i < 7; i++) {
        root.add(new THREE.Mesh(makeGeometry({ indexCount: 3 }), { id: i } as any));
      }

      const result = validateAsset(root, 'prop');

      expect(result.warnings).toContain('High material count: 7 (suggested: 6)');
    });

    it('validateAsset can return both triangle and material warnings', () => {
      const root = new THREE.Object3D();
      for (let i = 0; i < 5; i++) {
        root.add(
          new THREE.Mesh(makeGeometry({ indexCount: 1500 }), { id: i } as any)
        );
      }

      const result = validateAsset(root, 'vfx');

      expect(result.warnings).toContain(
        'High triangle count: 2500 (suggested: 2000)'
      );
      expect(result.warnings).toContain('High material count: 5 (suggested: 4)');
    });
  });
});
