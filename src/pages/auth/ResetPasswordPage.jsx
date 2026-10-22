// src/pages/auth/ResetPasswordPage.jsx
// The link-target page that `supabase.auth.resetPasswordForEmail()`
// redirects to. The URL contains a fragment like:
//   `https://stockwise-rho.vercel.app/reset-password#access_token=...&refresh_token=...&type=recovery`
//
// Supabase's `detectSessionInUrl: true` config (set in src/lib/supabase.js)
// automatically detects the recovery hash and updates the session.
// This page just needs to:
//   1. Wait for the auth state to settle (loading state).
//   2. Show a "set new password" form.
//   3. Call `supabase.auth.updateUser({ password })` on submit.
//   4. Show a success message + redirect to /login.
//
// If the recovery link is invalid/expired, show a clear error and a
// link to request a new reset email.
//
// In demo mode (no Supabase configured), this page shows a clear
// message that password reset requires Supabase.

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Loader2, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useDocumentTitle } from '../../utils/useDocumentTitle';

export default function ResetPasswordPage() {
  useDocumentTitle('Reset password — Stockwise');
  const navigate = useNavigate();
  const { authMode } = useAuth();

  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirm]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [success, setSuccess]           = useState(false);
  const [error, setError]               = useState('');
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  // Check whether Supabase has detected the recovery token from the URL.
  // In demo mode we just skip this.
  useEffect(() => {
    let active = true;
    if (authMode !== 'supabase') {
      setRecoveryReady(true);
      return;
    }
    // In Supabase mode, wait briefly for the auto-detect to fire and
    // surface a session. If no session appears within 3s, the link
    // may be invalid.
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled || !active) return;
      try {
        const { supabase } = await import('../../lib/supabase');
        if (!supabase) {
          setRecoveryError('Supabase client not configured.');
          setRecoveryReady(true);
          return;
        }
        const { data, error: err } = await supabase.auth.getSession();
        if (cancelled || !active) return;
        if (err) {
          setRecoveryError(err.message ?? 'Failed to read session from URL.');
        } else if (!data.session) {
          setRecoveryError('No active recovery session. The reset link may have expired — request a new one.');
        } else {
          setRecoveryReady(true);
        }
      } catch (e) {
        if (cancelled || !active) return;
        setRecoveryError(e?.message ?? 'Unexpected error.');
      } finally {
        if (!cancelled && active) setRecoveryReady(true);
      }
    }, 1500);

    return () => {
      cancelled = true;
      active = false;
      clearTimeout(timer);
    };
  }, [authMode]);

  const validate = () => {
    const e = {};
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) e.confirm = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = validate();
    if (Object.keys(errs).length) {
      setError(Object.values(errs).join('. '));
      return;
    }
    setSubmitting(true);
    try {
      if (authMode === 'supabase') {
        const { supabase } = await import('../../lib/supabase');
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) {
          setError(err.message ?? 'Failed to update password.');
          return;
        }
      } else {
        // Demo mode — simulate.
        await new Promise(r => setTimeout(r, 800));
      }
      setSuccess(true);
      // After 3s, navigate to /login.
      setTimeout(() => navigate('/login'), 3000);
    } catch (e) {
      setError(e?.message ?? 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="text-green-600 text-xl font-bold">Stockwise</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Set a new password</h1>
          <p className="text-sm text-gray-500 mb-6">
            Enter a new password for your Stockwise account.
          </p>

          {authMode === 'demo' && (
            <div className="mb-5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-amber-700 text-xs font-medium">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>Demo mode — password reset is not connected. Supabase must be configured for real password updates.</span>
            </div>
          )}

          {recoveryError && (
            <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-red-700 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{recoveryError}</p>
                <Link to="/forgot-password" className="block mt-2 text-xs font-bold text-red-700 hover:underline">
                  Request a new reset link →
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-red-700 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircle size={26} className="text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Password updated</h2>
              <p className="text-sm text-gray-500 mb-6">
                Your password has been updated. Redirecting to login…
              </p>
              <Link to="/login"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all">
                Go to login <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reset-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <input
                    id="reset-confirm"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !recoveryReady}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {submitting
                  ? <><Loader2 size={18} className="animate-spin" /> Updating…</>
                  : <>Update password <ArrowRight size={18} /></>}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          <Link to="/login" className="text-green-600 hover:text-green-700 font-semibold">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
