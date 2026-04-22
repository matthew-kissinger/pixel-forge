/**
 * Starter code templates for new assets.
 *
 * Pure string builders - no runtime dependencies. Lives next to the
 * runtime so editor code that touches both stays close.
 */

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
