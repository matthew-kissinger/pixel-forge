import { describe, it, expect, mock, beforeEach, spyOn, afterEach } from 'bun:test';

// Mocks must be declared before importing the module under test
let queryImpl = async function* (args: any): AsyncGenerator<any> {
  yield { type: 'assistant', message: { content: [{ type: 'text', text: 'some response' }] } };
  yield { type: 'result', session_id: 'test-session' };
};

mock.module('@anthropic-ai/claude-agent-sdk', () => ({
  query: (args: any) => queryImpl(args),
}));

mock.module('@pixel-forge/shared/logger', () => ({
  logger: {
    info: mock(() => {}),
    debug: mock(() => {}),
    error: mock(() => {}),
    warn: mock(() => {}),
  },
}));

// Import the module under test
const claude = await import('../../src/services/claude');

describe('Claude Service', () => {
  let fileSpy: any;
  let writeSpy: any;
  let mockFiles: Record<string, string> = {};

  beforeEach(() => {
    mockFiles = {};
    
    // Reset query implementation
    queryImpl = async function* (args: any): AsyncGenerator<any> {
      yield { type: 'assistant', message: { content: [{ type: 'text', text: 'some response' }] } };
      yield { type: 'result', session_id: 'test-session' };
    };

    // Spy on Bun.file and Bun.write
    fileSpy = spyOn(Bun, 'file').mockImplementation(((path: string | URL) => ({
      exists: async () => !!mockFiles[path.toString()],
      text: async () => mockFiles[path.toString()] || '',
    })) as any);

    writeSpy = spyOn(Bun, 'write').mockImplementation(async (path: any, content: any) => {
      if (typeof path === 'string') {
        mockFiles[path] = content.toString();
      }
      return 100;
    });
  });

  afterEach(() => {
    fileSpy.mockRestore();
    writeSpy.mockRestore();
  });

  describe('generateKilnCode', () => {
    it('successfully generates geometry code', async () => {
      const request: any = {
        prompt: 'test prompt',
        mode: 'glb',
        category: 'prop',
      };

      // Mock the files that runQuery expects to find after agent finishes
      // We need to capture the generated path to know where to put the files
      // But we can just use a wildcard or check what was written to manifest
      
      // Let's adjust the queryImpl to simulate file writing if we want, 
      // but generateKilnCode reads them AFTER the generator finishes.
      // So we just need to make sure they exist in mockFiles.
      
      // Since generateKilnCode generates a timestamped dir, we might need 
      // to intercept the write to manifest.json to find the dir.
      
      let capturedDir = '';
      writeSpy.mockImplementation(async (path: any, content: any) => {
        if (typeof path === 'string') {
          mockFiles[path] = content.toString();
          if (path.endsWith('manifest.json')) {
            capturedDir = path.replace('/manifest.json', '');
            // Simulate agent writing geometry.ts
            mockFiles[`${capturedDir}/geometry.ts`] = 'const meta = { name: "Test" }; function build() {}';
          }
        }
        return 100;
      });

      const result = await claude.generateKilnCode(request);

      expect(result.success).toBe(true);
      expect(result.code).toContain('const meta');
      expect(result.sessionId).toBe('test-session');
      expect(result.outputDir).toBe(capturedDir);
    });

    it('generates both geometry and effect code in both mode', async () => {
      const request: any = {
        prompt: 'test both',
        mode: 'both',
        category: 'prop',
      };

      writeSpy.mockImplementation(async (path: any, content: any) => {
        if (typeof path === 'string') {
          mockFiles[path] = content.toString();
          if (path.endsWith('manifest.json')) {
            const dir = path.replace('/manifest.json', '');
            mockFiles[`${dir}/geometry.ts`] = 'geometry code';
            mockFiles[`${dir}/effect.ts`] = 'effect code';
          }
        }
        return 100;
      });

      const result = await claude.generateKilnCode(request);

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

    it('handles missing files gracefully', async () => {
      // Don't mock geometry.ts existence
      const result = await claude.generateKilnCode({
        prompt: 'missing',
        mode: 'glb',
        category: 'prop',
      });

      expect(result.success).toBe(true);
      expect(result.code).toBe(''); // Should be empty if file not found
    });

    it('handles request with animation disabled', async () => {
      let capturedPrompt = '';
      queryImpl = async function* (args: any) {
        capturedPrompt = args.prompt;
        yield { type: 'result', session_id: 'test' };
      };

      await claude.generateKilnCode({
        prompt: 'no anim',
        mode: 'glb',
        category: 'prop',
        includeAnimation: false,
      });

      expect(capturedPrompt).toContain('Do NOT include an animate() function');
    });
  });

  describe('streamKilnCode', () => {
    it('yields chunks from the assistant', async () => {
      queryImpl = async function* () {
        yield { type: 'assistant', message: { content: [{ type: 'text', text: 'part 1' }] } };
        yield { type: 'assistant', message: { content: [{ type: 'text', text: ' part 2' }] } };
      };

      const generator = claude.streamKilnCode({
        prompt: 'stream',
        mode: 'glb',
        category: 'prop',
      });

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { type: 'chunk', data: 'part 1' },
        { type: 'chunk', data: ' part 2' },
        { type: 'done', data: '' },
      ]);
    });

    it('yields error chunk on failure', async () => {
      queryImpl = async function* () {
        throw new Error('Streaming failed');
      };

      const generator = claude.streamKilnCode({
        prompt: 'fail',
        mode: 'glb',
        category: 'prop',
      });

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { type: 'error', data: 'Streaming failed' },
      ]);
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
    it('refactors geometry code via parsing response', async () => {
      queryImpl = async function* () {
        yield { type: 'assistant', message: { content: [{ type: 'text', text: '```geometry\nfunction build() { /* refactored */ }\n```' }] } };
        yield { type: 'result', session_id: 'refactor-session' };
      };

      const result = await claude.refactorCode({
        instruction: 'make it red',
        geometryCode: 'original',
        target: 'geometry',
      });

      expect(result.success).toBe(true);
      expect(result.code).toBe('function build() { /* refactored */ }');
      expect(result.sessionId).toBe('refactor-session');
    });

    it('refactors effect code via parsing response', async () => {
      queryImpl = async function* () {
        yield { type: 'assistant', message: { content: [{ type: 'text', text: '```effect\nimport { material } from "three/tsl";\nexport { material };\n```' }] } };
        yield { type: 'result', session_id: 'refactor-session' };
      };

      const result = await claude.refactorCode({
        instruction: 'glow blue',
        effectCode: 'original',
        target: 'effect',
      });

      expect(result.success).toBe(true);
      expect(result.effectCode).toContain('export { material };');
    });

    it('reads refactored code from files if outputDir provided', async () => {
      mockFiles['/tmp/geometry.ts'] = 'file geometry';
      mockFiles['/tmp/effect.ts'] = 'file effect';

      const result = await claude.refactorCode({
        instruction: 'refactor to files',
        outputDir: '/tmp',
        target: 'both',
      });

      expect(result.success).toBe(true);
      expect(result.code).toBe('file geometry');
      expect(result.effectCode).toBe('file effect');
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
      // We can check if generateKilnCode was called correctly 
      // by looking at how buildUserPrompt uses existingCode.
      // But generateKilnCode is what we export.
      
      // Let's just make sure it returns a result.
      writeSpy.mockImplementation(async (path: any, content: any) => {
        if (typeof path === 'string' && path.endsWith('manifest.json')) {
          const dir = path.replace('/manifest.json', '');
          mockFiles[`${dir}/geometry.ts`] = 'edited code';
        }
        return 100;
      });

      const result = await claude.editKilnCode('old code', 'make it new');

      expect(result.success).toBe(true);
      expect(result.code).toBe('edited code');
    });
  });
});
