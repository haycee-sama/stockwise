// src/pages/auth/SignupPage.jsx
import SignupForm from '../../components/auth/SignupForm';
import { Package, Check } from 'lucide-react';
import { useDocumentTitle } from '../../utils/useDocumentTitle';

// Only list features the frontend actually implements. The handover
// document (docs/BACKEND_HANDOVER.md Section 9) documents which of
// these are placeholders or have known frontend-side gaps in
// Supabase mode. No fabricated metrics, testimonials, or trust
// badges are shown on this page.
const featureHighlights = [
  'Inventory tracking with low-stock thresholds',
  'Atomic sales recording with stock decrement',
  'Customer and vendor management with purchase orders',
  'Expense logging by category and payment method',
  'Aggregate business reports across sales, inventory, customers, and expenses',
];

export default function SignupPage() {
  useDocumentTitle('Sign up — Stockwise');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex">

      {/* LEFT SIDE — Branding panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 to-emerald-700 flex-col justify-between p-12 relative overflow-hidden">

        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full translate-y-48 -translate-x-48" aria-hidden="true" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-green-600" aria-hidden="true" />
          </div>
          <span className="text-white text-2xl font-bold">Stockwise</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Start tracking smarter,
            <span className="text-green-200"> not harder.</span>
          </h1>
          <p className="text-green-100 text-lg leading-relaxed mb-10">
            Stockwise is built for Nigerian small and medium retail
            businesses. Sign up to set up your inventory, record
            sales, and view aggregate business reports.
          </p>

          {/* Feature list */}
          <ul className="space-y-3">
            {featureHighlights.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-green-100 text-sm font-medium">
                <Check size={16} className="text-green-300 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* RIGHT SIDE — Signup form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <span className="text-green-600 text-xl font-bold">Stockwise</span>
          </div>

          <SignupForm />
        </div>
      </div>
    </div>
  );
}
