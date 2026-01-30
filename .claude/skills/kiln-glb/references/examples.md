# GLB Complete Examples

## Props

### Hinged Door
```typescript
const meta = { name: 'WoodenDoor', category: 'prop' };

function build() {
  const root = createRoot('WoodenDoor');

  // Frame
  createPart('Mesh_Frame', boxGeo(1.2, 2.2, 0.1), gameMaterial(0x654321), { parent: root });

  // Door - pivot at left edge
  const hinge = createPivot('Joint_Hinge', [-0.5, 0, 0.06], root);
  createPart('Mesh_Door', boxGeo(0.9, 2, 0.08), gameMaterial(0x8b4513), {
    position: [0.45, 1, 0],  // Offset right so hinge at edge
    parent: hinge
  });

  // Handle
  createPart('Mesh_Handle', sphereGeo(0.04), gameMaterial(0xffd700), {
    position: [0.35, 1, 0.06],
    parent: hinge
  });

  return root;
}

function animate(root) {
  return [
    createClip('Open', 1, [
      rotationTrack('Joint_Hinge', [
        { time: 0, rotation: [0, 0, 0] },
        { time: 1, rotation: [0, -90, 0] }
      ])
    ])
  ];
}
```

### Glowing Crystal
```typescript
const meta = { name: 'MagicCrystal', category: 'prop' };

function build() {
  const root = createRoot('MagicCrystal');
  const spin = createPivot('Joint_Spin', [0, 0.5, 0], root);

  const crystalMat = gameMaterial(0x00ffff, { emissive: 0x003333 });

  // Double cone crystal
  createPart('Mesh_Top', coneGeo(0.3, 0.5, 6), crystalMat, {
    position: [0, 0.25, 0],
    parent: spin
  });
  createPart('Mesh_Bottom', coneGeo(0.3, 0.5, 6), crystalMat, {
    position: [0, -0.25, 0],
    rotation: [Math.PI, 0, 0],
    parent: spin
  });

  // Orbiting particles
  const orbMat = gameMaterial(0xffff00, { emissive: 0xffff00 });
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    createPart(`Mesh_Orb${i}`, sphereGeo(0.06), orbMat, {
      position: [Math.cos(angle) * 0.5, 0, Math.sin(angle) * 0.5],
      parent: spin
    });
  }

  return root;
}

function animate(root) {
  return [spinAnimation('Joint_Spin', 3, 'y')];
}
```

### Treasure Chest
```typescript
const meta = { name: 'TreasureChest', category: 'prop' };

function build() {
  const root = createRoot('TreasureChest');
  const woodMat = gameMaterial(0x8b4513);
  const metalMat = gameMaterial(0xffd700, { metalness: 0.8 });

  // Base
  createPart('Mesh_Base', boxGeo(0.8, 0.4, 0.5), woodMat, {
    position: [0, 0.2, 0],
    parent: root
  });

  // Lid hinge at back edge
  const lidHinge = createPivot('Joint_Lid', [0, 0.4, -0.25], root);
  createPart('Mesh_Lid', boxGeo(0.8, 0.1, 0.5), woodMat, {
    position: [0, 0.05, 0.25],
    parent: lidHinge
  });

  // Metal bands
  createPart('Mesh_Band1', boxGeo(0.85, 0.05, 0.52), metalMat, {
    position: [0, 0.15, 0],
    parent: root
  });

  // Lock
  createPart('Mesh_Lock', boxGeo(0.1, 0.1, 0.05), metalMat, {
    position: [0, 0.35, 0.28],
    parent: root
  });

  return root;
}

function animate(root) {
  return [
    createClip('Open', 1.5, [
      rotationTrack('Joint_Lid', [
        { time: 0, rotation: [0, 0, 0] },
        { time: 1.5, rotation: [-110, 0, 0] }
      ])
    ])
  ];
}
```

---

## Vehicles

