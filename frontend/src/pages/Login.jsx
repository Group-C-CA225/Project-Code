import { useState } from "react";
import { auth } from "../utils/api";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import Swal from 'sweetalert2';

// Simple SVG icons for Email and Password
const EmailIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-gray-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
    />
  </svg>
);

const LockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-gray-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await auth.login({ email, password });

      // Save Token & User Info
      localStorage.setItem("teacher_token", res.token);
      localStorage.setItem("user_name", res.user.name);

      await Swal.fire({
        icon: 'success',
        title: 'Login Successful!',
        text: `Welcome back, ${res.user.name}`,
        timer: 1500,
        showConfirmButton: false
      });

      navigate("/dashboard");
    } catch (err) {
      setIsLoading(false);
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: err.message || 'Invalid credentials. Please try again.',
        confirmButtonColor: '#00ADB5'
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#222831]">
      <div className="bg-[#393E46] p-10 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-[#00ADB5]">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#EEEEEE] tracking-wide">
            Welcome Back
          </h1>
          <p className="text-gray-400 mt-2">Sign in to manage your quizzes</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-900/50 border-l-4 border-red-500 text-red-200 p-4 rounded mb-6 text-sm">
            <p className="font-bold">Login Failed</p>
            <p>{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email Input Group */}
          <div>
            <label className="block text-sm font-bold text-[#00ADB5] mb-2">
              Email Address
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3">
                <EmailIcon />
              </span>
              <input
                type="email"
                required
                className="w-full bg-[#222831] text-[#EEEEEE] border border-gray-600 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-[#00ADB5] transition-colors duration-200"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Input Group */}
          <div>
            <label className="block text-sm font-bold text-[#00ADB5] mb-2">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3">
                <LockIcon />
              </span>
              <input
                type="password"
                required
                className="w-full bg-[#222831] text-[#EEEEEE] border border-gray-600 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-[#00ADB5] transition-colors duration-200"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-[#00ADB5] text-white font-bold py-3 rounded-lg shadow-md hover:bg-[#008c94] hover:-translate-y-1 transition-all duration-200 
                        ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {isLoading ? "Signing In..." : "Access Dashboard"}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>
            Forgot your password?{" "}
            <Link to="/forgot-password" className="text-[#00ADB5] hover:underline">
              Reset here
            </Link>
          </p>
          <p className="mt-2">
            Need an account?{" "}
            <Link
              to="/register"
              className="text-[#00ADB5] hover:underline font-bold"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
