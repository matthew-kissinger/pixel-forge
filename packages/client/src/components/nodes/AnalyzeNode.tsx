import { useCallback, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { ScanSearch, Settings } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '../../stores/workflow';
import { extractDominantColors, getImageDimensions } from '../../lib/image-utils';
import { logger } from '@pixel-forge/shared/logger';

interface AnalyzeNodeData {
  label: string;
  extractStats?: boolean;
  extractPalette?: boolean;
  extractDimensions?: boolean;
  [key: string]: unknown;
}

interface AnalysisResult {
  dimensions?: { width: number; height: number };
  palette?: string[];
  stats?: {
    aspectRatio: string;
    totalPixels: number;
    isPowerOf2: boolean;
  };
}

export function AnalyzeNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as AnalyzeNodeData;

  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';
  const [showSettings, setShowSettings] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const extractStats = nodeData.extractStats ?? true;
  const extractPalette = nodeData.extractPalette ?? true;
  const extractDimensions = nodeData.extractDimensions ?? true;

  const handleAnalyze = useCallback(async () => {
    const inputs = getInputsForNode(id);
    const imageInput = inputs.find((i) => i.type === 'image');

    if (!imageInput) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');

    try {
      const analysisResult: AnalysisResult = {};

      // Extract dimensions
      if (extractDimensions) {
        const dims = await getImageDimensions(imageInput.data);
        analysisResult.dimensions = dims;
      }

      // Extract color palette
      if (extractPalette) {
        const colors = await extractDominantColors(imageInput.data, 8);
        analysisResult.palette = colors.map(
          ([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        );
      }

      // Calculate stats
      if (extractStats && analysisResult.dimensions) {
        const { width, height } = analysisResult.dimensions;
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const divisor = gcd(width, height);
        analysisResult.stats = {
          aspectRatio: `${width / divisor}:${height / divisor}`,
          totalPixels: width * height,
          isPowerOf2: (width & (width - 1)) === 0 && (height & (height - 1)) === 0,
        };
      }

      setResult(analysisResult);

      // Output as JSON metadata
      setNodeOutput(id, {
        type: 'metadata',
        data: JSON.stringify(analysisResult, null, 2),
        timestamp: Date.now(),
      });
      setNodeStatus(id, 'success');
    } catch (error) {
      logger.error('Analysis failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [id, getInputsForNode, setNodeOutput, setNodeStatus, extractStats, extractPalette, extractDimensions]);

  return (
    <BaseNode
      {...props}
      data={nodeData}
      hasInput
      hasOutput
      inputLabel="Image"
      outputLabel="Metadata"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <ScanSearch className="h-4 w-4" />
            <span>Analyze Image</span>
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
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={extractDimensions}
                onChange={() => updateNodeData(id, { extractDimensions: !extractDimensions })}
                className="accent-[var(--accent)]"
              />
              <span className="text-xs text-[var(--text-secondary)]">Dimensions</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={extractPalette}
                onChange={() => updateNodeData(id, { extractPalette: !extractPalette })}
                className="accent-[var(--accent)]"
              />
              <span className="text-xs text-[var(--text-secondary)]">Color Palette</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={extractStats}
                onChange={() => updateNodeData(id, { extractStats: !extractStats })}
                className="accent-[var(--accent)]"
              />
              <span className="text-xs text-[var(--text-secondary)]">Image Stats</span>
            </label>
          </div>
        )}

        {/* Analysis Results */}
        {result && status === 'success' && (
          <div className="rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2 text-xs">
            {result.dimensions && (
              <div className="mb-1">
                <span className="text-[var(--text-secondary)]">Size: </span>
                <span className="text-[var(--text-primary)]">
                  {result.dimensions.width} x {result.dimensions.height}
                </span>
              </div>
            )}
            {result.stats && (
              <>
                <div className="mb-1">
                  <span className="text-[var(--text-secondary)]">Ratio: </span>
                  <span className="text-[var(--text-primary)]">{result.stats.aspectRatio}</span>
                </div>
                <div className="mb-1">
                  <span className="text-[var(--text-secondary)]">Power of 2: </span>
                  <span className={result.stats.isPowerOf2 ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
                    {result.stats.isPowerOf2 ? 'Yes' : 'No'}
                  </span>
                </div>
              </>
            )}
            {result.palette && (
              <div className="mt-2">
                <span className="text-[var(--text-secondary)]">Palette:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {result.palette.map((color, i) => (
                    <div
                      key={i}
                      className="h-4 w-4 rounded border border-black/20"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={status === 'running'}
          className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'running' ? 'Analyzing...' : 'Analyze'}
        </button>

        {status === 'error' && (
          <p className="text-xs text-[var(--error)]">Analysis failed</p>
        )}
      </div>
    </BaseNode>
  );
}
