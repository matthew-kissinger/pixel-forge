/**
 * Claude SDK Integration for Kiln Code Generation
 *
 * Uses structured output (JSON schema) - no file I/O, no tools.
 * Prompts and validation imported from shared package.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { logger } from '@pixel-forge/shared/logger';
import {
  getSystemPrompt,
  buildUserPrompt,
  type KilnGenerateRequest,
} from '@pixel-forge/shared/kiln-prompts';
import { validateKilnCode } from '@pixel-forge/shared/kiln-validation';
import type {
  GenerateKilnCodeResponse,
  KilnRenderMode as RenderMode,
} from '@pixel-forge/shared';

// =============================================================================
// Types
// =============================================================================

export type { KilnGenerateRequest };

export interface KilnGenerateResponse extends GenerateKilnCodeResponse {
  sessionId?: string;
}

export interface RefactorRequest {
  instruction: string;
  geometryCode?: string;
  effectCode?: string;
  target: 'geometry' | 'effect' | 'both';
}

// =============================================================================
// Structured Output Schema
// =============================================================================

const KILN_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', description: 'JavaScript code with const meta, function build(), and optionally function animate()' },
    effectCode: { type: 'string', description: 'TSL shader code (for tsl/both modes only)' },
  },
  required: ['code'],
};

// =============================================================================
// Main Generation
// =============================================================================

export async function generateKilnCode(
  request: KilnGenerateRequest
): Promise<KilnGenerateResponse> {
  try {
    const userPrompt = buildUserPrompt(request);
    const systemPrompt = getSystemPrompt(request.mode);

    const assetName = request.prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'asset';

    logger.info('[Kiln] Generating:', assetName);
    logger.debug('[Kiln] Mode:', request.mode, '| Category:', request.category);

    const result = await runStructuredQuery(userPrompt, systemPrompt, request.mode);

    if (!result.success) {
      return result;
    }

    // Validate GLB code
    if (result.code && request.mode !== 'tsl') {
      const validation = validateKilnCode(result.code);
      if (!validation.valid) {
        logger.info('[Kiln] Validation failed, retrying with feedback:', validation.errors);
        return retryWithFeedback(request, result.code, validation.errors);
      }
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Claude generation error:', error);
    return { success: false, error: message };
  }
}

// =============================================================================
// Edit Code
// =============================================================================

export async function editKilnCode(
  currentCode: string,
  editRequest: string,
  mode: RenderMode = 'glb'
): Promise<KilnGenerateResponse> {
  return generateKilnCode({
    prompt: editRequest,
    mode,
    category: 'prop',
    existingCode: currentCode,
  });
}

// =============================================================================
// Compact Code
// =============================================================================

export async function compactCode(
  code: string
): Promise<KilnGenerateResponse> {
  try {
    const q = query({
      prompt: `Code golf this Three.js code - minimize characters while producing IDENTICAL visual output.

- Shorten variable names
- Remove whitespace and comments
- Inline simple expressions
- Reuse identical materials/geometries
- Keep EXACT same visual result

\`\`\`typescript
${code}
\`\`\`

Output minified code only.`,
      options: {
        model: 'claude-haiku-4-5-20251001',
        maxTurns: 1,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
      },
    });

    let result = '';
    for await (const message of q) {
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            result += block.text;
          }
        }
      }
    }

    // Extract code from markdown fences if present
    const codeMatch = result.match(/```(?:typescript|ts|javascript|js)?\n?([\s\S]*?)\n?```/);
    if (codeMatch?.[1]) {
      result = codeMatch[1];
    }

    return { success: true, code: result.trim() };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// =============================================================================
// Refactor Code
// =============================================================================

export async function refactorCode(
  request: RefactorRequest
): Promise<KilnGenerateResponse> {
  try {
    const codeContext: string[] = [];
    if (request.geometryCode) {
      codeContext.push(`## Current Geometry Code\n\`\`\`typescript\n${request.geometryCode}\n\`\`\``);
    }
    if (request.effectCode) {
      codeContext.push(`## Current Effect Code\n\`\`\`typescript\n${request.effectCode}\n\`\`\``);
    }

    const outputInstructions = request.target === 'both'
      ? 'Update BOTH geometry and effect code'
      : request.target === 'geometry'
      ? 'Update only the geometry code'
      : 'Update only the effect code';

    const prompt = `${codeContext.join('\n\n')}

## Refactor Instructions
${request.instruction}

## Task
${outputInstructions}`;

    const systemPrompt = `You are refactoring existing 3D asset code.
Preserve the asset's character and style while applying the requested changes.
Keep working code - only modify what's necessary for the refactor.`;

    const q = query({
      prompt,
      options: {
        model: 'claude-opus-4-7',
        systemPrompt,
        maxTurns: 1,
        outputFormat: {
          type: 'json_schema',
          schema: KILN_OUTPUT_SCHEMA,
        },
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
      },
    });

    let sessionId: string | undefined;

    for await (const message of q) {
      if (message.type === 'result' && message.subtype === 'success') {
        sessionId = message.session_id;
        if (message.structured_output) {
          const output = message.structured_output as { code: string; effectCode?: string };
          return { success: true, code: output.code, effectCode: output.effectCode, sessionId };
        }
        // Fallback: parse result text
        return parseResultText(message.result, sessionId);
      }
      if (message.type === 'result' && message.subtype?.startsWith('error')) {
        const errMsg = (message as Record<string, unknown>).errors;
        return { success: false, error: Array.isArray(errMsg) ? errMsg.join('; ') : 'Refactor failed' };
      }
      if (message.type === 'auth_status' && message.error) {
        return { success: false, error: `Auth failed: ${message.error}. Run "claude auth login".` };
      }
    }

    return { success: false, error: 'No result received from refactor query' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// =============================================================================
// Internal Helpers
// =============================================================================

async function runStructuredQuery(
  userPrompt: string,
  systemPrompt: string,
  _mode: RenderMode
): Promise<KilnGenerateResponse> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    logger.error('[Kiln] Agent query timed out after 120s');
    abortController.abort();
  }, 300_000);

  try {
    const q = query({
      prompt: userPrompt,
      options: {
        abortController,
        model: 'claude-opus-4-7',
        systemPrompt,
        maxTurns: 3,
        outputFormat: {
          type: 'json_schema',
          schema: KILN_OUTPUT_SCHEMA,
        },
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
      },
    });

    logger.info('[Kiln] Starting structured query...');

    for await (const message of q) {
      if (message.type === 'result' && message.subtype === 'success') {
        logger.info('[Kiln] Query succeeded, session:', message.session_id);
        if (message.structured_output) {
          const output = message.structured_output as { code: string; effectCode?: string };
          return {
            success: true,
            code: output.code,
            effectCode: output.effectCode,
            sessionId: message.session_id,
          };
        }
        // Fallback: parse result text if structured output is missing
        return parseResultText(message.result, message.session_id);
      }
      if (message.type === 'result' && message.subtype?.startsWith('error')) {
        const errors = (message as Record<string, unknown>).errors;
        logger.error('[Kiln] Query error:', errors);
        return { success: false, error: Array.isArray(errors) ? errors.join('; ') : 'Generation failed' };
      }
      if (message.type === 'auth_status' && message.error) {
        logger.error('[Kiln] Auth error:', message.error);
        return { success: false, error: `Auth failed: ${message.error}. Run "claude auth login".` };
      }
      if (message.type === 'system' && message.subtype === 'init') {
        logger.info('[Kiln] Agent initialized, model:', message.model);
      }
    }

    return { success: false, error: 'No result received from query' };
  } finally {
    clearTimeout(timeout);
  }
}

async function retryWithFeedback(
  request: KilnGenerateRequest,
  failedCode: string,
  errors: string[]
): Promise<KilnGenerateResponse> {
  const retryPrompt = `Previous attempt had validation errors:
${errors.map(e => `- ${e}`).join('\n')}

Failed code:
\`\`\`javascript
${failedCode}
\`\`\`

Fix these issues and regenerate. Remember: NO imports, NO exports, use rotation:/position: not value: in keyframes.`;

  const systemPrompt = getSystemPrompt(request.mode);

  try {
    return await runStructuredQuery(retryPrompt, systemPrompt, request.mode);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Retry failed: ${message}` };
  }
}

function parseResultText(result: string, sessionId?: string): KilnGenerateResponse {
  if (!result) {
    return { success: false, error: 'Empty result text' };
  }

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(result);
    if (parsed.code) {
      return { success: true, code: parsed.code, effectCode: parsed.effectCode, sessionId };
    }
  } catch {
    // Not JSON, try to extract code blocks
  }

  // Extract geometry code block
  const geoMatch = result.match(/```(?:geometry|typescript|javascript|js)?\n?([\s\S]*?function build[\s\S]*?)```/);
  if (geoMatch?.[1]) {
    const effectMatch = result.match(/```(?:effect|typescript)\n?(import[\s\S]*?export \{ material \}[\s\S]*?)```/);
    return {
      success: true,
      code: geoMatch[1].trim(),
      effectCode: effectMatch?.[1]?.trim(),
      sessionId,
    };
  }

  // Last resort: return the raw result as code
  return { success: true, code: result.trim(), sessionId };
}
