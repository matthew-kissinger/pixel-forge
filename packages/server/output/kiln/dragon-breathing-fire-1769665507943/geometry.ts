const meta = { name: "Dragon Breathing Fire", category: "prop" };

function build() {
  const root = createRoot("dragon");

  // Body
  const body = createPart(
    "body",
    sphereGeo(0.8, 6, 6),
    gameMaterial(0x8b4513, { metalness: 0.1, roughness: 0.7, flatShading: true }),
    { position: [0, 1, 0], scale: [1.2, 1, 1.5], parent: root }
  );

  // Head pivot for animation
  const headPivot = createPivot("headPivot", [0, 1.5, -0.8], root);

  // Head
  const head = createPart(
    "head",
    sphereGeo(0.6, 6, 6),
    gameMaterial(0x8b4513, { metalness: 0.1, roughness: 0.7, flatShading: true }),
    { scale: [1, 0.9, 1.3], parent: headPivot }
  );

  // Snout
  const snout = createPart(
    "snout",
    coneGeo(0.3, 0.5, 6),
    gameMaterial(0x654321, { metalness: 0.1, roughness: 0.7, flatShading: true }),
    { position: [0, -0.1, -0.9], rotation: [Math.PI / 2, 0, 0], parent: headPivot }
  );

  // Eyes
  createPart(
    "eyeLeft",
    sphereGeo(0.12, 6, 6),
    gameMaterial(0xffff00, { emissive: 0xff4400, metalness: 0, roughness: 0.3, flatShading: true }),
    { position: [-0.3, 0.15, -0.4], parent: headPivot }
  );

  createPart(
    "eyeRight",
    sphereGeo(0.12, 6, 6),
    gameMaterial(0xffff00, { emissive: 0xff4400, metalness: 0, roughness: 0.3, flatShading: true }),
    { position: [0.3, 0.15, -0.4], parent: headPivot }
  );

  // Horns
  createPart(
    "hornLeft",
    coneGeo(0.15, 0.6, 6),
    gameMaterial(0x2a1810, { metalness: 0.2, roughness: 0.6, flatShading: true }),
    { position: [-0.3, 0.5, 0.1], rotation: [-0.3, 0, -0.4], parent: headPivot }
  );

  createPart(
    "hornRight",
    coneGeo(0.15, 0.6, 6),
    gameMaterial(0x2a1810, { metalness: 0.2, roughness: 0.6, flatShading: true }),
    { position: [0.3, 0.5, 0.1], rotation: [-0.3, 0, 0.4], parent: headPivot }
  );

  // Neck
  createPart(
    "neck",
    cylinderGeo(0.4, 0.5, 0.6, 6),
    gameMaterial(0x8b4513, { metalness: 0.1, roughness: 0.7, flatShading: true }),
    { position: [0, 1.2, -0.3], rotation: [0.3, 0, 0], parent: root }
  );

  // Wings
  const wingLeft = createPart(
    "wingLeft",
    boxGeo(1.5, 0.1, 1),
    gameMaterial(0x654321, { metalness: 0.2, roughness: 0.6, flatShading: true }),
    { position: [-0.8, 1.3, 0.3], rotation: [0, 0.5, 0.6], parent: root }
  );

  const wingRight = createPart(
    "wingRight",
    boxGeo(1.5, 0.1, 1),
    gameMaterial(0x654321, { metalness: 0.2, roughness: 0.6, flatShading: true }),
    { position: [0.8, 1.3, 0.3], rotation: [0, -0.5, -0.6], parent: root }
  );

  // Tail pivot for animation
  const tailPivot = createPivot("tailPivot", [0, 0.8, 1.2], root);

  // Tail segments
  createPart(
    "tail1",
    cylinderGeo(0.3, 0.25, 0.8, 6),
    gameMaterial(0x8b4513, { metalness: 0.1, roughness: 0.7, flatShading: true }),
    { position: [0, 0, 0.4], rotation: [-0.5, 0, 0], parent: tailPivot }
  );

  createPart(
    "tail2",
    cylinderGeo(0.25, 0.15, 0.7, 6),
    gameMaterial(0x8b4513, { metalness: 0.1, roughness: 0.7, flatShading: true }),
    { position: [0, -0.2, 0.9], rotation: [-0.7, 0, 0], parent: tailPivot }
  );

  createPart(
    "tailTip",
    coneGeo(0.2, 0.5, 6),
    gameMaterial(0x654321, { metalness: 0.2, roughness: 0.6, flatShading: true }),
    { position: [0, -0.5, 1.4], rotation: [-0.9, 0, 0], parent: tailPivot }
  );

  // Legs
  createPart(
    "legFrontLeft",
    cylinderGeo(0.2, 0.2, 0.8, 6),
    gameMaterial(0x8b4513, { metalness: 0.1, roughness: 0.7, flatShading: true }),
    { position: [-0.5, 0.4, -0.5], parent: root }
  );

  createPart(
    "legFrontRight",
    cylinderGeo(0.2, 0.2, 0.8, 6),
    gameMaterial(0x8b4513, { metalness: 0.1, roughness: 0.7, flatShading: true }),
    { position: [0.5, 0.4, -0.5], parent: root }
  );

  createPart(
    "legBackLeft",
    cylinderGeo(0.25, 0.25, 0.9, 6),
    gameMaterial(0x8b4513, { metalness: 0.1, roughness: 0.7, flatShading: true }),
    { position: [-0.5, 0.45, 0.8], parent: root }
  );

  createPart(
    "legBackRight",
    cylinderGeo(0.25, 0.25, 0.9, 6),
    gameMaterial(0x8b4513, { metalness: 0.1, roughness: 0.7, flatShading: true }),
    { position: [0.5, 0.45, 0.8], parent: root }
  );

  // Fire breath - multiple particles
  for (let i = 0; i < 5; i++) {
    createPart(
      `fire${i}`,
      sphereGeo(0.15 + i * 0.05, 6, 6),
      gameMaterial(0xff4400, { emissive: 0xff4400, metalness: 0, roughness: 0.2, flatShading: true }),
      { position: [0, -0.1, -1.3 - i * 0.3], scale: [1, 0.8, 1.2], parent: headPivot }
    );
  }

  return root;
}