### Simple Car
```typescript
const meta = { name: 'SimpleCar', category: 'prop' };

function build() {
  const root = createRoot('SimpleCar');
  const bodyMat = gameMaterial(0xff0000);
  const glassMat = gameMaterial(0x333333, { metalness: 0.3 });
  const wheelMat = gameMaterial(0x222222);

  // Body
  createPart('Mesh_Body', boxGeo(2, 0.5, 1), bodyMat, {
    position: [0, 0.5, 0],
    parent: root
  });

  // Cabin
  createPart('Mesh_Cabin', boxGeo(1, 0.4, 0.9), glassMat, {
    position: [0.2, 0.95, 0],
    parent: root
  });

  // Wheels
  const wheels = [
    [-0.7, 0.25, 0.55, 'FL'],
    [-0.7, 0.25, -0.55, 'FR'],
    [0.7, 0.25, 0.55, 'RL'],
    [0.7, 0.25, -0.55, 'RR']
  ];

  wheels.forEach(([x, y, z, id]) => {
    const axle = createPivot(`Joint_Wheel${id}`, [x, y, z], root);
    createPart(`Mesh_Wheel${id}`, cylinderGeo(0.25, 0.25, 0.1, 12), wheelMat, {
      rotation: [Math.PI/2, 0, 0],
      parent: axle
    });
  });

  return root;
}

function animate(root) {
  const wheelNames = ['Joint_WheelFL', 'Joint_WheelFR', 'Joint_WheelRL', 'Joint_WheelRR'];
  const tracks = wheelNames.map(name =>
    rotationTrack(name, [
      { time: 0, rotation: [0, 0, 0] },
      { time: 1, rotation: [0, 0, 360] }
    ])
  );
  return [createClip('Drive', 1, tracks)];
}
```

---

## Characters

### Blocky Character
```typescript
const meta = { name: 'BlockyGuy', category: 'character' };

function build() {
  const root = createRoot('BlockyGuy');
  const skin = gameMaterial(0xffcc99);
  const shirt = gameMaterial(0x4466aa);
  const pants = gameMaterial(0x333333);

  // Body at y=1 (feet at y=0)
  const body = createPivot('Joint_Body', [0, 1, 0], root);
  createPart('Mesh_Torso', boxGeo(0.4, 0.5, 0.25), shirt, { parent: body });

  // Head
  const head = createPivot('Joint_Head', [0, 0.35, 0], body);
  createPart('Mesh_Head', boxGeo(0.3, 0.3, 0.3), skin, { parent: head });

  // Arms
  [-1, 1].forEach(side => {
    const name = side < 0 ? 'Left' : 'Right';
    const shoulder = createPivot(`Joint_${name}Shoulder`, [side * 0.28, 0.15, 0], body);
    createPart(`Mesh_${name}Arm`, boxGeo(0.12, 0.4, 0.12), skin, {
      position: [0, -0.2, 0],
      parent: shoulder
    });
  });

  // Legs
  [-1, 1].forEach(side => {
    const name = side < 0 ? 'Left' : 'Right';
    const hip = createPivot(`Joint_${name}Hip`, [side * 0.1, -0.3, 0], body);
    createPart(`Mesh_${name}Leg`, boxGeo(0.14, 0.5, 0.14), pants, {
      position: [0, -0.25, 0],
      parent: hip
    });
  });

  return root;
}

function animate(root) {
  return [
    createClip('Idle', 2, [
      positionTrack('Joint_Body', [
        { time: 0, position: [0, 1, 0] },
        { time: 1, position: [0, 1.02, 0] },
        { time: 2, position: [0, 1, 0] }
      ])
    ]),
    createClip('Walk', 1, [
      rotationTrack('Joint_LeftHip', [
        { time: 0, rotation: [30, 0, 0] },
        { time: 0.5, rotation: [-30, 0, 0] },
        { time: 1, rotation: [30, 0, 0] }
      ]),
      rotationTrack('Joint_RightHip', [
        { time: 0, rotation: [-30, 0, 0] },
        { time: 0.5, rotation: [30, 0, 0] },
        { time: 1, rotation: [-30, 0, 0] }
      ]),
      rotationTrack('Joint_LeftShoulder', [
        { time: 0, rotation: [-20, 0, 0] },
        { time: 0.5, rotation: [20, 0, 0] },
        { time: 1, rotation: [-20, 0, 0] }
      ]),
      rotationTrack('Joint_RightShoulder', [
        { time: 0, rotation: [20, 0, 0] },
        { time: 0.5, rotation: [-20, 0, 0] },
        { time: 1, rotation: [20, 0, 0] }
      ])
    ])
  ];
}
```

