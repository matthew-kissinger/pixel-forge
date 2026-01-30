#!/usr/bin/env bun
/**
 * Test Claude SDK Integration
 *
 * Run: bun run scripts/test-claude.ts
 *
 * Requires ANTHROPIC_API_KEY in .env.local
 */

import Anthropic from '@anthropic-ai/sdk';

const GLB_SYSTEM_PROMPT = `You are a 3D asset generator for games. You write TypeScript code that creates low-poly 3D models using Three.js. Output must be GLB-exportable.

## Output Format

Output ONLY valid TypeScript code. No markdown, no explanations. Define:

1. \`meta\` - Asset metadata object
2. \`build()\` - Returns THREE.Object3D
3. \`animate(root)\` - Returns AnimationClip[] (optional)

## Available Primitives (in scope, don't import)

**Geometry:**
- \`createRoot(name)\` - Root Object3D
- \`createPivot(name, [x,y,z], parent)\` - Animation joint
- \`createPart(name, geo, mat, {position?, rotation?, scale?, pivot?, parent?})\`

**Shapes:**
- \`boxGeo(w, h, d)\`
- \`sphereGeo(radius, wSeg=8, hSeg=6)\`
- \`cylinderGeo(rTop, rBot, h, seg=8)\`
- \`capsuleGeo(r, h, seg=6)\`
- \`coneGeo(r, h, seg=8)\`
- \`torusGeo(r, tube, rSeg=8, tSeg=12)\`

**Materials (GLB-compatible):**
- \`gameMaterial(color, {metalness?, roughness?, emissive?, flatShading?})\`
- \`lambertMaterial(color, {flatShading?, emissive?})\`
- \`basicMaterial(color, {transparent?, opacity?})\`

**Animation:**
- \`rotationTrack(joint, [{time, rotation:[x,y,z]}])\` - Degrees
- \`positionTrack(joint, [{time, position:[x,y,z]}])\`
- \`createClip(name, duration, tracks)\`
- \`idleBreathing(joint, dur, amt)\`, \`bobbingAnimation(root, dur, h)\`, \`spinAnimation(joint, dur, axis)\`

## Constraints

Characters: 5000 tris, 5 mats | Props: 2000 tris, 4 mats | VFX: 1000 tris, 2 mats

## Rules

1. Keep code MINIMAL - no comments, no extra whitespace
2. Ground at y=0, build upward
3. Character body pivot at y=1.0 (feet touch ground)
4. Colors as hex: 0xff0000 not "#ff0000"
5. Animations must loop (end = start)
6. Use \`{pivot:true}\` for animated parts`;

async function testGeneration() {
  console.log('Testing Claude SDK for Kiln code generation...\n');

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY not found in environment');
    console.error('Add it to packages/server/.env.local:');
    console.error('  ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  const anthropic = new Anthropic();

  // Test prompt
  const userPrompt = `Create prop: a glowing crystal gem that spins

Output ONLY TypeScript code, no markdown.`;

  console.log('=== SYSTEM PROMPT ===');
  console.log(GLB_SYSTEM_PROMPT.slice(0, 500) + '...\n');

  console.log('=== USER PROMPT ===');
  console.log(userPrompt + '\n');

  console.log('=== CALLING CLAUDE (claude-sonnet-4-5-20250929) ===\n');

  try {
    const startTime = Date.now();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: GLB_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const elapsed = Date.now() - startTime;

    console.log('=== RESPONSE ===\n');

    const textBlock = response.content.find((b) => b.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      console.log(textBlock.text);
    }

    console.log('\n=== STATS ===');
    console.log(`Time: ${elapsed}ms`);
    console.log(`Input tokens: ${response.usage.input_tokens}`);
    console.log(`Output tokens: ${response.usage.output_tokens}`);
    console.log(`Stop reason: ${response.stop_reason}`);

  } catch (error) {
    console.error('ERROR:', error);
  }
}

testGeneration();
