// src/utils/fetchAll.js
// Reusable paginated-fetch helper for Supabase queries.
//
// Problem: PostgREST has a default row limit (typically 1000).
// Queries without `.limit()` or `.range()` silently truncate at
// that limit, producing an incomplete dataset that looks successful.
//
// Solution: this helper fetches all pages of a query in deterministic
// ranges (page size 1000 to match PostgREST's default limit) until a
// page returns fewer rows than the page size (indicating the last
// page) or an empty page. It applies all filters/sorts/order on the
// caller's query builder, then paginates the result set.
//
// Usage:
//   const allRows = await fetchAll(
//     supabase.from('sw_sales').select('id, total, status, sale_date').eq('status', 'completed').is('deleted_at', null),
//     { pageSize: 1000 }
//   );
//   if (allRows.error) return { data: null, error: allRows.error };
//   const sales = allRows.data;
//
// Constraints:
// - The caller's query MUST include a `.order()` call (typically
//   `.order('id', { ascending: true })` or `.order('created_at')`)
//   so pagination is deterministic. Without a stable sort, rows can
//   be skipped or duplicated between pages.
// - The caller's query MUST NOT include `.limit()` or `.range()` —
//   this helper manages pagination internally.
// - The total request count is `ceil(total / pageSize)` — for very
//   large datasets this could be many requests. The helper does not
//   implement parallel fetching (to avoid race conditions where rows
//   are inserted/deleted between page fetches — see "consistency
//   limitation" below).
//
// Consistency limitation:
// - If rows are inserted or deleted between page fetches, the
//   paginated result may include duplicates (a new row pushes
//   existing rows into the next page's range) or miss rows (a
//   deleted row shifts the range). This is inherent to any
//   paginated fetch without a server-side cursor. The caller should
//   treat the result as an approximately-complete snapshot. For
//   aggregate calculations (sum, count), the error is typically
//   small and bounded by the page size.
// - For exact transactional consistency, the backend would need a
//   custom RPC that computes aggregates server-side — out of scope
//   for this frontend-only fix.

const DEFAULT_PAGE_SIZE = 1000;

export async function fetchAll(queryBuilder, { pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const allRows = [];
  let page = 1;
  let totalCount = null;

  while (true) {
    const { data, error, count } = await queryBuilder
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      return { data: null, error: { code: error.code, message: error.message }, partial: allRows };
    }

    // Track the total count from the first page (PostgREST returns
    // count only when { count: 'exact' } is set on the SELECT —
    // the caller's queryBuilder should include this if it wants
    // the count; otherwise count is null).
    if (page === 1 && count !== null) {
      totalCount = count;
    }

    const rows = data ?? [];
    allRows.push(...rows);

    // Stop when we've fetched fewer rows than the page size
    // (indicating the last page) or an empty page.
    if (rows.length < pageSize) {
      break;
    }

    page++;
  }

  return { data: allRows, error: null, total: totalCount };
}
