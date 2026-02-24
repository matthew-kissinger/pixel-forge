/**
 * Headless GLB Export Script
 *
 * Takes Kiln-generated code and exports it as a binary GLB file.
 * Uses Three.js for scene construction + @gltf-transform/core for serialization.
 * No WebGL, no browser APIs, no polyfills needed.
 *
 * Usage:
 *   bun scripts/export-glb.ts <code-json-or-file> <output-path>
 *
 * Examples:
 *   bun scripts/export-glb.ts /tmp/kiln-ammo-crate.json war-assets/structures/ammo-crate.glb
 *   bun scripts/export-glb.ts packages/server/output/kiln/.../geometry.ts war-assets/structures/ammo-crate.glb
 */

import * as THREE from 'three';
import { Document, NodeIO, Accessor } from '@gltf-transform/core';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';

// =============================================================================
// Kiln Primitives (mirrors packages/client/src/lib/kiln/primitives.ts)
// =============================================================================

function createRoot(name: string): THREE.Object3D {
  const root = new THREE.Object3D();
  root.name = name;
  return root;
}

function createPivot(
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

function createPart(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  options: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    pivot?: boolean;
    parent?: THREE.Object3D;
  } = {}
): THREE.Object3D {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `Mesh_${name}`;
  if (options.position) mesh.position.set(...options.position);
  if (options.rotation) mesh.rotation.set(
    THREE.MathUtils.degToRad(options.rotation[0]),
    THREE.MathUtils.degToRad(options.rotation[1]),
    THREE.MathUtils.degToRad(options.rotation[2]),
  );
  if (options.scale) mesh.scale.set(...options.scale);
  if (options.pivot) {
    const pivot = new THREE.Object3D();
    pivot.name = `Joint_${name}`;
    pivot.add(mesh);
    mesh.position.set(0, 0, 0);
    if (options.position) pivot.position.set(...options.position);
    if (options.parent) options.parent.add(pivot);
    return pivot;
  }
  if (options.parent) options.parent.add(mesh);
  return mesh;
}

function capsuleGeo(radius: number, height: number, segments = 6) {
  return new THREE.CapsuleGeometry(radius, height, 2, segments);
}
function cylinderGeo(rTop: number, rBot: number, height: number, segments = 8) {
  return new THREE.CylinderGeometry(rTop, rBot, height, segments);
}
function boxGeo(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(w, h, d);
}
function sphereGeo(r: number, wSeg = 8, hSeg = 6) {
  return new THREE.SphereGeometry(r, wSeg, hSeg);
}
function coneGeo(r: number, h: number, seg = 8) {
  return new THREE.ConeGeometry(r, h, seg);
}
function torusGeo(r: number, tube: number, rSeg = 8, tSeg = 12) {
  return new THREE.TorusGeometry(r, tube, rSeg, tSeg);
}
function planeGeo(w: number, h: number, wSeg = 1, hSeg = 1) {
  return new THREE.PlaneGeometry(w, h, wSeg, hSeg);
}

function gameMaterial(color: number | string, opts: any = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: opts.metalness ?? 0,
    roughness: opts.roughness ?? 0.8,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    flatShading: opts.flatShading ?? true,
  });
}
function basicMaterial(color: number | string, opts: any = {}) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  });
}
function glassMaterial(color: number | string, opts: any = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: opts.opacity ?? 0.35,
    roughness: opts.roughness ?? 0.1,
    metalness: opts.metalness ?? 0,
    side: THREE.DoubleSide,
  });
}
function lambertMaterial(color: number | string, opts: any = {}) {
  return new THREE.MeshLambertMaterial({
    color,
    flatShading: opts.flatShading ?? true,
    emissive: opts.emissive ?? 0x000000,
  });
}

function rotationTrack(
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
  return new THREE.QuaternionKeyframeTrack(`${jointName}.quaternion`, times, values);
}

function positionTrack(
  jointName: string,
  keyframes: Array<{ time: number; position: [number, number, number] }>
): THREE.VectorKeyframeTrack {
  const times: number[] = [];
  const values: number[] = [];
  for (const kf of keyframes) {
    times.push(kf.time);
    values.push(...kf.position);
  }
  return new THREE.VectorKeyframeTrack(`${jointName}.position`, times, values);
}

