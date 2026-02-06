import { useCallback, useEffect, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { LayoutGrid } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '../../stores/workflow';
import type { ExportSheetNodeData } from '../../types/nodes';
import { generateAtlas, getAtlasFileExtension, type AtlasFormat } from '../../lib/atlas';
import { FormatSelector } from './export-sheet/FormatSelector';
import { ExportSettings } from './export-sheet/ExportSettings';
import { InputStatus } from './export-sheet/InputStatus';
import { ExportActions } from './export-sheet/ExportActions';
import type { ExportSheetNodeCallbacks, ImageDimensions } from './export-sheet/types';

export function ExportSheetNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ExportSheetNodeData;
  const { getInputsForNode, updateNodeData, nodes, edges } = useWorkflowStore();

  const fileName = nodeData.fileName || 'sprite-sheet';
  const includeMetadata = nodeData.includeMetadata ?? true;
  const format = nodeData.format || 'png';
  const atlasFormat = nodeData.atlasFormat || 'none';
  const columns = nodeData.columns ?? 4;
  const rows = nodeData.rows ?? 4;

  const inputs = getInputsForNode(id);
  const latestInput = inputs[inputs.length - 1];
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);

  // Get image dimensions for frame size calculation
  useEffect(() => {
    if (latestInput && latestInput.type === 'image') {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = latestInput.data;
    } else {
      setImageDimensions(null);
    }
  }, [latestInput]);

  // Try to infer columns/rows from upstream SliceSheetNode (only once on mount)
  useEffect(() => {
    // Only auto-infer if columns/rows haven't been explicitly set
    const hasExplicitValues = 'columns' in nodeData && 'rows' in nodeData;
    if (!hasExplicitValues) {
      // Find upstream SliceSheetNode
      const incomingEdge = edges.find((e) => e.target === id);
      if (incomingEdge) {
        const sourceNode = nodes.find((n) => n.id === incomingEdge.source);
        if (sourceNode?.data.nodeType === 'sliceSheet') {
          const sliceData = sourceNode.data as { cols?: number; rows?: number };
          if (sliceData.cols && sliceData.rows) {
            updateNodeData<ExportSheetNodeData>(id, {
              columns: sliceData.cols,
              rows: sliceData.rows,
            });
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const downloadMetadata = useCallback(
    (width: number, height: number) => {
      // Create basic sprite sheet metadata
      const metadata = {
        fileName: `${fileName}.${format}`,
        dimensions: { width, height },
        format,
        exportedAt: new Date().toISOString(),
      };

      const metaLink = document.createElement('a');
      metaLink.download = `${fileName}.json`;
      metaLink.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(metadata, null, 2))}`;
      metaLink.click();
    },
    [fileName, format]
  );

  const handleDownload = useCallback(async () => {
    if (!latestInput || latestInput.type !== 'image') return;

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = latestInput.data;
    });

    const sheetWidth = img.width;
    const sheetHeight = img.height;
    const imageFileName = `${fileName}.${format}`;

    // If atlas format is selected, create ZIP with image + atlas file
    if (atlasFormat !== 'none') {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Convert image to blob
      const canvas = document.createElement('canvas');
      canvas.width = sheetWidth;
      canvas.height = sheetHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Wait for blob conversion
      const imageBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, format === 'png' ? 'image/png' : 'image/webp', format === 'webp' ? 0.9 : undefined);
      });

      zip.file(imageFileName, imageBlob);

      // Generate atlas file
      const atlasContent = generateAtlas(atlasFormat as AtlasFormat, {
        columns,
        rows,
        sheetWidth,
        sheetHeight,
        imageFileName,
      });

      const atlasExtension = getAtlasFileExtension(atlasFormat as AtlasFormat);
      const atlasFileName = `${fileName}.${atlasExtension}`;
      zip.file(atlasFileName, atlasContent);

      // If basic metadata is also enabled, include it
      if (includeMetadata) {
        const metadata = {
          fileName: imageFileName,
          dimensions: { width: sheetWidth, height: sheetHeight },
          format,
          exportedAt: new Date().toISOString(),
        };
        zip.file(`${fileName}_metadata.json`, JSON.stringify(metadata, null, 2));
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    // No atlas format - download image (and metadata if enabled) separately
    const link = document.createElement('a');
    link.download = imageFileName;

    if (format === 'png') {
      link.href = latestInput.data;
    } else {
      // Convert to webp
      const canvas = document.createElement('canvas');
      canvas.width = sheetWidth;
      canvas.height = sheetHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      link.href = canvas.toDataURL('image/webp', 0.9);
    }

    link.click();

    // If metadata is enabled, also download JSON
    if (includeMetadata) {
      downloadMetadata(sheetWidth, sheetHeight);
    }
  }, [latestInput, fileName, format, includeMetadata, downloadMetadata, atlasFormat, columns, rows]);

  const callbacks: ExportSheetNodeCallbacks = {
    onFileNameChange: (newFileName) => {
      updateNodeData<ExportSheetNodeData>(id, { fileName: newFileName });
    },
    onFormatChange: (newFormat) => {
      updateNodeData<ExportSheetNodeData>(id, { format: newFormat });
    },
    onAtlasFormatChange: (newAtlasFormat) => {
      updateNodeData<ExportSheetNodeData>(id, { atlasFormat: newAtlasFormat });
    },
    onColumnsChange: (newColumns) => {
      updateNodeData<ExportSheetNodeData>(id, { columns: newColumns });
    },
    onRowsChange: (newRows) => {
      updateNodeData<ExportSheetNodeData>(id, { rows: newRows });
    },
    onIncludeMetadataChange: (include) => {
      updateNodeData<ExportSheetNodeData>(id, { includeMetadata: include });
    },
    onExport: handleDownload,
  };

  const canExport = latestInput?.type === 'image';

  return (
    <BaseNode {...props} data={nodeData} hasInput inputLabel="Image">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <LayoutGrid className="h-4 w-4" />
          <span>Export Sprite Sheet</span>
        </div>

        <ExportSettings data={nodeData} callbacks={callbacks} imageDimensions={imageDimensions} />
        <FormatSelector data={nodeData} callbacks={callbacks} />
        <InputStatus hasInput={!!latestInput} inputType={latestInput?.type || null} />
        <ExportActions canExport={canExport} callbacks={callbacks} />
      </div>
    </BaseNode>
  );
}
