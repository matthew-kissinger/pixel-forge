import { describe, it, expect, mock, beforeEach } from 'bun:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Mocks must be declared before importing the module under test.
// `queryImpl` is reassigned per-test via `beforeEach` + in-test overrides.
let queryImpl = async function* (_args: any): AsyncGenerator<any> {
  yield { type: 'result', subtype: 'success', result: '', session_id: 'test-session' };
};

const sdkStub = () => ({
  query: (args: any) => queryImpl(args),
});

// `@anthropic-ai/claude-agent-sdk` resolves to TWO different physical files
// depending on importer:
//   - from this test file (server package): packages/server/node_modules/...
//   - from @pixel-forge/core/kiln (core package): <repo>/node_modules/...
// bun:test's `mock.module` keys off resolved specifiers, so we have to
// register the stub against both resolutions or the core package will
// receive the real SDK (which spawns a nested Claude Code process and
// hangs the 5s test timeout).
mock.module('@anthropic-ai/claude-agent-sdk', sdkStub);
const hoistedSdkPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs'
);
mock.module(hoistedSdkPath, sdkStub);

mock.module('@pixel-forge/shared/logger', () => ({
  logger: {
    info: mock(() => {}),
    debug: mock(() => {}),
    error: mock(() => {}),
    warn: mock(() => {}),
  },
}));

// Implementation lives in @pixel-forge/core/kiln (server services/claude.ts
// is just a re-export). Static import so the mock.module stubs above
// apply — a cache-busting dynamic import would bypass bun's module cache
// and hit the real SDK.
import * as claude from '@pixel-forge/core/kiln';

describe('Claude Service', () => {
  beforeEach(() => {
    // Reset query implementation to a neutral default before each test.
    queryImpl = async function* (_args: any): AsyncGenerator<any> {
      yield { type: 'result', subtype: 'success', result: '', session_id: 'test-session' };
    };
  });

  describe('generateKilnCode', () => {
    it('successfully generates code via structured output', async () => {
      queryImpl = async function* () {
        yield {
          type: 'result',
          subtype: 'success',
          structured_output: { code: 'const meta = { name: "Test" };\nfunction build() {}' },
          session_id: 'test-session',
        };
      };

      const result = await claude.generateKilnCode({
        prompt: 'test prompt',
        mode: 'glb',
        category: 'prop',
      });

      expect(result.success).toBe(true);
      expect(result.code).toContain('const meta');
      expect(result.sessionId).toBe('test-session');
    });

    it('generates both geometry and effect code', async () => {
      queryImpl = async function* () {
        yield {
          type: 'result',
          subtype: 'success',
          structured_output: { code: 'geometry code', effectCode: 'effect code' },
          session_id: 'both-session',
        };
      };

      const result = await claude.generateKilnCode({
        prompt: 'test both',
        mode: 'both',
        category: 'prop',
      });

      expect(result.success).toBe(true);
      expect(result.code).toBe('geometry code');
      expect(result.effectCode).toBe('effect code');
    });

    it('handles errors from query', async () => {
      queryImpl = async function* () {
        throw new Error('Claude is busy');
      };

      const result = await claude.generateKilnCode({
        prompt: 'fail',
        mode: 'glb',
        category: 'prop',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Claude is busy');
    });

    it('handles error result messages', async () => {
      queryImpl = async function* () {
        yield {
          type: 'result',
          subtype: 'error_during_execution',
          errors: ['Something went wrong'],
          session_id: 'err-session',
        };
      };

      const result = await claude.generateKilnCode({
        prompt: 'error result',
        mode: 'glb',
        category: 'prop',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Something went wrong');
    });

    it('handles auth errors', async () => {
      queryImpl = async function* () {
        yield { type: 'auth_status', error: 'Not authenticated' };
      };

      const result = await claude.generateKilnCode({
        prompt: 'auth fail',
        mode: 'glb',
        category: 'prop',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Auth failed');
    });

    it('handles request with animation disabled', async () => {
      let capturedPrompt = '';
      queryImpl = async function* (args: any) {
        capturedPrompt = args.prompt;
        yield { type: 'result', subtype: 'success', result: '', session_id: 'test' };
      };

      await claude.generateKilnCode({
        prompt: 'no anim',
        mode: 'glb',
        category: 'prop',
        includeAnimation: false,
      });

      expect(capturedPrompt).toContain('Do NOT include an animate() function');
    });

    it('falls back to result text when structured_output is missing', async () => {
      queryImpl = async function* () {
        yield {
          type: 'result',
          subtype: 'success',
          result: '{"code":"const meta = {}; function build() {}"}',
          session_id: 'fallback-session',
        };
      };

      const result = await claude.generateKilnCode({
        prompt: 'fallback',
        mode: 'glb',
        category: 'prop',
      });

      expect(result.success).toBe(true);
      expect(result.code).toContain('const meta');
    });
  });

  describe('compactCode', () => {
    it('successfully compacts code', async () => {
      queryImpl = async function* () {
        yield { type: 'assistant', message: { content: [{ type: 'text', text: '```typescript\ncompacted\n```' }] } };
      };

      const result = await claude.compactCode('original code');

      expect(result.success).toBe(true);
      expect(result.code).toBe('compacted');
    });

    it('successfully compacts code with js label', async () => {
      queryImpl = async function* () {
        yield { type: 'assistant', message: { content: [{ type: 'text', text: '```js\ncompacted js\n```' }] } };
      };

      const result = await claude.compactCode('original code');

      expect(result.success).toBe(true);
      expect(result.code).toBe('compacted js');
    });

    it('returns original text if no code block found', async () => {
       queryImpl = async function* () {
        yield { type: 'assistant', message: { content: [{ type: 'text', text: 'just text' }] } };
      };

      const result = await claude.compactCode('original code');
      expect(result.success).toBe(true);
      expect(result.code).toBe('just text');
    });
  });

  describe('refactorCode', () => {
    it('refactors code via structured output', async () => {
      queryImpl = async function* () {
        yield {
          type: 'result',
          subtype: 'success',
          structured_output: { code: 'function build() { /* refactored */ }' },
          session_id: 'refactor-session',
        };
      };

      const result = await claude.refactorCode({
        instruction: 'make it red',
        geometryCode: 'original',
        target: 'geometry',
      });

      expect(result.success).toBe(true);
      expect(result.code).toContain('refactored');
      expect(result.sessionId).toBe('refactor-session');
    });

    it('refactors both geometry and effect code', async () => {
      queryImpl = async function* () {
        yield {
          type: 'result',
          subtype: 'success',
          structured_output: { code: 'new geometry', effectCode: 'new effect' },
          session_id: 'both-refactor',
        };
      };

      const result = await claude.refactorCode({
        instruction: 'update both',
        geometryCode: 'old geo',
        effectCode: 'old eff',
        target: 'both',
      });

      expect(result.success).toBe(true);
      expect(result.code).toBe('new geometry');
      expect(result.effectCode).toBe('new effect');
    });

    it('handles refactor errors', async () => {
      queryImpl = async function* () {
        throw new Error('Refactor failed');
      };

      const result = await claude.refactorCode({
        instruction: 'fail',
        target: 'geometry',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Refactor failed');
    });
  });

  describe('editKilnCode', () => {
    it('calls generateKilnCode with existingCode', async () => {
      queryImpl = async function* () {
        yield {
          type: 'result',
          subtype: 'success',
          structured_output: { code: 'edited code' },
          session_id: 'edit-session',
        };
      };

      const result = await claude.editKilnCode('old code', 'make it new');

      expect(result.success).toBe(true);
      expect(result.code).toBe('edited code');
    });
  });
});
