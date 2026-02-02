const meta = { name: "Dragon Breathing Fire", category: "prop" };

function build() {
  const root = createRoot("dragon");

  // Body
  const body = createPart(
    "body",
    boxGeo(1.2, 0.8, 1.6),
    gameMaterial(0x8b0000, { metalness: 0.1, roughness: 0.9, flatShading: true }),
    { position: [0, 1.2, 0], parent: root }
  );

  // Neck
  const neck = createPart(
    "neck",
    cylinderGeo(0.3, 0.4, 0.8, 6),
    gameMaterial(0x8b0000, { metalness: 0.1, roughness: 0.9, flatShading: true }),
    { position: [0, 1.8, 0.5], rotation: [0.3, 0, 0], parent: root }
  );

  // Head
  const head = createPart(
    "head",
    boxGeo(0.6, 0.5, 0.7),
    gameMaterial(0xa52a2a, { metalness: 0.1, roughness: 0.9, flatShading: true }),
    { position: [0, 2.4, 0.8], parent: root }
  );

  // Snout
  const snout = createPart(
    "snout",
    boxGeo(0.4, 0.3, 0.5),
    gameMaterial(0xa52a2a, { metalness: 0.1, roughness: 0.9, flatShading: true }),
    { position: [0, 2.35, 1.25], parent: root }
  );

  // Eyes
  createPart(
    "eyeL",
    sphereGeo(0.08, 6, 6),
    gameMaterial(0xffff00, { metalness: 0.3, roughness: 0.5, emissive: 0xffff00, flatShading: true }),
    { position: [-0.2, 2.5, 1.0], parent: root }
  );

  createPart(
    "eyeR",
    sphereGeo(0.08, 6, 6),
    gameMaterial(0xffff00, { metalness: 0.3, roughness: 0.5, emissive: 0xffff00, flatShading: true }),
    { position: [0.2, 2.5, 1.0], parent: root }
  );

  // Horns
  createPart(
    "hornL",
    coneGeo(0.1, 0.4, 6),
    gameMaterial(0x2f2f2f, { metalness: 0.3, roughness: 0.7, flatShading: true }),
    { position: [-0.25, 2.75, 0.7], rotation: [-0.3, 0, -0.2], parent: root }
  );

  createPart(
    "hornR",
    coneGeo(0.1, 0.4, 6),
    gameMaterial(0x2f2f2f, { metalness: 0.3, roughness: 0.7, flatShading: true }),
    { position: [0.25, 2.75, 0.7], rotation: [-0.3, 0, 0.2], parent: root }
  );

  // Tail
  const tailBase = createPivot("tailBase", [0, 1.2, -0.8], root);
  createPart(
    "tail",
    cylinderGeo(0.2, 0.35, 1.2, 6),
    gameMaterial(0x8b0000, { metalness: 0.1, roughness: 0.9, flatShading: true }),
    { position: [0, 0, -0.6], rotation: [0.6, 0, 0], parent: tailBase }
  );

  createPart(
    "tailTip",
    coneGeo(0.2, 0.4, 6),
    gameMaterial(0xa52a2a, { metalness: 0.1, roughness: 0.9, flatShading: true }),
    { position: [0, 0, -1.3], rotation: [0.6, 0, 0], parent: tailBase }
  );

  // Wings
  const wingL = createPivot("wingL", [-0.6, 1.5, 0.2], root);
  createPart(
    "wingArmL",
    boxGeo(0.8, 0.1, 0.15),
    gameMaterial(0x4a0000, { metalness: 0.2, roughness: 0.8, flatShading: true }),
    { position: [-0.4, 0, 0], rotation: [0, 0, 0.4], parent: wingL }
  );

  createPart(
    "wingMembraneL",
    boxGeo(0.7, 0.05, 0.9),
    gameMaterial(0x6b0000, { metalness: 0.1, roughness: 0.7, flatShading: true }),
    { position: [-0.5, -0.45, 0], rotation: [0, 0, 0.4], parent: wingL }
  );

  const wingR = createPivot("wingR", [0.6, 1.5, 0.2], root);
  createPart(
    "wingArmR",
    boxGeo(0.8, 0.1, 0.15),
    gameMaterial(0x4a0000, { metalness: 0.2, roughness: 0.8, flatShading: true }),
    { position: [0.4, 0, 0], rotation: [0, 0, -0.4], parent: wingR }
  );

  createPart(
    "wingMembraneR",
    boxGeo(0.7, 0.05, 0.9),
    gameMaterial(0x6b0000, { metalness: 0.1, roughness: 0.7, flatShading: true }),
    { position: [0.5, -0.45, 0], rotation: [0, 0, -0.4], parent: wingR }
  );

  // Legs
  createPart(
    "legFL",
    cylinderGeo(0.15, 0.15, 0.6, 6),
    gameMaterial(0x8b0000, { metalness: 0.1, roughness: 0.9, flatShading: true }),
    { position: [-0.4, 0.6, 0.5], parent: root }
  );

  createPart(
    "legFR",
    cylinderGeo(0.15, 0.15, 0.6, 6),
    gameMaterial(0x8b0000, { metalness: 0.1, roughness: 0.9, flatShading: true }),
    { position: [0.4, 0.6, 0.5], parent: root }
  );

  createPart(
    "legBL",
    cylinderGeo(0.15, 0.15, 0.6, 6),
    gameMaterial(0x8b0000, { metalness: 0.1, roughness: 0.9, flatShading: true }),
    { position: [-0.4, 0.6, -0.4], parent: root }
  );

  createPart(
    "legBR",
    cylinderGeo(0.15, 0.15, 0.6, 6),
    gameMaterial(0x8b0000, { metalness: 0.1, roughness: 0.9, flatShading: true }),
    { position: [0.4, 0.6, -0.4], parent: root }
  );

  // Fire breath
  const fireBase = createPivot("fireBase", [0, 2.35, 1.5], root);

  createPart(
    "fire1",
    coneGeo(0.15, 0.4, 6),
    gameMaterial(0xff4500, { metalness: 0.0, roughness: 0.3, emissive: 0xff4500, flatShading: true }),
    { position: [0, 0, 0.2], rotation: [1.57, 0, 0], parent: fireBase }
  );

  createPart(
    "fire2",
    coneGeo(0.12, 0.35, 6),
    gameMaterial(0xff6b00, { metalness: 0.0, roughness: 0.3, emissive: 0xff6b00, flatShading: true }),
    { position: [0, 0, 0.5], rotation: [1.57, 0, 0], parent: fireBase }
  );

  createPart(
    "fire3",
    coneGeo(0.08, 0.3, 6),
    gameMaterial(0xffa500, { metalness: 0.0, roughness: 0.3, emissive: 0xffa500, flatShading: true }),
    { position: [0, 0, 0.75], rotation: [1.57, 0, 0], parent: fireBase }
  );

  return root;
}

