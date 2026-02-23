/**
 * Generate "Terror in the Jungle" start screen background.
 *
 * Concept: Vietnam War jungle scene at golden hour with Huey helicopter.
 * Style: 32-bit pixel art with subtle 3D depth, cinematic widescreen.
 * No bg removal - this is a full-frame background.
 */

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/ui/screens';

async function apiPost(endpoint: string, body: Record<string, unknown>) {
  const resp = await fetch(`${SERVER}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(`API ${endpoint} failed (${resp.status}): ${JSON.stringify(err)}`);
  }
  return resp.json() as Promise<Record<string, unknown>>;
}

// Check server
try {
  const health = await fetch(`${SERVER}/health`);
  if (!health.ok) throw new Error('not ok');
} catch {
  console.error('Server not reachable. Start with: bun run dev:server');
  process.exit(1);
}

console.log('=== Generating Terror in the Jungle Start Screen ===\n');

const prompt = `32-bit pixel art video game title screen background, Vietnam War jungle scene. Dense dark green tropical jungle canopy fills the bottom two thirds. A single UH-1 Huey helicopter silhouette flies low over the treeline from the left, slightly tilted forward. Golden hour sunset sky with deep orange and amber light rays cutting through layered mist and haze between the trees. Dark foreground jungle silhouettes create depth layers - closest trees darkest, distant trees fade into warm golden haze. Atmospheric perspective with 3 distinct depth layers: dark foreground foliage, mid-ground treeline with helicopter, distant misty golden sky. Moody, dramatic, cinematic composition. Rich saturated pixel art colors, visible pixel texture throughout, clean hard edges, no anti-aliasing, no blur, no text, no UI elements, no characters on ground, widescreen 16:9 game title screen`;

console.log('  Generating...');
const gen = await apiPost('image/generate', { prompt, aspectRatio: '16:9' });

if (!gen.image) {
  console.error('  FAILED');
  process.exit(1);
}

const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
const buf = Buffer.from(rawB64, 'base64');
await Bun.write(`${OUT_DIR}/start-screen.png`, buf);
console.log(`  Saved: ${(buf.length / 1024).toFixed(0)}KB`);

console.log('\nDone! Check http://localhost:3000/gallery');
