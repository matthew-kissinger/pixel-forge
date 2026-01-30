/**
 * Hook for processing images in nodes
 * Handles status lifecycle, error handling, and output storage
 */

import { useCallback, useRef } from 'react';
import { useWorkflowStore, type NodeOutput } from '../stores/workflow';
import type { ImageProcessor } from '../lib/image-utils';
import { processImage } from '../lib/image-utils';

interface UseImageProcessorOptions {
  /** Called before processing starts */
  onStart?: () => void;
  /** Called when processing completes successfully */
  onSuccess?: (result: string) => void;
  /** Called when processing fails */
  onError?: (error: Error) => void;
}

interface UseImageProcessorResult {
  /** Process an image with a custom processor function */
  process: (imageData: string, processor: ImageProcessor) => Promise<void>;
  /** Process an image with an async function that returns a result */
  processAsync: (
    imageData: string,
    asyncFn: (imageData: string) => Promise<string>
  ) => Promise<void>;
  /** Check if there's an image input available */
  hasImageInput: () => boolean;
  /** Get the image input data */
  getImageInput: () => string | null;
  /** Get all inputs for the node */
  getInputs: () => NodeOutput[];
  /** Get text input if available */
  getTextInput: () => string | null;
  /** Whether an operation is currently running */
  isProcessing: boolean;
}

/**
 * Hook for processing images in nodes.
 * Handles status lifecycle, error handling, and output storage.
 */
export function useImageProcessor(
  nodeId: string,
  options: UseImageProcessorOptions = {}
): UseImageProcessorResult {
  const { onStart, onSuccess, onError } = options;

  const {
    getInputsForNode,
    setNodeOutput,
    setNodeStatus,
    nodeStatus,
  } = useWorkflowStore();

  const isProcessing = nodeStatus[nodeId] === 'running';
  const processingRef = useRef(false);

  const getInputs = useCallback(() => {
    return getInputsForNode(nodeId);
  }, [nodeId, getInputsForNode]);

  const hasImageInput = useCallback(() => {
    const inputs = getInputs();
    return inputs.some((i) => i.type === 'image');
  }, [getInputs]);

  const getImageInput = useCallback(() => {
    const inputs = getInputs();
    const imageInput = inputs.find((i) => i.type === 'image');
    return imageInput?.data ?? null;
  }, [getInputs]);

  const getTextInput = useCallback(() => {
    const inputs = getInputs();
    const textInput = inputs.find((i) => i.type === 'text');
    return textInput?.data ?? null;
  }, [getInputs]);

  const process = useCallback(
    async (imageData: string, processor: ImageProcessor) => {
      if (processingRef.current) return;
      processingRef.current = true;

      onStart?.();
      setNodeStatus(nodeId, 'running');

      try {
        const result = await processImage(imageData, processor);

        setNodeOutput(nodeId, {
          type: 'image',
          data: result,
          timestamp: Date.now(),
        });
        setNodeStatus(nodeId, 'success');
        onSuccess?.(result);
      } catch (error) {
        console.error(`Image processing failed for node ${nodeId}:`, error);
        setNodeStatus(nodeId, 'error');
        onError?.(error instanceof Error ? error : new Error(String(error)));
      } finally {
        processingRef.current = false;
      }
    },
    [nodeId, setNodeOutput, setNodeStatus, onStart, onSuccess, onError]
  );

  const processAsync = useCallback(
    async (imageData: string, asyncFn: (data: string) => Promise<string>) => {
      if (processingRef.current) return;
      processingRef.current = true;

      onStart?.();
      setNodeStatus(nodeId, 'running');

      try {
        const result = await asyncFn(imageData);

        setNodeOutput(nodeId, {
          type: 'image',
          data: result,
          timestamp: Date.now(),
        });
        setNodeStatus(nodeId, 'success');
        onSuccess?.(result);
      } catch (error) {
        console.error(`Async processing failed for node ${nodeId}:`, error);
        setNodeStatus(nodeId, 'error');
        onError?.(error instanceof Error ? error : new Error(String(error)));
      } finally {
        processingRef.current = false;
      }
    },
    [nodeId, setNodeOutput, setNodeStatus, onStart, onSuccess, onError]
  );

  return {
    process,
    processAsync,
    hasImageInput,
    getImageInput,
    getInputs,
    getTextInput,
    isProcessing,
  };
}

/**
 * Hook for nodes that generate outputs (not just process images)
 */
export function useNodeOutput(nodeId: string) {
  const {
    getInputsForNode,
    setNodeOutput,
    setNodeStatus,
    nodeStatus,
    nodeOutputs,
  } = useWorkflowStore();

  const status = nodeStatus[nodeId] ?? 'idle';
  const output = nodeOutputs[nodeId];
  const processingRef = useRef(false);

  const getInputs = useCallback(() => {
    return getInputsForNode(nodeId);
  }, [nodeId, getInputsForNode]);

  const getTextInput = useCallback(() => {
    const inputs = getInputs();
    const textInput = inputs.find((i) => i.type === 'text');
    return textInput?.data ?? null;
  }, [getInputs]);

  const getImageInput = useCallback(() => {
    const inputs = getInputs();
    const imageInput = inputs.find((i) => i.type === 'image');
    return imageInput?.data ?? null;
  }, [getInputs]);

  const setOutput = useCallback(
    (type: 'text' | 'image' | 'model', data: string) => {
      setNodeOutput(nodeId, {
        type,
        data,
        timestamp: Date.now(),
      });
    },
    [nodeId, setNodeOutput]
  );

  const setStatus = useCallback(
    (status: 'idle' | 'running' | 'success' | 'error') => {
      setNodeStatus(nodeId, status);
    },
    [nodeId, setNodeStatus]
  );

  const runAsync = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      onResult: (result: T) => { type: 'text' | 'image' | 'model'; data: string }
    ) => {
      if (processingRef.current) return;
      processingRef.current = true;

      setStatus('running');

      try {
        const result = await asyncFn();
        const output = onResult(result);
        setOutput(output.type, output.data);
        setStatus('success');
      } catch (error) {
        console.error(`Operation failed for node ${nodeId}:`, error);
        setStatus('error');
      } finally {
        processingRef.current = false;
      }
    },
    [nodeId, setOutput, setStatus]
  );

  return {
    status,
    output,
    getInputs,
    getTextInput,
    getImageInput,
    setOutput,
    setStatus,
    runAsync,
    isProcessing: status === 'running',
  };
}
