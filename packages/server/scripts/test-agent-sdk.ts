#!/usr/bin/env bun
/**
 * Test Claude Agent SDK (uses Claude Code's authenticated session)
 */

import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';

const GLB_SYSTEM_PROMPT = `You are a 3D asset generator. Output ONLY TypeScript code. Define:
1. \`meta\` object with name and category
2. \`build()\` function returning THREE.Object3D
3. \`animate(root)\` function returning AnimationClip[] (optional)

Available primitives (in scope):
- createRoot(name), createPivot(name, [x,y,z], parent)
- createPart(name, geo, mat, {position?, rotation?, pivot?, parent?})
- boxGeo(w,h,d), sphereGeo(r), capsuleGeo(r,h), coneGeo(r,h)
- gameMaterial(color, {emissive?}), spinAnimation(joint, dur, axis)

Keep code minimal. No comments. Colors as hex: 0xff0000`;

async function test() {
  console.log('Testing Claude Agent SDK (AsyncGenerator)...\n');

  const userPrompt = `Create prop: a glowing crystal gem that spins

Output ONLY the TypeScript code, no explanation.`;

  console.log('=== USER PROMPT ===');
  console.log(userPrompt);
  console.log('\n=== CALLING CLAUDE AGENT SDK ===\n');

  try {
    // query() returns an AsyncGenerator<SDKMessage>
    const q = query({
      prompt: userPrompt,
      options: {
        model: 'sonnet',
        systemPrompt: GLB_SYSTEM_PROMPT,
        maxTurns: 1,
      },
    });

    let fullText = '';

    // Iterate over the async generator
    for await (const message of q) {
      // Log message type
      if (message.type === 'assistant') {
        // Assistant message with content
        if (message.message?.content) {
          for (const block of message.message.content) {
            if (block.type === 'text') {
              process.stdout.write(block.text);
              fullText += block.text;
            }
          }
        }
      } else if (message.type === 'result') {
        console.log('\n\n=== RESULT ===');
        // costUSD is not supported by current SDK version
        console.log('Session ID:', message.session_id);
      } else {
        // Log other message types
        console.log(`[${message.type}]`, JSON.stringify(message).slice(0, 200));
      }
    }

    console.log('\n\n=== FULL OUTPUT ===');
    console.log(fullText || '(no text output)');

  } catch (error) {
    console.error('ERROR:', error);
  }
}

test();
