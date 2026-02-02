import { MeshStandardNodeMaterial } from 'three/webgpu';
import { color, float, time, positionWorld, normalWorld, cameraPosition } from 'three/tsl';

const material = new MeshStandardNodeMaterial();

// Pulsing fire glow effect
const pulse = time.mul(4).sin().mul(0.3).add(0.7);

// Fresnel rim light (dragon scales catching light)
const viewDir = cameraPosition.sub(positionWorld).normalize();
const fresnel = float(1).sub(normalWorld.dot(viewDir)).pow(3).mul(0.5);

// Animated heat distortion on fire parts
const heatWave = time.mul(8).add(positionWorld.y.mul(5)).sin().mul(0.1).add(0.9);

// Combine: base brown/orange with pulsing fire glow and rim lighting
const dragonColor = color(0x8b4513).mul(float(0.8).add(fresnel.mul(0.4)));
const fireGlow = color(0xff4500).mul(pulse).mul(heatWave);

// Mix based on emissive strength (fire parts have high emissive)
material.colorNode = dragonColor.add(fireGlow.mul(0.3));
material.emissiveNode = fireGlow.mul(pulse);

export { material };