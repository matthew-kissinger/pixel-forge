/**
 * Provider capability matrix — agent-queryable routing facts.
 *
 * Static data distilled from the current provider catalog and
 * docs/gpt-image-2-investigation.md. Keep prices / latencies approximate;
 * this table is for routing decisions, not for billing.
 *
 * Consumers:
 * - `pickProviderFor({ refs: 8, transparency: true })` → routing hint
 * - `capabilitiesFor('openai')` → full detail before an API call
 * - `capabilities()` → iterate everything (useful for CLI `providers list`)
 */

// =============================================================================
// Types
// =============================================================================

export type ProviderId = 'gemini' | 'openai' | 'fal' | 'anthropic';

export type CapabilityKind = 'image' | 'texture' | 'bg-removal' | 'model-3d' | 'code-gen';

export interface ModelCapability {
  /** Provider-native model ID (e.g. `'gpt-image-2'`). */
  id: string;
  /** True if this model is the provider's recommended default for its kind. */
  default?: boolean;
  /** Whether the model can take reference / edit images. */
  supportsRefs: boolean;
  /** Upper bound on ref images. Undefined if `supportsRefs` is false. */
  maxRefs?: number;
  /** Whether the model can emit a transparent background natively. */
  supportsTransparency: boolean;
  /** Approximate USD per image (or per model output). */
  pricePerImage?: number;
  /** Approximate wall-clock latency in ms. */
  avgLatencyMs?: number;
  /** Short agent-readable tags — positive attributes. */
  strengths: string[];
  /** Short agent-readable tags — known limitations. */
  weaknesses?: string[];
}

export interface ProviderCapabilities {
  id: ProviderId;
  kind: CapabilityKind;
  models: ModelCapability[];
  rateLimit?: {
    perMinute?: number;
    note?: string;
  };
}

// =============================================================================
// Matrix — keep in sync with docs/model-catalog-*.md snapshots
// =============================================================================

