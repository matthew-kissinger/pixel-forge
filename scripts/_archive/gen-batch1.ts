// Batch 1: Vegetation Billboards (5 assets)
// Generates with red background, then removes background via BiRefNet

const SERVER = 'http://localhost:3000';
const OUT_DIR = './war-assets/vegetation';

const assets = [
  {
    name: 'jungle-fern',
    prompt: 'Dense cluster of tropical ferns, bright green fronds, Vietnam jungle undergrowth, side view from ground level, game asset sprite on solid red #FF0000 background, 512x512, clean crisp edges for billboard cutout, painted art style, no shadows on background',
  },
  {
    name: 'elephant-ear-plants',
    prompt: 'Cluster of elephant ear plants (Colocasia gigantea), huge heart-shaped leaves in dark green, Vietnam tropical jungle floor, side view, game asset sprite on solid red #FF0000 background, 512x512, clean crisp edges for billboard cutout, painted art style, no shadows on background',
  },
  {
    name: 'fan-palm-cluster',
    prompt: 'Vietnamese fan palm cluster (Licuala grandis), circular fan-shaped fronds on slender stems, tropical jungle understory, side view, game asset sprite on solid red #FF0000 background, 512x512, clean crisp edges for billboard cutout, painted art style, no shadows on background',
  },
  {
    name: 'coconut-palm',
    prompt: 'Tall coconut palm tree, full view from base to crown, slender curved trunk, drooping fronds with coconut clusters, Vietnam tropical coast, side view, game asset sprite on solid red #FF0000 background, 512x512, clean crisp edges for billboard cutout, painted art style, no shadows on background',
  },
  {
    name: 'areca-palm-cluster',
    prompt: 'Cluster of areca betel nut palms, 3-4 slender ringed trunks, feathery pinnate fronds, Vietnam jungle mid-canopy, side view, game asset sprite on solid red #FF0000 background, 512x512, clean crisp edges for billboard cutout, painted art style, no shadows on background',
  },
];

for (const [i, asset] of assets.entries()) {
  console.log(`\n[${i + 1}/5] Generating: ${asset.name}...`);

  // Generate image via Gemini
  const genResp = await fetch(`${SERVER}/api/image/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: asset.prompt, aspectRatio: '1:1' }),
  });
  const genData = await genResp.json() as { image?: string; error?: string };

  if (!genData.image) {
    console.log(`  FAILED: ${genData.error || 'no image returned'}`);
    continue;
  }
  console.log(`  Generated (${genData.image.length} chars)`);

  // Save raw (with red background)
  const rawBase64 = genData.image.replace(/^data:image\/\w+;base64,/, '');
  await Bun.write(`${OUT_DIR}/${asset.name}_raw.png`, Buffer.from(rawBase64, 'base64'));
  console.log(`  Saved ${asset.name}_raw.png`);

  // Remove background via BiRefNet
  const bgResp = await fetch(`${SERVER}/api/image/remove-bg`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: genData.image }),
  });
  const bgData = await bgResp.json() as { image?: string; error?: string };

  if (!bgData.image) {
    console.log(`  BG removal FAILED: ${bgData.error || 'no image'}`);
    continue;
  }

  const cleanBase64 = bgData.image.replace(/^data:image\/\w+;base64,/, '');
  await Bun.write(`${OUT_DIR}/${asset.name}.png`, Buffer.from(cleanBase64, 'base64'));

  const rawSize = Buffer.from(rawBase64, 'base64').length;
  const cleanSize = Buffer.from(cleanBase64, 'base64').length;
  console.log(`  Saved ${asset.name}.png (${(cleanSize / 1024).toFixed(0)}KB, bg removed from ${(rawSize / 1024).toFixed(0)}KB raw)`);
}

console.log('\nBatch 1 complete! Files in war-assets/vegetation/');
