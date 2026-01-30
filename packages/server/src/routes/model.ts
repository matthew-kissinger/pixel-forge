import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { generateModel, getModelStatus } from '../services/fal';
import { BadRequestError, NotFoundError } from '../lib/errors';

const modelRouter = new Hono();

// Art styles for 3D models
const model3DStyles = ['low-poly', 'realistic', 'sculpture'] as const;

const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000),
  artStyle: z.enum(model3DStyles).optional().default('low-poly'),
});

modelRouter.post(
  '/generate',
  zValidator('json', generateSchema),
  async (c) => {
    const { prompt, artStyle } = c.req.valid('json');

    try {
      const result = await generateModel(prompt);
      return c.json(result);
    } catch (error) {
      console.error('3D model generation error:', error);
      throw new BadRequestError(
        error instanceof Error ? error.message : '3D model generation failed'
      );
    }
  }
);

modelRouter.get('/status/:id', async (c) => {
  const requestId = c.req.param('id');

  if (!requestId || requestId.length < 10) {
    throw new BadRequestError('Invalid request ID');
  }

  try {
    const status = getModelStatus(requestId);

    // Return 404 if request not found
    if (status.status === 'failed' && status.error === 'Request not found') {
      throw new NotFoundError(`Request ${requestId} not found`);
    }

    return c.json(status);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError) {
      throw error;
    }
    console.error('Status check error:', error);
    throw new BadRequestError(
      error instanceof Error ? error.message : 'Status check failed'
    );
  }
});

export { modelRouter };
