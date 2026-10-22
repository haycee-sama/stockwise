// src/components/auth/SignupForm.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Building2, Phone, ArrowRight, Loader2, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Reusable Input component to keep code clean
function InputField({ label, name, type = 'text', value, onChange, error, placeholder, icon: Icon, rightElement }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Icon size={18} className={error ? 'text-red-400' : 'text-gray-400'} />
          </div>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} ${rightElement ? 'pr-12' : 'pr-4'} py-3 rounded-xl border text-sm transition-all duration-200 outline-none
            ${error 
              ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100' 
              : 'border-gray-200 bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100'
            }`}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-500">⚠ {error}</p>
      )}
    </div>
  );
}

// Password strength indicator
function PasswordStrength({ password }) {
  const getStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];
  const textColors = ['', 'text-red-500', 'text-yellow-600', 'text-blue-600', 'text-green-600'];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= strength ? colors[strength] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${textColors[strength]}`}>
        {labels[strength]} password
      </p>
    </div>
  );
}

export default function SignupForm() {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Multi-step form

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Validate step 1 fields
  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
    return newErrors;
  };

  // Validate step 2 fields
  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\s-]{10,15}$/.test(formData.phone)) {
      newErrors.phone = 'Enter a valid phone number';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!agreed) newErrors.agreed = 'You must agree to the terms';
    return newErrors;
  };

  const handleNextStep = () => {
    const stepErrors = validateStep1();
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setCurrentStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const stepErrors = validateStep2();
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    const result = await signup(formData);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h2>
        <p className="text-gray-500">Get started with Stockwise in minutes</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2].map((step) => (
          <div key={step} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
              ${currentStep === step 
                ? 'bg-green-600 text-white' 
                : currentStep > step 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {currentStep > step ? <Check size={16} /> : step}
            </div>
            <span className={`text-sm font-medium ${currentStep >= step ? 'text-gray-700' : 'text-gray-400'}`}>
              {step === 1 ? 'Business Info' : 'Account Setup'}
            </span>
            {step < 2 && (
              <div className={`w-8 h-px mx-1 ${currentStep > step ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        
        {/* STEP 1: Business Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                error={errors.firstName}
                placeholder="John"
                icon={User}
              />
              <InputField
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                error={errors.lastName}
                placeholder="Doe"
                icon={User}
              />
            </div>
            <InputField
              label="Business Name"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              error={errors.businessName}
              placeholder="Your Store Name"
              icon={Building2}
            />

            {/* Business Type Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Type</label>
              <select className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all">
                <option value="">Select your business type</option>
                <option value="retail">Retail Store</option>
                <option value="wholesale">Wholesale</option>
                <option value="ecommerce">E-commerce</option>
                <option value="distribution">Distribution</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextStep}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 2: Account Setup */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <InputField
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="you@business.com"
              icon={Mail}
            />
            <InputField
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              placeholder="+234 800 000 0000"
              icon={Phone}
            />

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock size={18} className={errors.password ? 'text-red-400' : 'text-gray-400'} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm transition-all outline-none
                    ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100'}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <PasswordStrength password={formData.password} />
              {errors.password && <p className="mt-1 text-xs text-red-500">⚠ {errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock size={18} className={errors.confirmPassword ? 'text-red-400' : 'text-gray-400'} />
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm transition-all outline-none
                    ${errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100'}`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">⚠ {errors.confirmPassword}</p>}
            </div>

            {/* Terms */}
            <div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreed}
                  onChange={(e) => { setAgreed(e.target.checked); if(errors.agreed) setErrors(p => ({...p, agreed: ''})); }}
                  className="mt-0.5 w-4 h-4 accent-green-600"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="text-green-600 hover:underline font-medium">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-green-600 hover:underline font-medium">Privacy Policy</a>
                </label>
              </div>
              {errors.agreed && <p className="mt-1 text-xs text-red-500">⚠ {errors.agreed}</p>}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-2 flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 size={18} className="animate-spin" /> Creating...</>
                ) : (
                  <><span>Create Account</span><ArrowRight size={18} /></>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Login link */}
      <p className="text-center text-sm text-gray-600 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-green-600 hover:text-green-700 font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  );
}