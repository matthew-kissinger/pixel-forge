import { useCallback, useState, useMemo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { CheckCircle2, XCircle, Settings, AlertCircle } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '../../stores/workflow';
import { getImageDimensions } from '../../lib/image-utils';
import { logger } from '@pixel-forge/shared/logger';
import type { QualityCheckNodeData } from '../../types/nodes';

interface ValidationResult {
  passed: boolean;
  checks: {
    dimensionRange: { passed: boolean; message: string };
    powerOf2: { passed: boolean; message: string };
    fileSize: { passed: boolean; message: string };
    format: { passed: boolean; message: string };
    transparency: { passed: boolean; message: string };
  };
}

export function QualityCheckNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as QualityCheckNodeData;

  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';
  const [showSettings, setShowSettings] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const maxFileSize = nodeData.maxFileSize ?? 51200;
  const allowedFormats = useMemo(() => nodeData.allowedFormats ?? ['png', 'webp', 'jpeg'], [nodeData.allowedFormats]);
  const requirePowerOf2 = nodeData.requirePowerOf2 ?? true;
  const requireTransparency = nodeData.requireTransparency ?? false;
  const minWidth = nodeData.minWidth ?? 0;
  const maxWidth = nodeData.maxWidth ?? 4096;
  const minHeight = nodeData.minHeight ?? 0;
  const maxHeight = nodeData.maxHeight ?? 4096;

  const formatBytes = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }, []);

  const handleQualityCheck = useCallback(async () => {
    const inputs = getInputsForNode(id);
    const imageInput = inputs.find((i) => i.type === 'image');

    if (!imageInput) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');

    try {
      // Get image dimensions
      const dimensions = await getImageDimensions(imageInput.data);
      const { width, height } = dimensions;

      // Estimate file size from data URL (base64 encoded)
      // Base64 encoding adds ~33% overhead, so we decode to get actual size
      const base64Data = imageInput.data.split(',')[1] || '';
      const binarySize = Math.floor((base64Data.length * 3) / 4);
      const fileSize = binarySize;

      // Extract format from data URL mime type
      const mimeMatch = imageInput.data.match(/data:image\/([^;]+)/);
      const format = mimeMatch ? mimeMatch[1].toLowerCase() : 'unknown';

      // Check transparency by loading image and checking alpha channel
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageInput.data;
      });

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, width, height);
      const hasTransparency = Array.from(imageData.data).some((_, i) => i % 4 === 3 && imageData.data[i] < 255);

      // Perform validation checks
      const checks = {
        dimensionRange: {
          passed: width >= minWidth && width <= maxWidth && height >= minHeight && height <= maxHeight,
          message: `Dimensions: ${width}x${height} (allowed: ${minWidth}-${maxWidth} x ${minHeight}-${maxHeight})`,
        },
        powerOf2: {
          passed: !requirePowerOf2 || ((width & (width - 1)) === 0 && (height & (height - 1)) === 0),
          message: `Power of 2: ${requirePowerOf2 ? (width & (width - 1)) === 0 && (height & (height - 1)) === 0 ? 'Yes' : 'No' : 'Not required'}`,
        },
        fileSize: {
          passed: fileSize <= maxFileSize,
          message: `File size: ${formatBytes(fileSize)} (max: ${formatBytes(maxFileSize)})`,
        },
        format: {
          passed: allowedFormats.includes(format),
          message: `Format: ${format} (allowed: ${allowedFormats.join(', ')})`,
        },
        transparency: {
          passed: !requireTransparency || hasTransparency,
          message: `Transparency: ${hasTransparency ? 'Yes' : 'No'}${requireTransparency ? ' (required)' : ''}`,
        },
      };

      const allPassed = Object.values(checks).every((check) => check.passed);

      const validationResult: ValidationResult = {
        passed: allPassed,
        checks,
      };

      setResult(validationResult);

      if (allPassed) {
        // Pass image through on success
        setNodeOutput(id, {
          type: 'image',
          data: imageInput.data,
          timestamp: Date.now(),
        });
        setNodeStatus(id, 'success');
      } else {
        // Throw error on failure
        const failedChecks = Object.entries(checks)
          .filter(([, check]) => !check.passed)
          .map(([, check]) => check.message)
          .join('; ');
        throw new Error(`Quality check failed: ${failedChecks}`);
      }
    } catch (error) {
      logger.error('Quality check failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [
    id,
    getInputsForNode,
    setNodeOutput,
    setNodeStatus,
    maxFileSize,
    allowedFormats,
    requirePowerOf2,
    requireTransparency,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    formatBytes,
  ]);

  return (
    <BaseNode
      {...props}
      data={nodeData}
      hasInput
      hasOutput
      inputLabel="Image"
      outputLabel="Validated"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <CheckCircle2 className="h-4 w-4" />
            <span>Quality Check</span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded p-1 hover:bg-[var(--bg-tertiary)]"
          >
            <Settings className="h-3 w-3 text-[var(--text-secondary)]" />
          </button>
        </div>

        {showSettings && (
          <div className="flex flex-col gap-2 rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2">
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Max File Size (bytes)</label>
              <input
                type="number"
                value={maxFileSize}
                onChange={(e) => updateNodeData(id, { maxFileSize: parseInt(e.target.value, 10) || 51200 })}
                className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Allowed Formats (comma-separated)</label>
              <input
                type="text"
                value={allowedFormats.join(', ')}
                onChange={(e) => updateNodeData(id, { allowedFormats: e.target.value.split(',').map(f => f.trim().toLowerCase()) })}
                className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-sm"
                placeholder="png, webp, jpeg"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={requirePowerOf2}
                onChange={() => updateNodeData(id, { requirePowerOf2: !requirePowerOf2 })}
                className="accent-[var(--accent)]"
              />
              <span className="text-xs text-[var(--text-secondary)]">Require Power of 2</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={requireTransparency}
                onChange={() => updateNodeData(id, { requireTransparency: !requireTransparency })}
                className="accent-[var(--accent)]"
              />
              <span className="text-xs text-[var(--text-secondary)]">Require Transparency</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Min Width</label>
                <input
                  type="number"
                  value={minWidth}
                  onChange={(e) => updateNodeData(id, { minWidth: parseInt(e.target.value, 10) || 0 })}
                  className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-sm"
                  min={0}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Max Width</label>
                <input
                  type="number"
                  value={maxWidth}
                  onChange={(e) => updateNodeData(id, { maxWidth: parseInt(e.target.value, 10) || 4096 })}
                  className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-sm"
                  min={1}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Min Height</label>
                <input
                  type="number"
                  value={minHeight}
                  onChange={(e) => updateNodeData(id, { minHeight: parseInt(e.target.value, 10) || 0 })}
                  className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-sm"
                  min={0}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Max Height</label>
                <input
                  type="number"
                  value={maxHeight}
                  onChange={(e) => updateNodeData(id, { maxHeight: parseInt(e.target.value, 10) || 4096 })}
                  className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-sm"
                  min={1}
                />
              </div>
            </div>
          </div>
        )}

        {/* Validation Results */}
        {result && (
          <div className="rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2 text-xs">
            <div className="mb-2 flex items-center gap-2">
              {result.passed ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                  <span className="font-medium text-[var(--success)]">All checks passed</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-[var(--error)]" />
                  <span className="font-medium text-[var(--error)]">Validation failed</span>
                </>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {Object.entries(result.checks).map(([key, check]) => (
                <div key={key} className="flex items-center gap-2">
                  {check.passed ? (
                    <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-[var(--success)]" />
                  ) : (
                    <XCircle className="h-3 w-3 flex-shrink-0 text-[var(--error)]" />
                  )}
                  <span className={check.passed ? 'text-[var(--text-primary)]' : 'text-[var(--error)]'}>
                    {check.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleQualityCheck}
          disabled={status === 'running'}
          className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'running' ? 'Validating...' : 'Validate'}
        </button>

        {status === 'error' && (
          <div className="flex items-center gap-2 text-xs text-[var(--error)]">
            <AlertCircle className="h-4 w-4" />
            <span>Validation failed. Check settings and try again.</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}
