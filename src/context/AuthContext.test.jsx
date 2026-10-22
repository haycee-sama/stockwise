// src/context/AuthContext.test.jsx
// Smoke tests for the AuthContext — verifies:
//   - P1-001 fix: a demo login persists across an AuthProvider remount
//     (simulates a page refresh in demo mode).
//   - The provider exposes `isDemoMode` / `isSupabaseMode` / `authMode`
//     so consumers can branch their UI.
//
// In the test environment, VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
// are not set, so the provider defaults to demo mode. This is the
// honest "demo mode without pretending it is secure production
// authentication" behaviour the user specified.

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, waitFor, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';

beforeEach(() => {
  localStorage.clear();
});

function withProvider(ui) {
  return (
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

describe('<AuthProvider />', () => {
  it('reports demo mode when Supabase is not configured', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    // Initial state is loading=true while the session is being restored.
    // (This may already be false by the time we read it because the
    // initial effect runs synchronously in the test environment — that
    // is fine, we just verify the eventual state below.)
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.authMode).toBe('demo');
    expect(result.current.isDemoMode).toBe(true);
    expect(result.current.isSupabaseMode).toBe(false);
    expect(result.current.user).toBeNull(); // no stored demo user
  });

  it('persists a demo user across AuthProvider remount (simulated refresh)', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      const r = await result.current.login('test@stockwise.io', 'password123');
      expect(r.success).toBe(true);
    });

    expect(result.current.user).not.toBeNull();
    expect(result.current.user.email).toBe('test@stockwise.io');

    // The demo user is persisted in localStorage under the dedicated
    // 'stockwise.demoUser' key. No password is stored.
    const raw = localStorage.getItem('stockwise.demoUser');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.email).toBe('test@stockwise.io');
    expect(parsed.isDemo).toBe(true);
    expect(parsed.password).toBeUndefined();
    expect(JSON.stringify(parsed).toLowerCase()).not.toContain('password');

    // Simulate a refresh: re-mount the provider. The demo user should
    // be restored on mount.
    const { result: result2 } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result2.current.isLoading).toBe(false));
    expect(result2.current.user).not.toBeNull();
    expect(result2.current.user.email).toBe('test@stockwise.io');
  });

  it('clears the demo user on signOut', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('a@b.c', 'passecret');
    });
    expect(result.current.user).not.toBeNull();
    expect(localStorage.getItem('stockwise.demoUser')).not.toBeNull();

    await act(async () => {
      await result.current.signOut();
    });
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('stockwise.demoUser')).toBeNull();
  });

  it('signUp in demo mode creates a user with the submitted firstName / lastName / businessName', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      const r = await result.current.signUp({
        firstName: 'Ada',
        lastName: 'Obi',
        businessName: 'Ada Boutique',
        email: 'ada@b.c',
        password: 'supersupersecret',
      });
      expect(r.success).toBe(true);
    });

    expect(result.current.user.firstName).toBe('Ada');
    expect(result.current.user.lastName).toBe('Obi');
    expect(result.current.user.businessName).toBe('Ada Boutique');
  });
});

describe('<ForgotPasswordPage />', () => {
  it('renders a clear "demo mode — email not actually sent" message in demo mode', async () => {
    render(withProvider(<ForgotPasswordPage />));
    // The page renders an h2 "Reset your password" + a longer <p>
    // containing "reset your password" — match the h2 specifically via role.
    expect(await screen.findByRole('heading', { name: /Reset your password/i })).toBeInTheDocument();
    expect(await screen.findByText(/Demo mode/i)).toBeInTheDocument();
  });

  it('accepts an email submission and shows the demo confirmation', async () => {
    const user = userEvent.setup();
    render(withProvider(<ForgotPasswordPage />));
    const input = await screen.findByPlaceholderText(/you@business.com/i);
    await user.type(input, 'demo@stockwise.io');
    await user.click(screen.getByRole('button', { name: /Send reset link/i }));
    expect(await screen.findByText(/Demo request received/i)).toBeInTheDocument();
  });
});