const MATRIX: ProviderCapabilities[] = [
  // ------------------------------------------------------------------- Gemini
  {
    id: 'gemini',
    kind: 'image',
    models: [
      {
        id: 'gemini-3.1-flash-image-preview',
        default: true,
        supportsRefs: true,
        maxRefs: 14,
        // Gemini outputs on solid bg, we chroma-key — it does not natively
        // emit alpha. Flag false so routing picks OpenAI when true transparency
        // is required.
        supportsTransparency: false,
        pricePerImage: 0.04,
        avgLatencyMs: 20_000,
        strengths: ['batch pricing', 'chroma compliance', 'fast'],
        weaknesses: ['no native transparency', 'weaker multi-ref fidelity than gpt-image-2'],
      },
      {
        id: 'gemini-3-pro-image-preview',
        supportsRefs: true,
        maxRefs: 14,
        supportsTransparency: false,
        pricePerImage: 0.15,
        avgLatencyMs: 35_000,
        strengths: ['text rendering', 'instruction following', 'hero assets'],
        weaknesses: ['3-4x cost vs flash', 'no native transparency'],
      },
    ],
    rateLimit: { note: 'Per-minute limits; expect 429 at ~25-30 req/min on image gen.' },
  },

  // ------------------------------------------------------------------- OpenAI
  {
    id: 'openai',
    kind: 'image',
    models: [
      {
        id: 'gpt-image-2',
        // Default for ref-heavy workflows; router picks based on input shape.
        supportsRefs: true,
        maxRefs: 16,
        // gpt-image-2 does NOT support background:'transparent'. Pipeline
        // generates on solid magenta and strips via BiRefNet + chroma.
        // Flag `supportsTransparency: false` so a request asking for real
        // alpha still routes to 1.5.
        supportsTransparency: false,
        pricePerImage: 0.15,
        avgLatencyMs: 100_000,
        strengths: [
          'multi-ref fidelity',
          'faction detail extraction',
          'pose transfer',
          '2K native',
        ],
        weaknesses: ['slow (~100s)', 'no transparent bg param', 'higher cost'],
      },
      {
        id: 'gpt-image-1.5',
        default: true,
        supportsRefs: true,
        maxRefs: 16,
        supportsTransparency: true,
        pricePerImage: 0.08,
        avgLatencyMs: 30_000,
        strengths: ['crisp pixel outlines', 'fast', 'native transparency', '2x cheaper than gpt-image-2'],
        weaknesses: ['weaker ref fidelity than gpt-image-2'],
      },
    ],
    rateLimit: {
      note: 'Tier-based; see platform.openai.com usage. 429 emits Retry-After.',
    },
  },

  // ---------------------------------------------------------------------- FAL
  {
    id: 'fal',
    kind: 'texture',
    models: [
      {
        id: 'fal-ai/flux-lora',
        default: true,
        supportsRefs: false,
        supportsTransparency: false,
        // FLUX 1 LoRA remains the current default because the available
        // Seamless Texture LoRA is FLUX-1-trained. FLUX 2 rejects it (422).
        pricePerImage: 0.002,
        avgLatencyMs: 25_000,
        strengths: ['seamless tiles via Seamless-Texture-LoRA', 'retro palette compatible'],
        weaknesses: ['not for sprites', 'textures only', 'requires FLUX-2-compatible LoRA before endpoint upgrade'],
      },
    ],
  },
  {
    id: 'fal',
    kind: 'bg-removal',
    models: [
      {
        id: 'fal-ai/birefnet/v2',
        default: true,
        supportsRefs: false,
        supportsTransparency: true,
        pricePerImage: 0.003,
        avgLatencyMs: 8_000,
        strengths: ['clean edges on solid-bg subjects', 'BiRefNet v2 Heavy variant cleaner on fine edges'],
        weaknesses: ['eats into solid white fills (icons)', 'destroys colored emblems'],
      },
    ],
  },
  {
    id: 'fal',
    kind: 'model-3d',
    models: [
      {
        id: 'fal-ai/meshy/text-to-3d',
        default: true,
        supportsRefs: false,
        supportsTransparency: false,
        pricePerImage: 0.05,
        avgLatencyMs: 120_000,
        strengths: ['text-to-3d', 'thumbnail preview', 'server model route compatibility'],
        weaknesses: ['review-only output', 'not Kiln contract validated', 'provider schema can drift'],
      },
    ],
  },

  // ---------------------------------------------------------------- Anthropic
  {
    id: 'anthropic',
    kind: 'code-gen',
    models: [
      {
        id: 'claude-opus-4-7',
        default: true,
        supportsRefs: false,
        supportsTransparency: false,
        // Kiln code-gen is priced per-token, not per-image. Surface as an
        // approximate per-call figure; 12k in / 3k out is typical for compound
        // GLBs (guard tower, vehicles).
        pricePerImage: 0.28,
        avgLatencyMs: 180_000,
        strengths: [
          'coordinate-heavy GLB',
          'structured output',
          '1M context',
          'best-in-class agentic coding',
        ],
        weaknesses: ['slow (2-5 min)', 'variance on repeated patterns', 'expensive'],
      },
      {
        id: 'claude-sonnet-4-6',
        supportsRefs: false,
        supportsTransparency: false,
        pricePerImage: 0.09,
        avgLatencyMs: 60_000,
        strengths: ['3-4x faster than opus', 'extended+adaptive thinking', 'cheaper'],
        weaknesses: ['lower fidelity on compound coord prompts'],
      },
    ],
  },
];

// =============================================================================
// Public API
// =============================================================================

/** Return the full capability matrix. Stable reference — do not mutate. */
export function capabilities(): ProviderCapabilities[] {
  return MATRIX;
}

/**
 * Return all capability entries for a provider id. A provider can have
 * multiple entries if it serves multiple kinds (e.g. FAL covers texture +
 * bg-removal).
 */
export function capabilitiesFor(provider: string): ProviderCapabilities | undefined {
  return MATRIX.find((p) => p.id === provider);
}

/**
 * Return the capability entry for a specific provider/kind pair.
 * Use this for multi-kind providers such as FAL.
 */
export function capabilitiesForKind(
  provider: string,
  kind: CapabilityKind,
): ProviderCapabilities | undefined {
  return MATRIX.find((p) => p.id === provider && p.kind === kind);
}

/**
 * Return all capability entries matching `provider` across every kind.
 * Useful for FAL which has both `texture` and `bg-removal` rows.
 */
