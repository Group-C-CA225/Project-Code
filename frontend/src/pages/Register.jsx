import { useState } from 'react';
import { auth } from '../utils/api';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';

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
      // Call your backend register API
      await auth.register({
        full_name: username,
        email,
        password,
      });

      await Swal.fire({
        icon: 'success',
        title: 'Registration Successful!',
        text: 'Please login to continue',
        confirmButtonColor: '#00ADB5',
      });

      navigate('/');
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');

      await Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: err?.message || 'Something went wrong. Please try again.',
        confirmButtonColor: '#00ADB5',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#222831]">
      <div className="bg-[#393E46] p-10 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-[#00ADB5]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#EEEEEE] tracking-wide">
            Create Account
          </h1>
          <p className="text-gray-400 mt-2">Join as a Teacher</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border-l-4 border-red-500 text-red-200 p-4 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-bold text-[#00ADB5] mb-2">
              Full Name
            </label>
            <input
              type="text"
              required
              className="w-full bg-[#222831] text-[#EEEEEE] border border-gray-600 rounded-lg py-3 px-4 focus:outline-none focus:border-[#00ADB5] transition-colors"
              placeholder="John Doe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-[#00ADB5] mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full bg-[#222831] text-[#EEEEEE] border border-gray-600 rounded-lg py-3 px-4 focus:outline-none focus:border-[#00ADB5] transition-colors"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold text-[#00ADB5] mb-2">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full bg-[#222831] text-[#EEEEEE] border border-gray-600 rounded-lg py-3 px-4 focus:outline-none focus:border-[#00ADB5] transition-colors"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-[#00ADB5] text-white font-bold py-3 rounded-lg shadow-md hover:bg-[#008c94] hover:-translate-y-1 transition-all duration-200 ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Creating Account...' : 'Register Now'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          <p>
            Already have an account?{' '}
            <Link to="/" className="text-[#00ADB5] hover:underline font-bold">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
