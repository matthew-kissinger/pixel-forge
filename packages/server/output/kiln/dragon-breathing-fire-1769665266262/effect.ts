import { MeshStandardNodeMaterial } from 'three/webgpu';
import { color, float, vec3, time, positionWorld, normalWorld, cameraPosition } from 'three/tsl';

const material = new MeshStandardNodeMaterial();

// Pulsing fire glow effect
const pulseSpeed = time.mul(4.0);
const pulse = pulseSpeed.sin().mul(0.3).add(0.7);

// Distance-based intensity for fire parts
const worldPos = positionWorld;
const fireCenter = vec3(0, 1.8, 1.2);
const distanceToFire = worldPos.sub(fireCenter).length();
const fireInfluence = float(1.0).sub(distanceToFire.div(3.0)).max(0.0);

// Fresnel effect for dragon scales
const viewDir = cameraPosition.sub(positionWorld).normalize();
const fresnel = float(1.0).sub(normalWorld.dot(viewDir).abs()).pow(2.0);

// Fire color gradient
const fireGlow = color(0xff4500).mul(pulse).mul(fireInfluence);
const emberGlow = color(0xff6600).mul(pulse.mul(0.8));

// Dragon body with subtle rim lighting
const baseColor = color(0x8b4513);
const rimLight = color(0xff8800).mul(fresnel).mul(0.4);

// Combine effects
material.colorNode = baseColor.add(rimLight).add(fireGlow.mul(0.3));
material.emissiveNode = fireGlow.add(emberGlow.mul(fresnel)).mul(pulse);
material.roughnessNode = float(0.7).sub(fresnel.mul(0.3));
material.metalnessNode = float(0.2).add(fresnel.mul(0.3));

export { material };
