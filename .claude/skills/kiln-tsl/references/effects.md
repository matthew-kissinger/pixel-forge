# TSL Effect Patterns

## Fresnel Rim

Bright edges when viewed at angle.

```javascript
const fresnel = Fn(() => {
  const viewDir = cameraPosition.sub(positionWorld).normalize();
  const nDotV = normalWorld.dot(viewDir).saturate();
  return float(1.0).sub(nDotV).pow(3.0);
});

material.emissiveNode = color(0x00ffff).mul(fresnel());
```

---

## Pulsing Glow

```javascript
// 0-1 oscillation
const pulse = time.mul(2.0).sin().mul(0.5).add(0.5);
material.emissiveNode = color(0xff0000).mul(pulse);
```

---

## Color Gradient (Height-based)

```javascript
const t = positionLocal.y.mul(0.5).add(0.5).saturate();
material.colorNode = mix(color(0x0000ff), color(0xff0000), t);
```

---

## Animated Color Cycle

```javascript
const t = time.mul(0.5).sin().mul(0.5).add(0.5);
material.colorNode = mix(color(0xff0000), color(0x0000ff), t);
```

---

## UV Scrolling

```javascript
const scrolledUV = uv().add(vec2(time.mul(0.1), 0));
material.colorNode = texture(map, scrolledUV);
```

---

## Dissolve

```javascript
const noise = hash(positionLocal.mul(50));
const threshold = uniform(0.5);

If(noise.lessThan(threshold), () => {
  Discard();
});

// Edge glow
const edge = smoothstep(threshold, threshold.add(0.1), noise);
material.emissiveNode = color(0xff5500).mul(float(1.0).sub(edge));
```

---

## Hologram

```javascript
// Scanlines
const scanline = positionWorld.y.mul(50).sin().mul(0.5).add(0.5);

// Fresnel
const viewDir = cameraPosition.sub(positionWorld).normalize();
const fresnel = float(1.0).sub(normalWorld.dot(viewDir).saturate()).pow(2.0);

material.colorNode = color(0x00ffff).mul(0.3);
material.emissiveNode = color(0x00ffff).mul(fresnel.add(scanline.mul(0.3)));
material.opacityNode = float(0.7);
material.transparent = true;
```

---

## Energy Shield

```javascript
const fresnel = Fn(() => {
  const viewDir = cameraPosition.sub(positionWorld).normalize();
  return float(1.0).sub(normalWorld.dot(viewDir).saturate()).pow(1.5);
});

material.colorNode = color(0x000033);
material.emissiveNode = color(0x00ffff).mul(fresnel());
material.opacityNode = fresnel().mul(0.8).add(0.1);
material.transparent = true;
material.side = THREE.DoubleSide;
```

---

## Glass

```javascript
const material = new THREE.MeshPhysicalNodeMaterial();
material.colorNode = color(0xffffff);
material.transmissionNode = float(0.95);
material.roughnessNode = float(0.0);
material.metalnessNode = float(0.0);
material.iorNode = float(1.5);
material.thicknessNode = float(0.5);
```

---

## Vertex Wave

```javascript
const wave = sin(positionLocal.x.mul(5).add(time.mul(3))).mul(0.1);
material.positionNode = positionLocal.add(vec3(0, wave, 0));
```

---

## Noise Pattern

```javascript
// Simple hash-based noise
const noise = Fn(([p]) => {
  return fract(p.dot(vec3(12.9898, 78.233, 45.543)).sin().mul(43758.5453));
});

const n = noise(positionLocal.mul(10));
material.colorNode = vec3(n, n, n);
```

---

## Rainbow/Iridescence

```javascript
const viewDir = cameraPosition.sub(positionWorld).normalize();
const angle = normalWorld.dot(viewDir);

// Map angle to hue
const hue = angle.mul(0.5).add(0.5);
const rgb = vec3(
  hue.mul(6).sub(3).abs().sub(1).saturate(),
  float(2).sub(hue.mul(6).sub(2).abs()).saturate(),
  float(2).sub(hue.mul(6).sub(4).abs()).saturate()
);

material.colorNode = rgb;
```

---

## Debug Visualizations

```javascript
// Visualize normals
material.colorNode = normalWorld.mul(0.5).add(0.5);

// Visualize UVs
material.colorNode = vec3(uv().x, uv().y, 0);

// Visualize depth
material.colorNode = vec3(positionView.z.negate().div(10).saturate());
```
