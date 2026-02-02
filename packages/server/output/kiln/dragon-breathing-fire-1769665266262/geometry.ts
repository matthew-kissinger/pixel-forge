const meta = { name: "Dragon Breathing Fire", category: "prop" };

function build() {
  const root = createRoot("dragon");

  // Body
  const body = createPivot("body", [0, 1.2, 0], root);
  createPart("torso", sphereGeo(0.8, 6, 6), gameMaterial(0x8b4513, { flatShading: true }), { parent: body, scale: [1, 1.2, 0.8] });

  // Neck
  const neck = createPivot("neck", [0, 0.6, 0.3], body);
  createPart("neckBase", cylinderGeo(0.3, 0.4, 0.8, 6), gameMaterial(0x8b4513, { flatShading: true }), { parent: neck, rotation: [0.3, 0, 0] });

  // Head
  const head = createPivot("head", [0, 0.8, 0.2], neck);
  createPart("skull", boxGeo(0.6, 0.5, 0.7), gameMaterial(0x8b4513, { flatShading: true }), { parent: head, position: [0, 0, 0.1] });
  createPart("snout", coneGeo(0.3, 0.5, 6), gameMaterial(0x7a3d0f, { flatShading: true }), { parent: head, position: [0, -0.1, 0.6], rotation: [Math.PI / 2, 0, 0] });

  // Eyes
  createPart("eyeL", sphereGeo(0.1, 6, 6), gameMaterial(0xff0000, { emissive: 0xff0000, flatShading: true }), { parent: head, position: [-0.2, 0.15, 0.3] });
  createPart("eyeR", sphereGeo(0.1, 6, 6), gameMaterial(0xff0000, { emissive: 0xff0000, flatShading: true }), { parent: head, position: [0.2, 0.15, 0.3] });

  // Horns
  createPart("hornL", coneGeo(0.1, 0.4, 6), gameMaterial(0x4a2511, { flatShading: true }), { parent: head, position: [-0.25, 0.35, -0.1], rotation: [-0.5, 0, -0.3] });
  createPart("hornR", coneGeo(0.1, 0.4, 6), gameMaterial(0x4a2511, { flatShading: true }), { parent: head, position: [0.25, 0.35, -0.1], rotation: [-0.5, 0, 0.3] });

  // Wings
  const wingL = createPivot("wingL", [-0.7, 0.3, -0.2], body);
  createPart("wingArmL", boxGeo(0.8, 0.1, 0.1), gameMaterial(0x6b3410, { flatShading: true }), { parent: wingL, position: [-0.4, 0, 0], rotation: [0, 0, 0.6] });
  createPart("wingMembraneL", boxGeo(0.6, 0.01, 0.8), gameMaterial(0x8b0000, { flatShading: true }), { parent: wingL, position: [-0.5, -0.2, 0], rotation: [0, 0, 0.4] });

  const wingR = createPivot("wingR", [0.7, 0.3, -0.2], body);
  createPart("wingArmR", boxGeo(0.8, 0.1, 0.1), gameMaterial(0x6b3410, { flatShading: true }), { parent: wingR, position: [0.4, 0, 0], rotation: [0, 0, -0.6] });
  createPart("wingMembraneR", boxGeo(0.6, 0.01, 0.8), gameMaterial(0x8b0000, { flatShading: true }), { parent: wingR, position: [0.5, -0.2, 0], rotation: [0, 0, -0.4] });

  // Tail
  const tail = createPivot("tail", [0, -0.4, -0.7], body);
  createPart("tailBase", cylinderGeo(0.25, 0.15, 1.0, 6), gameMaterial(0x8b4513, { flatShading: true }), { parent: tail, rotation: [0.8, 0, 0] });
  createPart("tailTip", coneGeo(0.2, 0.4, 6), gameMaterial(0x7a3d0f, { flatShading: true }), { parent: tail, position: [0, -0.3, -0.5], rotation: [0.8, 0, 0] });

  // Legs
  const legFL = createPivot("legFL", [-0.4, -0.3, 0.3], body);
  createPart("thighFL", cylinderGeo(0.2, 0.2, 0.5, 6), gameMaterial(0x8b4513, { flatShading: true }), { parent: legFL });
  createPart("footFL", boxGeo(0.15, 0.1, 0.2), gameMaterial(0x4a2511, { flatShading: true }), { parent: legFL, position: [0, -0.35, 0.05] });

  const legFR = createPivot("legFR", [0.4, -0.3, 0.3], body);
  createPart("thighFR", cylinderGeo(0.2, 0.2, 0.5, 6), gameMaterial(0x8b4513, { flatShading: true }), { parent: legFR });
  createPart("footFR", boxGeo(0.15, 0.1, 0.2), gameMaterial(0x4a2511, { flatShading: true }), { parent: legFR, position: [0, -0.35, 0.05] });

  const legBL = createPivot("legBL", [-0.4, -0.3, -0.4], body);
  createPart("thighBL", cylinderGeo(0.22, 0.22, 0.6, 6), gameMaterial(0x8b4513, { flatShading: true }), { parent: legBL });
  createPart("footBL", boxGeo(0.15, 0.1, 0.2), gameMaterial(0x4a2511, { flatShading: true }), { parent: legBL, position: [0, -0.4, 0.05] });

  const legBR = createPivot("legBR", [0.4, -0.3, -0.4], body);
  createPart("thighBR", cylinderGeo(0.22, 0.22, 0.6, 6), gameMaterial(0x8b4513, { flatShading: true }), { parent: legBR });
  createPart("footBR", boxGeo(0.15, 0.1, 0.2), gameMaterial(0x4a2511, { flatShading: true }), { parent: legBR, position: [0, -0.4, 0.05] });

  // Fire breath
  const fire = createPivot("fire", [0, -0.1, 0.9], head);
  createPart("flame1", coneGeo(0.15, 0.4, 6), gameMaterial(0xff4500, { emissive: 0xff4500, flatShading: true }), { parent: fire, rotation: [Math.PI / 2, 0, 0] });
  createPart("flame2", coneGeo(0.12, 0.3, 6), gameMaterial(0xff6600, { emissive: 0xff6600, flatShading: true }), { parent: fire, position: [0, 0, 0.25], rotation: [Math.PI / 2, 0, 0] });
  createPart("flame3", coneGeo(0.08, 0.2, 6), gameMaterial(0xffff00, { emissive: 0xffff00, flatShading: true }), { parent: fire, position: [0, 0, 0.45], rotation: [Math.PI / 2, 0, 0] });

  return root;
}

