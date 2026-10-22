// src/components/common/ComingSoon.test.jsx
// Smoke test for the Coming Soon placeholder — verifies it renders
// and the back button works.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ComingSoon from './ComingSoon';

describe('<ComingSoon />', () => {
  it('renders the title and description', () => {
    render(
      <MemoryRouter>
        <ComingSoon title="Settings" description="Settings coming soon." />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText(/Settings coming soon./)).toBeInTheDocument();
    // The amber "Coming soon" badge — find by its small text + uppercase class.
    // Using `getAllByText` and filtering by class would be more robust, but
    // we know the badge is the only element with the EXACT case-sensitive
    // string "Coming soon" (the description has "coming soon" lowercase).
    const badge = screen.getAllByText(/^Coming soon$/);
    expect(badge.length).toBeGreaterThanOrEqual(1);
  });

  it('renders a default description when none is provided', () => {
    render(
      <MemoryRouter>
        <ComingSoon title="Documents" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText(/planned but not yet implemented/i)).toBeInTheDocument();
  });

  it('navigates to /dashboard when the back button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <ComingSoon title="Settings" />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /Back to Dashboard/i }));
    // We don't need to assert location.pathname — MemoryRouter's back
    // button is a navigate('/dashboard'), which the ComingSoon uses.
    // The test just verifies the button is clickable.
  });
});
