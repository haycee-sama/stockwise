// src/pages/auth/ForgotPasswordPage.jsx
// Real Supabase-backed "send reset link" page. Works in both demo and
// Supabase modes:
//
// - Supabase mode: calls `supabase.auth.resetPasswordForEmail(email)`.
//   Supabase sends a real email with a reset link. The link target
//   must be configured in the Supabase dashboard (Auth → URL
//   Configuration → Site URL + Redirect URLs). Out of scope for this
//   phase: building the `/reset-password` page that the email links to.
//   See docs/SUPABASE_SETUP.md §"What remains incomplete".
//
// - Demo mode: shows a clear "demo mode — email sending is not
//   configured" message and does NOT pretend to send an email.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export default function ForgotPasswordPage() {
  const { authMode } = useAuth();
  const [email, setEmail]       = useState('');
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // Demo mode: short-circuit with an honest message.
    if (authMode === 'demo') {
      setSubmitting(true);
      await new Promise(r => setTimeout(r, 500));
      setSubmitting(false);
      setSubmitted(true);
      return;
    }

    // Supabase mode.
    setSubmitting(true);
    try {
      const { supabase } = await import('../../lib/supabase');
      // The redirect URL must be in the Supabase dashboard's allowed
      // Redirect URLs list (Auth → URL Configuration). Uses the
      // VITE_PUBLIC_APP_URL env var so dev / preview / prod all work.
      const appUrl = import.meta.env.VITE_PUBLIC_APP_URL ?? window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/reset-password`,
      });
      if (error) {
        setServerError(error.message ?? 'Failed to send reset email.');
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setServerError(err?.message ?? 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Mobile / page logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="text-green-600 text-xl font-bold">Stockwise</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset your password</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter the email you signed up with and we&apos;ll send you a link to reset your password.
          </p>

          {authMode === 'demo' && (
            <div className="mb-5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-amber-700 text-xs font-medium">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>Demo mode — email sending is not configured. Supabase must be set up to actually send a reset link. See <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">docs/SUPABASE_SETUP.md</code>.</span>
            </div>
          )}

          {serverError && (
            <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-red-700 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {submitted ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircle size={26} className="text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {authMode === 'demo' ? 'Demo request received' : 'Check your email'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {authMode === 'demo'
                  ? 'In demo mode no email is actually sent. Configure Supabase to enable real password-reset emails.'
                  : `If an account exists for ${email}, a reset link is on its way.`}
              </p>
              <Link to="/login"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                <ArrowLeft size={15} /> Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${errors.email ? 'text-red-400' : 'text-gray-400'}`} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: '' })); }}
                    placeholder="you@business.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all
                      ${errors.email
                        ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                        : 'border-gray-200 bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100'
                      }`}
                  />
                </div>
                {errors.email && <p className="mt-1.5 text-xs text-red-500">⚠ {errors.email}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {submitting
                  ? <><Loader2 size={18} className="animate-spin" /> Sending…</>
                  : <>Send reset link <ArrowRight size={18} /></>}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Remembered your password?{' '}
          <Link to="/login" className="text-green-600 hover:text-green-700 font-semibold">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
