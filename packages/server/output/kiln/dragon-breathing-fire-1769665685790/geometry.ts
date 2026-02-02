const meta = { name: "Dragon Breathing Fire", category: "character" };

function build() {
  const root = createRoot("Dragon");

  // Body
  const body = createPart("Body", boxGeo(1.4, 1.2, 2), gameMaterial(0x8B4513, { flatShading: true }));
  body.position.set(0, 1, 0);
  root.add(body);

  // Neck pivot
  const neckPivot = createPivot("NeckPivot");
  neckPivot.position.set(0, 1.3, -0.8);
  root.add(neckPivot);

  // Neck
  const neck = createPart("Neck", cylinderGeo(0.4, 0.5, 1, 6), gameMaterial(0x8B4513, { flatShading: true }));
  neck.position.set(0, 0.5, 0);
  neck.rotation.set(Math.PI * 0.15, 0, 0);
  neckPivot.add(neck);

  // Head pivot
  const headPivot = createPivot("HeadPivot");
  headPivot.position.set(0, 0.9, 0);
  neckPivot.add(headPivot);

  // Head
  const head = createPart("Head", boxGeo(0.8, 0.7, 1.2), gameMaterial(0x8B4513, { flatShading: true }));
  head.position.set(0, 0.35, 0);
  headPivot.add(head);

  // Snout
  const snout = createPart("Snout", boxGeo(0.5, 0.4, 0.6), gameMaterial(0xA0522D, { flatShading: true }));
  snout.position.set(0, 0, -0.8);
  headPivot.add(snout);

  // Horns
  const hornLeft = createPart("HornLeft", coneGeo(0.15, 0.5, 6), gameMaterial(0xFFE4B5, { flatShading: true }));
  hornLeft.position.set(-0.3, 0.7, 0.2);
  hornLeft.rotation.set(0, 0, -0.3);
  headPivot.add(hornLeft);

  const hornRight = createPart("HornRight", coneGeo(0.15, 0.5, 6), gameMaterial(0xFFE4B5, { flatShading: true }));
  hornRight.position.set(0.3, 0.7, 0.2);
  hornRight.rotation.set(0, 0, 0.3);
  headPivot.add(hornRight);

  // Eyes
  const eyeLeft = createPart("EyeLeft", sphereGeo(0.12, 6, 6), gameMaterial(0xFFFF00, { emissive: 0xFFAA00, flatShading: true }));
  eyeLeft.position.set(-0.25, 0.35, -0.5);
  headPivot.add(eyeLeft);

  const eyeRight = createPart("EyeRight", sphereGeo(0.12, 6, 6), gameMaterial(0xFFFF00, { emissive: 0xFFAA00, flatShading: true }));
  eyeRight.position.set(0.25, 0.35, -0.5);
  headPivot.add(eyeRight);

  // Fire breath (emissive geometry)
  const firePivot = createPivot("FirePivot");
  firePivot.position.set(0, 0, -1.1);
  headPivot.add(firePivot);

  const fire = createPart("Fire", coneGeo(0.3, 1.2, 6), gameMaterial(0xFF4500, { emissive: 0xFF4500, flatShading: true }));
  fire.position.set(0, 0, -0.6);
  fire.rotation.set(Math.PI * 0.5, 0, 0);
  firePivot.add(fire);

  // Wings
  const wingLeftPivot = createPivot("WingLeftPivot");
  wingLeftPivot.position.set(-0.7, 1.5, 0.3);
  root.add(wingLeftPivot);

  const wingLeft = createPart("WingLeft", boxGeo(1.5, 0.1, 1), gameMaterial(0x654321, { flatShading: true }));
  wingLeft.position.set(-0.75, 0, 0);
  wingLeft.rotation.set(0, 0, -0.3);
  wingLeftPivot.add(wingLeft);

  const wingRightPivot = createPivot("WingRightPivot");
  wingRightPivot.position.set(0.7, 1.5, 0.3);
  root.add(wingRightPivot);

  const wingRight = createPart("WingRight", boxGeo(1.5, 0.1, 1), gameMaterial(0x654321, { flatShading: true }));
  wingRight.position.set(0.75, 0, 0);
  wingRight.rotation.set(0, 0, 0.3);
  wingRightPivot.add(wingRight);

  // Tail pivot
  const tailPivot = createPivot("TailPivot");
  tailPivot.position.set(0, 1, 1);
  root.add(tailPivot);

  // Tail
  const tail = createPart("Tail", cylinderGeo(0.3, 0.15, 1.5, 6), gameMaterial(0x8B4513, { flatShading: true }));
  tail.position.set(0, 0, 0.75);
  tail.rotation.set(Math.PI * 0.3, 0, 0);
  tailPivot.add(tail);

  // Tail tip
  const tailTip = createPart("TailTip", coneGeo(0.2, 0.4, 6), gameMaterial(0xA0522D, { flatShading: true }));
  tailTip.position.set(0, 0, 1.5);
  tailPivot.add(tailTip);

  // Legs
  const legFrontLeft = createPart("LegFrontLeft", cylinderGeo(0.2, 0.2, 0.8, 6), gameMaterial(0x8B4513, { flatShading: true }));
  legFrontLeft.position.set(-0.5, 0.4, -0.6);
  root.add(legFrontLeft);

  const legFrontRight = createPart("LegFrontRight", cylinderGeo(0.2, 0.2, 0.8, 6), gameMaterial(0x8B4513, { flatShading: true }));
  legFrontRight.position.set(0.5, 0.4, -0.6);
  root.add(legFrontRight);

  const legBackLeft = createPart("LegBackLeft", cylinderGeo(0.25, 0.25, 1, 6), gameMaterial(0x8B4513, { flatShading: true }));
  legBackLeft.position.set(-0.5, 0.5, 0.7);
  root.add(legBackLeft);

  const legBackRight = createPart("LegBackRight", cylinderGeo(0.25, 0.25, 1, 6), gameMaterial(0x8B4513, { flatShading: true }));
  legBackRight.position.set(0.5, 0.5, 0.7);
  root.add(legBackRight);

  return root;
}

