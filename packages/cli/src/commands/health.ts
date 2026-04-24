/**
 * `pixelforge health` — live API key + model health check.
 *
 * Thin wrapper over `scripts/_key-health.ts` (per-provider liveness probes)
 * with an optional `--audit` flag that also triggers the full model catalog
 * regeneration via `scripts/_model-audit.ts`.
 *
 * Exit code is non-zero when any probed key is missing or AUTH_FAIL so this
 * can be used as a pre-flight guard in overnight batch scripts.
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { defineCommand } from 'citty';

import { printError } from '../output';

const REPO_ROOT = resolve(process.cwd());

export const healthCommand = defineCommand({
  meta: {
    name: 'health',
    description:
      'Probe ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY / FAL_KEY for liveness. Optional --audit regenerates docs/model-catalog-*.md.',
  },
  args: {
    audit: {
      type: 'boolean',
      description:
        'After the liveness check, re-run scripts/_model-audit.ts to refresh docs/model-catalog-YYYY-MM-DD.md and _catalog.generated.json.',
      default: false,
    },
    strict: {
      type: 'boolean',
      description:
        'Exit non-zero if any probe prints MISSING, AUTH_FAIL, or BALANCE/RATE (useful for pre-flight in batch scripts).',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const probe = spawnSync('bun', ['scripts/_key-health.ts'], {
        cwd: REPO_ROOT,
        stdio: ['inherit', 'pipe', 'inherit'],
        encoding: 'utf8',
      });

      const out = probe.stdout ?? '';
      process.stdout.write(out);

      if (args.audit) {
        const audit = spawnSync('bun', ['scripts/_model-audit.ts'], {
          cwd: REPO_ROOT,
          stdio: 'inherit',
        });
        if (audit.status !== 0) {
          process.exit(audit.status ?? 1);
        }
      }

      if (args.strict) {
        const bad = /(MISSING|AUTH_FAIL|BALANCE\/RATE|FAIL\s\d{3})/i.test(out);
        if (bad) {
          process.stderr.write(
            '\npixelforge health: strict mode — one or more providers unhealthy.\n',
          );
          process.exit(2);
        }
      }

      process.exit(probe.status ?? 0);
    } catch (err) {
      printError(err);
      process.exit(1);
    }
  },
});
