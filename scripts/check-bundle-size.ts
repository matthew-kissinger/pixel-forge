#!/usr/bin/env bun

import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { gzipSync } from 'zlib';

interface SizeCheck {
  file: string;
  rawSize: number;
  gzipSize: number;
  warnings: string[];
  errors: string[];
}

// Size thresholds (in bytes)
const THRESHOLDS = {
  main: {
    warn: 800 * 1024, // 800KB
    fail: 1000 * 1024, // 1000KB
  },
  three: {
    warn: 1500 * 1024, // 1500KB
    fail: 2000 * 1024, // 2000KB
  },
  anyChunk: {
    fail: 2000 * 1024, // 2000KB
  },
  totalGzip: {
    warn: 900 * 1024, // 900KB
  },
};

async function checkBundleSizes() {
  const distPath = join(process.cwd(), 'packages/client/dist/assets');
  
  try {
    const files = await readdir(distPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    if (jsFiles.length === 0) {
      console.error('❌ No JS files found in dist/assets. Build may have failed.');
      process.exit(1);
    }
    
    const checks: SizeCheck[] = [];
    let totalGzipSize = 0;
    
    for (const file of jsFiles) {
      const filePath = join(distPath, file);
      const stats = await stat(filePath);
      const rawSize = stats.size;
      
      // Read file and calculate gzip size
      const content = await Bun.file(filePath).arrayBuffer();
      const gzipSize = gzipSync(Buffer.from(content)).length;
      totalGzipSize += gzipSize;
      
      const warnings: string[] = [];
      const errors: string[] = [];
      
      // Identify chunk type by filename
      const isMain = file.includes('index') || file.includes('main');
      const isThree = file.includes('three');
      const isReactFlow = file.includes('react-flow');
      
      // Check main chunk thresholds
      if (isMain) {
        if (rawSize > THRESHOLDS.main.fail) {
          errors.push(`Main chunk exceeds fail threshold: ${formatSize(rawSize)} > ${formatSize(THRESHOLDS.main.fail)}`);
        } else if (rawSize > THRESHOLDS.main.warn) {
          warnings.push(`Main chunk exceeds warn threshold: ${formatSize(rawSize)} > ${formatSize(THRESHOLDS.main.warn)}`);
        }
      }
      
      // Check Three.js chunk thresholds
      if (isThree) {
        if (rawSize > THRESHOLDS.three.fail) {
          errors.push(`Three.js chunk exceeds fail threshold: ${formatSize(rawSize)} > ${formatSize(THRESHOLDS.three.fail)}`);
        } else if (rawSize > THRESHOLDS.three.warn) {
          warnings.push(`Three.js chunk exceeds warn threshold: ${formatSize(rawSize)} > ${formatSize(THRESHOLDS.three.warn)}`);
        }
      }
      
      // Check any chunk size limit
      if (rawSize > THRESHOLDS.anyChunk.fail) {
        errors.push(`Chunk exceeds maximum size: ${formatSize(rawSize)} > ${formatSize(THRESHOLDS.anyChunk.fail)}`);
      }
      
      checks.push({
        file,
        rawSize,
        gzipSize,
        warnings,
        errors,
      });
    }
    
    // Check total gzipped size
    if (totalGzipSize > THRESHOLDS.totalGzip.warn) {
      console.warn(`⚠️  Total gzipped size exceeds warn threshold: ${formatSize(totalGzipSize)} > ${formatSize(THRESHOLDS.totalGzip.warn)}`);
    }
    
    // Print summary
    console.log('\n📦 Bundle Size Report\n');
    console.log('Chunk sizes:');
    for (const check of checks) {
      const type = check.file.includes('three') ? 'Three.js' :
                   check.file.includes('react-flow') ? 'React Flow' :
                   check.file.includes('index') || check.file.includes('main') ? 'Main' :
                   'Other';
      console.log(`  ${check.file.padEnd(50)} ${formatSize(check.rawSize).padStart(10)} (${formatSize(check.gzipSize)} gzip) [${type}]`);
      
      if (check.warnings.length > 0) {
        check.warnings.forEach(w => console.warn(`    ⚠️  ${w}`));
      }
      if (check.errors.length > 0) {
        check.errors.forEach(e => console.error(`    ❌ ${e}`));
      }
    }
    
    console.log(`\nTotal gzipped size: ${formatSize(totalGzipSize)}`);
    
    // Check for errors
    const hasErrors = checks.some(c => c.errors.length > 0);
    if (hasErrors) {
      console.error('\n❌ Bundle size check failed! Some chunks exceed thresholds.');
      process.exit(1);
    }
    
    // Check for warnings
    const hasWarnings = checks.some(c => c.warnings.length > 0) || totalGzipSize > THRESHOLDS.totalGzip.warn;
    if (hasWarnings) {
      console.warn('\n⚠️  Bundle size check passed with warnings.');
    } else {
      console.log('\n✅ Bundle size check passed!');
    }
    
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`❌ Build output directory not found: ${distPath}`);
      console.error('   Make sure to run "bun run build" first.');
      process.exit(1);
    }
    throw error;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

checkBundleSizes().catch((error) => {
  console.error('❌ Error checking bundle sizes:', error);
  process.exit(1);
});