export function capabilitiesForAll(provider: string): ProviderCapabilities[] {
  return MATRIX.filter((p) => p.id === provider);
}

// =============================================================================
// Routing
// =============================================================================

export interface PickProviderRequirements {
  kind: CapabilityKind;
  /** Number of reference images needed (0 if none). */
  refs?: number;
  /** True if native transparent output is required (skips magenta pipeline). */
  transparency?: boolean;
  /** Explicit provider preference — bypasses auto-routing when set. */
  preferProvider?: ProviderId;
  /** Hint: optimize for cost over quality (cheap batch path). */
  preferCheap?: boolean;
}

export interface PickProviderResult {
  provider: ProviderId | 'none';
  model: string | 'none';
  /** Human-readable explanation of the routing decision. */
  reason: string;
}

/**
 * Pick a provider + model for a given requirement set. Always returns a
 * structured result — on no-match, returns `{ provider: 'none', model: 'none',
 * reason }` rather than null, so callers never have to handle a bare null.
 *
 * Routing rules (from docs/next-cycle.md W3a.5):
 * - Code-gen → anthropic opus by default, sonnet if `preferCheap`.
 * - Texture → FAL flux-lora (current Seamless LoRA-compatible default).
 * - BG-removal → FAL birefnet (only option).
 * - Model-3D → FAL Meshy text-to-3D (server route compatibility).
 * - Image + `refs > 0` → gpt-image-2 (best multi-ref fidelity).
 * - Image + `transparency: true` → gpt-image-1.5 (only model with native alpha).
 * - Image text-only → gemini flash (cheapest, bulk-friendly).
 */
