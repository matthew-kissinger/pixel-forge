---
name: kiln-glb
description: Generate exportable 3D game assets (GLB) from text descriptions using Three.js primitives. Creates props, characters, vehicles, buildings.
---

# Kiln GLB - Exportable 3D Assets

Generate game-ready 3D models that export to GLB for Unity, Unreal, Godot.

## When to Use

- User requests an exportable 3D model
- Props, characters, vehicles, buildings, environment pieces
- Needs to work in game engines

## References

- `references/primitives.md` - Geometry, materials, animation API
- `references/examples.md` - Complete asset examples

## Output Structure

```typescript
const meta = { name: 'AssetName', category: 'prop' };

function build() {
  const root = createRoot('AssetName');
  // Build scene graph...
  return root;
}

function animate(root) {  // Optional
  return [createClip('Idle', 2, [tracks...])];
}
```

## Core Pattern: Pivot + Mesh

For animated parts, use two nodes:

1. **Pivot** (`Joint_*`) - Empty Object3D at the rotation point
2. **Mesh** (`Mesh_*`) - Geometry as child, offset from pivot

```
Joint_DoorHinge (at left edge)
  └── Mesh_Door (offset so hinge works)

Joint_WheelAxle (at center)
  └── Mesh_Wheel (centered on pivot)
```

**Rule**: Animate pivots, never meshes. Track names must match pivot names exactly.

## Primitives Quick Reference

```typescript
// Scene
createRoot(name)
createPivot(name, [x,y,z], parent?)
createPart(name, geo, mat, { position?, rotation?, scale?, parent })
  // CRITICAL: createPart AUTO-ADDS to parent - DO NOT call .add() on result!
  // WRONG: root.add(createPart(...))
  // RIGHT: createPart("Name", geo, mat, { parent: root })

// Geometry (low-poly defaults)
boxGeo(w, h, d)
sphereGeo(r, wSeg=8, hSeg=6)
cylinderGeo(rTop, rBot, h, seg=8)
capsuleGeo(r, h, seg=6)
coneGeo(r, h, seg=8)
torusGeo(r, tube, rSeg=8, tSeg=12)

// Materials
gameMaterial(0xcolor, { metalness?, roughness?, emissive?, flatShading? })
lambertMaterial(0xcolor, { flatShading? })
basicMaterial(0xcolor, { transparent?, opacity? })

// Animation
rotationTrack(joint, [{time, rotation: [x,y,z]}])  // degrees
positionTrack(joint, [{time, position: [x,y,z]}])
scaleTrack(joint, [{time, scale: [x,y,z]}])
createClip(name, duration, tracks)
spinAnimation(joint, duration, axis)
bobbingAnimation(root, duration, height)
idleBreathing(joint, duration, amount)
```

## Quick Example

```typescript
const meta = { name: 'SpinningCrystal', category: 'prop' };

function build() {
  const root = createRoot('SpinningCrystal');
  const spin = createPivot('Joint_Spin', [0, 0.5, 0], root);

  const crystalMat = gameMaterial(0x00ffff, { emissive: 0x004444 });
  createPart('Mesh_Top', coneGeo(0.3, 0.5, 6), crystalMat, {
    position: [0, 0.25, 0],
    parent: spin
  });
  createPart('Mesh_Bottom', coneGeo(0.3, 0.5, 6), crystalMat, {
    position: [0, -0.25, 0],
    rotation: [Math.PI, 0, 0],
    parent: spin
  });

  return root;
}

function animate(root) {
  return [spinAnimation('Joint_Spin', 3, 'y')];
}
```

## Triangle Budgets

| Category | Max Tris | Max Materials |
|----------|----------|---------------|
| prop | 2,000 | 4 |
| character | 5,000 | 5 |
| vfx | 1,000 | 2 |
| environment | 10,000 | 8 |

## GLB Export Compatibility

Materials that export correctly:
- `gameMaterial` (MeshStandardMaterial) - **RECOMMENDED** - full PBR support
- `basicMaterial` (MeshBasicMaterial) - unlit, exports as unlit extension
- `lambertMaterial` - converts to standard material on export

PBR properties that export:
- color, metalness, roughness, emissive
- transparent, opacity
- flatShading

NOT supported in GLB:
- Custom shaders (use TSL mode for viewport-only effects)
- Vertex colors (use materials instead)

## Mesh Types

All geometries export correctly:
- Box, Sphere, Cylinder, Cone, Capsule, Torus
- LatheGeometry, ExtrudeGeometry (if using advanced shapes)

Scene graph exports fully:
- Object3D hierarchy preserved
- Mesh positions, rotations, scales
- AnimationClips with tracks

## Rules

1. **NO IMPORTS, NO EXPORTS**: Code runs in sandbox, just define meta/build/animate
2. **createPart AUTO-ADDS**: Never call `.add()` on createPart result - use `parent` option
3. **Animations loop**: End values = start values
4. **Colors as hex**: `0xff0000` not `"#ff0000"`
5. **Y-up**: Ground at Y=0
6. **Animate pivots only**: Only `Joint_*` nodes
7. **Match names**: Track names = pivot names (e.g., `Joint_Lid`)
8. **Output code only**: No markdown, no explanation
9. **Use gameMaterial**: Best GLB compatibility
10. **Animation keyframes**: Use `rotation: [x,y,z]` NOT `value: [x,y,z]`
