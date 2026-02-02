import { MeshStandardNodeMaterial } from 'three/webgpu';
import { color, float, vec3, time, positionWorld, normalWorld, cameraPosition } from 'three/tsl';

const material = new MeshStandardNodeMaterial();

// Fresnel edge glow
const viewDirection = cameraPosition.sub(positionWorld).normalize();
const fresnel = float(1.0).sub(viewDirection.dot(normalWorld)).pow(3.0);

// Pulsing fire glow effect
const pulseSpeed = time.mul(4.0);
const pulse = pulseSpeed.sin().mul(0.3).add(0.7);

// Fire color gradient (orange to yellow)
const fireCore = color(0xffff00);
const fireEdge = color(0xff4500);
const fireGlow = fireEdge.mul(pulse).add(fireCore.mul(fresnel.mul(0.5)));

// Body scales shimmer
const shimmer = positionWorld.y.mul(3.0).add(time.mul(2.0)).sin().mul(0.1).add(0.9);
const bodyColor = color(0x8b0000).mul(shimmer);

// Combine body with fire glow
material.colorNode = bodyColor.add(fireGlow.mul(0.2));

// Emissive fire glow for eyes and flames
const emissiveGlow = fireGlow.mul(fresnel.mul(2.0));
material.emissiveNode = emissiveGlow;

// Slight opacity variation for fire transparency effect
const fireOpacity = pulse.mul(0.2).add(0.8);
material.opacityNode = fireOpacity;

export { material };
