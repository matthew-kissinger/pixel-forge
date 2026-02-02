const meta = { name: "Dragon Breathing Fire", category: "character" };

function build() {
  const root = createRoot("Dragon");

  // Body - chunky oval
  createPart("Body", sphereGeo(1.2, 6, 6), gameMaterial(0x8b4513, { flatShading: true }), {
    position: [0, 1, 0],
    scale: [1, 0.8, 1.3],
    parent: root
  });

  // Neck pivot
  const neckPivot = createPivot("Neck", [0, 1.5, 0.3], root);

  // Neck
  createPart("NeckBody", cylinderGeo(0.4, 0.5, 0.8, 6), gameMaterial(0x8b4513, { flatShading: true }), {
    position: [0, 0.4, 0],
    parent: neckPivot
  });

  // Head pivot
  const headPivot = createPivot("Head", [0, 0.8, 0], neckPivot);

  // Head - angular
  createPart("HeadBody", boxGeo(0.7, 0.6, 0.9), gameMaterial(0x8b4513, { flatShading: true }), {
    position: [0, 0.3, 0],
    parent: headPivot
  });

  // Snout
  createPart("Snout", coneGeo(0.35, 0.6, 6), gameMaterial(0xa0522d, { flatShading: true }), {
    position: [0, 0.1, 0.6],
    rotation: [90, 0, 0],
    parent: headPivot
  });

  // Eyes
  createPart("EyeL", sphereGeo(0.12, 4, 4), gameMaterial(0xffff00, { emissive: 0xffaa00, flatShading: true }), {
    position: [-0.25, 0.4, 0.35],
    parent: headPivot
  });

  createPart("EyeR", sphereGeo(0.12, 4, 4), gameMaterial(0xffff00, { emissive: 0xffaa00, flatShading: true }), {
    position: [0.25, 0.4, 0.35],
    parent: headPivot
  });

  // Horns
  createPart("HornL", coneGeo(0.15, 0.5, 6), gameMaterial(0x2f1f0f, { flatShading: true }), {
    position: [-0.3, 0.6, -0.1],
    rotation: [-20, 0, -15],
    parent: headPivot
  });

  createPart("HornR", coneGeo(0.15, 0.5, 6), gameMaterial(0x2f1f0f, { flatShading: true }), {
    position: [0.3, 0.6, -0.1],
    rotation: [-20, 0, 15],
    parent: headPivot
  });

  // Fire breath pivot
  const firePivot = createPivot("Fire", [0, 0.1, 0.95], headPivot);

  // Fire particles (3 cones for stylized fire)
  createPart("Fire1", coneGeo(0.2, 0.8, 6), gameMaterial(0xff4500, { emissive: 0xff4500, flatShading: true }), {
    position: [0, 0, 0.4],
    rotation: [90, 0, 0],
    parent: firePivot
  });

  createPart("Fire2", coneGeo(0.15, 0.6, 6), gameMaterial(0xff6600, { emissive: 0xff6600, flatShading: true }), {
    position: [0.15, 0.1, 0.6],
    rotation: [85, 0, 10],
    parent: firePivot
  });

  createPart("Fire3", coneGeo(0.15, 0.6, 6), gameMaterial(0xffaa00, { emissive: 0xffaa00, flatShading: true }), {
    position: [-0.15, 0.1, 0.6],
    rotation: [85, 0, -10],
    parent: firePivot
  });

  // Wings - left
  const wingLPivot = createPivot("WingL", [-0.8, 1.3, -0.2], root);

  createPart("WingLBody", boxGeo(0.1, 1.2, 0.8), gameMaterial(0x654321, { flatShading: true }), {
    position: [-0.3, 0, 0],
    rotation: [0, 0, -30],
    scale: [1, 1, 1.2],
    parent: wingLPivot
  });

  // Wings - right
  const wingRPivot = createPivot("WingR", [0.8, 1.3, -0.2], root);

  createPart("WingRBody", boxGeo(0.1, 1.2, 0.8), gameMaterial(0x654321, { flatShading: true }), {
    position: [0.3, 0, 0],
    rotation: [0, 0, 30],
    scale: [1, 1, 1.2],
    parent: wingRPivot
  });

  // Legs - front left
  createPart("LegFL", cylinderGeo(0.2, 0.2, 0.8, 6), gameMaterial(0x8b4513, { flatShading: true }), {
    position: [-0.5, 0.4, 0.5],
    parent: root
  });

  // Legs - front right
  createPart("LegFR", cylinderGeo(0.2, 0.2, 0.8, 6), gameMaterial(0x8b4513, { flatShading: true }), {
    position: [0.5, 0.4, 0.5],
    parent: root
  });

  // Legs - back left
  createPart("LegBL", cylinderGeo(0.25, 0.2, 0.9, 6), gameMaterial(0x8b4513, { flatShading: true }), {
    position: [-0.5, 0.45, -0.4],
    parent: root
  });

  // Legs - back right
  createPart("LegBR", cylinderGeo(0.25, 0.2, 0.9, 6), gameMaterial(0x8b4513, { flatShading: true }), {
    position: [0.5, 0.45, -0.4],
    parent: root
  });

  // Tail pivot
  const tailPivot = createPivot("Tail", [0, 1.2, -1], root);

  createPart("TailBody", coneGeo(0.3, 1.5, 6), gameMaterial(0x8b4513, { flatShading: true }), {
    position: [0, -0.5, 0],
    rotation: [45, 0, 0],
    parent: tailPivot
  });

  // Tail spike
  createPart("TailSpike", coneGeo(0.2, 0.4, 6), gameMaterial(0x2f1f0f, { flatShading: true }), {
    position: [0, -1.2, -0.4],
    rotation: [60, 0, 0],
    parent: tailPivot
  });

  return root;
}

