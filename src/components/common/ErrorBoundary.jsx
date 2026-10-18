// src/components/common/ErrorBoundary.jsx
// Class-based React error boundary. Wraps lazy-loaded pages so that a
// runtime crash in one page does not blank out the whole app.
//
// Usage (see App.jsx):
//   <ErrorBoundary>
//     <Suspense fallback={<PageLoader />}>
//       <Outlet />
//     </Suspense>
//   </ErrorBoundary>
//
// This file exports a class component (the only construct that can implement
// `componentDidCatch`), so it deliberately does not use hooks.

import { Component } from 'react';
import { Package, RefreshCw, ArrowLeft } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI.
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console. In production this should also be sent to Sentry
    // or similar (see docs/ENVIRONMENT_SETUP.md §10).
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    // Full reload is a last-resort recovery — but it is intentional here
    // because the wrapped subtree is crashed and cannot recover in place.
    window.location.reload();
  };

  handleGoBack = () => {
    // Best-effort: clear the boundary state and let the user try again.
    this.setState({ error: null, errorInfo: null });
    // Navigate back via history so the user lands on the previous page,
    // not on the crashed one.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (!error) return children;

    // Allow callers to provide a custom fallback render prop.
    if (typeof fallback === 'function') return fallback(error, this.handleGoBack);
    if (fallback) return fallback;

    // Default branded fallback.
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-5 animate-fade-up">
          <Package size={26} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2 animate-fade-up">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-500 mb-1 max-w-md animate-fade-up">
          An unexpected error occurred while rendering this page. Your data
          is safe. Try reloading — and if the problem persists, please
          report it so we can fix it.
        </p>
        {error?.message && (
          <p className="text-[11px] text-gray-400 font-mono mb-5 max-w-md break-words">
            {error.message}
          </p>
        )}
        <div className="flex items-center gap-3 animate-fade-up">
          <button
            onClick={this.handleGoBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
          >
            <ArrowLeft size={15} /> Go back
          </button>
          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all active:scale-95"
          >
            <RefreshCw size={15} /> Reload page
          </button>
        </div>
      </div>
    );
  }
}
