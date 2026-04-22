/**
 * Fake / stub providers used across pipeline tests.
 *
 * These satisfy the W3a interfaces in `providers/types.ts` without
 * making real HTTP calls. Most tests build a magenta-tinted PNG once
 * via `solidColorPng()` and feed it through the pipelines.
 */

import sharp from 'sharp';

import { capabilitiesFor } from '../../../capabilities';
import {
  ProviderRateLimited,
} from '../../../errors';
import type {
  BgRemovalProvider,
  ImageProvider,
  TextureProvider,
} from '../../../providers/types';
import type {
  BgRemovalInput,
  BgRemovalOutput,
  ImageEditInput,
  ImageGenerateInput,
  ImageGenerateOutput,
  TextureGenerateInput,
  TextureGenerateOutput,
} from '../../../schemas/image';

// =============================================================================
// PNG factory
// =============================================================================

/** Build a solid-color PNG. Useful as a fake provider's return value. */
export async function solidColorPng(
  width: number,
  height: number,
  rgb: [number, number, number]
): Promise<Buffer> {
  const raw = new Uint8Array(width * height * 4);
  for (let i = 0; i < raw.length; i += 4) {
    raw[i] = rgb[0]!;
    raw[i + 1] = rgb[1]!;
    raw[i + 2] = rgb[2]!;
    raw[i + 3] = 255;
  }
  return sharp(Buffer.from(raw), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

// =============================================================================
// Image provider
// =============================================================================

export interface FakeImageProviderOptions {
  /** PNG to return from generate() and editWithRefs(). */
  image: Buffer;
  /** Provider id to claim (default: gemini). */
  id?: 'gemini' | 'openai';
  /** Reported model. */
  model?: string;
  /** Throw on every call — useful for error-wrapping tests. */
  throwOnCall?: Error;
  /** Throw a structured ProviderRateLimited (drives retry tests). */
  rateLimitOnce?: boolean;
}

export class FakeImageProvider implements ImageProvider {
  readonly id: 'gemini' | 'openai';
  readonly capabilities;
  generateCalls = 0;
  editWithRefsCalls = 0;
  lastPrompt = '';
  lastRefs: Buffer[] = [];
  private rateLimited = false;

  constructor(private readonly opts: FakeImageProviderOptions) {
    this.id = opts.id ?? 'gemini';
    const caps = capabilitiesFor(this.id);
    if (!caps) throw new Error(`No capabilities for ${this.id}`);
    this.capabilities = caps;
    if (opts.rateLimitOnce) this.rateLimited = true;
  }

  async generate(input: ImageGenerateInput): Promise<ImageGenerateOutput> {
    this.generateCalls++;
    this.lastPrompt = input.prompt;
    return this.respond();
  }

  async editWithRefs(input: ImageEditInput): Promise<ImageGenerateOutput> {
    this.editWithRefsCalls++;
    this.lastPrompt = input.prompt;
    this.lastRefs = input.refs;
    return this.respond();
  }

  private async respond(): Promise<ImageGenerateOutput> {
    if (this.opts.throwOnCall) throw this.opts.throwOnCall;
    if (this.rateLimited) {
      this.rateLimited = false;
      throw new ProviderRateLimited({
        provider: this.id,
        message: 'fake rate limit',
        retryAfterSec: 1,
      });
    }
    return {
      image: this.opts.image,
      provider: this.id,
      model: this.opts.model ?? 'gemini-3.1-flash-image-preview',
      meta: { latencyMs: 5, costUsd: 0.001, warnings: [] },
    };
  }
}

// =============================================================================
// Bg-removal provider
// =============================================================================

export interface FakeBgRemovalOptions {
  /** PNG to return — typically the same magenta image, since chroma cleans it. */
  image: Buffer;
  throwOnCall?: Error;
}

export class FakeBgRemovalProvider implements BgRemovalProvider {
  readonly id = 'fal' as const;
  readonly capabilities;
  removeCalls = 0;

  constructor(private readonly opts: FakeBgRemovalOptions) {
    const caps = capabilitiesFor('fal');
    if (!caps) throw new Error('No capabilities for fal');
    this.capabilities = caps;
  }

  async remove(_input: BgRemovalInput): Promise<BgRemovalOutput> {
    this.removeCalls++;
    if (this.opts.throwOnCall) throw this.opts.throwOnCall;
    return {
      image: this.opts.image,
      meta: { latencyMs: 3, warnings: [] },
    };
  }
}

// =============================================================================
// Texture provider
// =============================================================================

export interface FakeTextureOptions {
  /** PNG to return from generate(). */
  image: Buffer;
  throwOnCall?: Error;
}

export class FakeTextureProvider implements TextureProvider {
  readonly id = 'fal' as const;
  readonly capabilities;
  generateCalls = 0;
  lastPrompt = '';

  constructor(private readonly opts: FakeTextureOptions) {
    const caps = capabilitiesFor('fal');
    if (!caps) throw new Error('No capabilities for fal');
    this.capabilities = caps;
  }

  async generate(input: TextureGenerateInput): Promise<TextureGenerateOutput> {
    this.generateCalls++;
    this.lastPrompt = input.description;
    if (this.opts.throwOnCall) throw this.opts.throwOnCall;
    return {
      image: this.opts.image,
      meta: { latencyMs: 10, costUsd: 0.002, warnings: [] },
    };
  }
}
