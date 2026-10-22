// src/lib/supabase.test.js
// Smoke test for the Supabase client module — verifies the safe-missing-config
// behaviour. The client must NOT throw when env vars are missing; it
// should return null and `isSupabaseConfigured` should be false.

import { describe, it, expect } from 'vitest';
import { supabase, isSupabaseConfigured } from './supabase';
import { envSummary } from './env';

describe('src/lib/supabase.js (no env configured)', () => {
  it('exposes isSupabaseConfigured=false when env vars are missing', () => {
    expect(isSupabaseConfigured).toBe(false);
  });

  it('exports a null supabase client (does not throw on import)', () => {
    expect(supabase).toBeNull();
  });

  it('envSummary reports demo mode honestly', () => {
    expect(envSummary.isSupabaseConfigured).toBe(false);
    expect(envSummary.enableNotifications).toBe(false);
    expect(envSummary.enableBulkUpload).toBe(false);
    expect(envSummary.enablePdfExport).toBe(false);
  });
});
