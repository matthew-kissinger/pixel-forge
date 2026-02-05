/**
 * Validation logic for QualityCheckNode
 */

import { getImageDimensions } from '../../../lib/image-utils';
import type { ValidationResult } from './types';

export interface ValidationConfig {
  maxFileSize: number;
  allowedFormats: string[];
  requirePowerOf2: boolean;
  requireTransparency: boolean;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export async function validateImage(
  imageDataUrl: string,
  config: ValidationConfig
): Promise<ValidationResult> {
  // Get image dimensions
  const dimensions = await getImageDimensions(imageDataUrl);
  const { width, height } = dimensions;

  // Estimate file size from data URL (base64 encoded)
  // Base64 encoding adds ~33% overhead, so we decode to get actual size
  const base64Data = imageDataUrl.split(',')[1] || '';
  const binarySize = Math.floor((base64Data.length * 3) / 4);
  const fileSize = binarySize;

  // Extract format from data URL mime type
  const mimeMatch = imageDataUrl.match(/data:image\/([^;]+)/);
  const format = mimeMatch ? mimeMatch[1].toLowerCase() : 'unknown';

  // Check transparency by loading image and checking alpha channel
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = imageDataUrl;
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
  const hasTransparency = Array.from(imageData.data).some(
    (_, i) => i % 4 === 3 && imageData.data[i] < 255
  );

  // Perform validation checks
  const checks = {
    dimensionRange: {
      passed:
        width >= config.minWidth &&
        width <= config.maxWidth &&
        height >= config.minHeight &&
        height <= config.maxHeight,
      message: `Dimensions: ${width}x${height} (allowed: ${config.minWidth}-${config.maxWidth} x ${config.minHeight}-${config.maxHeight})`,
    },
    powerOf2: {
      passed:
        !config.requirePowerOf2 ||
        ((width & (width - 1)) === 0 && (height & (height - 1)) === 0),
      message: `Power of 2: ${
        config.requirePowerOf2
          ? (width & (width - 1)) === 0 && (height & (height - 1)) === 0
            ? 'Yes'
            : 'No'
          : 'Not required'
      }`,
    },
    fileSize: {
      passed: fileSize <= config.maxFileSize,
      message: `File size: ${formatBytes(fileSize)} (max: ${formatBytes(config.maxFileSize)})`,
    },
    format: {
      passed: config.allowedFormats.includes(format),
      message: `Format: ${format} (allowed: ${config.allowedFormats.join(', ')})`,
    },
    transparency: {
      passed: !config.requireTransparency || hasTransparency,
      message: `Transparency: ${hasTransparency ? 'Yes' : 'No'}${config.requireTransparency ? ' (required)' : ''}`,
    },
  };

  const allPassed = Object.values(checks).every((check) => check.passed);

  return {
    passed: allPassed,
    checks,
  };
}
