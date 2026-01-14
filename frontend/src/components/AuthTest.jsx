import React, { useState } from 'react';
import { auth, testCORS } from '../utils/api';

const AuthTest = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [loginData, setLoginData] = useState({
        email: '',
        password: ''
    });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e, formType) => {
        const { name, value } = e.target;
        if (formType === 'register') {
            setFormData(prev => ({ ...prev, [name]: value }));
        } else {
            setLoginData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await auth.register(formData);
            setMessage(`Success: ${result.message}`);
            setFormData({ username: '', email: '', password: '' });
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
        setLoading(false);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await auth.login(loginData);
            setMessage(`Login Success: Welcome ${result.user.username}!`);
            setLoginData({ email: '', password: '' });
        } catch (error) {
            setMessage(`Login Error: ${error.message}`);
        }
        setLoading(false);
    };

    const handleTestCORS = async () => {
        setLoading(true);
        try {
            const result = await testCORS();
            setMessage(`CORS Test: ${result.message}`);
        } catch (error) {
            setMessage(`CORS Error: ${error.message}`);
        }
        setLoading(false);
    };

    return (
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-center">API Test</h2>
            
            {/* CORS Test Button */}
            <button
                onClick={handleTestCORS}
                disabled={loading}
                className="w-full mb-6 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
            >
                Test CORS Connection
            </button>

            {/* Register Form */}
            <form onSubmit={handleRegister} className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Register</h3>
                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={formData.username}
                    onChange={(e) => handleInputChange(e, 'register')}
                    className="w-full mb-2 p-2 border rounded"
                    required
                />
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => handleInputChange(e, 'register')}
                    className="w-full mb-2 p-2 border rounded"
                    required
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => handleInputChange(e, 'register')}
                    className="w-full mb-3 p-2 border rounded"
                    required
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:opacity-50"
                >
                    Register
                </button>
            </form>

            {/* Login Form */}
            <form onSubmit={handleLogin}>
                <h3 className="text-lg font-semibold mb-3">Login</h3>
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={loginData.email}
                    onChange={(e) => handleInputChange(e, 'login')}
                    className="w-full mb-2 p-2 border rounded"
                    required
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={loginData.password}
                    onChange={(e) => handleInputChange(e, 'login')}
                    className="w-full mb-3 p-2 border rounded"
                    required
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:opacity-50"
                >
                    Login
                </button>
            </form>

            {/* Message Display */}
            {message && (
                <div className={`mt-4 p-3 rounded ${
                    message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default AuthTest;