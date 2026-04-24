#!/usr/bin/env bun
/**
 * pixelforge — CLI adapter over `@pixel-forge/core`.
 *
 * Thin shell. Every command lives in `commands/` as a `defineCommand`
 * export; this file only stitches them into the root command and calls
 * `runMain`. Subcommands are eagerly imported so `--help` enumerates the
 * full surface; lazy loading isn't worth the complexity at this size.
 *
 * See README.md (in this package) for installation. The intent is:
 *   bun link            # from packages/cli — `pixelforge` on PATH
 *   pixelforge --help
 *
 * Without `bun link`, invoke directly:
 *   bun packages/cli/src/index.ts <args>
 */

import { defineCommand, runMain } from 'citty';

import { genCommand } from './commands/gen';
import { inspectCommand } from './commands/inspect';
import { providersCommand } from './commands/providers';
import { kilnCommand } from './commands/kiln';
import { auditCommand } from './commands/audit';
import { healthCommand } from './commands/health';

const main = defineCommand({
  meta: {
    name: 'pixelforge',
    version: '0.0.0',
    description:
      'Agent-first CLI over @pixel-forge/core: gen sprites/icons/textures/glbs, inspect kiln code, query providers.',
  },
  subCommands: {
    gen: genCommand,
    inspect: inspectCommand,
    providers: providersCommand,
    kiln: kilnCommand,
    audit: auditCommand,
    health: healthCommand,
  },
});

runMain(main);
