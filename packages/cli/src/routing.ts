/**
 * Local mirror of `@pixel-forge/core`'s `pickProviderFor()`.
 *
 * Kept as a small local mirror for CLI tests and backwards-compatible
 * routing output. The core package now exports `pickProviderFor`; new CLI
 * feature work should prefer core directly.
 *
 * The logic mirrors `packages/core/src/capabilities.ts:pickProviderFor`
 * one-for-one. Keep the two in sync; tests in this package assert routing
 * outcomes match the documented rules.
 */

import { capabilities } from '@pixel-forge/core';

export type ProviderId = 'gemini' | 'openai' | 'fal' | 'anthropic';
export type CapabilityKind = 'image' | 'texture' | 'bg-removal' | 'model-3d' | 'code-gen';

export interface PickProviderRequirements {
  kind: CapabilityKind;
  refs?: number;
  transparency?: boolean;
  preferProvider?: ProviderId;
  preferCheap?: boolean;
}

export interface PickProviderResult {
  provider: ProviderId | 'none';
  model: string | 'none';
  reason: string;
}

/**
 * Pick a provider + model for the given requirements. Returns
 * `{ provider: 'none', ... }` rather than null when no match is found.
 */
export function pickProviderForLocal(
  req: PickProviderRequirements,
): PickProviderResult {
  const matrix = capabilities();

  if (req.preferProvider) {
    const entry = matrix.find(
      (p) => p.id === req.preferProvider && p.kind === req.kind,
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
      provider: entry.id as ProviderId,
      model: model.id,
      reason: `Explicit preferProvider='${req.preferProvider}' honored.`,
    };
  }

  switch (req.kind) {
    case 'code-gen': {
      const anth = matrix.find((p) => p.id === 'anthropic' && p.kind === 'code-gen');
      if (!anth) {
        return { provider: 'none', model: 'none', reason: 'No code-gen provider registered.' };
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
        return { provider: 'none', model: 'none', reason: 'Anthropic row has no models.' };
      }
      return {
        provider: 'anthropic',
        model: opus.id,
        reason: 'Default code-gen: Opus 4.7 for coordinate-heavy structured output.',
      };
    }

    case 'texture': {
      const fal = matrix.find((p) => p.id === 'fal' && p.kind === 'texture');
      const model = fal?.models.find((m) => m.default) ?? fal?.models[0];
      if (!fal || !model) {
        return { provider: 'none', model: 'none', reason: 'No texture provider registered.' };
      }
      return {
        provider: 'fal',
        model: model.id,
        reason: 'Texture pipeline uses FAL flux-lora until a FLUX 2 compatible Seamless LoRA exists.',
      };
    }

    case 'bg-removal': {
      const fal = matrix.find((p) => p.id === 'fal' && p.kind === 'bg-removal');
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
      const fal = matrix.find((p) => p.id === 'fal' && p.kind === 'model-3d');
      const model = fal?.models.find((m) => m.default) ?? fal?.models[0];
      if (!fal || !model) {
        return { provider: 'none', model: 'none', reason: 'No text-to-3D provider registered.' };
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
      const openai = matrix.find((p) => p.id === 'openai' && p.kind === 'image');
      const gemini = matrix.find((p) => p.id === 'gemini' && p.kind === 'image');

      if (req.transparency) {
        const m = openai?.models.find((mm) => mm.supportsTransparency);
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

      const flash = gemini?.models.find((m) => m.default);
      if (flash && gemini) {
        return {
          provider: 'gemini',
          model: flash.id,
          reason: 'Text-only image: gemini flash is the cheapest bulk path.',
        };
      }
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
