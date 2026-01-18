import { useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';

const EmailIcon = () => (
  <svg className="h-5 w-5 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
  </svg>
);

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost/quiz_platform/backend/api/password-reset.php?action=request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Email Sent!',
          text: 'A password reset link has been sent to your email address. Please check your inbox.',
          confirmButtonColor: '#0EA5E9'
        });
        setEmail('');
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          html: `<p>${data.message}</p>${data.debug ? `<p style="font-size: 12px; color: #666; margin-top: 10px;">Debug: ${data.debug}</p>` : ''}`,
          confirmButtonColor: '#0EA5E9'
        });
      }
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to send reset email. Please try again.',
        confirmButtonColor: '#0EA5E9'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute h-full w-full bg-white">
        <div className="absolute h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-[#E5E7EB]">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="bg-[#0EA5E9] bg-opacity-10 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#111827] mb-2">Forgot Password?</h1>
              <p className="text-[#6B7280]">Enter your email to receive a reset link</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    Sending...
                  </div>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 text-center text-sm text-[#6B7280]">
              <p>
                Remember your password?{" "}
                <Link to="/" className="text-[#0EA5E9] hover:text-[#0284C7] font-medium">
                  Back to Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
