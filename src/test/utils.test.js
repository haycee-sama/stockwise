// src/test/utils.test.js
// Tests for the chunk() and fetchAll() utility functions.

import { describe, it, expect } from 'vitest';
import { chunk } from '../utils/chunk';
import { fetchAll } from '../utils/fetchAll';

describe('chunk()', () => {
  it('splits an array into chunks of the given size', () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it('returns a single chunk when the array is smaller than the size', () => {
    expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });

  it('returns [] for an empty array', () => {
    expect(chunk([], 500)).toEqual([]);
  });

  it('returns [] for non-array input', () => {
    expect(chunk(null, 500)).toEqual([]);
    expect(chunk(undefined, 500)).toEqual([]);
  });

  it('uses default chunk size of 500', () => {
    const ids = Array.from({ length: 1001 }, (_, i) => i);
    const chunks = chunk(ids); // default 500
    expect(chunks).toHaveLength(3); // 500 + 500 + 1
    expect(chunks[0]).toHaveLength(500);
    expect(chunks[1]).toHaveLength(500);
    expect(chunks[2]).toHaveLength(1);
  });

  it('does not duplicate or skip elements', () => {
    const ids = Array.from({ length: 1200 }, (_, i) => `id-${i}`);
    const chunks = chunk(ids, 500);
    const allFlattened = chunks.flat();
    expect(allFlattened).toEqual(ids);
    expect(allFlattened).toHaveLength(1200);
  });
});

describe('fetchAll()', () => {
  // Helper: create a mock query builder that simulates PostgREST
  // pagination. Returns `pageSize` rows per page until the data is
  // exhausted.
  function mockQueryBuilder(allRows, _pageSize) {
    const chain = {
      select() { return chain; },
      eq() { return chain; },
      is() { return chain; },
      order() { return chain; },
      range(_start, _end) {
        const slice = allRows.slice(_start, _end + 1);
        return Promise.resolve({
          data: slice,
          error: null,
          count: allRows.length,
        });
      },
    };
    return chain;
  }

  it('fetches all rows across multiple pages', async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => ({ id: i, total: 100 }));
    const qb = mockQueryBuilder(rows, 1000);
    const result = await fetchAll(qb, { pageSize: 1000 });
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2500);
    expect(result.data[0].id).toBe(0);
    expect(result.data[2499].id).toBe(2499);
  });

  it('fetches a single page when rows < pageSize', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const qb = mockQueryBuilder(rows, 1000);
    const result = await fetchAll(qb, { pageSize: 1000 });
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
  });

  it('handles empty dataset (0 rows)', async () => {
    const qb = mockQueryBuilder([], 1000);
    const result = await fetchAll(qb, { pageSize: 1000 });
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(0);
  });

  it('propagates errors from the first page', async () => {
    const chain = {
      select() { return chain; },
      eq() { return chain; },
      is() { return chain; },
      order() { return chain; },
      range() {
        return Promise.resolve({ data: null, error: { code: 'PGRST123', message: 'relation does not exist' }, count: null });
      },
    };
    const result = await fetchAll(chain, { pageSize: 1000 });
    expect(result.data).toBeNull();
    expect(result.error.code).toBe('PGRST123');
    expect(result.error.message).toBe('relation does not exist');
  });

  it('propagates errors from a later page and returns partial data', async () => {
    let _callCount = 0;
    const chain = {
      select() { return chain; },
      eq() { return chain; },
      is() { return chain; },
      order() { return chain; },
      range(_start, _end) {
        _callCount++;
        if (_callCount === 1) {
          return Promise.resolve({ data: Array(1000).fill({ id: 1 }), error: null, count: 2000 });
        }
        return Promise.resolve({ data: null, error: { code: 'CONNECTION_LOST', message: 'network error' }, count: null });
      },
    };
    const result = await fetchAll(chain, { pageSize: 1000 });
    expect(result.data).toBeNull();
    expect(result.error.code).toBe('CONNECTION_LOST');
    expect(result.partial).toHaveLength(1000); // first page's data preserved
  });

  it('stops when a page returns fewer rows than pageSize', async () => {
    const rows = Array.from({ length: 1500 }, (_, i) => ({ id: i }));
    const qb = mockQueryBuilder(rows, 1000);
    const result = await fetchAll(qb, { pageSize: 1000 });
    expect(result.data).toHaveLength(1500); // 1000 + 500
  });
});
