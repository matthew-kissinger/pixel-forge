/**
 * Generate Sprint 4 2D assets:
 * - Match End / Debrief Background (11.4)
 * - Damage direction indicator (11.16)
 * - Hit marker (11.17)
 * - Kill skull icon (11.18)
 * - Vietnam Jungle Skybox (12.1)
 *
 * Screen backgrounds: full frame, no bg removal.
 * HUD icons: white on blue #0000FF with BiRefNet.
 * Skybox: full frame panorama, no bg removal.
 */

import sharp from 'sharp';

const SERVER = 'http://localhost:3000';
const ICONS_DIR = './war-assets/ui/icons';
const SCREENS_DIR = './war-assets/ui/screens';
const HUD_DIR = './war-assets/ui/hud';
const SKYBOX_DIR = './war-assets/skybox';

const ICON_STYLE = '32-bit pixel art icon, bold white geometric shape, simple clean silhouette, thick pixel outlines, minimal detail, readable at small size, game HUD icon, no text, no labels, no words, game asset on solid blue #0000FF background, entire background is flat solid blue #0000FF with no gradients';

async function apiPost(endpoint: string, body: Record<string, unknown>, retries = 3): Promise<Record<string, unknown>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const resp = await fetch(`${SERVER}/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resp.ok) return resp.json() as Promise<Record<string, unknown>>;
    console.log(`    Attempt ${attempt}/${retries} failed (${resp.status})`);
    if (attempt < retries) await new Promise(r => setTimeout(r, 10000));
    else {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(`API ${endpoint} failed: ${JSON.stringify(err)}`);
    }
  }
  throw new Error('unreachable');
}

async function chromaCleanBlue(buf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data.buffer);
  let cleaned = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if (b > 150 && r < 100 && g < 100) { pixels[i + 3] = 0; cleaned++; }
  }
  if (cleaned > 0) console.log(`    Chroma blue: ${cleaned} px`);
  return sharp(Buffer.from(pixels), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

try {
  const health = await fetch(`${SERVER}/health`);
  if (!health.ok) throw new Error('not ok');
} catch {
  console.error('Server not reachable. Start with: bun run dev:server');
  process.exit(1);
}

// === Match End Background ===
console.log('=== Match End / Debrief Background ===');
{
  const prompt = '32-bit pixel art video game debrief screen background, Vietnam War dusk scene, silhouettes of soldiers walking single file toward distant firebase perimeter, UH-1 Huey helicopter landed on ground with rotors still, smoke columns rising from treeline, dramatic deep orange and purple sunset sky, dark jungle treeline, moody end-of-mission atmosphere, detailed pixel art with visible pixels, rich saturated colors, no text, no UI elements, widescreen 16:9';
  const gen = await apiPost('image/generate', { prompt, aspectRatio: '16:9' });
  if (!gen.image) { console.error('  FAILED'); } else {
    const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(rawB64, 'base64');
    await Bun.write(`${SCREENS_DIR}/match-end-screen.png`, buf);
    console.log(`  Saved: ${(buf.length / 1024).toFixed(0)}KB`);
  }
}

// === Damage Direction Indicator ===
console.log('\n=== Damage Direction Indicator ===');
{
  const prompt = 'red blood splatter directional damage indicator arc, semi-transparent red crescent arc shape pointing upward, blood drip effect at edges, FPS damage HUD overlay element, no text, no labels, game asset on solid blue #0000FF background, entire background is flat solid blue #0000FF with no gradients';
  const gen = await apiPost('image/generate', { prompt, aspectRatio: '1:1' });
  if (!gen.image) { console.error('  FAILED'); } else {
    const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
    await Bun.write(`${HUD_DIR}/damage-indicator_raw.png`, Buffer.from(rawB64, 'base64'));

    const bgResult = await apiPost('image/remove-bg', { image: gen.image });
    if (bgResult.image) {
      const bgB64 = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
      const clean = await chromaCleanBlue(Buffer.from(bgB64, 'base64'));
      await Bun.write(`${HUD_DIR}/damage-indicator.png`, clean);
      console.log(`  Saved: ${(clean.length / 1024).toFixed(0)}KB`);
    }
  }
}

// === Hit Marker ===
console.log('\n=== Hit Marker ===');
{
  const prompt = 'white hit marker crosshair confirmation icon, thin white X shape with small gap in center, four short diagonal lines radiating outward from center, military FPS hitmarker style, bold clean, no text, game asset on solid blue #0000FF background, entire background is flat solid blue #0000FF with no gradients';
  const gen = await apiPost('image/generate', { prompt, aspectRatio: '1:1' });
  if (!gen.image) { console.error('  FAILED'); } else {
    const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
    await Bun.write(`${HUD_DIR}/hit-marker_raw.png`, Buffer.from(rawB64, 'base64'));

    const bgResult = await apiPost('image/remove-bg', { image: gen.image });
    if (bgResult.image) {
      const bgB64 = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
      const clean = await chromaCleanBlue(Buffer.from(bgB64, 'base64'));
      await Bun.write(`${HUD_DIR}/hit-marker.png`, clean);
      console.log(`  Saved: ${(clean.length / 1024).toFixed(0)}KB`);
    }
  }
}

// === Kill Skull ===
console.log('\n=== Kill Skull Icon ===');
{
  const prompt = 'white skull and crossbones icon, small military style skull with two crossed bones underneath, clean white silhouette, bold pixel art, no text, game asset on solid blue #0000FF background, entire background is flat solid blue #0000FF with no gradients';
  const gen = await apiPost('image/generate', { prompt, aspectRatio: '1:1' });
  if (!gen.image) { console.error('  FAILED'); } else {
    const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
    await Bun.write(`${HUD_DIR}/kill-skull_raw.png`, Buffer.from(rawB64, 'base64'));

    const bgResult = await apiPost('image/remove-bg', { image: gen.image });
    if (bgResult.image) {
      const bgB64 = (bgResult.image as string).replace(/^data:image\/\w+;base64,/, '');
      const clean = await chromaCleanBlue(Buffer.from(bgB64, 'base64'));
      await Bun.write(`${HUD_DIR}/kill-skull.png`, clean);
      console.log(`  Saved: ${(clean.length / 1024).toFixed(0)}KB`);
    }
  }
}

// === Skybox ===
console.log('\n=== Vietnam Jungle Skybox ===');
{
  const prompt = 'Vietnam tropical sky panorama, humid hazy light blue sky with scattered white cumulus clouds, tropical sun suggesting mid-morning position upper right, slight golden warm haze on horizon line, thin wispy clouds at different heights, seamless panoramic sky texture, photorealistic sky for game engine skybox, no ground, no trees, no objects, just sky and clouds, wide panoramic view';
  const gen = await apiPost('image/generate', { prompt, aspectRatio: '16:9' });
  if (!gen.image) { console.error('  FAILED'); } else {
    const rawB64 = (gen.image as string).replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(rawB64, 'base64');
    await Bun.write(`${SKYBOX_DIR}/skybox.png`, buf);
    console.log(`  Saved: ${(buf.length / 1024).toFixed(0)}KB`);
  }
}

console.log('\nDone! Check http://localhost:3000/gallery');
