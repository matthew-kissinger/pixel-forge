const meta = { name: "Treasure Chest", category: "prop" };

function build() {
  const root = createRoot("TreasureChest");

  // Main chest body
  const chestBody = createPart(
    "ChestBody",
    boxGeo(1.2, 0.8, 0.9),
    gameMaterial(0x8B4513, { roughness: 0.8, flatShading: true }),
    { position: [0, 0.4, 0] }
  );
  chestBody.parent = root;

  // Gold trim bottom
  const trimBottom = createPart(
    "TrimBottom",
    boxGeo(1.25, 0.12, 0.95),
    gameMaterial(0xFFD700, { metalness: 0.8, roughness: 0.3, flatShading: true }),
    { position: [0, 0.06, 0] }
  );
  trimBottom.parent = root;

  // Gold lock plate
  const lockPlate = createPart(
    "LockPlate",
    boxGeo(0.2, 0.25, 0.08),
    gameMaterial(0xFFD700, { metalness: 0.8, roughness: 0.3, flatShading: true }),
    { position: [0, 0.45, 0.46] }
  );
  lockPlate.parent = root;

  // Lock keyhole
  const keyhole = createPart(
    "Keyhole",
    cylinderGeo(0.04, 0.04, 0.1, 6),
    gameMaterial(0x000000, { flatShading: true }),
    { position: [0, 0.45, 0.51], rotation: [Math.PI / 2, 0, 0] }
  );
  keyhole.parent = root;

  // Lid pivot (positioned at back hinge point)
  const lidPivot = createPivot("LidPivot", [0, 0.8, -0.35], root);

  // Lid (curved top)
  const lid = createPart(
    "Lid",
    boxGeo(1.2, 0.5, 0.9),
    gameMaterial(0x8B4513, { roughness: 0.8, flatShading: true }),
    { position: [0, 0.25, 0.35], scale: [1, 1, 1.1] }
  );
  lid.parent = lidPivot;

  // Lid gold trim
  const lidTrim = createPart(
    "LidTrim",
    boxGeo(1.25, 0.12, 0.95),
    gameMaterial(0xFFD700, { metalness: 0.8, roughness: 0.3, flatShading: true }),
    { position: [0, 0.5, 0.35] }
  );
  lidTrim.parent = lidPivot;

  // Lid center ornament
  const ornament = createPart(
    "Ornament",
    sphereGeo(0.1, 6, 6),
    gameMaterial(0xFFD700, { metalness: 0.9, roughness: 0.2, emissive: 0xFFAA00, flatShading: true }),
    { position: [0, 0.57, 0.35] }
  );
  ornament.parent = lidPivot;

  return root;
}

function animate(root) {
  const lidPivot = root.getObjectByName("LidPivot");

  if (!lidPivot) return;

  // Opening animation: lid rotates back around X-axis
  const openTrack = rotationTrack(lidPivot, [
    { time: 0, value: [0, 0, 0] },
    { time: 1, value: [-Math.PI * 0.5, 0, 0] }, // Open 90 degrees
    { time: 3, value: [-Math.PI * 0.5, 0, 0] }, // Hold open
    { time: 4, value: [0, 0, 0] } // Close
  ]);

  const clip = createClip("ChestOpen", 4, [openTrack]);
  return clip;
}
