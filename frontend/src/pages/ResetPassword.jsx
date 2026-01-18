import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';

const LockIcon = () => (
  <svg className="h-5 w-5 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (!token) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Link',
        text: 'No reset token provided',
        confirmButtonColor: '#0EA5E9'
      }).then(() => navigate('/'));
      return;
    }

    // Verify token
    const verifyToken = async () => {
      try {
        const response = await fetch(`http://localhost/quiz_platform/backend/api/password-reset.php?action=verify&token=${token}`);
        const data = await response.json();

        if (data.success) {
          setUserInfo(data);
        } else {
          throw new Error(data.message);
        }
      } catch (error) {
        await Swal.fire({
          icon: 'error',
          title: 'Invalid or Expired Link',
          text: data?.message || 'This reset link is invalid or has expired',
          confirmButtonColor: '#0EA5E9'
        });
        navigate('/');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      Swal.fire({
        icon: 'warning',
        title: 'Password Too Short',
        text: 'Password must be at least 6 characters',
        confirmButtonColor: '#0EA5E9'
      });
      return;
    }

    if (password !== confirmPassword) {
      Swal.fire({
        icon: 'warning',
        title: 'Passwords Do Not Match',
        text: 'Please make sure both passwords match',
        confirmButtonColor: '#0EA5E9'
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost/quiz_platform/backend/api/password-reset.php?action=reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();

      if (data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Password Reset!',
          text: 'Your password has been reset successfully. You can now login.',
          confirmButtonColor: '#0EA5E9'
        });
        navigate('/');
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Reset Failed',
          text: data.message || 'Failed to reset password',
          confirmButtonColor: '#0EA5E9'
        });
      }
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Reset Failed',
        text: error.message || 'Failed to reset password. Please try again.',
        confirmButtonColor: '#0EA5E9'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="h-screen w-full relative overflow-hidden">
        <div className="absolute h-full w-full bg-white">
          <div className="absolute h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        </div>
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-[#0EA5E9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-semibold text-[#111827]">Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-[#111827] mb-2">Reset Password</h1>
              {userInfo && (
                <p className="text-[#6B7280]">
                  Setting new password for <span className="font-semibold">{userInfo.email}</span>
                </p>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockIcon />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2.5 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent outline-none transition"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockIcon />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2.5 border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent outline-none transition"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                    Resetting...
                  </div>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
