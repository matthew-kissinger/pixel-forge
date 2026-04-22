/**
 * `pixelforge providers <subcommand>` — query the capability matrix.
 *
 * `providers list` prints every provider/model pair with strengths +
 * limitations. `providers pick` lets agents test the routing decision
 * without sending a real request.
 */

import { defineCommand } from 'citty';

import { capabilities } from '@pixel-forge/core';

import { printError, printResult } from '../output';
import { pickProviderForLocal, type PickProviderRequirements } from '../routing';

// =============================================================================
// providers list
// =============================================================================

const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List every registered provider + model with strengths and limitations.',
  },
  args: {
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const matrix = capabilities();

      if (args.json) {
        printResult({ ok: true, providers: matrix }, { json: true });
        return;
      }

      // Human-friendly table.
      const lines: string[] = [];
      for (const provider of matrix) {
        lines.push(`\n${provider.id} (${provider.kind})`);
        for (const model of provider.models) {
          const flags: string[] = [];
          if (model.default) flags.push('default');
          if (model.supportsRefs) flags.push(`refs<=${model.maxRefs ?? '?'}`);
          if (model.supportsTransparency) flags.push('transparency');
          const meta: string[] = [];
          if (model.pricePerImage !== undefined) {
            meta.push(`$${model.pricePerImage.toFixed(3)}/img`);
          }
          if (model.avgLatencyMs !== undefined) {
            meta.push(`~${Math.round(model.avgLatencyMs / 1000)}s`);
          }
          lines.push(
            `  - ${model.id} [${flags.join(',') || 'basic'}] ${meta.join(' · ')}`,
          );
          lines.push(`      strengths: ${model.strengths.join(', ')}`);
          if (model.weaknesses?.length) {
            lines.push(`      caveats:   ${model.weaknesses.join(', ')}`);
          }
        }
        if (provider.rateLimit?.note) {
          lines.push(`      rate-limit: ${provider.rateLimit.note}`);
        }
      }
      printResult(lines.join('\n').trimStart(), { json: false });
    } catch (err) {
      printError(err);
    }
  },
});

// =============================================================================
// providers pick
// =============================================================================

const pickCommand = defineCommand({
  meta: {
    name: 'pick',
    description: 'Test the auto-routing decision for a given requirement set.',
  },
  args: {
    kind: {
      type: 'string',
      description: 'image | texture | bg-removal | code-gen. Default image.',
      default: 'image',
    },
    refs: {
      type: 'string',
      description: 'Number of reference images. Default 0.',
      default: '0',
    },
    transparency: {
      type: 'boolean',
      description: 'Require native transparent output.',
      default: false,
    },
    'prefer-cheap': {
      type: 'boolean',
      description: 'Hint: optimize for cost over quality.',
      default: false,
    },
    'prefer-provider': {
      type: 'string',
      description: 'Pin a specific provider (gemini | openai | fal | anthropic).',
    },
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    try {
      const validKinds = ['image', 'texture', 'bg-removal', 'code-gen'] as const;
      if (!validKinds.includes(args.kind as (typeof validKinds)[number])) {
        throw new Error(
          `--kind must be one of ${validKinds.join(', ')}, got '${args.kind}'.`,
        );
      }

      const req: PickProviderRequirements = {
        kind: args.kind as (typeof validKinds)[number],
        refs: Number(args.refs),
        transparency: args.transparency,
        preferCheap: args['prefer-cheap'],
        ...(args['prefer-provider']
          ? {
              preferProvider: args['prefer-provider'] as
                | 'gemini'
                | 'openai'
                | 'fal'
                | 'anthropic',
            }
          : {}),
      };
      const result = pickProviderForLocal(req);

      if (args.json) {
        printResult({ ok: true, request: req, result }, { json: true });
        return;
      }
      printResult(
        `Routed to: ${result.provider} (${result.model})\nReason:    ${result.reason}`,
        { json: false },
      );
    } catch (err) {
      printError(err);
    }
  },
});

// =============================================================================
// providers (root)
// =============================================================================

export const providersCommand = defineCommand({
  meta: {
    name: 'providers',
    description: 'Query the provider capability matrix and routing.',
  },
  subCommands: {
    list: listCommand,
    pick: pickCommand,
  },
});
