// src/pages/auth/SignupPage.jsx
import SignupForm from '../../components/auth/SignupForm';
import { Package } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex">
      
      {/* LEFT SIDE - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 to-emerald-700 flex-col justify-between p-12 relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full translate-y-48 -translate-x-48" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-green-600" />
          </div>
          <span className="text-white text-2xl font-bold">Stockwise</span>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Start tracking smarter,
            <span className="text-green-200"> not harder.</span>
          </h1>
          <p className="text-green-100 text-lg leading-relaxed mb-10">
            Set up your inventory in under 3 minutes and start making 
            data-driven decisions for your business today.
          </p>

          {/* Feature List */}
          {[
            '✅ Real-time stock tracking',
            '✅ Low stock alerts & notifications',
            '✅ Sales and profit insights',
            '✅ Multi-location support',
            '✅ No credit card required to start',
          ].map((feature) => (
            <div key={feature} className="text-green-100 mb-3 text-sm font-medium">
              {feature}
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="bg-white bg-opacity-10 rounded-2xl p-6 relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex -space-x-2">
              {['A', 'B', 'C', 'D'].map((letter) => (
                <div key={letter} className="w-8 h-8 rounded-full bg-green-400 border-2 border-green-600 flex items-center justify-center text-white text-xs font-bold">
                  {letter}
                </div>
              ))}
            </div>
            <span className="text-green-200 text-sm">500+ businesses joined this month</span>
          </div>
          <p className="text-green-300 text-xs">
            🔒 Your data is encrypted and secure. We never share your business information.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-green-600 text-xl font-bold">Stockwise</span>
          </div>

          <SignupForm />
        </div>
      </div>
    </div>
  );
}