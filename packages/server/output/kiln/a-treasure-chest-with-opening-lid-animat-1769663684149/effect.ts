import { MeshStandardNodeMaterial } from 'three/webgpu';
import { color, float, time, positionWorld, normalWorld, cameraPosition, vec3 } from 'three/tsl';

const material = new MeshStandardNodeMaterial();

// Pulsing golden glow effect
const pulse = time.mul(2.0).sin().mul(0.3).add(0.7);

// Fresnel rim glow for magical treasure effect
const worldNormal = normalWorld.normalize();
const viewDir = cameraPosition.sub(positionWorld).normalize();
const fresnel = float(1.0).sub(viewDir.dot(worldNormal)).pow(3.0);

// Golden base color with pulsing brightness
const goldColor = color(0xFFD700);
const brightGold = color(0xFFFF88);
const baseColor = goldColor.mix(brightGold, pulse.mul(0.4));

// Emissive glow that pulses and responds to viewing angle
const emissiveGlow = color(0xFFAA00).mul(pulse).mul(fresnel.mul(2.0));

material.colorNode = baseColor;
material.emissiveNode = emissiveGlow;
material.metalnessNode = float(0.8);
material.roughnessNode = float(0.3);

export { material };
