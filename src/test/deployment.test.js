// src/test/deployment.test.js
// Regression tests for the Vercel SPA routing configuration.
//
// Background: this app uses BrowserRouter (URLs like /inventory, /sales,
// /reports). Without a Vercel rewrite rule, refreshing any non-root
// route returns the Vercel platform-level 404 ("This page doesn't
// exist" / "404 NOT_FOUND") because Vercel looks for a static file
// at that path, doesn't find one, and returns its own 404 page.
//
// The fix is a vercel.json `rewrites` entry that sends non-asset
// paths to /index.html so React Router can handle them. These tests
// verify the config file exists and has the correct shape so a
// future refactor or accidental deletion doesn't silently regress
// the fix.
//
// What these tests do NOT verify:
// - That the Vite build produces a working dist/index.html (run
//   `npm run build` and inspect dist/ manually).
// - That Vercel actually applies the rewrite in production (the
//   only way to verify that is to deploy and curl the URLs).
// - That static assets are served with the correct MIME types
//   (Vercel handles MIME types via the file extension; we just
//   ensure the rewrite doesn't accidentally serve HTML for asset
//   requests).
//
// What these tests DO verify:
// - vercel.json exists at the repo root.
// - The rewrites array contains an entry whose destination is
//   /index.html (the SPA entry point).
// - The source pattern excludes common static-asset extensions
//   so they don't get rewritten to HTML.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ESM-safe path resolution. The test file's own URL is the starting
// point — go up 2 levels (src/test/ -> repo root).
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const VERCEL_JSON_PATH = resolve(REPO_ROOT, 'vercel.json');
const INDEX_HTML_PATH = resolve(REPO_ROOT, 'index.html');

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf-8'));
}

describe('Vercel SPA routing configuration', () => {
  it('vercel.json exists at the repo root', () => {
    expect(() => readJson(VERCEL_JSON_PATH)).not.toThrow();
  });

  it('rewrites array routes non-asset paths to /index.html', () => {
    const cfg = readJson(VERCEL_JSON_PATH);
    expect(Array.isArray(cfg.rewrites)).toBe(true);
    expect(cfg.rewrites.length).toBeGreaterThan(0);

    const spaRewrite = cfg.rewrites.find(r => r.destination === '/index.html');
    expect(spaRewrite).toBeDefined();
    expect(typeof spaRewrite.source).toBe('string');
    expect(spaRewrite.source.length).toBeGreaterThan(0);
  });

  it('the rewrite source excludes common static-asset extensions', () => {
    // The regex must NOT rewrite asset requests to /index.html.
    // Otherwise a missing asset would silently return HTML, breaking
    // the browser's content-type expectations.
    const cfg = readJson(VERCEL_JSON_PATH);
    const spaRewrite = cfg.rewrites.find(r => r.destination === '/index.html');
    const src = spaRewrite.source;

    // Required extensions — if any of these is missing, an asset
    // request for that extension could be silently rewritten.
    // The vercel.json source uses `jpe?g` (regex shorthand that
    // matches both `jpg` and `jpeg`) and `woff2?` (matches `woff`
    // and `woff2`), so we check for the shorter forms here.
    const required = [
      'js', 'css', 'png', 'jpe?g', 'gif', 'svg', 'ico',
      'webmanifest', 'xml', 'txt', 'woff2?', 'ttf', 'otf',
      'map',
    ];
    for (const ext of required) {
      expect(src).toContain(ext);
    }
  });

  it('index.html has the SPA root div + module script entry', () => {
    // Sanity: the file Vercel rewrites TO must actually be the SPA
    // entry point (not a placeholder).
    const html = readFileSync(INDEX_HTML_PATH, 'utf-8');
    expect(html).toContain('<div id="root"></div>');
    expect(html).toMatch(/<script[^>]+type="module"[^>]+src="\/src\/main\.jsx"/);
  });
});
