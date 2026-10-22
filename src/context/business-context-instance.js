// src/context/business-context-instance.js
// The React context object for the active business. Lives in a
// non-component file so that BusinessContext.jsx can export only the
// BusinessProvider component (satisfies the
// react-refresh/only-export-components lint rule).
//
// Pattern mirrors auth-context-instance.js.

import { createContext } from 'react';

// null sentinel — consumers see this if they call useBusiness()
// outside a BusinessProvider (which would throw via useBusiness).
export const BusinessContext = createContext(null);
