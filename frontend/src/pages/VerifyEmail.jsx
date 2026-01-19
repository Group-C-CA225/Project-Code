import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import Swal from 'sweetalert2';

const VerifyEmail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
    
    // Get email from location state
    const email = location.state?.email;
    
    useEffect(() => {
        if (!email) {
            navigate('/register');
            return;
        }
        
        // Countdown timer
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => clearInterval(timer);
    }, [email, navigate]);
    
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    const handleVerify = async (e) => {
        e.preventDefault();
        
        if (!otp || otp.length !== 6) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid OTP',
                text: 'Please enter the 6-digit verification code',
                confirmButtonColor: '#0EA5E9'
            });
            return;
        }
        
        setLoading(true);
        
        try {
            await api.post('/api/verify-email', {
                email: email,
                otp: otp
            });
            
            await Swal.fire({
                icon: 'success',
                title: 'Email Verified!',
                text: 'Your account has been created successfully. You can now login.',
                confirmButtonColor: '#0EA5E9'
            });
            
            navigate('/');
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Verification Failed',
                text: err.message || 'Invalid or expired verification code',
                confirmButtonColor: '#0EA5E9'
            });
        } finally {
            setLoading(false);
        }
    };
    
    const handleResendOTP = async () => {
        setResending(true);
        
        try {
            await api.post('/api/resend-otp', {
                email: email
            });
            
            setTimeLeft(600); // Reset timer to 10 minutes
            setOtp(''); // Clear current OTP
            
            Swal.fire({
                icon: 'success',
                title: 'Code Sent',
                text: 'A new verification code has been sent to your email.',
                confirmButtonColor: '#0EA5E9'
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Failed to Resend',
                text: err.message || 'Could not resend verification code',
                confirmButtonColor: '#0EA5E9'
            });
        } finally {
            setResending(false);
        }
    };
    
    if (!email) {
        return null; // Will redirect in useEffect
    }
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#0EA5E9] rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-[#111827] mb-2">Verify Your Email</h1>
                    <p className="text-[#6B7280] text-sm">
                        We've sent a 6-digit verification code to
                    </p>
                    <p className="text-[#0EA5E9] font-semibold text-sm">{email}</p>
                </div>
                
                <form onSubmit={handleVerify} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-[#374151] mb-2 text-center">
                            Enter Verification Code
                        </label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-gray-300 rounded-lg focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9] focus:ring-opacity-20 outline-none transition"
                            placeholder="000000"
                            maxLength="6"
                            required
                        />
                    </div>
                    
                    <div className="text-center">
                        <p className="text-sm text-[#6B7280] mb-2">
                            Code expires in: <span className="font-mono font-semibold text-[#DC2626]">{formatTime(timeLeft)}</span>
                        </p>
                        {timeLeft === 0 && (
                            <p className="text-sm text-[#DC2626] font-semibold">Code has expired!</p>
                        )}
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading || timeLeft === 0}
                        className="w-full py-3 bg-[#0EA5E9] text-white font-semibold rounded-lg hover:bg-[#0284C7] disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-lg"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                Verifying...
                            </div>
                        ) : (
                            'Verify Email'
                        )}
                    </button>
                </form>
                
                <div className="mt-6 text-center">
                    <p className="text-sm text-[#6B7280] mb-3">Didn't receive the code?</p>
                    <button
                        onClick={handleResendOTP}
                        disabled={resending}
                        className="text-[#0EA5E9] font-semibold hover:text-[#0284C7] disabled:text-gray-400 disabled:cursor-not-allowed transition"
                    >
                        {resending ? 'Sending...' : 'Resend Code'}
                    </button>
                </div>
                
                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/register')}
                        className="text-sm text-[#6B7280] hover:text-[#374151] transition"
                    >
                        ← Back to Registration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;