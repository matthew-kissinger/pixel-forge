# GLB Primitives Reference

## Scene Building

### createRoot(name)
Creates the root Object3D for the asset.
```typescript
const root = createRoot('MyAsset');
return root;  // Always return from build()
```

### createPivot(name, position, parent?)
Creates an empty Object3D for animation joints.
```typescript
// Door hinge at left edge
const hinge = createPivot('Joint_DoorHinge', [-0.5, 1, 0], root);

// Wheel axle at center
const axle = createPivot('Joint_WheelAxle', [0, 0.3, 0], root);
```
- Name with `Joint_` prefix
- Position is [x, y, z] relative to parent
- This node gets animated, not its children

### createPart(name, geometry, material, options?)
Creates a visible Mesh and **automatically adds it to parent**.
```typescript
// CORRECT - createPart auto-adds to parent
createPart('Mesh_Door', boxGeo(1, 2, 0.1), gameMaterial(0x8b4513), {
  position: [0.5, 0, 0],       // Offset from parent
  rotation: [0, Math.PI/4, 0], // Radians
  scale: [1, 1, 1],
  parent: hingeJoint           // AUTO-ADDED to this!
});

// WRONG - DO NOT call .add() on the result!
// parent.add(createPart(...))  // This causes errors!
```
- Name with `Mesh_` prefix
- **CRITICAL**: Always use `parent` option - the mesh is auto-added
- Do NOT manually call `.add()` on the return value

---

## Geometry

All geometries are low-poly optimized for games.

### boxGeo(width, height, depth)
Axis-aligned box. Most versatile primitive.
```typescript
boxGeo(1, 2, 0.5)  // 1 wide, 2 tall, 0.5 deep
```

### sphereGeo(radius, widthSegments?, heightSegments?)
Defaults: 8 width, 6 height segments (~100 tris)
```typescript
sphereGeo(0.5)           // Low-poly sphere
sphereGeo(0.5, 16, 12)   // Smoother sphere
```

### cylinderGeo(radiusTop, radiusBottom, height, segments?)
Default: 8 segments. Use for wheels, pillars, limbs.
```typescript
cylinderGeo(0.3, 0.3, 1)      // Uniform cylinder
cylinderGeo(0, 0.5, 1)         // Cone (radiusTop = 0)
cylinderGeo(0.5, 0.3, 0.5)     // Tapered
```

### capsuleGeo(radius, height, segments?)
Cylinder with hemispherical caps. Great for limbs.
```typescript
capsuleGeo(0.1, 0.5)  // radius 0.1, total height ~0.7
```

### coneGeo(radius, height, segments?)
Point at top, flat base.
```typescript
coneGeo(0.5, 1)    // Base radius 0.5, height 1
coneGeo(1, 2, 4)   // 4 segments = pyramid
```

### torusGeo(radius, tube, radialSegments?, tubularSegments?)
Donut shape. Good for rings, halos.
```typescript
torusGeo(0.5, 0.1)         // Ring
torusGeo(1, 0.3, 6, 12)    // Chunky donut
```

---

## Materials

### gameMaterial(color, options?)
MeshStandardMaterial - PBR, responds to lighting.
```typescript
gameMaterial(0xff0000)  // Red, default roughness

gameMaterial(0x888888, {
  metalness: 0.8,        // 0-1, metal look
  roughness: 0.2,        // 0-1, shininess
  emissive: 0x440000,    // Glow color
  emissiveIntensity: 1,
  flatShading: true,     // Faceted look
  transparent: true,
  opacity: 0.5
})
```

### lambertMaterial(color, options?)
Faster, no specular highlights. Good for matte surfaces.
```typescript
lambertMaterial(0x228b22)  // Matte green
lambertMaterial(0xffffff, { flatShading: true })
```

### basicMaterial(color, options?)
Unlit - ignores lights. Good for glow effects, UI elements.
```typescript
basicMaterial(0xffff00)  // Always bright yellow
basicMaterial(0xffffff, { transparent: true, opacity: 0.3 })
```

---

## Animation

### Keyframe Tracks

All tracks target a joint by name. The name must match exactly.

#### rotationTrack(jointName, keyframes)
Rotation values in **degrees** (converted to quaternions internally).
```typescript
rotationTrack('Joint_Door', [
  { time: 0, rotation: [0, 0, 0] },
  { time: 0.5, rotation: [0, -45, 0] },
  { time: 1, rotation: [0, -90, 0] }
])
```

#### positionTrack(jointName, keyframes)
Position animation.
```typescript
positionTrack('Joint_Body', [
  { time: 0, position: [0, 1, 0] },
  { time: 1, position: [0, 1.05, 0] },
  { time: 2, position: [0, 1, 0] }
])
```

#### scaleTrack(jointName, keyframes)
Uniform or non-uniform scale.
```typescript
scaleTrack('Joint_Pulse', [
  { time: 0, scale: [1, 1, 1] },
  { time: 0.5, scale: [1.2, 1.2, 1.2] },
  { time: 1, scale: [1, 1, 1] }
])
```

### createClip(name, duration, tracks)
Combine tracks into an AnimationClip.
```typescript
createClip('Open', 1, [
  rotationTrack('Joint_Door', [...]),
  positionTrack('Joint_Handle', [...])
])
```

### Pre-built Animations

```typescript
// Continuous rotation
spinAnimation('Joint_Propeller', 2, 'y')  // 2 sec per rotation

// Vertical bobbing
bobbingAnimation('Root', 3, 0.1)  // 3 sec cycle, 0.1 height

// Subtle breathing for characters
idleBreathing('Joint_Body', 2, 0.02)  // 2 sec cycle
```

---

## Common Patterns

### Symmetry with Loop
```typescript
[-1, 1].forEach(side => {
  const name = side < 0 ? 'Left' : 'Right';
  const arm = createPivot(`Joint_${name}Arm`, [side * 0.3, 0.2, 0], body);
  createPart(`Mesh_${name}Arm`, capsuleGeo(0.05, 0.3), skinMat, {
    position: [0, -0.15, 0],
    parent: arm
  });
});
```

### Wheel Array
```typescript
const wheels = [
  [-0.7, 0.25, 0.5, 'FL'],
  [-0.7, 0.25, -0.5, 'FR'],
  [0.7, 0.25, 0.5, 'RL'],
  [0.7, 0.25, -0.5, 'RR']
];

wheels.forEach(([x, y, z, id]) => {
  const axle = createPivot(`Joint_Wheel${id}`, [x, y, z], root);
  createPart(`Mesh_Wheel${id}`, cylinderGeo(0.25, 0.25, 0.1), wheelMat, {
    rotation: [Math.PI/2, 0, 0],
    parent: axle
  });
});
```

### Stacked Shapes
```typescript
const layers = [
  { y: 1.8, r: 0.8, h: 1 },
  { y: 2.4, r: 0.6, h: 0.8 },
  { y: 2.9, r: 0.4, h: 0.6 }
];

layers.forEach((l, i) => {
  createPart(`Mesh_Layer${i}`, coneGeo(l.r, l.h, 6), mat, {
    position: [0, l.y, 0],
    parent: root
  });
});
```

### Reuse Materials
```typescript
const woodMat = gameMaterial(0x8b4513);
createPart('Mesh_Plank1', boxGeo(1, 0.1, 0.2), woodMat, {...});
createPart('Mesh_Plank2', boxGeo(1, 0.1, 0.2), woodMat, {...});
```
