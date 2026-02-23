/**
 * Generate Sprint 2 screen backgrounds: Loadout + Loading screens.
 * Full-frame backgrounds, no bg removal.
 */

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/ui/screens';

async function apiPost(endpoint: string, body: Record<string, unknown>) {
  const resp = await fetch(`${SERVER}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`API ${endpoint} failed (${resp.status})`);
  return resp.json() as Promise<Record<string, unknown>>;
}

try {
  const health = await fetch(`${SERVER}/health`);
  if (!health.ok) throw new Error('not ok');
} catch {
  console.error('Server not reachable. Start with: bun run dev:server');
  process.exit(1);
}

const screens = [
  {
    name: 'loadout-screen',
    prompt: '32-bit pixel art video game loadout screen background, Vietnam War firebase interior, wooden table with military map spread out, weapons laid out on table (M16 rifle, pistol, grenades), ammo pouches and magazines, PRC-25 radio with handset, sandbag wall in background, warm kerosene lamp light casting orange glow, atmospheric military planning scene, detailed pixel art with visible pixels, rich saturated colors, no text, no UI elements, widescreen 16:9',
  },
  {
    name: 'loading-screen',
    prompt: '32-bit pixel art video game loading screen background, Vietnam War aerial view from inside helicopter looking down, dense tropical jungle canopy stretching to horizon, muddy brown river winding through green jungle, scattered white clouds below, door gunner silhouette in foreground frame, golden green tropical tones, atmospheric haze in distance, detailed pixel art with visible pixels, rich saturated colors, no text, no UI elements, widescreen 16:9',
  },
];

for (const screen of screens) {
  console.log(`=== ${screen.name} ===`);

  const gen = await apiPost('image/generate', { prompt: screen.prompt, aspectRatio: '16:9' });
  if (!gen.image) { console.error('  FAILED'); continue; }

  const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
  const buf = Buffer.from(rawB64, 'base64');
  await Bun.write(`${OUT_DIR}/${screen.name}.png`, buf);
  console.log(`  Saved: ${(buf.length / 1024).toFixed(0)}KB`);
}

console.log('\nDone!');
