const meta = { name: "Dragon Breathing Fire", category: "character" };

function build() {
  const root = createRoot("Dragon");

  // Body
  const body = createPart("Body", boxGeo(1.2, 0.8, 1.6), gameMaterial(0x8b4513, { flatShading: true }));
  body.position = [0, 0.8, 0];
  root.add(body);

  // Neck pivot
  const neckPivot = createPivot("NeckPivot");
  neckPivot.position = [0, 1.1, -0.5];
  root.add(neckPivot);

  // Neck
  const neck = createPart("Neck", cylinderGeo(0.3, 0.3, 0.6, 6), gameMaterial(0x8b4513, { flatShading: true }));
  neck.position = [0, 0.3, 0];
  neck.rotation = [0.3, 0, 0];
  neckPivot.add(neck);

  // Head pivot
  const headPivot = createPivot("HeadPivot");
  headPivot.position = [0, 0.55, 0.15];
  neckPivot.add(headPivot);

  // Head
  const head = createPart("Head", boxGeo(0.5, 0.4, 0.6), gameMaterial(0x8b4513, { flatShading: true }));
  head.position = [0, 0, 0];
  headPivot.add(head);

  // Snout
  const snout = createPart("Snout", boxGeo(0.35, 0.25, 0.4), gameMaterial(0x6d3410, { flatShading: true }));
  snout.position = [0, -0.05, 0.5];
  headPivot.add(snout);

  // Horns
  const hornLeft = createPart("HornLeft", coneGeo(0.1, 0.35, 6), gameMaterial(0xf4e4c1, { flatShading: true }));
  hornLeft.position = [-0.15, 0.2, -0.15];
  hornLeft.rotation = [-0.2, 0, -0.2];
  headPivot.add(hornLeft);

  const hornRight = createPart("HornRight", coneGeo(0.1, 0.35, 6), gameMaterial(0xf4e4c1, { flatShading: true }));
  hornRight.position = [0.15, 0.2, -0.15];
  hornRight.rotation = [-0.2, 0, 0.2];
  headPivot.add(hornRight);

  // Eyes
  const eyeLeft = createPart("EyeLeft", sphereGeo(0.08, 6, 6), gameMaterial(0xffff00, { flatShading: true, emissive: 0xff4400 }));
  eyeLeft.position = [-0.15, 0.05, 0.25];
  headPivot.add(eyeLeft);

  const eyeRight = createPart("EyeRight", sphereGeo(0.08, 6, 6), gameMaterial(0xffff00, { flatShading: true, emissive: 0xff4400 }));
  eyeRight.position = [0.15, 0.05, 0.25];
  headPivot.add(eyeRight);

  // Fire breath pivot
  const firePivot = createPivot("FirePivot");
  firePivot.position = [0, -0.05, 0.7];
  headPivot.add(firePivot);

  // Fire cone
  const fire = createPart("Fire", coneGeo(0.15, 0.8, 6), gameMaterial(0xff4400, { flatShading: true, emissive: 0xff8800 }));
  fire.position = [0, 0, 0.4];
  fire.rotation = [1.57, 0, 0];
  firePivot.add(fire);

  // Wings
  const wingLeft = createPart("WingLeft", boxGeo(0.9, 0.05, 0.7), gameMaterial(0x5c3317, { flatShading: true }));
  wingLeft.position = [-0.8, 1.0, 0];
  wingLeft.rotation = [0, 0, 0.4];
  root.add(wingLeft);

  const wingRight = createPart("WingRight", boxGeo(0.9, 0.05, 0.7), gameMaterial(0x5c3317, { flatShading: true }));
  wingRight.position = [0.8, 1.0, 0];
  wingRight.rotation = [0, 0, -0.4];
  root.add(wingRight);

  // Legs
  const legFrontLeft = createPart("LegFrontLeft", cylinderGeo(0.15, 0.12, 0.5, 6), gameMaterial(0x6d3410, { flatShading: true }));
  legFrontLeft.position = [-0.35, 0.25, -0.5];
  root.add(legFrontLeft);

  const legFrontRight = createPart("LegFrontRight", cylinderGeo(0.15, 0.12, 0.5, 6), gameMaterial(0x6d3410, { flatShading: true }));
  legFrontRight.position = [0.35, 0.25, -0.5];
  root.add(legFrontRight);

  const legBackLeft = createPart("LegBackLeft", cylinderGeo(0.15, 0.12, 0.5, 6), gameMaterial(0x6d3410, { flatShading: true }));
  legBackLeft.position = [-0.35, 0.25, 0.5];
  root.add(legBackLeft);

  const legBackRight = createPart("LegBackRight", cylinderGeo(0.15, 0.12, 0.5, 6), gameMaterial(0x6d3410, { flatShading: true }));
  legBackRight.position = [0.35, 0.25, 0.5];
  root.add(legBackRight);

  // Tail
  const tail = createPart("Tail", coneGeo(0.2, 1.0, 6), gameMaterial(0x8b4513, { flatShading: true }));
  tail.position = [0, 0.7, 0.9];
  tail.rotation = [2.2, 0, 0];
  root.add(tail);

  return root;
}

function animate(root) {
  // Neck breathing motion
  const neckBreath = createClip("Breathe", 2, [
    rotationTrack("NeckPivot", [
      { time: 0, rotation: [0, 0, 0] },
      { time: 0.5, rotation: [-0.2, 0, 0] },
      { time: 1.0, rotation: [0, 0, 0] },
      { time: 2, rotation: [0, 0, 0] }
    ])
  ]);

  // Head tilt
  const headTilt = createClip("HeadTilt", 2, [
    rotationTrack("HeadPivot", [
      { time: 0, rotation: [0, 0, 0] },
      { time: 0.5, rotation: [0.15, 0, 0] },
      { time: 1.0, rotation: [0, 0, 0] },
      { time: 2, rotation: [0, 0, 0] }
    ])
  ]);

  // Fire pulse
  const firePulse = createClip("FirePulse", 2, [
    positionTrack("Fire", [
      { time: 0, position: [0, 0, 0.4] },
      { time: 0.3, position: [0, 0, 0.6] },
      { time: 0.6, position: [0, 0, 0.5] },
      { time: 1.0, position: [0, 0, 0.4] },
      { time: 2, position: [0, 0, 0.4] }
    ])
  ]);

  // Wing flap
  const wingFlap = createClip("WingFlap", 1.5, [
    rotationTrack("WingLeft", [
      { time: 0, rotation: [0, 0, 0.4] },
      { time: 0.75, rotation: [0, 0, 0.8] },
      { time: 1.5, rotation: [0, 0, 0.4] }
    ]),
    rotationTrack("WingRight", [
      { time: 0, rotation: [0, 0, -0.4] },
      { time: 0.75, rotation: [0, 0, -0.8] },
      { time: 1.5, rotation: [0, 0, -0.4] }
    ])
  ]);

  return [neckBreath, headTilt, firePulse, wingFlap];
}