function scaleTrack(
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

function createClip(name: string, duration: number, tracks: THREE.KeyframeTrack[]) {
  return new THREE.AnimationClip(name, duration, tracks);
}

function spinAnimation(jointName: string, duration = 2, axis: 'x' | 'y' | 'z' = 'y') {
  const rotation: [number, number, number] = [0, 0, 0];
  const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  const rotations: Array<{ time: number; rotation: [number, number, number] }> = [];
  for (let i = 0; i <= 4; i++) {
    const r: [number, number, number] = [...rotation];
    r[idx] = (i * 90) % 360;
    rotations.push({ time: (i * duration) / 4, rotation: r });
  }
  return createClip('Spin', duration, [rotationTrack(jointName, rotations)]);
}

function bobbingAnimation(rootName: string, duration = 2, height = 0.1) {
  return createClip('Bob', duration, [
    positionTrack(rootName, [
      { time: 0, position: [0, 0, 0] },
      { time: duration / 2, position: [0, height, 0] },
      { time: duration, position: [0, 0, 0] },
    ]),
  ]);
}

function idleBreathing(bodyJoint: string, duration = 2, amount = 0.02) {
  return createClip('Idle', duration, [
    positionTrack(bodyJoint, [
      { time: 0, position: [0, 0, 0] },
      { time: duration / 2, position: [0, amount, 0] },
      { time: duration, position: [0, 0, 0] },
    ]),
  ]);
}

function countTriangles(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geo = child.geometry;
      if (geo.index) count += geo.index.count / 3;
      else {
        const pos = geo.getAttribute('position');
        if (pos) count += pos.count / 3;
      }
    }
  });
  return Math.floor(count);
}

// =============================================================================
// Three.js -> gltf-transform bridge
// =============================================================================

type GtNode = import('@gltf-transform/core').Node;
type GtMesh = import('@gltf-transform/core').Mesh;
type GtMaterial = import('@gltf-transform/core').Material;
type GtBuffer = import('@gltf-transform/core').Buffer;

/** Convert a Three.js MeshStandardMaterial (or similar) to a gltf-transform Material */
function bridgeMaterial(
  doc: Document,
  threeMat: THREE.Material,
  cache: Map<THREE.Material, GtMaterial>
): GtMaterial {
  if (cache.has(threeMat)) return cache.get(threeMat)!;

  const mat = doc.createMaterial(threeMat.name || undefined);

  if (threeMat instanceof THREE.MeshStandardMaterial) {
    mat.setBaseColorFactor([threeMat.color.r, threeMat.color.g, threeMat.color.b, threeMat.opacity]);
    mat.setRoughnessFactor(threeMat.roughness);
    mat.setMetallicFactor(threeMat.metalness);
    if (threeMat.emissive) {
      mat.setEmissiveFactor([threeMat.emissive.r, threeMat.emissive.g, threeMat.emissive.b]);
    }
    if (threeMat.transparent) {
      mat.setAlphaMode('BLEND');
    }
    if (threeMat.side === THREE.DoubleSide) {
      mat.setDoubleSided(true);
    }
  } else if (threeMat instanceof THREE.MeshLambertMaterial) {
    mat.setBaseColorFactor([threeMat.color.r, threeMat.color.g, threeMat.color.b, threeMat.opacity]);
    mat.setRoughnessFactor(1.0);
    mat.setMetallicFactor(0.0);
    if (threeMat.emissive) {
      mat.setEmissiveFactor([threeMat.emissive.r, threeMat.emissive.g, threeMat.emissive.b]);
    }
  } else if (threeMat instanceof THREE.MeshBasicMaterial) {
    mat.setBaseColorFactor([threeMat.color.r, threeMat.color.g, threeMat.color.b, threeMat.opacity]);
    mat.setRoughnessFactor(1.0);
    mat.setMetallicFactor(0.0);
  }

  cache.set(threeMat, mat);
  return mat;
}

