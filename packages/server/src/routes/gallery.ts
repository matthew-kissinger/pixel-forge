/**
 * Asset Gallery Routes
 *
 * GET /gallery - Browse all generated war-assets with raw/clean comparison
 * GET /gallery/api/assets - JSON list of all assets
 * GET /gallery/file/* - Serve asset files from war-assets/
 */

import { Hono } from 'hono';
import path from 'path';
import { readdirSync, statSync, existsSync } from 'fs';
import { logger } from '@pixel-forge/shared/logger';

const galleryRouter = new Hono();

// Resolve war-assets directory relative to project root
const WAR_ASSETS_DIR = path.resolve(
  process.env.WAR_ASSETS_DIR || path.join(import.meta.dir, '../../../../war-assets')
);

interface AssetEntry {
  name: string;
  category: string;
  rawPath?: string;
  cleanPath?: string;
  rawSize?: number;
  cleanSize?: number;
  modified: string;
}

/**
 * Recursively scan war-assets/ for image files, pairing _raw with clean versions.
 */
function scanAssets(): AssetEntry[] {
  const assets: AssetEntry[] = [];

  if (!existsSync(WAR_ASSETS_DIR)) {
    logger.warn(`War assets directory not found: ${WAR_ASSETS_DIR}`);
    return assets;
  }

  function walkDir(dir: string, category: string) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    // Collect files, skip _raw files (will be paired later)
    const files = new Map<string, { raw?: string; clean?: string; rawSize?: number; cleanSize?: number; modified: string }>();

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        const subCategory = category ? `${category}/${entry}` : entry;
        walkDir(fullPath, subCategory);
      } else if (/\.(png|jpg|jpeg|webp|glb|gltf)$/i.test(entry)) {
        // Determine if this is a _raw variant
        const isRaw = /_raw\.\w+$/.test(entry);
        const baseName = entry.replace(/_raw(\.\w+)$/, '$1');
        const existing = files.get(baseName) || { modified: stat.mtime.toISOString() };

        if (isRaw) {
          existing.raw = entry;
          existing.rawSize = stat.size;
        } else {
          existing.clean = entry;
          existing.cleanSize = stat.size;
        }

        // Keep the latest modification time
        if (stat.mtime.toISOString() > existing.modified) {
          existing.modified = stat.mtime.toISOString();
        }

        files.set(baseName, existing);
      }
    }

    for (const [baseName, info] of files.entries()) {
      const name = baseName.replace(/\.\w+$/, '');
      assets.push({
        name,
        category,
        rawPath: info.raw ? `${category}/${info.raw}` : undefined,
        cleanPath: info.clean ? `${category}/${info.clean}` : undefined,
        rawSize: info.rawSize,
        cleanSize: info.cleanSize,
        modified: info.modified,
      });
    }
  }

  walkDir(WAR_ASSETS_DIR, '');
  assets.sort((a, b) => b.modified.localeCompare(a.modified));
  return assets;
}

/**
 * GET /gallery/api/assets - JSON list of all assets
 */
galleryRouter.get('/api/assets', (c) => {
  const assets = scanAssets();
  return c.json({ assets, total: assets.length, dir: WAR_ASSETS_DIR });
});

/**
 * GET /gallery/file/* - Serve raw asset files
 */
galleryRouter.get('/file/*', async (c) => {
  const filePath = c.req.path.replace('/gallery/file/', '');

  // Security: prevent directory traversal
  if (filePath.includes('..')) {
    return c.text('Forbidden', 403);
  }

  const fullPath = path.join(WAR_ASSETS_DIR, filePath);

  if (!existsSync(fullPath)) {
    return c.text('Not found', 404);
  }

  // Determine content type
  const ext = path.extname(fullPath).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
  };

  const file = Bun.file(fullPath);
  return new Response(file, {
    headers: {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    },
  });
});

/**
 * GET /gallery - HTML gallery page
 */
galleryRouter.get('/', (c) => {
  return c.html(GALLERY_HTML);
});

