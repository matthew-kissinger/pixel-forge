---
name: kiln-tsl
description: Use this skill when generating real-time VFX or shader effects using Three.js TSL (Three Shading Language) for in-editor preview. Trigger on keywords "TSL", "Three Shading Language", "shader", "shader effect", "VFX", "node material", "fresnel", "glow", "dissolve", "hologram", "energy effect", or when the user asks for GPU shader-driven visual effects in the Kiln editor. Not exportable to GLB — skip this skill if the user needs a static 3D model (use kiln-glb instead).
allowed-tools: Read, Write, Glob, Grep
---

# Kiln TSL - Real-Time VFX

Generate shader-based visual effects using Three.js Node Materials and TSL.

## When to Use

- User requests VFX or shader effects
- Real-time effects (glow, dissolve, hologram, energy)
- In-editor preview only (not exportable)

## References

- `references/syntax.md` - TSL syntax and operators
- `references/materials.md` - Node material properties
- `references/effects.md` - Common effect patterns

## Output Structure

```javascript
import * as THREE from 'three/webgpu';
import { color, float, vec3, time, ... } from 'three/tsl';

// Create material
const material = new THREE.MeshStandardNodeMaterial();

// Configure nodes
material.colorNode = ...;
material.emissiveNode = ...;

// Export for runtime
export { material };
```

## TSL Basics

### Method Chaining
TSL uses method chaining instead of operators:
```javascript
// GLSL: sin(time * 2.0 + offset) * 0.5 + 0.5
// TSL:
time.mul(2.0).add(offset).sin().mul(0.5).add(0.5)
```

### Core Types
```javascript
float(1.0)           // Scalar
vec2(x, y)           // 2D vector
vec3(x, y, z)        // 3D vector
vec4(x, y, z, w)     // 4D vector
color(0xff0000)      // RGB from hex
```

### Geometry Nodes
```javascript
positionLocal        // Model space position
positionWorld        // World space position
normalWorld          // World space normal
uv()                 // UV coordinates
```

### Time
```javascript
time                 // Seconds since start
deltaTime            // Frame delta
```

## Quick Example

### Fresnel Glow
```javascript
import * as THREE from 'three/webgpu';
import {
  color, float, positionWorld, normalWorld,
  cameraPosition, Fn
} from 'three/tsl';

const fresnel = Fn(() => {
  const viewDir = cameraPosition.sub(positionWorld).normalize();
  const nDotV = normalWorld.dot(viewDir).saturate();
  return float(1.0).sub(nDotV).pow(3.0);
});

const material = new THREE.MeshStandardNodeMaterial();
material.colorNode = color(0x111122);
material.emissiveNode = color(0x00ffff).mul(fresnel());

export { material };
```

## Material Types

| Material | Use Case |
|----------|----------|
| `MeshBasicNodeMaterial` | Unlit, always visible |
| `MeshStandardNodeMaterial` | PBR with lighting |
| `MeshPhysicalNodeMaterial` | Glass, clearcoat |
| `PointsNodeMaterial` | Particles |

## Rules

1. **Always import from three/webgpu and three/tsl**
2. **Use method chaining** for operations
3. **Export the material** for runtime use
4. **Not exportable**: TSL effects stay in editor
5. **Output code only**: No markdown, no explanation
