# TSL Syntax Reference

## Imports

```javascript
import * as THREE from 'three/webgpu';
import {
  // Types
  float, int, uint, bool,
  vec2, vec3, vec4, color,

  // Geometry
  positionLocal, positionWorld, positionView,
  normalLocal, normalWorld, normalView,
  uv,

  // Camera
  cameraPosition, cameraNear, cameraFar,

  // Time
  time, deltaTime,

  // Math
  abs, sign, floor, ceil, fract,
  min, max, clamp, mix, step, smoothstep,
  sin, cos, tan, asin, acos, atan,
  pow, sqrt, exp, log,
  length, distance, dot, cross, normalize, reflect,

  // Textures
  texture, uniform,

  // Control
  Fn, If, Loop, Discard
} from 'three/tsl';
```

## Operators

TSL uses method chaining:

```javascript
// Arithmetic
a.add(b)        // a + b
a.sub(b)        // a - b
a.mul(b)        // a * b
a.div(b)        // a / b
a.mod(b)        // mod(a, b)
a.negate()      // -a

// Comparison (return bool)
a.lessThan(b)       // a < b
a.lessThanEqual(b)  // a <= b
a.greaterThan(b)    // a > b
a.greaterThanEqual(b) // a >= b
a.equal(b)          // a == b
a.notEqual(b)       // a != b

// Logical
a.and(b)        // a && b
a.or(b)         // a || b
a.not()         // !a

// Assignment (for variables)
a.assign(b)     // a = b
a.addAssign(b)  // a += b
a.subAssign(b)  // a -= b
a.mulAssign(b)  // a *= b
```

## Swizzling

```javascript
const v = vec3(1, 2, 3);
v.x           // 1
v.y           // 2
v.xy          // vec2(1, 2)
v.zyx         // vec3(3, 2, 1)
v.rgb         // Same as xyz
v.r           // Same as x
```

## Math Functions

```javascript
// Basic
abs(x)                  // Absolute value
sign(x)                 // -1, 0, or 1
floor(x)                // Round down
ceil(x)                 // Round up
fract(x)                // Fractional part (x - floor(x))

// Range
min(a, b)               // Minimum
max(a, b)               // Maximum
clamp(x, lo, hi)        // Clamp to range
saturate(x)             // clamp(x, 0, 1)

// Interpolation
mix(a, b, t)            // Linear interpolation
step(edge, x)           // 0 if x < edge, else 1
smoothstep(a, b, x)     // Smooth 0-1 transition

// Trigonometry
sin(x), cos(x), tan(x)
asin(x), acos(x), atan(x)
atan2(y, x)

// Exponential
pow(x, y)               // x^y
sqrt(x)                 // Square root
exp(x)                  // e^x
log(x)                  // Natural log

// Vector
length(v)               // Vector magnitude
distance(a, b)          // Distance between points
dot(a, b)               // Dot product
cross(a, b)             // Cross product (vec3 only)
normalize(v)            // Unit vector
reflect(i, n)           // Reflection vector
```

## Custom Functions

```javascript
// Define reusable function
const myEffect = Fn(([param1, param2 = 1.0]) => {
  return param1.mul(param2).sin();
});

// Use it
const result = myEffect(time, 2.0);
```

## Control Flow

```javascript
// If-Else
If(condition, () => {
  // true branch
}).ElseIf(other, () => {
  // else if branch
}).Else(() => {
  // false branch
});

// Select (ternary)
const result = select(condition, trueVal, falseVal);

// Loop
Loop(10, ({ i }) => {
  // i = 0 to 9
});

// Discard fragment
If(alpha.lessThan(0.5), () => {
  Discard();
});
```

## Variables

```javascript
// Create mutable variable
const myVar = float(0).toVar();

// Modify in shader
myVar.addAssign(1);
myVar.assign(time.sin());
```

## Textures

```javascript
// Sample texture at UV
texture(map, uv())

// Sample at offset UV
texture(map, uv().add(vec2(0.1, 0)))

// Get specific channel
texture(map).r
texture(map).rgb
```

## Uniforms

```javascript
// Create uniform (can update from JS)
const brightness = uniform(1.0);
const tint = uniform(new THREE.Color(0xff0000));

// Use in shader
material.colorNode = baseColor.mul(brightness);

// Update at runtime
brightness.value = 0.5;
tint.value.setHex(0x00ff00);
```
