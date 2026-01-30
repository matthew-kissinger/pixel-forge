#!/usr/bin/env bun
/**
 * Test Claude SDK with OAuth Token (from Claude Code credentials)
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Load OAuth token from Claude Code credentials
function loadOAuthToken(): string {
  const credPath = join(homedir(), '.claude', '.credentials.json');
  try {
    const creds = JSON.parse(readFileSync(credPath, 'utf-8'));
    const token = creds?.claudeAiOauth?.accessToken;
    if (!token) throw new Error('No accessToken in credentials');
    return token;
  } catch (err) {
    console.error('Failed to load OAuth token from', credPath);
    throw err;
  }
}

const GLB_SYSTEM_PROMPT = `You are a 3D asset generator for games. You write TypeScript code that creates low-poly 3D models using Three.js.

## Output Format
Output ONLY valid TypeScript code. No markdown fences, no explanations. Define:
1. \`meta\` - Asset metadata object
2. \`build()\` - Returns THREE.Object3D
3. \`animate(root)\` - Returns AnimationClip[] (optional)

## Available Primitives (in scope)
- \`createRoot(name)\`, \`createPivot(name, [x,y,z], parent)\`
- \`createPart(name, geo, mat, {position?, rotation?, pivot?, parent?})\`
- \`boxGeo(w,h,d)\`, \`sphereGeo(r)\`, \`cylinderGeo(rT,rB,h)\`, \`capsuleGeo(r,h)\`, \`coneGeo(r,h)\`
- \`gameMaterial(color, {metalness?, roughness?, emissive?})\`
- \`spinAnimation(joint, dur, axis)\`, \`bobbingAnimation(root, dur, h)\`

## Rules
1. Keep code MINIMAL
2. Ground at y=0
3. Colors as hex: 0xff0000
4. Use \`{pivot:true}\` for animated parts`;

async function test() {
  console.log('Loading OAuth token from Claude Code credentials...');
  const token = loadOAuthToken();
  console.log(`Token loaded (${token.slice(0, 20)}...)\n`);

  // Create client with OAuth token as API key
  const anthropic = new Anthropic({
    apiKey: token,
  });

  const userPrompt = `Create prop: a glowing crystal gem that slowly spins

Output ONLY TypeScript code.`;

  console.log('=== USER PROMPT ===');
  console.log(userPrompt);
  console.log('\n=== CALLING CLAUDE (claude-sonnet-4-5-20250929) ===\n');

  try {
    const start = Date.now();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: GLB_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const elapsed = Date.now() - start;

    console.log('=== GENERATED CODE ===\n');
    const text = response.content.find((b) => b.type === 'text');
    if (text && text.type === 'text') {
      console.log(text.text);
    }

    console.log('\n=== STATS ===');
    console.log(`Time: ${elapsed}ms`);
    console.log(`Input tokens: ${response.usage.input_tokens}`);
    console.log(`Output tokens: ${response.usage.output_tokens}`);
    console.log(`Model: ${response.model}`);

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('ERROR:', error.message);
      if ('status' in error) console.error('Status:', (error as { status: number }).status);
    } else {
      console.error('ERROR:', error);
    }
  }
}

test();
