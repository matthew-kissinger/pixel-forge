const meta = { name: "Glowing Gem", category: "prop" };

function build() {
  const root = createRoot("gem");

  // Main gem body - octahedron-like shape using cone
  const gemBody = createPart(
    "body",
    coneGeo(0.5, 0.8, 6),
    gameMaterial(0x00ffff, { metalness: 0.3, roughness: 0.2, flatShading: true }),
    { parent: root, position: [0, 0, 0] }
  );

  // Top pyramid
  const gemTop = createPart(
    "top",
    coneGeo(0.5, 0.6, 6),
    gameMaterial(0x00ffff, { metalness: 0.3, roughness: 0.2, flatShading: true }),
    { parent: root, position: [0, 0.7, 0], rotation: [0, 0, Math.PI] }
  );

  // Bottom point
  const gemBottom = createPart(
    "bottom",
    coneGeo(0.5, 0.4, 6),
    gameMaterial(0x00ffff, { metalness: 0.3, roughness: 0.2, flatShading: true }),
    { parent: root, position: [0, -0.6, 0] }
  );

  return root;
}

function animate(root) {
  // Slow rotation on Y axis
  const rotY = rotationTrack([0, 1, 0], [0, 0, Math.PI * 2]);

  // Gentle bobbing motion
  const posY = positionTrack([0, 1, 0], [0, 0, 0.15, 0]);

  const spin = createClip("spin", 4, [{ target: root, track: rotY }]);
  const bob = createClip("bob", 2, [{ target: root, track: posY }]);

  return [spin, bob];
}
