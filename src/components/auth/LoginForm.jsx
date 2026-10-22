// src/components/auth/LoginForm.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LoginForm() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  // Form field values
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Track errors per field
  const [errors, setErrors] = useState({});

  // Toggle password visibility
  const [showPassword, setShowPassword] = useState(false);

  // General error message (e.g. wrong credentials)
  const [generalError, setGeneralError] = useState('');

  // Update form fields as user types
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (generalError) setGeneralError('');
  };

  // Validate before submitting
  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    return newErrors;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const result = await login(formData.email, formData.password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setGeneralError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
        <p className="text-gray-500">Sign in to your Stockwise account</p>
      </div>

      {/* General Error Banner */}
      {generalError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">!</span>
          </div>
          <p className="text-red-700 text-sm">{generalError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className={`w-4.5 h-4.5 ${errors.email ? 'text-red-400' : 'text-gray-400'}`} size={18} />
            </div>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@business.com"
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all duration-200 outline-none
                ${errors.email 
                  ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100' 
                  : 'border-gray-200 bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100'
                }`}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <span>⚠</span> {errors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <Link 
              to="/forgot-password" 
              className="text-xs text-green-600 hover:text-green-700 font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className={`${errors.password ? 'text-red-400' : 'text-gray-400'}`} size={18} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm transition-all duration-200 outline-none
                ${errors.password 
                  ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100' 
                  : 'border-gray-200 bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100'
                }`}
            />
            {/* Show/Hide password toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <span>⚠</span> {errors.password}
            </p>
          )}
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="remember"
            className="w-4 h-4 text-green-600 border-gray-300 rounded accent-green-600"
          />
          <label htmlFor="remember" className="text-sm text-gray-600">
            Remember me for 30 days
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Sign up link */}
      <p className="text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link 
          to="/signup" 
          className="text-green-600 hover:text-green-700 font-semibold"
        >
          Create one free
        </Link>
      </p>
    </div>
  );
}