# TSL Node Materials

## Material Types

### MeshBasicNodeMaterial
Unlit - ignores lights, always visible.
```javascript
const material = new THREE.MeshBasicNodeMaterial();
material.colorNode = color(0xff0000);
```

### MeshStandardNodeMaterial
PBR material with metalness/roughness.
```javascript
const material = new THREE.MeshStandardNodeMaterial();
material.colorNode = color(0xff0000);
material.roughnessNode = float(0.5);
material.metalnessNode = float(0.0);
material.emissiveNode = color(0x000000);
```

### MeshPhysicalNodeMaterial
Advanced PBR with transmission, clearcoat.
```javascript
const material = new THREE.MeshPhysicalNodeMaterial();
material.transmissionNode = float(0.9);    // Glass
material.thicknessNode = float(0.5);
material.iorNode = float(1.5);
material.clearcoatNode = float(1.0);       // Car paint
material.clearcoatRoughnessNode = float(0.1);
```

### PointsNodeMaterial
For particle systems.
```javascript
const material = new THREE.PointsNodeMaterial();
material.colorNode = color(0xffffff);
material.sizeNode = float(5.0);
```

### SpriteNodeMaterial
For billboards.
```javascript
const material = new THREE.SpriteNodeMaterial();
material.colorNode = texture(map);
```

---

## Common Properties

### Color and Opacity
```javascript
material.colorNode = color(0xff0000);
material.colorNode = texture(map);
material.colorNode = positionLocal.normalize();

material.opacityNode = float(0.8);
material.transparent = true;

material.alphaTestNode = float(0.5);
```

### PBR (MeshStandardNodeMaterial)
```javascript
// Metalness: 0 = plastic, 1 = metal
material.metalnessNode = float(0.0);
material.metalnessNode = texture(metalMap).r;

// Roughness: 0 = mirror, 1 = matte
material.roughnessNode = float(0.5);
material.roughnessNode = texture(roughMap).r;

// Emissive (self-illumination)
material.emissiveNode = color(0x000000);
material.emissiveNode = color(0xff0000).mul(2.0);  // HDR
```

### Normal Mapping
```javascript
import { normalMap, bumpMap } from 'three/tsl';

material.normalNode = normalMap(texture(normalMapTex));
material.normalNode = normalMap(texture(normalMapTex), float(0.5));  // With strength
material.normalNode = bumpMap(texture(heightMap), 0.05);
```

### Vertex Displacement
```javascript
// Displace along normals
const displacement = texture(heightMap).r.mul(0.1);
material.positionNode = positionLocal.add(normalLocal.mul(displacement));

// Wave effect
const wave = positionLocal.x.add(time).sin().mul(0.1);
material.positionNode = positionLocal.add(vec3(0, wave, 0));
```

---

## Geometry Nodes

### Position
```javascript
positionGeometry   // Original mesh position
positionLocal      // Model space
positionWorld      // World space
positionView       // Camera space
```

### Normal
```javascript
normalGeometry     // Original mesh normal
normalLocal        // Model space
normalWorld        // World space (for lighting)
normalView         // Camera space
```

### UV
```javascript
uv()               // Primary UV (UV0)
uv(1)              // Secondary UV (UV1)
```

### Other
```javascript
vertexColor()      // Vertex colors
instanceIndex      // For instanced meshes
vertexIndex        // Current vertex
```

---

## Camera Nodes

```javascript
cameraPosition            // Camera world position
cameraNear                // Near plane
cameraFar                 // Far plane
cameraViewMatrix          // View matrix
cameraProjectionMatrix    // Projection matrix
```

---

## Screen Space

```javascript
screenUV           // Screen UV (0-1)
screenCoordinate   // Pixel coordinates
screenSize         // Screen dimensions
viewport           // Viewport rect
depth              // Fragment depth
```
