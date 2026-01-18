import { useState } from 'react';
import { auth } from '../utils/api';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';

// Icons for form fields
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

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await auth.register({
        full_name: username,
        email,
        password,
      });

      await Swal.fire({
        icon: 'success',
        title: 'Registration Successful!',
        text: 'Please login to continue',
        confirmButtonColor: '#0EA5E9',
      });

      navigate('/');
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');

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

  return (
    <div className="h-screen w-full relative overflow-hidden">
      {/* Background Pattern from bg.ibelick.com */}
      <div className="absolute h-full w-full bg-white">
        <div className="absolute h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex items-center justify-center p-8">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-16 items-center">
          
          {/* Left Side - Branding */}
          <div className="space-y-8">
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
            </div>
          </div>

          {/* Right Side - Register Form */}
          <div className="w-full max-w-sm mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-[#E5E7EB]">
              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-[#111827] mb-2">Create Account</h3>
                <p className="text-[#6B7280]">Join as a Teacher</p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
                  <p className="font-semibold">Registration Failed</p>
                  <p>{error}</p>
                </div>
              )}

              {/* Register Form */}
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon />
                    </div>
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent outline-none transition"
                      placeholder="John Doe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EmailIcon />
                    </div>
                    <input
                      type="email"
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent outline-none transition"
                      placeholder="teacher@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockIcon />
                    </div>
                    <input
                      type="password"
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent outline-none transition"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

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
