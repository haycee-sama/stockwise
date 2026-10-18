// src/lib/env.js
// Centralised, typed access to Vite env vars.
// All VITE_* env vars are PUBLIC — they are shipped to the browser bundle.
// NEVER put secrets (DB passwords, service-role keys, OAuth secrets) in a VITE_ var.
// See docs/ENVIRONMENT_SETUP.md §6 for safe-development practices.

function getEnv(name, fallback = '') {
  // import.meta.env is replaced at build time by Vite.
  // Fallback covers dev environments without a .env file (e.g. fresh clones).
  const value = import.meta.env?.[name];
  return value === undefined || value === '' ? fallback : value;
}

function getBoolEnv(name, fallback = false) {
  const value = import.meta.env?.[name];
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1' || value === 'yes';
}

// Supabase public configuration. The publishable key (anon key) is
// DESIGNED to be public — it is safe to expose in the browser bundle,
// as long as Row Level Security is enabled on every table. NEVER put
// the service_role key here. See docs/SUPABASE_SETUP.md.
export const SUPABASE_URL = getEnv('VITE_SUPABASE_URL', '');
export const SUPABASE_PUBLISHABLE_KEY = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');

// True only when BOTH required Supabase values are present.
export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_PUBLISHABLE_KEY.length > 0;

// Optional feature flags (all default false / off in demo mode).
export const ENABLE_NOTIFICATIONS = getBoolEnv('VITE_ENABLE_NOTIFICATIONS', false);
export const ENABLE_BULK_UPLOAD   = getBoolEnv('VITE_ENABLE_BULK_UPLOAD',   false);
export const ENABLE_PDF_EXPORT    = getBoolEnv('VITE_ENABLE_PDF_EXPORT',    false);

// API base URL for a future REST backend (separate from Supabase).
// Empty string means "no REST backend configured; use Supabase or demo mode".
export const API_BASE_URL = getEnv('VITE_API_BASE_URL', '');
export const API_TIMEOUT_MS = Number(getEnv('VITE_API_TIMEOUT_MS', '15000'));

// Expose a small read-only snapshot for debugging (no secrets included).
export const envSummary = Object.freeze({
  isSupabaseConfigured,
  hasApiBaseUrl: API_BASE_URL.length > 0,
  enableNotifications: ENABLE_NOTIFICATIONS,
  enableBulkUpload: ENABLE_BULK_UPLOAD,
  enablePdfExport: ENABLE_PDF_EXPORT,
});