/** Convert a Three.js BufferGeometry to a gltf-transform Mesh */
function bridgeGeometry(
  doc: Document,
  buf: GtBuffer,
  geometry: THREE.BufferGeometry,
  material: GtMaterial,
  meshName: string
): GtMesh {
  // Ensure normals exist
  if (!geometry.getAttribute('normal')) {
    geometry.computeVertexNormals();
  }

  const prim = doc.createPrimitive().setMaterial(material);

  // Position
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  if (posAttr) {
    prim.setAttribute('POSITION',
      doc.createAccessor(meshName + '_pos')
        .setArray(new Float32Array(posAttr.array))
        .setType(Accessor.Type.VEC3)
        .setBuffer(buf)
    );
  }

  // Normal
  const normAttr = geometry.getAttribute('normal') as THREE.BufferAttribute;
  if (normAttr) {
    prim.setAttribute('NORMAL',
      doc.createAccessor(meshName + '_norm')
        .setArray(new Float32Array(normAttr.array))
        .setType(Accessor.Type.VEC3)
        .setBuffer(buf)
    );
  }

  // UV
  const uvAttr = geometry.getAttribute('uv') as THREE.BufferAttribute;
  if (uvAttr) {
    prim.setAttribute('TEXCOORD_0',
      doc.createAccessor(meshName + '_uv')
        .setArray(new Float32Array(uvAttr.array))
        .setType(Accessor.Type.VEC2)
        .setBuffer(buf)
    );
  }

  // Index
  const indexAttr = geometry.getIndex();
  if (indexAttr) {
    prim.setIndices(
      doc.createAccessor(meshName + '_idx')
        .setArray(new Uint16Array(indexAttr.array))
        .setType(Accessor.Type.SCALAR)
        .setBuffer(buf)
    );
  }

  return doc.createMesh(meshName).addPrimitive(prim);
}

/** Recursively convert a Three.js Object3D tree to gltf-transform nodes */
function bridgeNode(
  doc: Document,
  buf: GtBuffer,
  threeObj: THREE.Object3D,
  matCache: Map<THREE.Material, GtMaterial>,
  nodeMap: Map<string, GtNode>
): GtNode {
  const gtNode = doc.createNode(threeObj.name || undefined);

  // Transform
  gtNode.setTranslation([threeObj.position.x, threeObj.position.y, threeObj.position.z]);
  gtNode.setRotation([threeObj.quaternion.x, threeObj.quaternion.y, threeObj.quaternion.z, threeObj.quaternion.w]);
  gtNode.setScale([threeObj.scale.x, threeObj.scale.y, threeObj.scale.z]);

  // If it's a mesh, attach geometry
  if (threeObj instanceof THREE.Mesh) {
    const threeMat = threeObj.material as THREE.Material;
    const gtMat = bridgeMaterial(doc, threeMat, matCache);
    const gtMesh = bridgeGeometry(doc, buf, threeObj.geometry, gtMat, threeObj.name || 'mesh');
    gtNode.setMesh(gtMesh);
  }

  // Track node by name for animation targeting
  if (threeObj.name) {
    nodeMap.set(threeObj.name, gtNode);
  }

  // Recurse children
  for (const child of threeObj.children) {
    const childNode = bridgeNode(doc, buf, child, matCache, nodeMap);
    gtNode.addChild(childNode);
  }

  return gtNode;
}

