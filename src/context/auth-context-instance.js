// src/context/auth-context-instance.js
// The React context object for auth. Lives in its own file (no JSX, no
// component) so that:
//   - AuthContext.jsx (the provider) can import it without violating
//     react-refresh/only-export-components (which forbids a JSX file
//     from exporting both components and non-components).
//   - useAuth.js can import it to consume the context.
import { createContext } from 'react';

// `null` is the sentinel value consumers see if they call useAuth
// outside an AuthProvider. useAuth() throws an explicit error in that
// case.
export const AuthContext = createContext(null);
