import { MeshStandardNodeMaterial } from 'three/webgpu';
import { color, float, time, positionWorld, mix, smoothstep } from 'three/tsl';

const material = new MeshStandardNodeMaterial();

// Pulsing fire effect - orange to yellow to bright white
const pulseSpeed = time.mul(3.0);
const pulse = pulseSpeed.sin().mul(0.5).add(0.5);

// Gradient based on world Y position for fire variation
const heightFactor = positionWorld.y.mul(0.8);
const gradientPulse = heightFactor.add(pulse);

// Color mix: deep orange -> bright yellow -> white hot
const deepOrange = color(0xff4400);
const brightYellow = color(0xffaa00);
const whiteHot = color(0xffffdd);

const midColor = mix(deepOrange, brightYellow, smoothstep(0.3, 0.7, gradientPulse));
const finalColor = mix(midColor, whiteHot, smoothstep(0.6, 1.0, pulse));

// Strong emissive for glowing fire effect
material.colorNode = finalColor;
material.emissiveNode = finalColor.mul(1.5);
material.roughness = 0.8;
material.metalness = 0.0;

export { material };
