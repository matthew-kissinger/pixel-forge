const meta = { name: "RedCube", category: "prop" };

function build() {
  const root = createRoot("RedCube");

  // Create a simple red cube centered at origin
  createPart(
    "Mesh_Cube",
    boxGeo(1, 1, 1),
    gameMaterial(0xff0000, { flatShading: true }),
    {
      position: [0, 0.5, 0],
      parent: root
    }
  );

  return root;
}

function animate(root) {
  // Optional idle rotation for visual interest
  return [
    spinAnimation("RedCube", 4, 'y')
  ];
}
