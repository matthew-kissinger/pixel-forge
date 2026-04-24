/**
 * Direct-API Kiln generator. Bypasses `@anthropic-ai/claude-agent-sdk`
 * (which hangs on this Windows + bun + nested-Claude-Code setup) and
 * calls Anthropic's messages API directly via `@anthropic-ai/sdk`.
 *
 * Outputs: { code, glb, meta, warnings } — same shape as the GLB
 * pipeline output, so scripts can substitute this for `glb.run()`.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  buildUserPrompt,
  getSystemPrompt,
  renderGLB,
  type KilnGenerateRequest,
} from '@pixel-forge/core/kiln';

const DEFAULT_MODEL =
  process.env['KILN_MODEL'] ??
  process.env['PIXEL_FORGE_MODEL'] ??
  'claude-opus-4-7';

export interface DirectGenerateOpts {
  model?: string;
  maxTokens?: number;
  /**
   * Error text from the previous attempt. Threaded back to the model as a
   * follow-up user turn so it can self-correct instead of re-emitting the
   * same faulty code.
   */
  priorError?: string;
  /** Previous attempt's source (for diff-style correction). */
  priorCode?: string;
  /**
   * Optional list of non-fatal validation warnings from a render that
   * otherwise succeeded (stray planes, floating parts). When present the
   * model is asked to repair the listed issues.
   */
  priorWarnings?: string[];
}

export interface DirectGenerateResult {
  code: string;
  glb: Buffer;
  meta: Awaited<ReturnType<typeof renderGLB>>['meta'];
  warnings: string[];
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function directGenerate(
  request: KilnGenerateRequest,
  opts: DirectGenerateOpts = {},
): Promise<DirectGenerateResult> {
  const userPrompt = buildUserPrompt(request);
  const systemPrompt = getSystemPrompt(request.mode);

  const model = opts.model ?? DEFAULT_MODEL;
  const maxTokens = opts.maxTokens ?? 16000;

  const instructions = `
PRIMITIVES API (all globals, no imports needed):
- Y-axis defaults: \`cylinderGeo\`, \`capsuleGeo\`, \`coneGeo\`. Aliases \`cylinderYGeo\`, \`capsuleYGeo\`, \`coneYGeo\` also work.
- X-axis explicit: \`cylinderXGeo\`, \`capsuleXGeo\`, \`coneXGeo\`.
- Z-axis explicit: \`cylinderZGeo\`, \`capsuleZGeo\`, \`coneZGeo\`.
- Decals on no-texture assets (red stars, hull numbers, stamps, windows rendered as colored rectangles): use \`decalBox(width, height, depth=0.01)\` placed on the surface with position + rotation. Do NOT use \`planeGeo\` for colored decals — it renders as a disconnected 2-tri rectangle when not textured.
- Attachment is part of correctness: every mesh must touch another mesh or a named pivot. Floating geometry will be flagged and fail retry.

Your output must be EXACTLY one JavaScript code block enclosed in triple
backticks. No prose, no explanation — just the code block.

\`\`\`javascript
const meta = { ... };
function build() { ... }
function animate(root) { ... }
\`\`\`
`;

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: userPrompt + '\n' + instructions,
    },
  ];

  // Error-feedback retry. When the caller passes a prior failed attempt plus
  // the runtime error (or a list of validation warnings), we replay the prior
  // assistant turn and ask for a targeted fix. This lets the model self-
  // correct rather than re-emit the same faulty code.
  if (opts.priorCode && (opts.priorError || opts.priorWarnings?.length)) {
    messages.push({
      role: 'assistant',
      content: '```javascript\n' + opts.priorCode + '\n```',
    });
    const feedbackLines: string[] = [];
    if (opts.priorError) {
      feedbackLines.push(
        `The previous attempt failed at runtime with: ${opts.priorError}`,
      );
    }
    if (opts.priorWarnings?.length) {
      feedbackLines.push('The previous attempt produced these validation warnings:');
      for (const w of opts.priorWarnings) feedbackLines.push(`  - ${w}`);
    }
    feedbackLines.push(
      '',
      'Fix the specific issues above and output the FULL corrected code block.',
      'Do not reply with a diff. Emit the entire updated file wrapped in one ```javascript fence.',
    );
    messages.push({ role: 'user', content: feedbackLines.join('\n') });
  }

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  let text = '';
  for (const block of response.content) {
    if (block.type === 'text') text += block.text;
  }

  const codeMatch = text.match(/```(?:javascript|js|typescript|ts)?\n?([\s\S]*?)\n?```/);
  const code = codeMatch?.[1]?.trim() ?? text.trim();

  if (!code) {
    throw new Error('No code extracted from response. Raw: ' + text.slice(0, 400));
  }

  let render: Awaited<ReturnType<typeof renderGLB>>;
  try {
    render = await renderGLB(code);
  } catch (err) {
    // Stash the generated code on the thrown error so the batch harness can
    // replay it as context on the next attempt. Without this the model loses
    // track of what it wrote and usually regenerates the same mistake.
    const e = err as Error & { priorCode?: string };
    e.priorCode = code;
    throw e;
  }

  return {
    code,
    glb: render.glb,
    meta: render.meta,
    warnings: render.warnings,
  };
}
