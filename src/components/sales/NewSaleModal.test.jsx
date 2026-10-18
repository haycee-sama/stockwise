// src/components/sales/NewSaleModal.test.jsx
// Smoke tests for the New Sale modal — verifies the P1-002 fix
// (Rules of Hooks violation) is gone and the modal renders + closes
// reliably. These tests do NOT verify business logic like cart math
// (those belong in a deeper test pass).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewSaleModal from './NewSaleModal';

function renderModal(props = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <NewSaleModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      {...props}
    />,
  );
  return { onSave, onClose };
}

describe('<NewSaleModal />', () => {
  it('renders the modal when isOpen=true (P1-002 regression test)', () => {
    // Before the fix, opening the modal threw a Rules-of-Hooks error
    // and the modal never appeared in the DOM.
    renderModal();
    expect(screen.getByText(/New Sale/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument();
  });

  it('returns null when isOpen=false (does not render the modal shell)', () => {
    render(<NewSaleModal isOpen={false} onClose={() => {}} onSave={() => {}} />);
    expect(screen.queryByText(/New Sale/i)).not.toBeInTheDocument();
  });

  it('shows a cart-empty prompt before any items are added', () => {
    renderModal();
    expect(screen.getByText(/Tap items on the left to add them/i)).toBeInTheDocument();
  });

  it('shows a validation error when the user tries to continue without items', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /Continue to Payment/i }));
    expect(await screen.findByText(/Add at least one item/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer name is required/i)).toBeInTheDocument();
  });

  it('adds an item to the cart when the inventory picker is clicked', async () => {
    const user = userEvent.setup();
    renderModal();
    // The first inventory item from mockData is "Ankara Gown (M)".
    // The inventory picker shows it as a button; click the first match.
    const inventoryButtons = await screen.findAllByRole('button', { name: /Ankara Gown/i });
    await user.click(inventoryButtons[0]);

    // The cart appears on the right. The item name should now appear
    // at least twice (once in the inventory list, once in the cart row).
    // Assert via "added" indicator that only shows when item is in cart.
    expect(await screen.findByText(/\+1 added/i)).toBeInTheDocument();
    expect(screen.getByText(/Subtotal/i)).toBeInTheDocument();
  });

  it('closes when the X button is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    // The X button has no aria-label; find it by its SVG content.
    const xButtons = screen.getAllByRole('button');
    const xButton = xButtons.find(b => b.querySelector('svg.lucide-x'));
    expect(xButton).toBeTruthy();
    await user.click(xButton);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