const GALLERY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pixel Forge - Asset Gallery</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #e0e0e0; }
  header { background: #111; border-bottom: 1px solid #333; padding: 16px 24px; display: flex; align-items: center; gap: 16px; }
  header h1 { font-size: 20px; font-weight: 600; }
  header .count { color: #888; font-size: 14px; }
  .filters { padding: 12px 24px; background: #111; border-bottom: 1px solid #222; display: flex; gap: 8px; flex-wrap: wrap; }
  .filters button { padding: 6px 14px; border: 1px solid #333; border-radius: 6px; background: #1a1a1a; color: #ccc; cursor: pointer; font-size: 13px; }
  .filters button.active { background: #2563eb; border-color: #2563eb; color: white; }
  .filters button:hover { border-color: #555; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(480px, 1fr)); gap: 20px; padding: 24px; }
  .card { background: #151515; border: 1px solid #262626; border-radius: 10px; overflow: hidden; }
  .card-header { padding: 12px 16px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; }
  .card-header h3 { font-size: 15px; font-weight: 500; }
  .card-header .category { font-size: 12px; color: #666; background: #1a1a1a; padding: 2px 8px; border-radius: 4px; }
  .comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #222; }
  .comparison .panel { background: #0a0a0a; position: relative; }
  .comparison .panel img { width: 100%; height: auto; display: block; }
  .comparison .panel .label { position: absolute; top: 8px; left: 8px; font-size: 11px; padding: 2px 8px; border-radius: 4px; }
  .label.raw { background: rgba(220, 38, 38, 0.8); }
  .label.clean { background: rgba(34, 197, 94, 0.8); }
  .card-footer { padding: 8px 16px; font-size: 12px; color: #666; display: flex; justify-content: space-between; }
  .checkerboard { background-image: linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%); background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0px; }
  .single img { width: 100%; height: auto; display: block; }
  .single { position: relative; }
  .tiled-preview { position: relative; overflow: hidden; background-color: #0a0a0a; }
  .tiled-toggle { position: absolute; top: 8px; right: 8px; padding: 4px 10px; background: rgba(37,99,235,0.85); color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer; z-index: 2; }
  .empty { padding: 60px; text-align: center; color: #555; font-size: 16px; }
  .status-bar { padding: 8px 24px; background: #0d0d0d; border-top: 1px solid #222; font-size: 12px; color: #555; position: fixed; bottom: 0; width: 100%; }
  @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } .comparison { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<header>
  <h1>Asset Gallery</h1>
  <span class="count" id="count">Loading...</span>
  <button onclick="loadAssets()" style="margin-left:auto; padding:6px 14px; background:#1a1a1a; border:1px solid #333; border-radius:6px; color:#ccc; cursor:pointer;">Refresh</button>
</header>
<div class="filters" id="filters"></div>
<div class="grid" id="grid"></div>
<div class="status-bar" id="status">Scanning war-assets/...</div>

<script>
let allAssets = [];
let activeFilter = 'all';

async function loadAssets() {
  const resp = await fetch('/gallery/api/assets');
  const data = await resp.json();
  allAssets = data.assets;
  document.getElementById('count').textContent = data.total + ' assets in ' + data.dir;
  document.getElementById('status').textContent = 'Last scan: ' + new Date().toLocaleTimeString() + ' | ' + data.total + ' assets';
  buildFilters();
  renderGrid();
}

function buildFilters() {
  const cats = ['all', ...new Set(allAssets.map(a => a.category).filter(Boolean))];
  const container = document.getElementById('filters');
  container.innerHTML = '';
  for (const cat of cats) {
    const btn = document.createElement('button');
    btn.textContent = cat === 'all' ? 'All' : cat;
    btn.className = cat === activeFilter ? 'active' : '';
    btn.onclick = () => { activeFilter = cat; buildFilters(); renderGrid(); };
    container.appendChild(btn);
  }
}

function formatSize(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(0) + ' KB';
}

function isTexture(asset) {
  return asset.category === 'textures' || asset.name.includes('texture') || asset.name.includes('floor') || asset.name.includes('trail');
}

function showTiled(id, cols) {
  var single = document.getElementById('ts-' + id);
  var wrap = document.getElementById('tw-' + id);
  var src = single.querySelector('img').src;
  single.style.display = 'none';
  wrap.style.display = 'block';
  var pct = (100 / cols) + '%';
  wrap.style.backgroundImage = 'url(' + src + ')';
  wrap.style.backgroundSize = pct + ' ' + pct;
  wrap.style.backgroundRepeat = 'repeat';
  wrap.style.imageRendering = 'pixelated';
  wrap.style.height = '480px';
}

function showSingle(id) {
  document.getElementById('tw-' + id).style.display = 'none';
  document.getElementById('ts-' + id).style.display = 'block';
}

var texId = 0;

function renderGrid() {
  var container = document.getElementById('grid');
  var filtered = activeFilter === 'all' ? allAssets : allAssets.filter(function(a) { return a.category === activeFilter; });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty">No assets found. Generate some with the API or scripts.</div>';
    return;
  }

  texId = 0;
  container.innerHTML = filtered.map(function(asset) {
    var hasRaw = !!asset.rawPath;
    var hasClean = !!asset.cleanPath;
    var isGlb = (asset.cleanPath || '').endsWith('.glb') || (asset.rawPath || '').endsWith('.glb');
    var isTex = isTexture(asset);
    var imgPath = asset.cleanPath || asset.rawPath;

    var body;
    if (isGlb) {
      body = '<div class="single" style="padding:40px;text-align:center;color:#666;">GLB Model - ' + asset.name + '</div>';
    } else if (isTex && imgPath) {
      var tid = texId++;
      body = '<div class="single" id="ts-' + tid + '"><span class="label clean" style="position:absolute;top:8px;left:8px;">Texture</span><img src="/gallery/file/' + imgPath + '" loading="lazy" style="width:100%;display:block;image-rendering:pixelated;"></div>' +
        '<div class="tiled-preview" id="tw-' + tid + '" style="display:none;"><button class="tiled-toggle" onclick="showSingle(' + tid + ')">Back to Single</button></div>' +
        '<div style="padding:6px 12px;border-top:1px solid #222;display:flex;gap:6px;">' +
        '<button onclick="showTiled(' + tid + ',3)" style="padding:4px 10px;background:#1a1a1a;border:1px solid #333;border-radius:4px;color:#ccc;cursor:pointer;font-size:11px;">3x3</button>' +
        '<button onclick="showTiled(' + tid + ',5)" style="padding:4px 10px;background:#1a1a1a;border:1px solid #333;border-radius:4px;color:#ccc;cursor:pointer;font-size:11px;">5x5</button>' +
        '<button onclick="showTiled(' + tid + ',8)" style="padding:4px 10px;background:#1a1a1a;border:1px solid #333;border-radius:4px;color:#ccc;cursor:pointer;font-size:11px;">8x8</button>' +
        '</div>';
    } else if (hasRaw && hasClean) {
      body = '<div class="comparison">' +
        '<div class="panel"><span class="label raw">Raw</span><img src="/gallery/file/' + asset.rawPath + '" loading="lazy"></div>' +
        '<div class="panel checkerboard"><span class="label clean">Clean</span><img src="/gallery/file/' + asset.cleanPath + '" loading="lazy"></div>' +
        '</div>';
    } else if (hasClean) {
      body = '<div class="single checkerboard"><span class="label clean" style="position:absolute;top:8px;left:8px;">Clean</span><img src="/gallery/file/' + asset.cleanPath + '" loading="lazy"></div>';
    } else if (hasRaw) {
      body = '<div class="single"><span class="label raw" style="position:absolute;top:8px;left:8px;">Raw</span><img src="/gallery/file/' + asset.rawPath + '" loading="lazy"></div>';
    }

    return '<div class="card">' +
      '<div class="card-header"><h3>' + asset.name + '</h3><span class="category">' + asset.category + '</span></div>' +
      body +
      '<div class="card-footer"><span>Raw: ' + formatSize(asset.rawSize) + ' | Clean: ' + formatSize(asset.cleanSize) + '</span><span>' + new Date(asset.modified).toLocaleString() + '</span></div>' +
      '</div>';
  }).join('');
}

loadAssets();
// Auto-refresh every 30s
setInterval(loadAssets, 30000);
</script>
</body>
</html>`;

export { galleryRouter };
