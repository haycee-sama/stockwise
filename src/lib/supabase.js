// src/lib/supabase.js
// Supabase client — safe to import in any component.
//
// Two modes:
// 1. Supabase configured (VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY both
//    present): the official `createClient` is called and the singleton is
//    returned. `isSupabaseClient` is true.
// 2. Demo mode (one or both env vars missing): the singleton is `null` and
//    `isSupabaseClient` is false. The app continues to work using mock data
//    and a clearly-labelled demo auth flow.
//
// SECURITY:
// - Only the publishable (anon) key is read from env. NEVER the service_role
//   key. The service_role key bypasses Row Level Security and must never be
//   shipped to the browser.
// - All write authorisation must be enforced by RLS policies on the database
//   side. See supabase/migrations/0002_rls_policies.sql and
//   docs/SUPABASE_SETUP.md.
//
// This file deliberately does NOT throw if Supabase is unconfigured — that
// would crash every page including the demo screens. Callers should check
// `isSupabaseClient` before using the client.

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, isSupabaseConfigured } from './env';

let supabase = null;

if (isSupabaseConfigured) {
  supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      // Persist the Supabase session in localStorage so refresh does not
      // log the user out. This is the official recommended setting for
      // a browser SPA without a backend session cookie.
      persistSession: true,
      // Auto-refresh the access token before it expires.
      autoRefreshToken: true,
      // Detect a stored session on startup (restores user on refresh).
      detectSessionInUrl: true,
    },
  });
} else {
  // Quietly log once per session so developers know they're in demo mode.
  // Not an error — running without Supabase is a supported configuration.
  if (typeof console !== 'undefined' && console.info) {
    console.info(
      '[stockwise] Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing). ' +
      'Running in demo mode with mock data. See docs/SUPABASE_SETUP.md.',
    );
  }
}

export { supabase, isSupabaseConfigured };
export default supabase;
