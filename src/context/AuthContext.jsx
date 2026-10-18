// src/context/AuthContext.jsx
//
// Auth context with two clearly-labelled modes:
//
// 1. Supabase mode (active when VITE_SUPABASE_URL and
//    VITE_SUPABASE_PUBLISHABLE_KEY are both configured):
//    - Uses Supabase Auth (email + password today; phone/OTP / OAuth
//      are out of scope for this phase — see docs/SUPABASE_SETUP.md).
//    - Restores the session on refresh via Supabase's auto-persisted
//      localStorage token (P1-001 fix).
//    - Subscribes to `onAuthStateChange` for token refresh / sign-out /
//      sign-in events from other tabs.
//    - `signOut` calls `supabase.auth.signOut()` to invalidate the
//      session server-side.
//
// 2. Demo mode (default when Supabase env vars are missing):
//    - Persists a CLEARLY-LABELLED demo user in localStorage under
//      `stockwise.demoUser`. This is NOT real authentication — anyone
//      with access to the browser can write to localStorage. It exists
//      only to make refresh-during-development bearable.
//    - `login` accepts any email + any password (mock).
//    - `signUp` accepts any form data (mock).
//    - `signOut` clears the demo user from localStorage.
//
// IMPORTANT — security boundaries:
// - The demo user is stored under a separate `stockwise.demoUser`
//   localStorage key. It is NEVER a substitute for real auth.
// - No password is ever stored — only the email + a "demo" marker.
// - `ProtectedRoute` still checks for the user object; in demo mode
//   it gates access on the localStorage flag, which is honest about
//   being a demo. In Supabase mode it gates on a verified Supabase
//   session.
// - The `password` argument is sent to Supabase but NEVER stored
//   anywhere on the client.
//
// This file deliberately does NOT introduce a second competing auth
// system. Demo mode is a development convenience, not a parallel
// authentication pathway.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AuthContext } from './auth-context-instance';
import { supabase, isSupabaseConfigured } from '../lib/supabase';


const DEMO_USER_KEY = 'stockwise.demoUser';

function readDemoUser() {
  try {
    const raw = localStorage.getItem(DEMO_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Defensive: validate the shape so a corrupt / hand-edited value
    // cannot break the app.
    if (parsed && typeof parsed === 'object' && parsed.email) {
      return { ...parsed, isDemo: true };
    }
    return null;
  } catch {
    return null;
  }
}

function writeDemoUser(user) {
  try {
    if (user) {
      // Store only the minimal, non-sensitive fields. NEVER store a
      // password. The `isDemo: true` flag is persisted so other tabs
      // and refreshes know they are in demo mode.
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify({ ...user, isDemo: true }));
    } else {
      localStorage.removeItem(DEMO_USER_KEY);
    }
  } catch {
    // localStorage can be unavailable (private browsing on some
    // browsers, SSR). Fall through silently — demo mode just won't
    // persist, which is the existing behaviour and not worse.
  }
}

