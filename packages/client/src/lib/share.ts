import type { WorkflowData } from '../types/workflow';
import { logger } from '@pixel-forge/shared/logger';

export type ExportedWorkflow = WorkflowData;

const COMPRESSION_FORMAT = 'deflate-raw';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlDecode = (input: string): Uint8Array => {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const ensureCompressionSupport = () => {
  if (typeof CompressionStream === 'undefined' || typeof DecompressionStream === 'undefined') {
    throw new Error('CompressionStream is not supported in this browser');
  }
};

const compressString = async (value: string): Promise<Uint8Array> => {
  ensureCompressionSupport();
  const input = encoder.encode(value);
  const stream = new Blob([input]).stream().pipeThrough(new CompressionStream(COMPRESSION_FORMAT));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
};

const decompressToString = async (bytes: Uint8Array): Promise<string> => {
  ensureCompressionSupport();
  const safeBytes = new Uint8Array(bytes);
  const stream = new Blob([safeBytes]).stream().pipeThrough(new DecompressionStream(COMPRESSION_FORMAT));
  const decompressed = await new Response(stream).arrayBuffer();
  return decoder.decode(decompressed);
};

export const encodeWorkflow = async (workflow: ExportedWorkflow): Promise<string> => {
  const json = JSON.stringify(workflow);
  const compressed = await compressString(json);
  return base64UrlEncode(compressed);
};

export const decodeWorkflow = async (hash: string): Promise<ExportedWorkflow | null> => {
  try {
    const bytes = base64UrlDecode(hash);
    const json = await decompressToString(bytes);
    return JSON.parse(json) as ExportedWorkflow;
  } catch (error) {
    logger.error('Failed to decode workflow hash:', error);
    return null;
  }
};
