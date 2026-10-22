// src/services/businessesSupabase.js
// Service for the sw_businesses + sw_business_memberships tables.
// Used by the auth flow + by other services to determine the user's
// active business (where to scope writes).

import { supabase } from '../lib/supabase';

/**
 * Returns the list of businesses the current auth user is a member of,
 * including their role in each.
 *
 * @returns Promise<{ data: Array<{ id, name, type, currency, timezone, role }>, error }>
 */
export async function listMyBusinesses() {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { data, error } = await supabase
    .from('sw_business_memberships')
    .select('role, business:sw_businesses!inner(id, name, type, currency, timezone, created_at, deleted_at)')
    .is('business.deleted_at', null);
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  const shaped = (data ?? []).map(m => ({
    id: m.business?.id,
    name: m.business?.name,
    type: m.business?.type,
    currency: m.business?.currency,
    timezone: m.business?.timezone,
    role: m.role,
    createdAt: m.business?.created_at,
  })).filter(b => b.id);
  return { data: shaped, error: null };
}

/**
 * Creates a new business + adds the caller as its owner.
 * Uses the SECURITY DEFINER RPC function sw_create_business().
 *
 * @param {Object} payload { name, type, currency, timezone }
 * @returns Promise<{ data: { business_id, name, type, currency, timezone, role }, error }>
 */
export async function createBusiness(payload) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { data, error } = await supabase.rpc('sw_create_business', {
    p_name: payload.name,
    p_type: payload.type ?? 'retail',
    p_currency: payload.currency ?? 'NGN',
    p_timezone: payload.timezone ?? 'Africa/Lagos',
  });
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data, error: null };
}

/**
 * Returns the user's first business ID (or null). Convenience wrapper
 * around listMyBusinesses() for callers that just need one ID.
 */
export async function getMyFirstBusinessId() {
  const { data, error } = await listMyBusinesses();
  if (error || !data || data.length === 0) return null;
  return data[0].id;
}
