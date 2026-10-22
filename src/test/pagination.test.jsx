// src/test/pagination.test.jsx
// Regression tests for the reusable Pagination component.
//
// These tests verify the component's core behavior:
// - Hides entirely when total === 0.
// - Renders Previous / Next buttons with correct disabled states.
// - Shows the current page indicator + result count.
// - Calls onPageChange with the correct page number.
// - Calls onPageSizeChange when the page-size selector changes.
// - Resets page to 1 when the page-size selector changes (the
//   parent is responsible for this — the test verifies the
//   parent's onPageSizeChange handler is called).

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '../components/common/Pagination';

describe('Pagination component', () => {
  it('hides entirely when total === 0', () => {
    const { container } = render(
      <Pagination page={1} pageSize={25} total={0} onPageChange={() => {}} onPageSizeChange={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders Previous + Next buttons + page indicator when total > 0', () => {
    render(
      <Pagination page={1} pageSize={25} total={87} onPageChange={() => {}} onPageSizeChange={() => {}} />
    );
    expect(screen.getByText(/Page 1 of 4/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    expect(screen.getByText(/Showing/i)).toHaveTextContent('Showing 1–25 of 87');
  });

  it('disables Previous on page 1', () => {
    render(
      <Pagination page={1} pageSize={25} total={87} onPageChange={() => {}} onPageSizeChange={() => {}} />
    );
    const prevBtn = screen.getByLabelText('Previous page');
    expect(prevBtn).toBeDisabled();
  });

  it('disables Next on the last page', () => {
    render(
      <Pagination page={4} pageSize={25} total={87} onPageChange={() => {}} onPageSizeChange={() => {}} />
    );
    const nextBtn = screen.getByLabelText('Next page');
    expect(nextBtn).toBeDisabled();
  });

  it('enables both Previous + Next on a middle page', () => {
    render(
      <Pagination page={2} pageSize={25} total={87} onPageChange={() => {}} onPageSizeChange={() => {}} />
    );
    expect(screen.getByLabelText('Previous page')).not.toBeDisabled();
    expect(screen.getByLabelText('Next page')).not.toBeDisabled();
  });

  it('calls onPageChange with page+1 when Next is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination page={2} pageSize={25} total={87} onPageChange={onPageChange} onPageSizeChange={() => {}} />
    );
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange with page-1 when Previous is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination page={2} pageSize={25} total={87} onPageChange={onPageChange} onPageSizeChange={() => {}} />
    );
    fireEvent.click(screen.getByLabelText('Previous page'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('renders the page-size selector with 10/25/50/100 options', () => {
    render(
      <Pagination page={1} pageSize={25} total={87} onPageChange={() => {}} onPageSizeChange={() => {}} />
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent('10 / page');
    expect(options[1]).toHaveTextContent('25 / page');
    expect(options[2]).toHaveTextContent('50 / page');
    expect(options[3]).toHaveTextContent('100 / page');
  });

  it('calls onPageSizeChange when the page-size selector changes', () => {
    const onPageSizeChange = vi.fn();
    render(
      <Pagination page={1} pageSize={25} total={87} onPageChange={() => {}} onPageSizeChange={onPageSizeChange} />
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '50' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('shows the correct "Showing X–Y of Z" range on the last page', () => {
    render(
      <Pagination page={4} pageSize={25} total={87} onPageChange={() => {}} onPageSizeChange={() => {}} />
    );
    // Page 4 of 4 (25 per page): 76–87 of 87
    expect(screen.getByText(/Showing/i)).toHaveTextContent('Showing 76–87 of 87');
  });

  it('shows the correct range on the first page', () => {
    render(
      <Pagination page={1} pageSize={25} total={87} onPageChange={() => {}} onPageSizeChange={() => {}} />
    );
    expect(screen.getByText(/Showing/i)).toHaveTextContent('Showing 1–25 of 87');
  });

  it('handles total < pageSize (single page)', () => {
    render(
      <Pagination page={1} pageSize={25} total={5} onPageChange={() => {}} onPageSizeChange={() => {}} />
    );
    expect(screen.getByText(/Page 1 of 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Showing/i)).toHaveTextContent('Showing 1–5 of 5');
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('renders a <nav> landmark with aria-label for accessibility', () => {
    const { container } = render(
      <Pagination page={1} pageSize={25} total={87} onPageChange={() => {}} onPageSizeChange={() => {}} />
    );
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('aria-label', 'Pagination');
  });

  it('marks the current page indicator with aria-current="page"', () => {
    render(
      <Pagination page={3} pageSize={25} total={87} onPageChange={() => {}} onPageSizeChange={() => {}} />
    );
    const pageIndicator = screen.getByText(/Page 3 of 4/i);
    expect(pageIndicator).toHaveAttribute('aria-current', 'page');
  });
});
