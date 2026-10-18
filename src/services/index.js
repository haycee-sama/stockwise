// src/services/index.js
// Data-access layer entry point.
//
// This module is the **single switch-point** between demo mode (mock data
// from `src/data/mockData.js`) and Supabase mode (real queries against
// the configured Supabase project).
//
// Page components should NEVER import from `src/data/mockData.js` directly
// once this layer is wired up — they should import from `src/services/*`
// instead. That way, swapping demo → Supabase is a one-line change in
// `src/services/index.js`, not a 30-file refactor.
//
// Current status:
// - All services return mock data via the `*Mock` imports below.
// - Each service exposes the same async shape it will have under Supabase
//   (Promise<{ data, error }>) so callers can be written today and the
//   implementation can be swapped later without touching call sites.
// - No Supabase queries are actually executed yet — `supabase` is only
//   imported for the auth flow (see `src/context/AuthContext.jsx`).
//
// See docs/BACKEND_HANDOVER.md for the full API contract list and
// docs/SUPABASE_SETUP.md for the schema and RLS plan.

import * as inventoryMock from './inventoryMock';
import * as salesMock     from './salesMock';
import * as customersMock from './customersMock';
import * as vendorsMock   from './vendorsMock';
import * as expensesMock  from './expensesMock';
import * as dashboardMock from './dashboardMock';
import * as reportsMock   from './reportsMock';

import { isSupabaseConfigured } from '../lib/env';

export const dataMode = Object.freeze({
  isSupabase: isSupabaseConfigured, // false in demo mode
  // True when data writes are actually persisted to a backend.
  // In demo mode, mutations are in-memory only and lost on refresh.
  writesPersist: false,
});

// Each of these delegates to the mock implementation today. When Supabase
// is wired (after schema + RLS are approved), the imports above will be
// replaced with `supabase*` equivalents without changing call sites.
export const inventoryService = inventoryMock;
export const salesService     = salesMock;
export const customersService = customersMock;
export const vendorsService   = vendorsMock;
export const expensesService  = expensesMock;
export const dashboardService = dashboardMock;
export const reportsService   = reportsMock;
