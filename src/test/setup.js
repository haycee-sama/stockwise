// src/test/setup.js
// Vitest setup file. Imported once before every test file.
//
// Provides:
//   - @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
//   - automatic cleanup after each test (so successive renders
//     into document.body don't leak)
//   - a fake localStorage backed by an in-memory Map, so tests that
//     depend on localStorage (e.g. demo auth persistence) work in
//     jsdom which does NOT ship localStorage by default.
//   - **env stubs** so tests run in a deterministic demo mode by
//     default — independent of any .env.local the developer has
//     configured. Individual tests that want to exercise Supabase mode
//     can call `vi.stubEnv('VITE_SUPABASE_URL', '...')` + re-import the
//     relevant module. This keeps the existing demo-mode tests stable.

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Reset DOM + fake localStorage between tests.
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// Stub env vars to empty strings so the demo-mode code paths are
// deterministic. Tests that want to exercise Supabase mode should
// call `vi.stubEnv('VITE_SUPABASE_URL', '...')` + `vi.resetModules()`
// + `await import('...')` to re-import the supabase module with the
// stubbed env.
beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', '');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
  vi.stubEnv('VITE_API_BASE_URL', '');
  vi.stubEnv('VITE_ENABLE_NOTIFICATIONS', 'false');
  vi.stubEnv('VITE_ENABLE_BULK_UPLOAD', 'false');
  vi.stubEnv('VITE_ENABLE_PDF_EXPORT', 'false');
});

// jsdom does not implement matchMedia. Components that read window
// dimensions for responsive behaviour need it. Default to "no media
// matches" — safe for tests that don't assert responsive behaviour.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// IntersectionObserver — not implemented in jsdom. Components that
// lazy-render based on intersection will see a no-op observer.
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

// Silence the demo-mode console.info from src/lib/supabase.js during
// tests so the test runner output is clean. Per-test files can override
// this if they assert against console.info.
beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