function animate(root) {
  // Head bobbing and fire breathing motion
  const headPivot = root.getObjectByName("headPivot");
  if (headPivot) {
    const headBob = rotationTrack(headPivot, [
      { time: 0, value: [0, 0, 0] },
      { time: 0.5, value: [-0.15, 0, 0] },
      { time: 1, value: [0, 0, 0] }
    ]);
    createClip("headBob", 1, [headBob]);
  }

  // Tail swaying
  const tailPivot = root.getObjectByName("tailPivot");
  if (tailPivot) {
    const tailSway = rotationTrack(tailPivot, [
      { time: 0, value: [0, -0.3, 0] },
      { time: 0.7, value: [0, 0.3, 0] },
      { time: 1.4, value: [0, -0.3, 0] }
    ]);
    createClip("tailSway", 1.4, [tailSway]);
  }

  // Wing flapping
  const wingLeft = root.getObjectByName("wingLeft");
  const wingRight = root.getObjectByName("wingRight");
  if (wingLeft && wingRight) {
    const wingLeftFlap = rotationTrack(wingLeft, [
      { time: 0, value: [0, 0.5, 0.6] },
      { time: 0.4, value: [0, 0.5, 1.2] },
      { time: 0.8, value: [0, 0.5, 0.6] }
    ]);
    const wingRightFlap = rotationTrack(wingRight, [
      { time: 0, value: [0, -0.5, -0.6] },
      { time: 0.4, value: [0, -0.5, -1.2] },
      { time: 0.8, value: [0, -0.5, -0.6] }
    ]);
    createClip("wingFlap", 0.8, [wingLeftFlap, wingRightFlap]);
  }

  // Fire particle animation
  for (let i = 0; i < 5; i++) {
    const fire = root.getObjectByName(`fire${i}`);
    if (fire) {
      const fireFloat = positionTrack(fire, [
        { time: 0, value: [0, -0.1, -1.3 - i * 0.3] },
        { time: 0.3 + i * 0.05, value: [Math.sin(i) * 0.1, -0.1 + i * 0.05, -1.3 - i * 0.3 - 0.2] },
        { time: 0.6 + i * 0.1, value: [Math.sin(i) * 0.15, -0.1 + i * 0.1, -1.3 - i * 0.3] }
      ]);
      createClip(`fire${i}Anim`, 0.6 + i * 0.1, [fireFloat]);
    }
  }

  // Body bobbing
  bobbingAnimation(root, 0.15, 2);
}

export { meta, build, animate };