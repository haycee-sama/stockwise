// src/services/supabaseServices.test.js
// Smoke tests for the Supabase-backed service modules. These tests do
// NOT require a real Supabase connection — they verify that:
//   1. The service modules can be imported without errors.
//   2. Each service returns a clear "NOT_CONFIGURED" error when the
//      Supabase client is null (i.e. when env vars are not set, which
//      is the case in the test environment via .env.test.local).
//   3. The shape of the returned error matches the documented
//      contract: `{ data: null, error: { code, message } }`.
//
// Tests that require a REAL Supabase connection (e.g. actually
// creating a sale and verifying stock decremented atomically) are
// documented in docs/BACKEND_HANDOVER.md as a manual verification
// procedure. They cannot be automated without a configured test
// Supabase project + service-role key, which is out of scope for
// the local test runner.

import { describe, it, expect } from 'vitest';
import {
  inventoryService, salesService, customersService,
  businessesService, dataMode,
} from './index';

describe('service layer (demo mode, no Supabase configured)', () => {
  it('dataMode reports demo mode honestly', () => {
    expect(dataMode.isSupabase).toBe(false);
    expect(dataMode.writesPersist).toBe(false);
  });

  it('businessesService returns empty list in demo mode', async () => {
    const { data, error } = await businessesService.listMyBusinesses();
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('businessesService.createBusiness returns a DEMO_MODE error', async () => {
    const { data, error } = await businessesService.createBusiness({ name: 'Test' });
    expect(data).toBeNull();
    expect(error.code).toBe('DEMO_MODE');
  });
});

// The next describe block dynamically imports the Supabase-backed
// service modules with stubbed env vars so we can verify they return
// NOT_CONFIGURED errors when the Supabase client is null. This is
// the safe path — we never make a real network call.
describe('Supabase services return NOT_CONFIGURED when client is null', () => {
  // These tests rely on the .env.test.local overrides (empty Supabase
  // env vars) so the supabase client is null. They import the
  // Supabase-specific modules directly to verify their guard clauses.
  it('inventorySupabase.list returns NOT_CONFIGURED', async () => {
    const inv = await import('./inventorySupabase');
    const { data, error } = await inv.list({});
    expect(data).toBeNull();
    expect(error.code).toBe('NOT_CONFIGURED');
  });

  it('salesSupabase.list returns NOT_CONFIGURED', async () => {
    const sales = await import('./salesSupabase');
    const { data, error } = await sales.list({});
    expect(data).toBeNull();
    expect(error.code).toBe('NOT_CONFIGURED');
  });

  it('salesSupabase.create returns NOT_CONFIGURED', async () => {
    const sales = await import('./salesSupabase');
    const { data, error } = await sales.create({ businessId: 'fake-uuid', items: [] });
    expect(data).toBeNull();
    expect(error.code).toBe('NOT_CONFIGURED');
  });

  it('customersSupabase.list returns NOT_CONFIGURED', async () => {
    const c = await import('./customersSupabase');
    const { data, error } = await c.list({});
    expect(data).toBeNull();
    expect(error.code).toBe('NOT_CONFIGURED');
  });

  it('vendorsSupabase.list returns NOT_CONFIGURED', async () => {
    const v = await import('./vendorsSupabase');
    const { data, error } = await v.list({});
    expect(data).toBeNull();
    expect(error.code).toBe('NOT_CONFIGURED');
  });

  it('expensesSupabase.list returns NOT_CONFIGURED', async () => {
    const e = await import('./expensesSupabase');
    const { data, error } = await e.list({});
    expect(data).toBeNull();
    expect(error.code).toBe('NOT_CONFIGURED');
  });

  it('dashboardSupabase.summary returns NOT_CONFIGURED', async () => {
    const d = await import('./dashboardSupabase');
    const { data, error } = await d.summary();
    expect(data).toBeNull();
    expect(error.code).toBe('NOT_CONFIGURED');
  });

  it('inventorySupabase.adjustStock returns NOT_CONFIGURED (verifies atomic path is guarded)', async () => {
    const inv = await import('./inventorySupabase');
    const { data, error } = await inv.adjustStock('fake-uuid', 'fake-item-uuid', 5);
    expect(data).toBeNull();
    expect(error.code).toBe('NOT_CONFIGURED');
  });

  it('businessesSupabase.listMyBusinesses returns NOT_CONFIGURED', async () => {
    const b = await import('./businessesSupabase');
    const { data, error } = await b.listMyBusinesses();
    expect(data).toBeNull();
    expect(error.code).toBe('NOT_CONFIGURED');
  });
});

// Also exercise the mock services (the default in demo mode) to make
// sure they still return the documented shape.
describe('mock services (active in demo mode) return documented shape', () => {
  it('inventoryService.list returns { data, error, pagination }', async () => {
    const result = await inventoryService.list({});
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('pagination');
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.error).toBeNull();
  });

  it('salesService.create returns the created sale with a generated id', async () => {
    const result = await salesService.create({
      customerName: 'Test Customer',
      items: [{ name: 'Test', qty: 1, price: 100 }],
      total: 100,
      payment: 'Cash',
      status: 'completed',
    });
    expect(result.error).toBeNull();
    expect(result.data).toBeTruthy();
    expect(result.data.id).toMatch(/^ORD-/);
  });

  it('customersService.create + get round-trip works', async () => {
    const created = await customersService.create({
      firstName: 'Ada',
      lastName: 'Obi',
      phone: '+234 800 000 0000',
      type: 'Retailer',
      location: 'Lagos',
    });
    expect(created.error).toBeNull();
    expect(created.data.firstName).toBe('Ada');
    const fetched = await customersService.get(created.data.id);
    expect(fetched.error).toBeNull();
    expect(fetched.data.firstName).toBe('Ada');
  });
});
