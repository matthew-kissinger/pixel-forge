import { useCallback, useState, useMemo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';
import { ValidationSettings } from './quality/ValidationSettings';
import { ValidationResults } from './quality/ValidationResults';
import { QualityActions } from './quality/QualityActions';
import { validateImage, type ValidationConfig } from './quality/validation';
import type { QualityCheckNodeData, ValidationResult } from './quality/types';

export function QualityCheckNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as QualityCheckNodeData;

  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';
  const [showSettings, setShowSettings] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const maxFileSize = nodeData.maxFileSize ?? 51200;
  const allowedFormats = useMemo(
    () => nodeData.allowedFormats ?? ['png', 'webp', 'jpeg'],
    [nodeData.allowedFormats]
  );
  const requirePowerOf2 = nodeData.requirePowerOf2 ?? true;
  const requireTransparency = nodeData.requireTransparency ?? false;
  const minWidth = nodeData.minWidth ?? 0;
  const maxWidth = nodeData.maxWidth ?? 4096;
  const minHeight = nodeData.minHeight ?? 0;
  const maxHeight = nodeData.maxHeight ?? 4096;

  const validationConfig: ValidationConfig = useMemo(
    () => ({
      maxFileSize,
      allowedFormats,
      requirePowerOf2,
      requireTransparency,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
    }),
    [maxFileSize, allowedFormats, requirePowerOf2, requireTransparency, minWidth, maxWidth, minHeight, maxHeight]
  );

  const handleQualityCheck = useCallback(async () => {
    const inputs = getInputsForNode(id);
    const imageInput = inputs.find((i) => i.type === 'image');

    if (!imageInput) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');

    try {
      const validationResult = await validateImage(imageInput.data, validationConfig);
      setResult(validationResult);

      if (validationResult.passed) {
        // Pass image through on success
        setNodeOutput(id, {
          type: 'image',
          data: imageInput.data,
          timestamp: Date.now(),
        });
        setNodeStatus(id, 'success');
      } else {
        // Throw error on failure
        const failedChecks = Object.entries(validationResult.checks)
          .filter(([, check]) => !check.passed)
          .map(([, check]) => check.message)
          .join('; ');
        throw new Error(`Quality check failed: ${failedChecks}`);
      }
    } catch (error) {
      logger.error('Quality check failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [id, getInputsForNode, setNodeOutput, setNodeStatus, validationConfig]);

  // Callbacks for sub-components
  const callbacks = {
    onMaxFileSizeChange: useCallback(
      (size: number) => {
        updateNodeData(id, { maxFileSize: size });
      },
      [id, updateNodeData]
    ),
    onAllowedFormatsChange: useCallback(
      (formats: string[]) => {
        updateNodeData(id, { allowedFormats: formats });
      },
      [id, updateNodeData]
    ),
    onRequirePowerOf2Change: useCallback(
      (require: boolean) => {
        updateNodeData(id, { requirePowerOf2: require });
      },
      [id, updateNodeData]
    ),
    onRequireTransparencyChange: useCallback(
      (require: boolean) => {
        updateNodeData(id, { requireTransparency: require });
      },
      [id, updateNodeData]
    ),
    onMinWidthChange: useCallback(
      (width: number) => {
        updateNodeData(id, { minWidth: width });
      },
      [id, updateNodeData]
    ),
    onMaxWidthChange: useCallback(
      (width: number) => {
        updateNodeData(id, { maxWidth: width });
      },
      [id, updateNodeData]
    ),
    onMinHeightChange: useCallback(
      (height: number) => {
        updateNodeData(id, { minHeight: height });
      },
      [id, updateNodeData]
    ),
    onMaxHeightChange: useCallback(
      (height: number) => {
        updateNodeData(id, { maxHeight: height });
      },
      [id, updateNodeData]
    ),
    onValidate: handleQualityCheck,
    onToggleSettings: useCallback(() => {
      setShowSettings((prev) => !prev);
    }, []),
  };

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
        <QualityActions status={status} showSettings={showSettings} callbacks={callbacks} />

        {showSettings && <ValidationSettings data={nodeData} callbacks={callbacks} />}

        {result && <ValidationResults result={result} />}
      </div>
    </BaseNode>
  );
}
