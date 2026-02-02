import { MeshStandardNodeMaterial } from 'three/webgpu';
import { color, float, time, positionWorld, normalWorld, cameraPosition, vec3 } from 'three/tsl';

const material = new MeshStandardNodeMaterial();

// Animated fire glow effect
const fireGlow = time.mul(8.0).sin().mul(0.5).add(0.5);
const fireIntensity = time.mul(12.0).cos().mul(0.3).add(0.7);

// Fresnel effect for dragon scales
const viewDir = cameraPosition.sub(positionWorld).normalize();
const fresnel = float(1.0).sub(normalWorld.dot(viewDir)).pow(3.0);

// Fire color gradient
const fireColor1 = color(0xff4400);
const fireColor2 = color(0xffaa00);
const fireMix = fireGlow.mul(fireIntensity);
const fireColorResult = fireColor1.mix(fireColor2, fireMix);

// Dragon body color with subtle edge glow
const bodyColor = color(0x8b4513);
const edgeGlow = color(0xff6600).mul(fresnel).mul(0.3);
const finalColor = bodyColor.add(edgeGlow);

// Apply fire effect to fire particles (conditional based on position)
const isFireParticle = positionWorld.y.lessThan(float(2.0));
material.colorNode = isFireParticle.select(fireColorResult, finalColor);

// Emissive for fire particles
const fireEmissive = fireColor2.mul(fireIntensity).mul(2.0);
const bodyEmissive = color(0x000000);
material.emissiveNode = isFireParticle.select(fireEmissive, bodyEmissive);

// Pulsing opacity for fire
const fireOpacity = fireGlow.mul(0.4).add(0.6);
const bodyOpacity = float(1.0);
material.opacityNode = isFireParticle.select(fireOpacity, bodyOpacity);

export { material };