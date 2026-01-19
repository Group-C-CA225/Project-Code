import { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '../utils/api';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';

// ============= SVG Icons =============
const UserIcon = () => (
  <svg className="h-5 w-5 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const EmailIcon = () => (
  <svg className="h-5 w-5 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
  </svg>
);

const LockIcon = () => (
  <svg className="h-5 w-5 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4 text-[#6B7280]" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// ============= Validation Helpers =============
const validateFullName = (name) => {
  const errors = [];
  if (!name.trim()) {
    errors.push('Full name is required');
  } else {
    if (name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }
    if (/[!@#$%^&*(),.?":{}|<>0-9]/.test(name)) {
      errors.push('Name cannot contain special characters or numbers');
    }
  }
  return errors;
};

const validateEmail = (email) => {
  const errors = [];
  if (!email.trim()) {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please enter a valid email address');
    }
  }
  return errors;
};

const validatePassword = (password) => {
  const errors = [];
  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  
  return { errors, checks: {} };
};

const validateConfirmPassword = (password, confirmPassword) => {
  const errors = [];
  if (!confirmPassword) {
    errors.push('Please confirm your password');
  } else if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }
  return errors;
};

// ============= Custom Hook for Debounce =============
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// ============= Field Error Message Component =============
const FieldError = ({ errors, touched }) => {
  if (!touched || errors.length === 0) return null;
  
  return (
    <div className="mt-1 text-xs text-red-500 flex items-start gap-1">
      <XIcon />
      <span>{errors[0]}</span>
    </div>
  );
};

// ============= Main Register Component =============
const Register = () => {
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  // Validation State
  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form submission
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs for auto-focus
  const fullNameRef = useRef(null);
  
  const navigate = useNavigate();

  // Auto-focus on mount
  useEffect(() => {
    fullNameRef.current?.focus();
  }, []);

  // Validation results
  const fullNameErrors = validateFullName(formData.fullName);
  const emailErrors = validateEmail(formData.email);
  const { errors: passwordErrors } = validatePassword(formData.password);
  const confirmPasswordErrors = validateConfirmPassword(formData.password, formData.confirmPassword);

  // Form validity check
  const isFormValid = 
    fullNameErrors.length === 0 && 
    emailErrors.length === 0 && 
    passwordErrors.length === 0 && 
    confirmPasswordErrors.length === 0;

  // Handlers
  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleBlur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const newTouched = {
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
    };
    setTouched(newTouched);

    // Re-calculate validation with current form data
    const currentFullNameErrors = validateFullName(formData.fullName);
    const currentEmailErrors = validateEmail(formData.email);
    const { errors: currentPasswordErrors } = validatePassword(formData.password);
    const currentConfirmPasswordErrors = validateConfirmPassword(formData.password, formData.confirmPassword);
    
    const currentIsFormValid = 
      currentFullNameErrors.length === 0 && 
      currentEmailErrors.length === 0 && 
      currentPasswordErrors.length === 0 && 
      currentConfirmPasswordErrors.length === 0;

    // Validate all fields
    if (!currentIsFormValid) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please fill all fields correctly before submitting.',
        confirmButtonColor: '#0EA5E9',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await auth.register({
        full_name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      await Swal.fire({
        icon: 'success',
        title: 'Verification Email Sent!',
        html: `
          <div class="text-left">
            <p class="mb-2">We've sent a verification code to your email address.</p>
            <p class="text-sm text-gray-600">Please check your email and enter the 6-digit code to complete registration.</p>
          </div>
        `,
        confirmButtonColor: '#0EA5E9',
        confirmButtonText: 'Continue to Verification',
      });

      // Navigate to email verification page with email
      navigate('/verify-email', { 
        state: { email: formData.email.trim().toLowerCase() } 
      });
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: err?.message || 'Something went wrong. Please try again.',
        confirmButtonColor: '#0EA5E9',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get input border class based on validation state
  const getInputBorderClass = (field, errors, additionalCheck = true) => {
    if (!touched[field]) return 'border-[#D1D5DB] focus:ring-[#0EA5E9]';
    if (errors.length > 0 || !additionalCheck) return 'border-red-400 focus:ring-red-400';
    return 'border-green-400 focus:ring-green-400';
  };

  return (
    <div className="min-h-screen w-full relative overflow-y-auto">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-white">
        <div className="absolute h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 md:gap-16 items-center py-8">
          
          {/* Left Side - Branding */}
          <div className="space-y-8 hidden md:block">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-[#0EA5E9] text-white p-2 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-[#111827]">QuizAI</h1>
              </div>
              <h2 className="text-3xl font-bold text-[#111827] leading-tight">
                Join Our Teaching Community
              </h2>
              <p className="text-[#6B7280] text-lg">
                Create your teacher account and start building amazing quizzes with AI assistance.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#0EA5E9] rounded-full"></div>
                <span className="text-[#374151]">Easy quiz creation tools</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#0EA5E9] rounded-full"></div>
                <span className="text-[#374151]">Automated grading system</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#0EA5E9] rounded-full"></div>
                <span className="text-[#374151]">Student progress tracking</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#0EA5E9] rounded-full"></div>
                <span className="text-[#374151]">Real-time exam monitoring</span>
              </div>
            </div>

          </div>

          {/* Right Side - Register Form */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-[#E5E7EB]">
              {/* Mobile Header */}
              <div className="md:hidden flex items-center justify-center space-x-2 mb-4">
                <div className="bg-[#0EA5E9] text-white p-2 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-[#111827]">QuizAI</h1>
              </div>

              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-[#111827] mb-2">Create Account</h3>
                <p className="text-[#6B7280]">Join as a Teacher</p>
              </div>

              {/* Register Form */}
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Full Name Field */}
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon />
                    </div>
                    <input
                      ref={fullNameRef}
                      type="text"
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition ${getInputBorderClass('fullName', fullNameErrors)}`}
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={handleChange('fullName')}
                      onBlur={handleBlur('fullName')}
                    />
                  </div>
                  <FieldError errors={fullNameErrors} touched={touched.fullName} />
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EmailIcon />
                    </div>
                    <input
                      type="email"
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition ${getInputBorderClass('email', emailErrors)}`}
                      placeholder="teacher@example.com"
                      value={formData.email}
                      onChange={handleChange('email')}
                      onBlur={handleBlur('email')}
                    />
                  </div>
                  <FieldError errors={emailErrors} touched={touched.email} />
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockIcon />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition ${getInputBorderClass('password', passwordErrors)}`}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange('password')}
                      onBlur={handleBlur('password')}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6B7280] hover:text-[#374151] transition"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  <FieldError errors={passwordErrors} touched={touched.password} />
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockIcon />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition ${getInputBorderClass('confirmPassword', confirmPasswordErrors)}`}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange('confirmPassword')}
                      onBlur={handleBlur('confirmPassword')}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6B7280] hover:text-[#374151] transition"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  <FieldError errors={confirmPasswordErrors} touched={touched.confirmPassword} />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0EA5E9] text-white font-medium py-2.5 rounded-lg hover:bg-[#0284C7] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              {/* Footer Links */}
              <div className="mt-6 text-center text-sm text-[#6B7280]">
                <p>
                  Already have an account?{" "}
                  <Link to="/" className="text-[#0EA5E9] hover:text-[#0284C7] font-medium">
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