/** Convert Three.js AnimationClips to gltf-transform animations */
function bridgeAnimations(
  doc: Document,
  buf: GtBuffer,
  clips: THREE.AnimationClip[],
  nodeMap: Map<string, GtNode>
): void {
  for (const clip of clips) {
    const anim = doc.createAnimation(clip.name);

    for (const track of clip.tracks) {
      // Parse track name: "Joint_Lid.quaternion" -> nodeName="Joint_Lid", property="quaternion"
      const dotIdx = track.name.lastIndexOf('.');
      const nodeName = track.name.substring(0, dotIdx);
      const property = track.name.substring(dotIdx + 1);

      const targetNode = nodeMap.get(nodeName);
      if (!targetNode) {
        console.warn(`Animation target "${nodeName}" not found, skipping track`);
        continue;
      }

      // Map Three.js property to glTF target path
      let targetPath: 'translation' | 'rotation' | 'scale';
      let valueType: typeof Accessor.Type.VEC3 | typeof Accessor.Type.VEC4;
      if (property === 'position') {
        targetPath = 'translation';
        valueType = Accessor.Type.VEC3;
      } else if (property === 'quaternion') {
        targetPath = 'rotation';
        valueType = Accessor.Type.VEC4;
      } else if (property === 'scale') {
        targetPath = 'scale';
        valueType = Accessor.Type.VEC3;
      } else {
        console.warn(`Unsupported animation property "${property}", skipping`);
        continue;
      }

      const inputAcc = doc.createAccessor(clip.name + '_' + nodeName + '_input')
        .setArray(new Float32Array(track.times))
        .setType(Accessor.Type.SCALAR)
        .setBuffer(buf);

      const outputAcc = doc.createAccessor(clip.name + '_' + nodeName + '_output')
        .setArray(new Float32Array(track.values))
        .setType(valueType)
        .setBuffer(buf);

      const sampler = doc.createAnimationSampler()
        .setInput(inputAcc)
        .setOutput(outputAcc)
        .setInterpolation('LINEAR');

      const channel = doc.createAnimationChannel()
        .setTargetNode(targetNode)
        .setTargetPath(targetPath)
        .setSampler(sampler);

      anim.addSampler(sampler);
      anim.addChannel(channel);
    }
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const [inputPath, outputPath] = process.argv.slice(2);

  if (!inputPath || !outputPath) {
    console.error('Usage: bun scripts/export-glb.ts <code-json-or-file> <output-path>');
    console.error('  <code-json-or-file>  Path to JSON response or .ts code file');
    console.error('  <output-path>        Where to write the .glb (e.g. war-assets/structures/ammo-crate.glb)');
    process.exit(1);
  }

  // Read input
  let code: string;
  const raw = readFileSync(inputPath, 'utf-8');

  if (inputPath.endsWith('.json')) {
    const json = JSON.parse(raw);
    code = json.code;
    if (!code) {
      console.error('No "code" field in JSON');
      process.exit(1);
    }
  } else {
    code = raw;
  }

  code = code.replace(/\r\n/g, '\n');

  console.log('Executing generated code...');

  // Build sandbox globals
  const globals = {
    createRoot, createPivot, createPart,
    capsuleGeo, cylinderGeo, boxGeo, sphereGeo, coneGeo, torusGeo, planeGeo,
    gameMaterial, basicMaterial, glassMaterial, lambertMaterial,
    rotationTrack, positionTrack, scaleTrack, createClip,
    spinAnimation, bobbingAnimation, idleBreathing,
    Math, console,
  };

  const globalNames = Object.keys(globals);
  const globalValues = Object.values(globals);

  const fn = new Function(
    ...globalNames,
    `${code}\nreturn { meta: typeof meta !== 'undefined' ? meta : {}, build, animate: typeof animate !== 'undefined' ? animate : null };`
  );

  const { meta, build, animate } = fn(...globalValues);

  console.log('Asset:', meta.name || 'Unknown', '| Category:', meta.category || 'prop');

  // Build the Three.js scene
  const root = build();
  const tris = countTriangles(root);
  console.log('Triangles:', tris);

  // Build animations
  let clips: THREE.AnimationClip[] = [];
  if (animate) {
    clips = animate(root) || [];
    console.log('Animations:', clips.length, clips.map((c: THREE.AnimationClip) => `${c.name} (${c.duration}s)`).join(', '));
  }

  // Bridge Three.js -> gltf-transform
  console.log('Serializing GLB via gltf-transform...');
  const doc = new Document();
  const buf = doc.createBuffer();
  const matCache = new Map<THREE.Material, GtMaterial>();
  const nodeMap = new Map<string, GtNode>();

  const rootNode = bridgeNode(doc, buf, root, matCache, nodeMap);
  const scene = doc.createScene(meta.name || 'Scene').addChild(rootNode);

  // Bridge animations
  if (clips.length > 0) {
    bridgeAnimations(doc, buf, clips, nodeMap);
  }

  // Write GLB
  const io = new NodeIO();
  const glbBytes = await io.writeBinary(doc);

  const outDir = path.dirname(outputPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outputPath, Buffer.from(glbBytes));

  console.log(`Written: ${outputPath} (${(glbBytes.byteLength / 1024).toFixed(1)} KB, ${tris} tris)`);
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
