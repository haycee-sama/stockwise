// src/context/useBusiness.js
// Hook for accessing the BusinessContext. Split into a separate file
// so that BusinessContext.jsx only exports the BusinessProvider
// component (satisfies react-refresh/only-export-components lint rule).
//
// Pattern mirrors useAuth.js.

import { useContext } from 'react';
import { BusinessContext } from './business-context-instance';

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return ctx;
}
