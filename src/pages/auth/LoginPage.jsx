// src/pages/auth/LoginPage.jsx
import LoginForm from '../../components/auth/LoginForm';
import { Package } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex">
      
      {/* LEFT SIDE - Branding Panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 to-emerald-700 flex-col justify-between p-12 relative overflow-hidden">
        
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full translate-y-48 -translate-x-48" />
        
        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-green-600" />
          </div>
          <span className="text-white text-2xl font-bold">Stockwise</span>
        </div>

        {/* Hero Text */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Take control of your inventory, 
            <span className="text-green-200"> grow your business.</span>
          </h1>
          <p className="text-green-100 text-lg leading-relaxed mb-10">
            Join thousands of Nigerian SMEs who use Stockwise to track stock, 
            prevent losses, and make smarter business decisions.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { value: '500+', label: 'Active Businesses' },
              { value: '98%', label: 'Stock Accuracy' },
              { value: '3min', label: 'Setup Time' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white bg-opacity-10 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-green-200 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="bg-white bg-opacity-10 rounded-2xl p-6 relative z-10">
          <p className="text-green-100 italic mb-4">
            "Stockwise helped me stop losing money from stockouts. I now know exactly 
            what to reorder and when. My business has never run smoother."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-400 rounded-full flex items-center justify-center text-white font-bold">
              A
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Amaka Okonkwo</div>
              <div className="text-green-300 text-xs">Fashion Retailer, Lagos</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-green-600 text-xl font-bold">Stockwise</span>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}