export function pickProviderFor(
  req: PickProviderRequirements
): PickProviderResult {
  // Explicit override — validate the requested provider still supports the kind.
  if (req.preferProvider) {
    const entry = MATRIX.find(
      (p) => p.id === req.preferProvider && p.kind === req.kind
    );
    if (!entry) {
      return {
        provider: 'none',
        model: 'none',
        reason: `Provider '${req.preferProvider}' does not support kind '${req.kind}'.`,
      };
    }
    const model = entry.models.find((m) => m.default) ?? entry.models[0];
    if (!model) {
      return {
        provider: 'none',
        model: 'none',
        reason: `Provider '${req.preferProvider}' has no models registered for '${req.kind}'.`,
      };
    }
    return {
      provider: entry.id,
      model: model.id,
      reason: `Explicit preferProvider='${req.preferProvider}' honored.`,
    };
  }

  switch (req.kind) {
    case 'code-gen': {
      const anth = MATRIX.find((p) => p.id === 'anthropic' && p.kind === 'code-gen');
      if (!anth) {
        return {
          provider: 'none',
          model: 'none',
          reason: 'No code-gen provider registered.',
        };
      }
      if (req.preferCheap) {
        const sonnet = anth.models.find((m) => m.id === 'claude-sonnet-4-6');
        if (sonnet) {
          return {
            provider: 'anthropic',
            model: sonnet.id,
            reason: 'preferCheap: sonnet is ~3x cheaper than opus on code-gen.',
          };
        }
      }
      const opus =
        anth.models.find((m) => m.default) ??
        anth.models.find((m) => m.id === 'claude-opus-4-7') ??
        anth.models[0];
      if (!opus) {
        return {
          provider: 'none',
          model: 'none',
          reason: 'Anthropic row has no models.',
        };
      }
      return {
        provider: 'anthropic',
        model: opus.id,
        reason: 'Default code-gen: Opus 4.7 for coordinate-heavy structured output.',
      };
    }

    case 'texture': {
      const fal = MATRIX.find((p) => p.id === 'fal' && p.kind === 'texture');
      const model = fal?.models.find((m) => m.default) ?? fal?.models[0];
      if (!fal || !model) {
        return {
          provider: 'none',
          model: 'none',
          reason: 'No texture provider registered.',
        };
      }
      return {
        provider: 'fal',
        model: model.id,
        reason: 'Texture pipeline uses FAL flux-lora until a FLUX 2 compatible Seamless LoRA exists.',
      };
    }

    case 'bg-removal': {
      const fal = MATRIX.find((p) => p.id === 'fal' && p.kind === 'bg-removal');
      const model = fal?.models.find((m) => m.default) ?? fal?.models[0];
      if (!fal || !model) {
        return {
          provider: 'none',
          model: 'none',
          reason: 'No bg-removal provider registered.',
        };
      }
      if (req.refs && req.refs > 0) {
        return {
          provider: 'none',
          model: 'none',
          reason: 'No provider in the matrix supports bg-removal with refs.',
        };
      }
      return {
        provider: 'fal',
        model: model.id,
        reason: 'BiRefNet is the only registered bg-removal model.',
      };
    }

    case 'model-3d': {
      const fal = MATRIX.find((p) => p.id === 'fal' && p.kind === 'model-3d');
      const model = fal?.models.find((m) => m.default) ?? fal?.models[0];
      if (!fal || !model) {
        return {
          provider: 'none',
          model: 'none',
          reason: 'No text-to-3D provider registered.',
        };
      }
      if (req.refs && req.refs > 0) {
        return {
          provider: 'none',
          model: 'none',
          reason: 'No provider in the matrix supports text-to-3D with refs.',
        };
      }
      return {
        provider: 'fal',
        model: model.id,
        reason: 'Model route compatibility: FAL Meshy text-to-3D.',
      };
    }

    case 'image': {
      const openai = MATRIX.find((p) => p.id === 'openai' && p.kind === 'image');
      const gemini = MATRIX.find((p) => p.id === 'gemini' && p.kind === 'image');

      // Rule 1: native transparency requested → gpt-image-1.5.
      if (req.transparency) {
        const m = openai?.models.find((m) => m.supportsTransparency);
        if (m && openai) {
          return {
            provider: 'openai',
            model: m.id,
            reason:
              'Native transparency requested; gpt-image-1.5 is the only model with supportsTransparency=true.',
          };
        }
        return {
          provider: 'none',
          model: 'none',
          reason: 'No registered model supports native transparent output.',
        };
      }

      // Rule 2: refs requested → gpt-image-2 (best multi-ref).
      if (req.refs && req.refs > 0) {
        if (!openai) {
          return {
            provider: 'none',
            model: 'none',
            reason: 'OpenAI not registered; cannot route multi-ref workflow.',
          };
        }
        const gpt2 = openai.models.find((m) => m.id === 'gpt-image-2');
        if (gpt2 && req.refs <= (gpt2.maxRefs ?? 0)) {
          return {
            provider: 'openai',
            model: gpt2.id,
            reason: `${req.refs} refs requested; gpt-image-2 wins at multi-ref fidelity.`,
          };
        }
        // Gemini fallback (maxRefs 14) for the rare ask above gpt-image-2's 16.
        const flash = gemini?.models.find((m) => m.default);
        if (flash && req.refs <= (flash.maxRefs ?? 0)) {
          return {
            provider: 'gemini',
            model: flash.id,
            reason: `${req.refs} refs exceeded gpt-image-2 cap; falling back to gemini flash.`,
          };
        }
        return {
          provider: 'none',
          model: 'none',
          reason: `${req.refs} refs exceeds every registered model's maxRefs cap.`,
        };
      }

      // Rule 3: text-only image → gemini flash (cheapest bulk path).
      const flash = gemini?.models.find((m) => m.default);
      if (flash && gemini) {
        return {
          provider: 'gemini',
          model: flash.id,
          reason: 'Text-only image: gemini flash is the cheapest bulk path.',
        };
      }
      // Fallback: gpt-image-1.5.
      const gpt15 = openai?.models.find((m) => m.id === 'gpt-image-1.5');
      if (gpt15 && openai) {
        return {
          provider: 'openai',
          model: gpt15.id,
          reason: 'Gemini unavailable; falling back to gpt-image-1.5.',
        };
      }
      return {
        provider: 'none',
        model: 'none',
        reason: 'No registered image model available.',
      };
    }

    default: {
      // Exhaustiveness gate.
      const _never: never = req.kind;
      void _never;
      return {
        provider: 'none',
        model: 'none',
        reason: `Unknown kind: ${String(req.kind)}`,
      };
    }
  }
}
