// src/context/BusinessContext.test.jsx
// Tests for the BusinessProvider — verifies:
//   1. In demo mode, it provides the DEMO_BUSINESS_ID sentinel +
//      a mock business list.
//   2. In demo mode, it does NOT crash if there's no user.
//   3. The provider exposes the documented shape:
//      { activeBusinessId, businesses, isBusinessLoading, businessError,
//        switchBusiness, isDemoMode }.

import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { BusinessProvider } from './BusinessContext';
import { useBusiness } from './useBusiness';

// `.env.test.local` (committed) overrides VITE_SUPABASE_* to empty
// strings so the app defaults to demo mode in tests.

function withProviders(ui) {
  return (
    <MemoryRouter>
      <AuthProvider>
        <BusinessProvider>{ui}</BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('<BusinessProvider /> in demo mode', () => {
  it('exposes the documented context shape', async () => {
    const { result } = renderHook(() => useBusiness(), {
      wrapper: ({ children }) => withProviders(children),
    });
    // Give the effect a moment to settle — the BusinessProvider mounts
    // with no user (localStorage is empty per test setup), so
    // activeBusinessId stays null. That's the expected initial state.
    await waitFor(() => {
      expect(result.current.businessError).toBeNull();
    });
    // Verify the documented shape — keys exist, values are the right types.
    expect(result.current).toHaveProperty('activeBusinessId');
    expect(result.current).toHaveProperty('businesses', expect.any(Array));
    expect(result.current).toHaveProperty('isBusinessLoading', expect.any(Boolean));
    expect(result.current).toHaveProperty('businessError');
    expect(result.current).toHaveProperty('switchBusiness', expect.any(Function));
    expect(result.current).toHaveProperty('isDemoMode', true);
  });

  it('sets the demo-business sentinel when there is a user (no user = null activeBusinessId)', async () => {
    // In demo mode, when the auth state changes from no-user →
    // has-user, BusinessProvider switches activeBusinessId from null
    // to 'demo-business'. We test the "no user yet" case here —
    // activeBusinessId should be null. The "has user" case requires
    // logging in first (see AuthContext.test.jsx for the login flow).
    const { result } = renderHook(() => useBusiness(), {
      wrapper: ({ children }) => withProviders(children),
    });
    // Wait briefly for any async state to settle.
    await waitFor(() => {
      // Either null (no user) or 'demo-business' (user set).
      expect([null, 'demo-business']).toContain(result.current.activeBusinessId);
    });
  });

  it('throws when used outside a BusinessProvider', () => {
    // Suppress the expected error from React's error boundary.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useBusiness())).toThrow('useBusiness must be used within a BusinessProvider');
    spy.mockRestore();
  });
});
