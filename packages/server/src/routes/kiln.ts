/**
 * Kiln API Routes
 *
 * POST /api/kiln/generate  - Generate 3D asset code from prompt
 * POST /api/kiln/compact   - Compact bloated code
 * POST /api/kiln/refactor  - Refactor existing code
 *
 * All code-generation work happens in @pixel-forge/core/kiln. This route
 * module is now just the HTTP adapter: validate input, delegate, shape
 * the response.
 */

import { Hono } from 'hono';
import { z } from 'zod';
// Routed through the server's thin service wrapper so existing test-mocks
// (`mock.module('../src/services/claude', ...)`) keep intercepting calls.
// The wrapper itself is a re-export of `@pixel-forge/core/kiln`.
import {
  generateKilnCode,
  compactCode,
  refactorCode,
  type KilnGenerateRequest,
  type RefactorRequest,
} from '../services/claude';
import { BadRequestError } from '../lib/errors';
import { logger } from '@pixel-forge/shared/logger';
import type { GenerateKilnCodeResponse } from '@pixel-forge/shared';

export const kilnRouter = new Hono();

// Request validation schema
const generateSchema = z.object({
  prompt: z.string().min(1).max(8000),
  mode: z.enum(['glb', 'tsl', 'both']).default('glb'),
  category: z.enum(['character', 'prop', 'vfx', 'environment']).default('prop'),
  style: z.enum(['low-poly', 'stylized', 'voxel', 'detailed', 'realistic']).optional(),
  includeAnimation: z.boolean().default(true),
  existingCode: z.string().optional(),
  referenceImageUrl: z.string().url().optional(),
});

/**
 * POST /api/kiln/generate
 *
 * Generate 3D asset code from a text prompt using structured output.
 */
kilnRouter.post('/generate', async (c) => {
  const body = await c.req.json();
  const parsed = generateSchema.safeParse(body);

  if (!parsed.success) {
    throw new BadRequestError(
      `Invalid request: ${parsed.error.issues.map((e) => e.message).join(', ')}`
    );
  }

  const request: KilnGenerateRequest = {
    prompt: parsed.data.prompt,
    mode: parsed.data.mode,
    category: parsed.data.category,
    style: parsed.data.style,
    includeAnimation: parsed.data.includeAnimation,
    existingCode: parsed.data.existingCode,
    referenceImageUrl: parsed.data.referenceImageUrl,
  };

  const assetName = request.prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'asset';
  logger.info('[Kiln] Generating:', assetName);
  logger.debug('[Kiln] Mode:', request.mode, '| Category:', request.category);

  const result = await generateKilnCode(request);

  if (!result.success) {
    logger.error('[Kiln] Generation failed:', result.error);
    return c.json<GenerateKilnCodeResponse>({ success: false, error: result.error }, 500);
  }

  return c.json<GenerateKilnCodeResponse>({
    success: true,
    code: result.code,
    effectCode: result.effectCode,
    usage: result.usage,
  });
});

/**
 * POST /api/kiln/compact
 *
 * Compact bloated code to reduce size while preserving functionality.
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
 */
const refactorSchema = z.object({
  instruction: z.string().min(1).max(2000),
  geometryCode: z.string().optional(),
  effectCode: z.string().optional(),
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
