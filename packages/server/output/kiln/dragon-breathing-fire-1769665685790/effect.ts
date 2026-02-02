import { MeshStandardNodeMaterial } from 'three/webgpu';
import { color, float, vec3, time, positionWorld, normalWorld, cameraPosition } from 'three/tsl';

const material = new MeshStandardNodeMaterial();

// Pulsing fire glow effect
const pulse = time.mul(4.0).sin().mul(0.3).add(0.7);

// Fresnel effect for dragon body
const viewDirection = cameraPosition.sub(positionWorld).normalize();
const fresnel = float(1.0).sub(normalWorld.dot(viewDirection)).pow(3.0);

// Combine base color with fresnel rim lighting
const baseColor = color(0x8B4513);
const rimColor = color(0xFF4500);
const finalColor = baseColor.mix(rimColor, fresnel.mul(0.4));

// Add pulsing to emissive parts (fire breath)
const emissiveColor = color(0xFF4500).mul(pulse);

material.colorNode = finalColor;
material.emissiveNode = emissiveColor.mul(0.8);
material.roughness = 0.7;
material.metalness = 0.1;

export { material };