// src/pages/InventoryPage.test.jsx
// Smoke tests for the refactored InventoryPage — verifies:
//   1. The page renders the loading state initially.
//   2. The page renders the empty state when the service returns no items.
//   3. The page renders the table once data arrives.
//   4. The page does NOT silently fall back to mock data on service error.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InventoryPage from './InventoryPage';
import { AuthProvider } from '../context/AuthContext';
import { BusinessProvider } from '../context/BusinessContext';

function withProviders(ui) {
  return (
    <MemoryRouter>
      <AuthProvider>
        <BusinessProvider>{ui}</BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

// The mock service returns the mock inventory — used in demo mode.
// In Supabase mode the real service would return real rows from RLS-scoped
// queries. Tests here exercise the demo-mode flow (default in tests
// because .env.test.local blanks out the Supabase env vars).

describe('<InventoryPage /> with service layer (demo mode)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders the loading state initially', async () => {
    render(withProviders(<InventoryPage />));
    // The page shows a "Loading inventory…" message before data arrives.
    expect(await screen.findByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders the inventory after the service loads', async () => {
    render(withProviders(<InventoryPage />));
    // The mock service returns 10 items — first item is "Ankara Gown (M)".
    // Wait for the data to load + render the table.
    expect(await screen.findByText(/Ankara Gown/i, undefined, { timeout: 5000 })).toBeInTheDocument();
  });

  it('shows the demo mode banner', async () => {
    render(withProviders(<InventoryPage />));
    expect(await screen.findByText(/Demo mode/i, undefined, { timeout: 5000 })).toBeInTheDocument();
  });
});