function animate(root) {
  const tailBase = root.getObjectByName("tailBase");
  const wingL = root.getObjectByName("wingL");
  const wingR = root.getObjectByName("wingR");
  const fireBase = root.getObjectByName("fireBase");

  // Tail sway
  const tailTrack = rotationTrack(tailBase, [
    { time: 0, value: [0, -0.3, 0] },
    { time: 1, value: [0, 0.3, 0] },
    { time: 2, value: [0, -0.3, 0] }
  ]);

  // Wing flap
  const wingLTrack = rotationTrack(wingL, [
    { time: 0, value: [0, 0, 0.4] },
    { time: 0.3, value: [0, 0, 0.8] },
    { time: 0.6, value: [0, 0, 0.4] }
  ]);

  const wingRTrack = rotationTrack(wingR, [
    { time: 0, value: [0, 0, -0.4] },
    { time: 0.3, value: [0, 0, -0.8] },
    { time: 0.6, value: [0, 0, -0.4] }
  ]);

  // Fire flicker
  const fireTrack = positionTrack(fireBase, [
    { time: 0, value: [0, 2.35, 1.5] },
    { time: 0.1, value: [0.05, 2.35, 1.55] },
    { time: 0.2, value: [-0.05, 2.35, 1.5] },
    { time: 0.3, value: [0, 2.35, 1.5] }
  ]);

  const clip = createClip("dragonAction", [tailTrack, wingLTrack, wingRTrack, fireTrack]);
  return clip;
}

export { meta, build, animate };
