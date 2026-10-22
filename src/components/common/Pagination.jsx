// src/components/common/Pagination.jsx
// Reusable client-side pagination control. Used on every list view
// (Sales, Customers, Inventory, Vendors, Expenses) where the
// service returns a paginated `{ data, error, pagination }` shape.
//
// Design:
// - Shows current page + total pages + total result count.
// - Previous / Next buttons with correct disabled states (Previous
//   is disabled on page 1; Next is disabled on the last page).
// - Page-size selector (10 / 25 / 50 / 100) — changing it resets
//   to page 1 to avoid out-of-range pages.
// - On empty results (total === 0), the entire control hides —
//   the parent renders its own empty state.
// - Accessible: nav landmark, aria-labels on the buttons, the
//   page-size selector has an explicit <label>, and the current
//   page is announced via aria-current='page'.
// - Responsive: collapses to a single column on small screens
//   (the page-size selector wraps below the navigation).
//
// Usage:
//   <Pagination
//     page={1}
//     pageSize={25}
//     total={87}
//     onPageChange={(p) => setPage(p)}
//     onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); }}
//   />

import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function Pagination({
  page = 1,
  pageSize = 100,
  total = 0,
  onPageChange,
  onPageSizeChange,
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isFirst = page <= 1;
  const isLast = page >= totalPages;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Hide entirely on empty results — the parent renders its own
  // empty state.
  if (total === 0) return null;

  return (
    <nav
      aria-label='Pagination'
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-gray-100 ${className}`}
    >
      <div className='flex items-center gap-3 text-xs text-gray-500'>
        <span>
          Showing <strong className='text-gray-700'>{from}</strong>–<strong className='text-gray-700'>{to}</strong> of{' '}
          <strong className='text-gray-700'>{total.toLocaleString()}</strong>
        </span>
        {onPageSizeChange && (
          <label className='flex items-center gap-1.5'>
            <span className='sr-only'>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className='text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 cursor-pointer'
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt} / page</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className='flex items-center gap-1.5'>
        <button
          type='button'
          onClick={() => !isFirst && onPageChange(page - 1)}
          disabled={isFirst}
          aria-label='Previous page'
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
            ${isFirst
              ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
        >
          <ChevronLeft size={14} aria-hidden='true' />
          <span className='hidden sm:inline'>Previous</span>
        </button>

        <span className='text-xs font-semibold text-gray-700 px-2' aria-current='page'>
          Page {page} of {totalPages}
        </span>

        <button
          type='button'
          onClick={() => !isLast && onPageChange(page + 1)}
          disabled={isLast}
          aria-label='Next page'
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
            ${isLast
              ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
        >
          <span className='hidden sm:inline'>Next</span>
          <ChevronRight size={14} aria-hidden='true' />
        </button>
      </div>
    </nav>
  );
}
