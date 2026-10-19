// src/hooks/useAsyncResource.js
// Generic async-data hook for the page → service → state pattern.
//
// Usage:
//   const { data, loading, error, refetch, setData } = useAsyncResource(
//     async () => inventoryService.list({ businessId, search, page }),
//     [businessId, search, page]   // deps — refetch when these change
//   );
//
// Returns:
//   - data: T | null  (the resolved value, or null while loading / on error)
//   - loading: boolean (true on first load + during refetch)
//   - error: { code, message } | null
//   - refetch: () => Promise<void>  (re-runs the async function)
//   - setData: (updater) => void   (lets the caller update the local
//     data without refetching — used after a successful mutation)
//
// Important: the caller is responsible for handling the case where
// the deps array changes during a refetch (the previous promise is
// ignored via the `activeRef` guard).

import { useState, useEffect, useRef, useCallback } from 'react';

export function useAsyncResource(asyncFn, deps = []) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const activeRef = useRef(true);

  const run = useCallback(async () => {
    activeRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      if (!activeRef.current) return; // stale — a newer refetch started
      if (result?.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data ?? null);
        setError(null);
      }
    } catch (e) {
      if (!activeRef.current) return;
      setError({ code: 'CAUGHT', message: e?.message ?? 'Unknown error' });
      setData(null);
    } finally {
      if (activeRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => { activeRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Public setData wrapper — lets the caller update the local data
  // (e.g. after a successful mutation, remove the deleted item from
  // the list without refetching).
  const updateData = useCallback((updater) => {
    setData(prev => typeof updater === 'function' ? updater(prev) : updater);
  }, []);

  return { data, loading, error, refetch: run, setData: updateData };
}
