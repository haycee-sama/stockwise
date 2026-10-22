// src/pages/auth/LoginPage.jsx
import LoginForm from '../../components/auth/LoginForm';
import { Package } from 'lucide-react';
import { useDocumentTitle } from '../../utils/useDocumentTitle';

export default function LoginPage() {
  useDocumentTitle('Sign in — Stockwise');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex">

      {/* LEFT SIDE — Branding panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 to-emerald-700 flex-col justify-between p-12 relative overflow-hidden">

        {/* Background decoration */}
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
            Take control of your inventory,
            <span className="text-green-200"> grow your business.</span>
          </h1>
          <p className="text-green-100 text-lg leading-relaxed">
            Stockwise helps Nigerian small and medium retail businesses
            track stock, record sales, manage customers and vendors,
            log expenses, and view aggregate business reports.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { title: 'Inventory', body: 'Track stock levels, thresholds, and reorder points.' },
            { title: 'Sales', body: 'Record sales atomically with automatic stock decrement.' },
            { title: 'Customers & Vendors', body: 'Maintain relationships and purchase orders.' },
            { title: 'Reports', body: 'See sales, inventory, customer, and expense aggregates.' },
          ].map((feature) => (
            <div key={feature.title} className="bg-white bg-opacity-10 rounded-2xl p-4">
              <div className="text-white font-semibold text-sm mb-1">{feature.title}</div>
              <div className="text-green-100 text-xs leading-relaxed">{feature.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE — Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <span className="text-green-600 text-xl font-bold">Stockwise</span>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
