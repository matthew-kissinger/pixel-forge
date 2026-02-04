import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import {
  encodeWorkflow,
  decodeWorkflow,
  base64UrlEncode,
  base64UrlDecode,
  ensureCompressionSupport
} from '../../src/lib/share';
import type { WorkflowData } from '../../src/types/workflow';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

// Polyfill for CompressionStream/DecompressionStream using node:zlib
// This is necessary because happy-dom might not fully support these APIs or they might be missing in the environment
const originalCompressionStream = global.CompressionStream;
const originalDecompressionStream = global.DecompressionStream;

// Helper to create a workflow for testing
const createTestWorkflow = (nodeCount = 2): WorkflowData => ({
  version: 1,
  nodes: Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    position: { x: i * 100, y: i * 100 },
    data: { label: `Node ${i}` },
  })),
  edges: Array.from({ length: nodeCount - 1 }, (_, i) => ({
    id: `edge-${i}`,
    source: `node-${i}`,
    target: `node-${i + 1}`,
  })),
});

describe('share.ts', () => {
  beforeAll(() => {
    // Basic Polyfill for CompressionStream
    if (typeof global.CompressionStream === 'undefined') {
      (global as any).CompressionStream = class CompressionStream {
        readable: ReadableStream;
        writable: WritableStream;
        
        constructor(format: string) {
          if (format !== 'deflate-raw') {
            throw new Error(`Unsupported compression format: ${format}`);
          }
          
          const { readable, writable } = new TransformStream({
            transform(chunk, controller) {
              const input = chunk instanceof Uint8Array ? chunk : new TextEncoder().encode(String(chunk));
              const compressed = deflateRawSync(input);
              controller.enqueue(compressed);
            }
          });
          
          this.readable = readable;
          this.writable = writable;
        }
      };
    }

    // Basic Polyfill for DecompressionStream
    if (typeof global.DecompressionStream === 'undefined') {
      (global as any).DecompressionStream = class DecompressionStream {
        readable: ReadableStream;
        writable: WritableStream;

        constructor(format: string) {
          if (format !== 'deflate-raw') {
            throw new Error(`Unsupported decompression format: ${format}`);
          }

          const { readable, writable } = new TransformStream({
            transform(chunk, controller) {
              const input = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
              try {
                const decompressed = inflateRawSync(input);
                controller.enqueue(decompressed);
              } catch (error) {
                controller.error(error);
              }
            }
          });

          this.readable = readable;
          this.writable = writable;
        }
      };
    }
  });

  afterAll(() => {
    // cleanup if we overwrote globals (though strictly not needed for test files usually)
    if (originalCompressionStream) global.CompressionStream = originalCompressionStream;
    if (originalDecompressionStream) global.DecompressionStream = originalDecompressionStream;
  });

  describe('base64UrlEncode / base64UrlDecode', () => {
    it('should correctly encode and decode a simple string', () => {
      const input = 'Hello World';
      const bytes = new TextEncoder().encode(input);
      const encoded = base64UrlEncode(bytes);
      
      // Base64 of 'Hello World' is 'SGVsbG8gV29ybGQ='
      // URL safe: no changes needed for this string, but let's check
      expect(encoded).toBe('SGVsbG8gV29ybGQ'); // padding removed

      const decodedBytes = base64UrlDecode(encoded);
      const decodedString = new TextDecoder().decode(decodedBytes);
      expect(decodedString).toBe(input);
    });

    it('should handle URL unsafe characters (+ and /)', () => {
      // Binary data that produces + and / in base64
      // 0xfb, 0xff, 0xff produces +//w
      const bytes = new Uint8Array([0xfb, 0xff, 0xff]); 
      const encoded = base64UrlEncode(bytes);
      
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).toContain('-');
      expect(encoded).toContain('_');

      const decoded = base64UrlDecode(encoded);
      expect(decoded).toEqual(bytes);
    });
  });

  describe('encodeWorkflow / decodeWorkflow', () => {
    it('should round-trip a valid workflow', async () => {
      const workflow = createTestWorkflow();
      const hash = await encodeWorkflow(workflow);
      
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      // Should be url safe
      expect(hash).not.toMatch(/[+/=]/);

      const decoded = await decodeWorkflow(hash);
      expect(decoded).toEqual(workflow);
    });

    it('should handle empty workflow', async () => {
      const emptyWorkflow: WorkflowData = {
        version: 1,
        nodes: [],
        edges: []
      };
      
      const hash = await encodeWorkflow(emptyWorkflow);
      const decoded = await decodeWorkflow(hash);
      
      expect(decoded).toEqual(emptyWorkflow);
    });

    it('should handle large workflow', async () => {
      const largeWorkflow = createTestWorkflow(100);
      const hash = await encodeWorkflow(largeWorkflow);
      
      expect(hash.length).toBeGreaterThan(0);
      
      const decoded = await decodeWorkflow(hash);
      expect(decoded).toEqual(largeWorkflow);
    });

    it('should return null for invalid hash (garbage)', async () => {
      const result = await decodeWorkflow('not-a-valid-hash-!@#$%^&*()');
      expect(result).toBeNull();
    });

    it('should return null for invalid base64', async () => {
        const result = await decodeWorkflow('invalid_base64_string');
        // It might throw or return null depending on implementation details of base64 decode or decompress
        // decodeWorkflow catches errors and returns null
        expect(result).toBeNull();
    });

    it('should return null if decompression fails', async () => {
      // "SGVsbG8=" is "Hello" base64url encoded. "Hello" is not valid deflate-raw data.
      const result = await decodeWorkflow('SGVsbG8');
      expect(result).toBeNull();
    });
  });

  describe('ensureCompressionSupport', () => {
    it('should throw if CompressionStream is missing', () => {
      const original = global.CompressionStream;
      // @ts-expect-error - Mocking missing global
      global.CompressionStream = undefined;
      
      expect(() => ensureCompressionSupport()).toThrow('CompressionStream is not supported');
      
      global.CompressionStream = original;
    });
  });
});
