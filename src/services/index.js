// src/services/index.js
// Data-access layer entry point. Single switch-point between demo
// mode (mock) and Supabase mode (real queries against the configured
// Supabase project).
//
// Switch logic:
// - If `isSupabaseConfigured` is true (both VITE_SUPABASE_URL and
//   VITE_SUPABASE_PUBLISHABLE_KEY are set), the Supabase-backed
//   services are used.
// - Otherwise, the mock services are used and a clearly-labelled
//   demo-mode banner is shown via DemoModeBanner.
//
// Note: switching is per-module at import time. The current selected
// mode is exposed as `dataMode.isSupabase` and `dataMode.writesPersist`
// so callers can branch their UI without re-checking env.

import { isSupabaseConfigured } from '../lib/env';

import * as inventoryMock from './inventoryMock';
import * as salesMock     from './salesMock';
import * as customersMock from './customersMock';
import * as vendorsMock   from './vendorsMock';
import * as expensesMock  from './expensesMock';
import * as dashboardMock from './dashboardMock';
import * as reportsMock   from './reportsMock';

import * as inventorySupabase from './inventorySupabase';
import * as salesSupabase     from './salesSupabase';
import * as customersSupabase from './customersSupabase';
import * as vendorsSupabase   from './vendorsSupabase';
import * as expensesSupabase  from './expensesSupabase';
import * as dashboardSupabase from './dashboardSupabase';
import * as reportsSupabase   from './reportsSupabase';

import * as businessesSupabase from './businessesSupabase';

// Businesses service — Supabase-only (no mock equivalent because it
// only makes sense when the auth user is a real Supabase user with
// real business memberships). In demo mode, return null/empty.
export const businessesService = isSupabaseConfigured
  ? businessesSupabase
  : {
      listMyBusinesses: async () => ({ data: [], error: null }),
      createBusiness:   async () => ({ data: null, error: { code: 'DEMO_MODE', message: 'Demo mode — Supabase not configured' } }),
      getMyFirstBusinessId: async () => null,
    };

export const dataMode = Object.freeze({
  isSupabase: isSupabaseConfigured,
  writesPersist: isSupabaseConfigured,
});

export const inventoryService = isSupabaseConfigured ? inventorySupabase : inventoryMock;
export const salesService     = isSupabaseConfigured ? salesSupabase     : salesMock;
export const customersService = isSupabaseConfigured ? customersSupabase : customersMock;
export const vendorsService   = isSupabaseConfigured ? vendorsSupabase   : vendorsMock;
export const expensesService  = isSupabaseConfigured ? expensesSupabase  : expensesMock;
export const dashboardService = isSupabaseConfigured ? dashboardSupabase : dashboardMock;
export const reportsService   = isSupabaseConfigured ? reportsSupabase   : reportsMock;
