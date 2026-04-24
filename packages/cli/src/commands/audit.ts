/**
 * `pixelforge audit <subcommand>` — GLB audit and review tooling.
 *
 * Sub-commands:
 *   - `audit review [--serve] [--open]` — (re)generate the interactive
 *     review.html and optionally launch the local annotation server on
 *     :7802 that writes to `war-assets/_review/issues.json`.
 *
 * This is a thin wrapper over the scripts under `scripts/` so the same
 * tooling is available via `pixelforge` as via `bun scripts/…`.
 */

import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { defineCommand } from 'citty';

import { printError } from '../output';

const REPO_ROOT = resolve(process.cwd());

const reviewCommand = defineCommand({
  meta: {
    name: 'review',
    description:
      'Build the interactive audit review page and optionally launch the annotation server (tier-2).',
  },
  args: {
    serve: {
      type: 'boolean',
      description:
        'Start the review server on :7802 and auto-open the browser. Annotations persist to war-assets/_review/issues.json.',
      default: false,
    },
    open: {
      type: 'boolean',
      description: 'Open the static HTML file in the default browser (skipped when --serve).',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const pageArgs = ['scripts/audit-review-page.ts'];
      if (args.serve) pageArgs.push('--serve');
      else if (args.open) pageArgs.push('--open');

      const result = spawnSync('bun', pageArgs, {
        cwd: REPO_ROOT,
        stdio: 'inherit',
      });
      if (result.status !== 0) {
        process.exit(result.status ?? 1);
      }

      if (args.serve) {
        // audit-review-page.ts already spawns the server in the background
        // when --serve is passed. We just sit here so ctrl-c lands on the
        // parent pixelforge process cleanly.
        await new Promise<void>((resolvePromise) => {
          process.on('SIGINT', () => resolvePromise());
        });
      }
    } catch (err) {
      printError(err);
    }
  },
});

const serverCommand = defineCommand({
  meta: {
    name: 'server',
    description:
      'Start only the annotation server (scripts/review-server.ts). Use when review.html already exists.',
  },
  async run() {
    const child = spawn('bun', ['scripts/review-server.ts'], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    });
    child.on('exit', (code) => process.exit(code ?? 0));
  },
});

export const auditCommand = defineCommand({
  meta: {
    name: 'audit',
    description: 'GLB audit tooling: build review page, run annotation server.',
  },
  subCommands: {
    review: reviewCommand,
    server: serverCommand,
  },
});