function animate(root) {
  const breatheDuration = 3;
  const flapDuration = 2;

  return [
    createClip("Breathe", breatheDuration, [
      rotationTrack("HeadPivot", [
        { time: 0, rotation: [0, 0, 0] },
        { time: 1, rotation: [-0.2, 0, 0] },
        { time: 2, rotation: [-0.2, 0, 0] },
        { time: breatheDuration, rotation: [0, 0, 0] }
      ]),
      positionTrack("Fire", [
        { time: 0, position: [0, 0, -0.6] },
        { time: 1, position: [0, 0, -1.5] },
        { time: 2, position: [0, 0, -1.5] },
        { time: breatheDuration, position: [0, 0, -0.6] }
      ])
    ]),
    createClip("FlapWings", flapDuration, [
      rotationTrack("WingLeftPivot", [
        { time: 0, rotation: [0, 0, 0] },
        { time: 0.5, rotation: [0, 0, -0.6] },
        { time: 1, rotation: [0, 0, 0] },
        { time: 1.5, rotation: [0, 0, -0.6] },
        { time: flapDuration, rotation: [0, 0, 0] }
      ]),
      rotationTrack("WingRightPivot", [
        { time: 0, rotation: [0, 0, 0] },
        { time: 0.5, rotation: [0, 0, 0.6] },
        { time: 1, rotation: [0, 0, 0] },
        { time: 1.5, rotation: [0, 0, 0.6] },
        { time: flapDuration, rotation: [0, 0, 0] }
      ])
    ]),
    createClip("TailSway", 2.5, [
      rotationTrack("TailPivot", [
        { time: 0, rotation: [0.3, 0.2, 0] },
        { time: 1.25, rotation: [0.3, -0.2, 0] },
        { time: 2.5, rotation: [0.3, 0.2, 0] }
      ])
    ])
  ];
}