function shapeSupabaseUser(supabaseUser) {
  // Map Supabase's user object to the shape the rest of the app expects.
  // The `user_metadata` is set during signup via the `data` option to
  // `supabase.auth.signUp`.
  const meta = supabaseUser?.user_metadata ?? {};
  return {
    id: supabaseUser?.id,
    email: supabaseUser?.email,
    firstName: meta.firstName ?? '',
    lastName:  meta.lastName ?? '',
    businessName: meta.businessName ?? '',
    isDemo: false,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `isLoading` is true while we are checking for an existing session
  // on mount. It MUST be true initially — otherwise `ProtectedRoute`
  // will redirect to /login on first paint even when there IS a stored
  // session (P1-001 root cause).
  const [isLoading, setIsLoading] = useState(true);
  const [authMode] = useState(isSupabaseConfigured ? 'supabase' : 'demo');
  // `mountedRef` guards against setState-after-unmount when the
  // onAuthStateChange subscription fires after the provider has been
  // torn down.
  const mountedRef = useRef(true);

  // ── Initial session restore ─────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    if (authMode === 'supabase' && supabase) {
      // Supabase mode: ask Supabase for any stored session.
      // `getSession()` reads from localStorage (or wherever the client
      // is configured to persist) and refreshes the access token if
      // needed. Returns `{ data: { session }, error }`.
      supabase.auth.getSession()
        .then(({ data, error }) => {
          if (!mountedRef.current) return;
          if (error) {
            console.warn('[AuthContext] getSession error:', error.message);
            setUser(null);
          } else {
            setUser(data.session?.user ? shapeSupabaseUser(data.session.user) : null);
          }
        })
        .catch((e) => {
          if (!mountedRef.current) return;
          console.warn('[AuthContext] getSession threw:', e?.message ?? e);
          setUser(null);
        })
        .finally(() => {
          if (mountedRef.current) setIsLoading(false);
        });
    } else {
      // Demo mode: restore from localStorage if present.
      setUser(readDemoUser());
      setIsLoading(false);
    }

    return () => { mountedRef.current = false; };
  }, [authMode]);

  // ── Subscribe to auth state changes (Supabase mode only) ─────
  useEffect(() => {
    if (authMode !== 'supabase' || !supabase) return;
    // `onAuthStateChange` returns `{ data: { subscription }, error }`.
    // The subscription MUST be unsubscribed on cleanup to avoid
    // leaks and double-fires in React 19 StrictMode.
    const { data: subData } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;
      setUser(session?.user ? shapeSupabaseUser(session.user) : null);
    });
    return () => {
      subData?.subscription?.unsubscribe?.();
    };
  }, [authMode]);

  // ── login ──────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    if (authMode === 'supabase' && supabase) {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          return { success: false, message: error.message ?? 'Invalid email or password.' };
        }
        // The onAuthStateChange subscription will call setUser for us,
        // but we also do it here so the UI updates immediately on the
        // post-submit tick.
        setUser(data.session?.user ? shapeSupabaseUser(data.session.user) : null);
        return { success: true };
      } catch (err) {
        return { success: false, message: err?.message ?? 'Network error during sign-in.' };
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    }

    // Demo mode — accept any credentials. This is a development
    // convenience and is NOT secure. The banner shown by
    // `DemoModeBanner` makes this clear to the user.
    setIsLoading(true);
    try {
      await new Promise(r => setTimeout(r, 600)); // shorter than before; less fake
      const demoUser = {
        id: 'demo-user',
        email,
        firstName: 'Business',
        lastName: 'Owner',
        businessName: 'My Store',
        isDemo: true,
      };
      writeDemoUser(demoUser);
      setUser(demoUser);
      return { success: true };
    } catch (err) {
      return { success: false, message: err?.message ?? 'Login failed' };
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [authMode]);

  // ── signUp ─────────────────────────────────────────────
  const signUp = useCallback(async (formData) => {
    if (authMode === 'supabase' && supabase) {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              businessName: formData.businessName,
            },
          },
        });
        if (error) {
          return { success: false, message: error.message ?? 'Sign-up failed.' };
        }
        // Some Supabase projects require email confirmation before
        // a session is returned. Handle both cases:
        if (data.session?.user) {
          setUser(shapeSupabaseUser(data.session.user));
          return { success: true };
        }
        // No session yet → email confirmation required. Tell the
        // user (returning `success: true` so the form does not show
        // an error; the caller can read `message` to display a
        // confirmation banner).
        return {
          success: true,
          message: 'Check your email for a confirmation link to complete sign-up.',
        };
      } catch (err) {
        return { success: false, message: err?.message ?? 'Network error during sign-up.' };
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    }

    // Demo mode sign-up.
    setIsLoading(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      const demoUser = {
        id: 'demo-user',
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        businessName: formData.businessName,
        isDemo: true,
      };
      writeDemoUser(demoUser);
      setUser(demoUser);
      return { success: true };
    } catch (err) {
      return { success: false, message: err?.message ?? 'Sign-up failed' };
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [authMode]);

  // ── signOut ────────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (authMode === 'supabase' && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[AuthContext] signOut error:', err?.message ?? err);
      }
    } else {
      writeDemoUser(null);
    }
    setUser(null);
  }, [authMode]);

  // ── Context value (memoised) ─────────────────────────
  const value = useMemo(() => ({
    user,
    isLoading,
    authMode, // 'supabase' | 'demo'
    isDemoMode: authMode === 'demo',
    isSupabaseMode: authMode === 'supabase',
    login,
    signUp,
    signOut,
    // Keep the legacy `logout` / `signup` names as aliases so existing
    // callers (Sidebar, LoginForm, SignupForm) keep working unchanged.
    logout: signOut,
    signup: signUp,
  }), [user, isLoading, authMode, login, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