function animate(root) {
  // Breathing motion
  const breathe = createClip(
    "breathe",
    2,
    [
      positionTrack("Joint_Neck", [
        { time: 0, position: [0, 1.5, 0.3] },
        { time: 1, position: [0, 1.6, 0.4] },
        { time: 2, position: [0, 1.5, 0.3] }
      ]),
      rotationTrack("Joint_Head", [
        { time: 0, rotation: [0, 0, 0] },
        { time: 1, rotation: [-5, 0, 0] },
        { time: 2, rotation: [0, 0, 0] }
      ])
    ]
  );

  // Wing flap
  const wingFlap = createClip(
    "wingFlap",
    1.5,
    [
      rotationTrack("Joint_WingL", [
        { time: 0, rotation: [0, 0, 0] },
        { time: 0.75, rotation: [0, -30, 0] },
        { time: 1.5, rotation: [0, 0, 0] }
      ]),
      rotationTrack("Joint_WingR", [
        { time: 0, rotation: [0, 0, 0] },
        { time: 0.75, rotation: [0, 30, 0] },
        { time: 1.5, rotation: [0, 0, 0] }
      ])
    ]
  );

  // Fire flicker
  const fireFlicker = createClip(
    "fireFlicker",
    0.4,
    [
      rotationTrack("Joint_Fire", [
        { time: 0, rotation: [0, 0, 0] },
        { time: 0.1, rotation: [5, 3, 0] },
        { time: 0.2, rotation: [0, -2, 0] },
        { time: 0.3, rotation: [-3, 1, 0] },
        { time: 0.4, rotation: [0, 0, 0] }
      ])
    ]
  );

  // Tail sway
  const tailSway = createClip(
    "tailSway",
    3,
    [
      rotationTrack("Joint_Tail", [
        { time: 0, rotation: [0, -15, 0] },
        { time: 1.5, rotation: [0, 15, 0] },
        { time: 3, rotation: [0, -15, 0] }
      ])
    ]
  );

  return [breathe, wingFlap, fireFlicker, tailSway];
}