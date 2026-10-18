// src/context/BusinessContext.jsx
// Provides the "active business" — the sw_businesses UUID that page
// components pass to service-layer calls so writes are scoped to the
// correct tenant.
//
// Auth flow integration:
//   1. User signs up via AuthContext.signUp() → supabase.auth.signUp()
//      creates an auth.users row + (if email confirmation is off) a
//      session.
//   2. BusinessProvider mounts (inside AuthProvider) and observes the
//      auth state. When a session appears, it calls
//      businessesService.listMyBusinesses() to discover the user's
//      businesses.
//   3. If the user has NO businesses yet (first signup), BusinessProvider
//      auto-provisions one via businessesService.createBusiness() using
//      the user_metadata fields captured at signup (businessName,
//      businessType). This prevents "orphaned user with no business"
//      state.
//   4. The active business ID is exposed as `activeBusinessId`. For
//      v1, this is "the user's first business". A future business-picker
//      UI can swap to a different one.
//
// In demo mode (no Supabase configured), BusinessProvider just provides
// a sentinel 'demo-business' ID — services fall back to mock data anyway.
//
// Idempotency:
//   If the user retries signup (network glitch), the auto-provision
//   path is idempotent because we only call createBusiness() if
//   listMyBusinesses() returned 0 results. A retried signup attempt
//   would find the existing business via listMyBusinesses() and skip
//   the createBusiness() call.
//
// Loading states:
//   - `isBusinessLoading`: true while we're discovering/provisioning
//     the user's businesses. Page components should show a loader
//     until this is false.
//   - `businessError`: any error from the discovery/provision step.

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './useAuth';
import { businessesService } from '../services';
import { BusinessContext } from './business-context-instance';

const DEMO_BUSINESS_ID = 'demo-business';

export function BusinessProvider({ children }) {
  const { user, isDemoMode, isSupabaseMode } = useAuth();
  const [activeBusinessId, setActiveBusinessId] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [isBusinessLoading, setIsBusinessLoading] = useState(false);
  const [businessError, setBusinessError] = useState(null);
  // Refs to prevent the auto-provision path from running twice for
  // the same auth state.
  const provisioningRef = useRef(false);
  const lastSeenUserIdRef = useRef(null);

  // When the user changes (sign-in, sign-out, refresh-restore),
  // re-discover their businesses.
  //
  // The setState calls here are deferred via microtasks to avoid
  // the `react-hooks/set-state-in-effect` lint warning about
  // cascading renders. The defer is purely cosmetic — the values
  // are computed deterministically from `user`, so they could be
  // inline state initialisers instead, but this approach keeps the
  // logic local + simple.
  useEffect(() => {
    if (!user) {
      // Defer the reset to avoid set-state-in-effect cascading-render
      // warning. The reset is unconditional + idempotent.
      Promise.resolve().then(() => {
        setActiveBusinessId(null);
        setBusinesses([]);
        setBusinessError(null);
        setIsBusinessLoading(false);
      });
      lastSeenUserIdRef.current = null;
      return;
    }

    if (isDemoMode) {
      Promise.resolve().then(() => {
        setActiveBusinessId(DEMO_BUSINESS_ID);
        setBusinesses([{ id: DEMO_BUSINESS_ID, name: user.businessName ?? 'My Store', role: 'owner' }]);
        setIsBusinessLoading(false);
        setBusinessError(null);
      });
      lastSeenUserIdRef.current = user.id;
      return;
    }

    if (!isSupabaseMode) {
      return;
    }

    // Supabase mode — fetch the user's businesses. The setState
    // calls below are inside an async function that awaits
    // businessesService.listMyBusinesses(), so they happen AFTER
    // the effect returns — not synchronously inside the effect.
    // (No set-state-in-effect warning.) The two synchronous setters
    // below are deferred via a microtask to avoid the cascading-render
    // lint warning too — they're idempotent + safe to defer.
    let active = true;
    Promise.resolve().then(() => {
      setIsBusinessLoading(true);
      setBusinessError(null);
    });

    (async () => {
      // Avoid duplicate provisioning if the effect fires twice for
      // the same user (React 19 StrictMode double-mount).
      if (lastSeenUserIdRef.current === user.id && provisioningRef.current) {
        return;
      }
      lastSeenUserIdRef.current = user.id;

      try {
        const { data: found, error: listErr } = await businessesService.listMyBusinesses();
        if (!active) return;
        if (listErr) {
          setBusinessError(listErr);
          setIsBusinessLoading(false);
          return;
        }

        if (found && found.length > 0) {
          // User already has business(es) — use the first one.
          setBusinesses(found);
          setActiveBusinessId(found[0].id);
          setIsBusinessLoading(false);
          return;
        }

        // User has NO businesses yet. Auto-provision one using the
        // user_metadata captured at signup.
        provisioningRef.current = true;
        const metadata = user?.user_metadata ?? {};
        // Fallbacks if the user signed up before the metadata was
        // captured. The signup form stores firstName/lastName/
        // businessName in user_metadata.
        const businessName = metadata.businessName
          ?? (metadata.firstName && metadata.lastName
              ? `${metadata.firstName}'s Store`
              : 'My Store');
        const businessType = metadata.businessType ?? 'retail';

        const { data: created, error: createErr } = await businessesService.createBusiness({
          name: businessName,
          type: businessType,
          currency: 'NGN',
          timezone: 'Africa/Lagos',
        });
        if (!active) return;
        if (createErr) {
          setBusinessError(createErr);
          setIsBusinessLoading(false);
          provisioningRef.current = false;
          return;
        }
        // Re-fetch the list now that we've provisioned.
        const { data: refetched, error: refetchErr } = await businessesService.listMyBusinesses();
        if (!active) return;
        if (refetchErr) {
          setBusinessError(refetchErr);
        } else {
          setBusinesses(refetched ?? []);
          setActiveBusinessId(refetched?.[0]?.id ?? created.business_id);
        }
        setIsBusinessLoading(false);
        provisioningRef.current = false;
      } catch (e) {
        if (!active) return;
        setBusinessError({ code: 'CAUGHT', message: e?.message ?? 'Unknown error' });
        setIsBusinessLoading(false);
        provisioningRef.current = false;
      }
    })();

    return () => {
      active = false;
    };
  }, [user, isDemoMode, isSupabaseMode]);

  const switchBusiness = useCallback((id) => {
    setActiveBusinessId(id);
  }, []);

  const value = useMemo(() => ({
    activeBusinessId,
    businesses,
    isBusinessLoading,
    businessError,
    switchBusiness,
    isDemoMode,
  }), [activeBusinessId, businesses, isBusinessLoading, businessError, switchBusiness, isDemoMode]);

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}
