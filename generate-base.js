import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PROMPT = `Space station base sprite for top-down space shooter game.

REQUIREMENTS:
- 256x256 pixel dimensions
- Circular/symmetrical space station design
- 4-6 docking bays/modules arranged around central hub
- Central shield generator core with bright cyan glow
- Dark metallic gray/black structure (#1a1a1a, #2d2d2d)
- Cyan accent lights (#00FFFF, #00CED1)
- White structural highlights
- Defense outpost aesthetic
- Top-down orthographic view
- Transparent background
- Pixel art style

STYLE REFERENCE:
- Clean pixel art (not overly detailed)
- Similar to existing game assets: dark navy spacecraft with cyan thrusters
- Military sci-fi aesthetic
- Clear readable silhouette for gameplay visibility
- Bioluminescent cyan energy glow in core and docking points

The station should look like a defendable military outpost with visible docking bays, shield generators, and defensive architecture. Central core should be the focal point with cyan energy shield visible.`;

async function generateVariation(index) {
  console.log(`\nGenerating variation ${index}...`);

  const model = genAI.getGenerativeModel({
    model: 'nano-banana-pro-preview',
  });

  const result = await model.generateContent([PROMPT]);

  const response = await result.response;
  const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;

  if (!imageData) {
    throw new Error('No image data in response');
  }

  const buffer = Buffer.from(imageData.data, 'base64');
  const outputDir = join(process.cwd(), 'output');
  await mkdir(outputDir, { recursive: true });

  const filename = `base-v${index}.png`;
  const filepath = join(outputDir, filename);
  await writeFile(filepath, buffer);

  const sizeKB = (buffer.length / 1024).toFixed(2);
  console.log(`✓ Saved ${filename} (${sizeKB} KB)`);

  return { filepath, filename, sizeKB: parseFloat(sizeKB) };
}

async function main() {
  console.log('Generating base.png variations for Space Laser...\n');
  console.log('Using model: nano-banana-pro-preview');
  console.log('Target: 256x256px, transparent background, <50KB\n');

  const results = [];

  for (let i = 1; i <= 5; i++) {
    try {
      const result = await generateVariation(i);
      results.push(result);
      // Rate limiting pause
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`✗ Variation ${i} failed:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('GENERATION COMPLETE');
  console.log('='.repeat(50));
  console.log(`\nGenerated ${results.length} variations:`);
  results.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.filename} - ${r.sizeKB} KB`);
  });
  console.log('\nReview variations in output/ directory');
  console.log('Select best one and optimize if needed for <50KB target');
}

main().catch(console.error);
