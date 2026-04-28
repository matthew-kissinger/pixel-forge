/**
 * Provider interfaces that W3 implementations will satisfy.
 *
 * Every provider:
 * - advertises an `.id` matching `ProviderId`
 * - exposes `.capabilities` (the row from the capability matrix, not just the id)
 * - returns rich structured outputs from its methods
 * - throws structured errors from `../errors.ts` — never raw `Error` instances
 *
 * These interfaces intentionally stay thin: pipelines (W4) compose multiple
 * providers; this file is the provider contract, nothing more.
 */

import type { ProviderCapabilities } from '../capabilities';
import type {
  ImageGenerateInput,
  ImageEditInput,
  ImageGenerateOutput,
  TextureGenerateInput,
  TextureGenerateOutput,
  BgRemovalInput,
  BgRemovalOutput,
  TextTo3DGenerateInput,
  TextTo3DGenerateOutput,
  CodeGenInput,
  CodeGenOutput,
  CodeRefactorInput,
  CodeCompactInput,
} from '../schemas/image';

// =============================================================================
// Image generation
// =============================================================================

/**
 * Providers of text-to-image and ref-to-image generation. Current
 * implementations will be `gemini`, `openai`. FAL's image endpoints live
 * under {@link TextureProvider} / {@link BgRemovalProvider} — FAL is not a
 * general-purpose image provider in this codebase.
 */
export interface ImageProvider {
  readonly id: 'gemini' | 'openai';
  readonly capabilities: ProviderCapabilities;

  /**
   * Text-only image generation. No reference images.
   * Throws {@link ProviderCapabilityMismatch} if the caller requests a
   * feature the provider's capability row disclaims (e.g. transparency on
   * a provider that has supportsTransparency=false).
   */
  generate(input: ImageGenerateInput): Promise<ImageGenerateOutput>;

  /**
   * Image generation with reference images (multi-ref edit / style transfer).
   * Throws {@link ProviderCapabilityMismatch} if `refs.length` exceeds the
   * model's `maxRefs`.
   */
  editWithRefs(input: ImageEditInput): Promise<ImageGenerateOutput>;
}

// =============================================================================
// Texture generation
// =============================================================================

/**
 * Providers of tileable terrain texture generation. Currently FAL-only
 * (`fal-ai/flux-lora` + Seamless Texture LoRA until a FLUX 2-compatible LoRA exists).
 */
export interface TextureProvider {
  readonly id: 'fal';
  readonly capabilities: ProviderCapabilities;

  generate(input: TextureGenerateInput): Promise<TextureGenerateOutput>;
}

// =============================================================================
// Background removal
// =============================================================================

/**
 * Providers of background removal (BiRefNet). Currently FAL-only.
 */
export interface BgRemovalProvider {
  readonly id: 'fal';
  readonly capabilities: ProviderCapabilities;

  remove(input: BgRemovalInput): Promise<BgRemovalOutput>;
}

// =============================================================================
// Text-to-3D model generation
// =============================================================================

export interface TextTo3DQueueUpdate {
  status?: string;
  message?: string;
  progress?: number;
  logs?: Array<{ message?: string }>;
}

export interface TextTo3DGenerateOptions {
  onQueueUpdate?: (update: TextTo3DQueueUpdate) => void;
}

/**
 * Providers of direct text-to-3D model generation. This is separate from
 * Kiln code-gen: outputs are provider-hosted model URLs, not core-validated
 * primitive source.
 */
export interface TextTo3DProvider {
  readonly id: 'fal';
  readonly capabilities: ProviderCapabilities;

  generate(
    input: TextTo3DGenerateInput,
    opts?: TextTo3DGenerateOptions,
  ): Promise<TextTo3DGenerateOutput>;
}

// =============================================================================
// Code generation (Kiln)
// =============================================================================

/**
 * Providers that emit structured code (currently Kiln code -> GLB). Only
 * Anthropic (Claude Opus/Sonnet) is a registered code-gen provider.
 */
export interface CodeGenProvider {
  readonly id: 'anthropic';
  readonly capabilities: ProviderCapabilities;

  /** Generate fresh Kiln code from a prompt + category/style/budget hints. */
  generate(input: CodeGenInput): Promise<CodeGenOutput>;

  /** Refactor existing code against a free-form instruction. */
  refactor(input: CodeRefactorInput): Promise<CodeGenOutput>;

  /** Compact code towards a token budget (fewer parts, simpler geometry). */
  compact(input: CodeCompactInput): Promise<CodeGenOutput>;
}

// =============================================================================
// Convenience union
// =============================================================================

export type AnyProvider =
  | ImageProvider
  | TextureProvider
  | BgRemovalProvider
  | TextTo3DProvider
  | CodeGenProvider;
