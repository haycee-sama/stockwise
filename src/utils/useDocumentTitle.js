// src/utils/useDocumentTitle.js
// Small hook to set the document title for a route. Restores the
// previous title on unmount so navigating away from a route cleans
// up after itself.
//
// Used on the public auth routes so each has a unique, descriptive
// title for browser tabs, history, and link previews. The fallback
// title in index.html is the brand title; this hook overrides it
// per-route.

import { useEffect } from 'react';

const DEFAULT_TITLE = 'Stockwise — Inventory and Sales Management for Nigerian SMEs';

export function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous ?? DEFAULT_TITLE;
    };
  }, [title]);
}

export { DEFAULT_TITLE };
