// src/App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { BusinessProvider } from './context/BusinessContext';
import { useBusiness } from './context/useBusiness';
import ErrorBoundary from './components/common/ErrorBoundary';
import Sidebar from './components/layout/Sidebar';
import MobileNav from './components/layout/MobileNav';
import { Package } from 'lucide-react';

// ── Lazy page imports ─────────────────────────────
const LoginPage          = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage         = lazy(() => import('./pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('./pages/auth/ResetPasswordPage'));
const DashboardPage     = lazy(() => import('./pages/DashboardPage'));
const InventoryPage     = lazy(() => import('./pages/InventoryPage'));
const SalesPage         = lazy(() => import('./pages/SalesPage'));
const CustomersPage     = lazy(() => import('./pages/CustomersPage'));
const VendorsPage       = lazy(() => import('./pages/VendorsPage'));
const ExpensesPage      = lazy(() => import('./pages/ExpensesPage'));
const ReportsPage       = lazy(() => import('./pages/ReportsPage'));
const SettingsPage      = lazy(() => import('./pages/SettingsPage'));
const DocumentsPage    = lazy(() => import('./pages/DocumentsPage'));
const NotFoundPage      = lazy(() => import('./pages/NotFoundPage'));

// ── Page loading spinner ──────────────────────────
function PageLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
      <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center animate-pulse">
        <Package size={20} className="text-white" />
      </div>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i}
            className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── App layout shell ──────────────────────────────
function AppLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Main content — wrapped in an error boundary so a crash in one
          page does not blank out the whole app (P2-001 fix). */}
      <div className="flex-1 overflow-x-hidden min-w-0">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}

// ── Route guards ──────────────────────────────────
//
// P1-001 fix: show a loader while the auth state is being restored
// on mount. Without this, `ProtectedRoute` would render a `<Navigate
// to="/login">` on first paint even when there IS a stored session,
// because `user` is null until `useEffect` in AuthProvider completes.
//
// Phase 3B: ProtectedRoute also wraps the children in BusinessProvider
// so that page components can useBusiness() to get the active business
// ID. In Supabase mode, BusinessProvider auto-provisions a business
// on first signup (idempotent — only creates one if list returns 0).
function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <BusinessProvider>
      <BusinessReadyGate>
        <Outlet />
      </BusinessReadyGate>
    </BusinessProvider>
  );
}

// Phase 3B: gate that shows a loader while BusinessProvider is
// discovering/provisioning the user's businesses. Prevents pages
// from rendering with `activeBusinessId === null` (which would
// cause every service call to send `businessId: null` and get
// rejected by RLS).
function BusinessReadyGate({ children }) {
  const { isBusinessLoading, businessError, activeBusinessId } = useBusiness();
  if (isBusinessLoading) return <PageLoader />;
  if (businessError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-5">
          <Package size={26} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Business setup error</h2>
        <p className="text-sm text-gray-500 mb-1 max-w-md">
          Could not load or provision your business. Try reloading — and
          if the problem persists, sign out and back in.
        </p>
        <p className="text-[11px] text-gray-400 font-mono mb-5 max-w-md break-words">
          {businessError.message}
        </p>
      </div>
    );
  }
  if (!activeBusinessId) {
    // Should not happen — but if it does, refuse to render rather
    // than sending null business_id to service calls.
    return <PageLoader />;
  }
  return children;
}

function AuthRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  return !user ? children : <Navigate to="/dashboard" replace />;
}

// ── Route tree ────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public auth routes */}
      <Route path="/login"  element={<AuthRoute><Suspense fallback={<PageLoader />}><LoginPage  /></Suspense></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute><Suspense fallback={<PageLoader />}><SignupPage /></Suspense></AuthRoute>} />
      <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense>} />
      <Route path="/reset-password"  element={<Suspense fallback={<PageLoader />}><ResetPasswordPage  /></Suspense>} />

      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/sales"     element={<SalesPage     />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/vendors"   element={<VendorsPage   />} />
          <Route path="/expenses"  element={<ExpensesPage  />} />
          <Route path="/reports"   element={<ReportsPage   />} />
          <Route path="/settings"  element={<SettingsPage  />} />
          <Route path="/documents" element={<DocumentsPage />} />
        </Route>
      </Route>

      {/* 404 — proper page instead of silent redirect to /dashboard (P3-008 fix). */}
      <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