function animate(root) {
  const body = root.getObjectByName("body");
  const neck = root.getObjectByName("neck");
  const wingL = root.getObjectByName("wingL");
  const wingR = root.getObjectByName("wingR");
  const tail = root.getObjectByName("tail");
  const fire = root.getObjectByName("fire");

  // Bobbing animation
  const bobbingClip = createClip("bobbing", [
    positionTrack(body, [
      [0, [0, 1.2, 0]],
      [1, [0, 1.3, 0]],
      [2, [0, 1.2, 0]]
    ])
  ], 2);

  // Neck breathing motion
  const breathClip = createClip("breath", [
    rotationTrack(neck, [
      [0, [0.3, 0, 0]],
      [0.5, [0.4, 0, 0]],
      [1, [0.3, 0, 0]]
    ])
  ], 1);

  // Wing flapping
  const flapClip = createClip("flap", [
    rotationTrack(wingL, [
      [0, [0, 0, 0]],
      [0.3, [0, 0, 0.4]],
      [0.6, [0, 0, 0]]
    ]),
    rotationTrack(wingR, [
      [0, [0, 0, 0]],
      [0.3, [0, 0, -0.4]],
      [0.6, [0, 0, 0]]
    ])
  ], 0.6);

  // Tail swaying
  const tailClip = createClip("tailSwing", [
    rotationTrack(tail, [
      [0, [0.8, -0.2, 0]],
      [1, [0.8, 0.2, 0]],
      [2, [0.8, -0.2, 0]]
    ])
  ], 2);

  // Fire flickering
  const fireClip = createClip("fireFlicker", [
    positionTrack(fire, [
      [0, [0, -0.1, 0.9]],
      [0.1, [0.02, -0.1, 0.95]],
      [0.2, [0, -0.1, 0.9]],
      [0.3, [-0.02, -0.1, 0.93]],
      [0.4, [0, -0.1, 0.9]]
    ])
  ], 0.4);

  bobbingClip.play();
  breathClip.play();
  flapClip.play();
  tailClip.play();
  fireClip.play();
}
