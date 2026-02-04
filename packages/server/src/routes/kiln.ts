/**
 * Kiln API Routes
 *
 * POST /api/kiln/generate - Generate 3D asset code from prompt
 * POST /api/kiln/stream   - Stream code generation (SSE)
 * POST /api/kiln/compact  - Compact bloated code
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import {
  generateKilnCode,
  streamKilnCode,
  compactCode,
  refactorCode,
  type KilnGenerateRequest,
  type RefactorRequest,
} from '../services/claude';
import { BadRequestError } from '../lib/errors';
import type { GenerateKilnCodeOptions, GenerateKilnCodeResponse } from '@pixel-forge/shared';

export const kilnRouter = new Hono();

// Request validation schema
const generateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  mode: z.enum(['glb', 'tsl', 'both']).default('glb'),
  category: z.enum(['character', 'prop', 'vfx', 'environment']).default('prop'),
  style: z.enum(['low-poly', 'stylized', 'voxel']).optional(),
  includeAnimation: z.boolean().default(true),
  existingCode: z.string().optional(),
  referenceImageUrl: z.string().url().optional(),
});

/**
 * POST /api/kiln/generate
 *
 * Generate 3D asset code from a text prompt.
 *
 * Request body:
 * {
 *   prompt: "a low-poly knight with sword",
 *   mode: "glb" | "tsl",
 *   category: "character" | "prop" | "vfx" | "environment",
 *   style?: "low-poly" | "stylized" | "voxel",
 *   existingCode?: string,  // For edits
 *   referenceImageUrl?: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   code: "const meta = {...}; function build() {...}",
 *   usage: { inputTokens: 123, outputTokens: 456 }
 * }
 */
kilnRouter.post('/generate', async (c) => {
  const body = await c.req.json();
  const parsed = generateSchema.safeParse(body);

  if (!parsed.success) {
    throw new BadRequestError(
      `Invalid request: ${parsed.error.issues.map((e) => e.message).join(', ')}`
    );
  }

  const request: GenerateKilnCodeOptions = {
    prompt: parsed.data.prompt,
    mode: parsed.data.mode as any,
    category: parsed.data.category as any,
    style: parsed.data.style as any,
    includeAnimation: parsed.data.includeAnimation,
    existingCode: parsed.data.existingCode,
    referenceImageUrl: parsed.data.referenceImageUrl,
  };

  const result = await generateKilnCode(request as any);

  if (!result.success) {
    return c.json<GenerateKilnCodeResponse>({ success: false, error: result.error }, 500);
  }

  return c.json<GenerateKilnCodeResponse>({
    success: true,
    code: result.code,
    effectCode: result.effectCode,
    outputDir: result.outputDir,
    usage: result.usage,
  });
});

/**
 * POST /api/kiln/stream
 *
 * Stream code generation using Server-Sent Events.
 * Useful for real-time feedback in the UI.
 */
kilnRouter.post('/stream', async (c) => {
  const body = await c.req.json();
  const parsed = generateSchema.safeParse(body);

  if (!parsed.success) {
    throw new BadRequestError('Invalid request');
  }

  const request: KilnGenerateRequest = {
    prompt: parsed.data.prompt,
    mode: parsed.data.mode,
    category: parsed.data.category,
    style: parsed.data.style,
    existingCode: parsed.data.existingCode,
  };

  return streamSSE(c, async (stream) => {
    for await (const event of streamKilnCode(request)) {
      await stream.writeSSE({
        event: event.type,
        data: event.data,
      });
    }
  });
});

/**
 * POST /api/kiln/compact
 *
 * Compact bloated code to reduce size while preserving functionality.
 *
 * Request body:
 * { code: "...bloated code..." }
 *
 * Response:
 * { success: true, code: "...compact code..." }
 */
kilnRouter.post('/compact', async (c) => {
  const { code } = await c.req.json();

  if (!code || typeof code !== 'string') {
    throw new BadRequestError('Code is required');
  }

  const result = await compactCode(code);

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 500);
  }

  return c.json({
    success: true,
    code: result.code,
  });
});

/**
 * POST /api/kiln/refactor
 *
 * Refactor existing code based on instructions.
 *
 * Request body:
 * {
 *   instruction: "Add more detail to the handle",
 *   geometryCode?: string,
 *   effectCode?: string,
 *   outputDir?: string,  // If provided, writes files directly
 *   target: "geometry" | "effect" | "both"
 * }
 */
const refactorSchema = z.object({
  instruction: z.string().min(1).max(2000),
  geometryCode: z.string().optional(),
  effectCode: z.string().optional(),
  outputDir: z.string().optional(),
  target: z.enum(['geometry', 'effect', 'both']).default('both'),
});

kilnRouter.post('/refactor', async (c) => {
  const body = await c.req.json();
  const parsed = refactorSchema.safeParse(body);

  if (!parsed.success) {
    throw new BadRequestError(
      `Invalid request: ${parsed.error.issues.map((e) => e.message).join(', ')}`
    );
  }

  if (!parsed.data.geometryCode && !parsed.data.effectCode) {
    throw new BadRequestError('At least one of geometryCode or effectCode is required');
  }

  const request: RefactorRequest = {
    instruction: parsed.data.instruction,
    geometryCode: parsed.data.geometryCode,
    effectCode: parsed.data.effectCode,
    outputDir: parsed.data.outputDir,
    target: parsed.data.target,
  };

  const result = await refactorCode(request);

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 500);
  }

  return c.json({
    success: true,
    code: result.code,
    effectCode: result.effectCode,
  });
});
