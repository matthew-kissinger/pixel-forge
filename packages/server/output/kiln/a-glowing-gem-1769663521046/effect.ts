import { MeshStandardNodeMaterial } from 'three/webgpu';
import { color, float, vec3, time, positionWorld, normalWorld, cameraPosition } from 'three/tsl';

const material = new MeshStandardNodeMaterial();

// Cyan base color with pulsing brightness
const pulseSpeed = time.mul(2.0);
const pulse = pulseSpeed.sin().mul(0.3).add(0.7);
const baseColor = color(0x00ffff).mul(pulse);

// Fresnel glow effect
const viewDir = cameraPosition.sub(positionWorld).normalize();
const fresnel = viewDir.dot(normalWorld).abs().oneMinus().pow(3.0);

// Animated glow intensity
const glowPulse = time.mul(1.5).sin().mul(0.5).add(0.5);
const glowColor = color(0x00ffff).mul(fresnel).mul(glowPulse.mul(2.0));

// Combine base color with glow
material.colorNode = baseColor;
material.emissiveNode = glowColor.add(color(0x0088aa).mul(pulse.mul(0.5)));
material.metalnessNode = float(0.3);
material.roughnessNode = float(0.2);

export { material };
