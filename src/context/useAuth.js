// src/context/useAuth.js
// Custom hook for accessing the AuthContext. Split out of AuthContext.jsx
// so that AuthContext.jsx only exports the AuthProvider component — this
// satisfies the react-refresh/only-export-components lint rule, which
// forbids a single file from exporting both components and non-components.
import { useContext } from 'react';
import { AuthContext } from './auth-context-instance';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
