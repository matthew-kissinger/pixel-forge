/**
 * TIJ asset pipeline validation gallery.
 *
 * Separate from the war-assets /gallery because:
 *   - Input root is packages/server/output/tij/ (pipeline output), not war-assets/.
 *   - The TIJ gallery is manifest-driven — it reads gallery-manifest.json
 *     and lazily loads GLBs + imposter atlases by path. The existing
 *     /gallery scans a directory tree, no manifest.
 *
 * Routes:
 *   GET /gallery-tij                          — the HTML shell
 *   GET /gallery-tij/gallery-manifest.json    — manifest file
 *   GET /gallery-tij/assets/*                 — any file under output/tij/
 */

import { Hono } from 'hono';
import path from 'path';
import { existsSync, readFileSync } from 'fs';

export const galleryTijRouter = new Hono();

const SERVER_ROOT = path.resolve(import.meta.dir, '../../..');
const TIJ_OUT = path.resolve(SERVER_ROOT, 'output/tij');
const GALLERY_HTML = path.resolve(SERVER_ROOT, 'tij-gallery/index.html');

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.json': 'application/json',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
};

galleryTijRouter.get('/', (c) => {
  if (!existsSync(GALLERY_HTML)) {
    return c.text(
      `Gallery HTML not found at ${GALLERY_HTML}. Run the pipeline first: bun run tij:pipeline`,
      404,
    );
  }
  return new Response(Bun.file(GALLERY_HTML), {
    headers: { 'Content-Type': 'text/html' },
  });
});

galleryTijRouter.get('/gallery-manifest.json', (c) => {
  const p = path.join(TIJ_OUT, 'gallery-manifest.json');
  if (!existsSync(p)) {
    return c.json(
      { error: 'manifest not generated yet', hint: 'bun run tij:pipeline' },
      404,
    );
  }
  return new Response(readFileSync(p, 'utf-8'), {
    headers: { 'Content-Type': 'application/json' },
  });
});

galleryTijRouter.get('/assets/*', (c) => {
  // Strip the route prefix — on Hono, c.req.path comes in as "/gallery-tij/assets/..."
  const idx = c.req.path.indexOf('/assets/');
  const rel = idx >= 0 ? c.req.path.slice(idx + '/assets/'.length) : '';
  if (!rel || rel.includes('..')) return c.text('Forbidden', 403);

  // Assets are expressed in gallery-manifest.json as paths relative to the
  // repo root ("packages/server/output/tij/..."). Strip the prefix before
  // resolving against TIJ_OUT.
  const normalized = rel.replace(/^packages\/server\/output\/tij\//, '');
  const full = path.join(TIJ_OUT, normalized);
  if (!full.startsWith(TIJ_OUT)) return c.text('Forbidden', 403);
  if (!existsSync(full)) return c.text('Not found: ' + normalized, 404);

  const ext = path.extname(full).toLowerCase();
  return new Response(Bun.file(full), {
    headers: {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=600',
    },
  });
});