---

## Environment

### Small House
```typescript
const meta = { name: 'SmallHouse', category: 'environment' };

function build() {
  const root = createRoot('SmallHouse');
  const wallMat = gameMaterial(0xd4a373);
  const roofMat = gameMaterial(0x8b4513);
  const doorMat = gameMaterial(0x654321);
  const glassMat = gameMaterial(0x87ceeb, { transparent: true, opacity: 0.5 });

  // Walls
  createPart('Mesh_Walls', boxGeo(4, 3, 4), wallMat, { parent: root });

  // Roof
  createPart('Mesh_Roof', coneGeo(3.5, 1.5, 4), roofMat, {
    position: [0, 2.25, 0],
    parent: root
  });

  // Door with hinge
  const doorHinge = createPivot('Joint_Door', [-1.5, 0, 2.01], root);
  createPart('Mesh_Door', boxGeo(1, 2, 0.1), doorMat, {
    position: [0.5, 1, 0],
    parent: doorHinge
  });

  // Windows
  createPart('Mesh_Window1', boxGeo(0.8, 0.8, 0.1), glassMat, {
    position: [1, 1.5, 2.01],
    parent: root
  });
  createPart('Mesh_Window2', boxGeo(0.8, 0.8, 0.1), glassMat, {
    position: [-2.01, 1.5, 0],
    rotation: [0, Math.PI/2, 0],
    parent: root
  });

  return root;
}

function animate(root) {
  return [
    createClip('DoorOpen', 1, [
      rotationTrack('Joint_Door', [
        { time: 0, rotation: [0, 0, 0] },
        { time: 1, rotation: [0, -90, 0] }
      ])
    ])
  ];
}
```

### Low-Poly Tree
```typescript
const meta = { name: 'LowPolyTree', category: 'environment' };

function build() {
  const root = createRoot('LowPolyTree');
  const trunkMat = gameMaterial(0x8b4513);
  const foliageMat = gameMaterial(0x228b22, { flatShading: true });

  // Trunk
  createPart('Mesh_Trunk', cylinderGeo(0.15, 0.2, 1.5, 6), trunkMat, {
    position: [0, 0.75, 0],
    parent: root
  });

  // Stacked cone foliage
  const layers = [
    { y: 1.8, r: 0.8, h: 1 },
    { y: 2.4, r: 0.6, h: 0.8 },
    { y: 2.9, r: 0.4, h: 0.6 }
  ];

  layers.forEach((l, i) => {
    createPart(`Mesh_Foliage${i}`, coneGeo(l.r, l.h, 6), foliageMat, {
      position: [0, l.y, 0],
      parent: root
    });
  });

  return root;
}
```

### Rock Formation
```typescript
const meta = { name: 'RockFormation', category: 'environment' };

function build() {
  const root = createRoot('RockFormation');
  const rockMat = gameMaterial(0x808080, { flatShading: true });

  // Main rock
  createPart('Mesh_Rock1', sphereGeo(0.5, 5, 4), rockMat, {
    position: [0, 0.3, 0],
    scale: [1, 0.7, 1],
    parent: root
  });

  // Secondary rocks
  createPart('Mesh_Rock2', sphereGeo(0.3, 4, 3), rockMat, {
    position: [0.4, 0.15, 0.2],
    scale: [1, 0.8, 0.9],
    parent: root
  });

  createPart('Mesh_Rock3', sphereGeo(0.25, 4, 3), rockMat, {
    position: [-0.3, 0.1, -0.1],
    scale: [0.9, 0.6, 1],
    parent: root
  });

  return root;
}
```
