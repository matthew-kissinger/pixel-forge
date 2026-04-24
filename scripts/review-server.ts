/**
 * Tier-2 review server. Serves the audit review.html and persists chip +
 * freetext annotations to `war-assets/_review/issues.json` as the reviewer
 * toggles them in the browser.
 *
 *   bun scripts/review-server.ts
 *
 * Endpoints:
 *   GET  /              -> enriched review.html (served from disk; run
 *                          `bun scripts/audit-review-page.ts` to refresh it).
 *   GET  /review-2d.html -> grouped 2D review page (run
 *                          `bun scripts/audit-review-2d.ts` to refresh).
 *   GET  /issues.json   -> current annotation state (for reload restore).
 *   POST /annotate      -> upsert { asset, chips, note, ts } into issues.json.
 *                          Per-asset last-write-wins semantics; empty chips
 *                          AND empty note clears the asset from the file.
 *   GET  /health        -> liveness probe ({ ok: true }).
 *
 * Design: a single tiny Bun server on 127.0.0.1:7802. Writes are atomic
 * (temp-file + rename) so a partial crash can't leave a half-written JSON
 * on disk. CORS is permissive because the page may be opened as file:// or
 * via the server itself.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const PORT = Number(process.env['REVIEW_PORT'] ?? 7802);
const HOST = '127.0.0.1';

const ROOT = resolve(process.cwd());
const REVIEW_HTML = join(ROOT, 'war-assets/validation/_grids/review.html');
const REVIEW_2D_HTML = join(ROOT, 'war-assets/_review/review-2d.html');
const ISSUES_FILE = join(ROOT, 'war-assets/_review/issues.json');

type Annotation = {
  chips: string[];
  note: string;
  ts: number;
};

type IssuesMap = Record<string, Annotation>;

function ensureDir(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

function readIssues(): IssuesMap {
  if (!existsSync(ISSUES_FILE)) return {};
  try {
    return JSON.parse(readFileSync(ISSUES_FILE, 'utf-8')) as IssuesMap;
  } catch (e) {
    console.warn('issues.json unreadable, starting empty:', (e as Error).message);
    return {};
  }
}

function writeIssues(map: IssuesMap): void {
  ensureDir(ISSUES_FILE);
  const tmp = ISSUES_FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify(map, null, 2) + '\n', 'utf-8');
  renameSync(tmp, ISSUES_FILE);
}

const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json',
      ...CORS,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (path === '/health') {
      return jsonResponse({ ok: true, port: PORT });
    }

    if (path === '/issues.json' && req.method === 'GET') {
      return jsonResponse(readIssues());
    }

    if (path === '/annotate' && req.method === 'POST') {
      let body: { asset?: string; chips?: string[]; note?: string; ts?: number };
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: 'invalid JSON body' }, { status: 400 });
      }
      const asset = body.asset;
      if (!asset || typeof asset !== 'string') {
        return jsonResponse(
          { error: 'missing `asset` string in body' },
          { status: 400 },
        );
      }
      const chips = Array.isArray(body.chips) ? body.chips.filter((c) => typeof c === 'string') : [];
      const note = typeof body.note === 'string' ? body.note : '';
      const ts = typeof body.ts === 'number' ? body.ts : Date.now();

      const current = readIssues();
      if (chips.length === 0 && note.length === 0) {
        if (asset in current) {
          delete current[asset];
          writeIssues(current);
          console.log(`[${new Date().toISOString()}] clear ${asset}`);
        }
        return jsonResponse({ ok: true, cleared: true });
      }

      current[asset] = { chips, note, ts };
      writeIssues(current);
      console.log(
        `[${new Date().toISOString()}] ${asset}: [${chips.join(', ') || '-'}]${
          note ? ' note=' + JSON.stringify(note.slice(0, 80)) : ''
        }`,
      );
      return jsonResponse({ ok: true });
    }

    if ((path === '/' || path === '/review.html') && req.method === 'GET') {
      if (!existsSync(REVIEW_HTML)) {
        return new Response(
          '<!DOCTYPE html><title>no review.html</title><body>' +
            `<p>review.html not found at <code>${REVIEW_HTML}</code>.` +
            ' Run <code>bun scripts/audit-review-page.ts</code> first.</p></body>',
          { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } },
        );
      }
      return new Response(readFileSync(REVIEW_HTML), {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          ...CORS,
        },
      });
    }

    if (path === '/review-2d.html' && req.method === 'GET') {
      if (!existsSync(REVIEW_2D_HTML)) {
        return new Response(
          '<!DOCTYPE html><title>no review-2d.html</title><body>' +
            `<p>review-2d.html not found at <code>${REVIEW_2D_HTML}</code>.` +
            ' Run <code>bun scripts/audit-review-2d.ts</code> first.</p></body>',
          { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } },
        );
      }
      return new Response(readFileSync(REVIEW_2D_HTML), {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          ...CORS,
        },
      });
    }

    return jsonResponse({ error: 'not found', path }, { status: 404 });
  },
});

console.log(`review-server listening on http://${HOST}:${PORT}`);
console.log(`  GET  /              -> ${REVIEW_HTML}`);
console.log(`  GET  /review-2d.html -> ${REVIEW_2D_HTML}`);
console.log(`  GET  /issues.json`);
console.log(`  POST /annotate`);
console.log(`  persists to ${ISSUES_FILE}`);

process.on('SIGINT', () => {
  console.log('\nstopping review-server');
  server.stop();
  process.exit(0);
});
