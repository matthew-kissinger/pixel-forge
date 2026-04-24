---
name: kiln-glb
description: Use this skill when generating exportable 3D game assets (GLB files) from text descriptions using Three.js primitives. Trigger on keywords "generate 3D", "make GLB", "3D model", "3D asset", "Three.js primitives", "kiln", or when the user asks to create a prop, character, vehicle, building, weapon, or environment piece as an engine-compatible 3D model for Unity, Unreal, or Godot. Also trigger when running `scripts/export-glb.ts`, writing code that uses `createRoot`/`createPivot`/`createPart`, or producing animated pivot-based scene graphs.
allowed-tools: Read, Write, Bash, Glob, Grep
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
cylinderGeo(rTop, rBot, h, seg=8)                    // Y-axis (default)
cylinderXGeo / cylinderYGeo / cylinderZGeo           // X/Y/Z explicit (Y is alias)
capsuleGeo(r, h, seg=6)                              // Y-axis (default)
capsuleXGeo / capsuleYGeo / capsuleZGeo              // X/Y/Z explicit (Y is alias)
coneGeo(r, h, seg=8)                                 // Y-axis (default)
coneXGeo / coneYGeo / coneZGeo                       // X/Y/Z explicit (Y is alias)
torusGeo(r, tube, rSeg=8, tSeg=12)

// Surface attachment helpers (prefer these over raw transforms)
beamBetween(name, [x1,y1,z1], [x2,y2,z2], radius)    // throws on zero-length
decalBox(width, height, depth=0.01)                  // THE correct primitive for
                                                      // solid-color decals (red stars,
                                                      // hull numbers, stamps, ARVN
                                                      // markings, unpainted windows)
planeGeo(width, height)                              // textured signs / billboards only

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
11. **Decals = `decalBox`, never `planeGeo`**: unless you actually have a texture.
12. **Attachment is mandatory**: visually-connected parts must overlap by ≥ `0.02` units. Floating parts are invalid even if every named part is present.

## Validator-driven retries

The render pipeline now runs `inspectSceneStructure` on every GLB it produces
and pushes two classes of warning back into the retry loop:

- **`Stray plane at origin: <name>`** — a 2-triangle `PlaneGeometry` mesh is sitting near world origin with no surface behind it. Fix: swap the `planeGeo` call for `decalBox(w, h)` AND position/rotate the part onto the target surface (fuselage, hull, door).
- **`Floating parts: <mesh-names>`** — one or more meshes have bounding boxes that do not overlap any sibling within tolerance `0.02`. Fix: extend geometry into contact, reposition the pivot, or delete the dangling piece.

## The harness speaks back to you

When a generation attempt fails, the batch harness (`scripts/_direct-batch.ts`)
embeds the exact runtime error text and your previous code into the next
user turn. Do NOT re-emit identical code on retry — read the feedback, fix
the specific call site, and output the corrected full program.

Common feedback patterns:

- `cylinderYGeo is not defined` → outdated; aliases are now registered. Use either form.
- `beamBetween("...") zero-length` → pick distinct endpoints or switch to `cylinderGeo` with explicit length.
- `Stray plane at origin: Mesh_RedStar` → replace `planeGeo(0.3, 0.3)` with `decalBox(0.3, 0.3)` and `position` it onto the fuselage.
- `Floating parts: Mesh_Bow` → the bow's bbox doesn't touch the hull. Extend Z or snap the pivot into the hull.
