import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import { ACTION_TYPES } from '../store/store';

export const SignUp = () => {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        // Username validation
        if (!formData.username) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        } else if (formData.username.length > 20) {
            newErrors.username = 'Username must be less than 20 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = 'Username can only contain letters, numbers, and underscores';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'Password must contain uppercase, lowercase, and number';
        }

        // Confirm password validation
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            const res = await fetch(`${backendUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    username: formData.username,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword   // ← backend expects this key
                })
            });

            // attempt to parse JSON regardless of status
            let data = {};
            try {
                data = await res.json();
            } catch { /* ignore if not JSON */ }

            if (res.ok) {
                const { user, access_token, refresh_token, message } = data;

                // persist token & user
                localStorage.setItem('access_token', access_token);
                if (refresh_token) {
                    localStorage.setItem('refresh_token', refresh_token);
                }
                dispatch({
                    type: ACTION_TYPES.LOGIN_SUCCESS,
                    payload: {
                    user: user,
                    token: access_token
                }
            });


                // show success toast/message
                dispatch({
                    type: 'set_message',
                    payload: { type: 'success', text: message || 'Account created!' }
                });

                
                navigate('/dashboard', { replace: true });
            } else {
                // show backend-supplied error, or fallback
                setErrors({ submit: data.error || data.message || 'Registration failed' });
            }

        } catch (err) {
            console.error(err);
            setErrors({ submit: 'Network error. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="min-h-screen relative overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,127,80,0.1),transparent_50%)]"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(138,43,226,0.1),transparent_50%)]"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(0,191,255,0.1),transparent_50%)]"></div>
                </div>

                {/* Floating Particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full opacity-20 animate-pulse"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${2 + Math.random() * 3}s`
                            }}
                        ></div>
                    ))}
                </div>

                {/* Glassmorphism Navbar */}
                <nav className="relative z-50 mx-4 mt-4">
                    <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-6 py-4 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <Link to="/" className="flex items-center space-x-3 group">
                                <div className="w-8 h-8 bg-gradient-to-r from-coral-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-white font-bold text-sm">S</span>
                                </div>
                                <span className="text-white font-bold text-xl group-hover:text-coral-400 transition-colors duration-300">
                                    SquadUp
                                </span>
                            </Link>
                            <Link
                                to="/login"
                                className="text-white/80 hover:text-white transition-colors duration-300 font-medium"
                            >
                                Already have an account?
                            </Link>
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <div className="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20 pb-12">
                    <div className="w-full max-w-md">
                        {/* Glassmorphism Form Container */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-white mb-2">
                                    Create an account
                                </h1>
                                <p className="text-white/70">
                                    Join the squad and start gaming together!
                                </p>
                            </div>

                            {errors.submit && (
                                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                                    {errors.submit}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Email Field */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-white/90">
                                        Email
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 bg-white/5 border ${errors.email
                                                ? 'border-red-500/50 focus:border-red-500'
                                                : 'border-white/20 focus:border-coral-500'
                                                } rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-coral-500/30 transition-all duration-300 group-hover:bg-white/10`}
                                            placeholder="Enter your email"
                                        />
                                        {errors.email && (
                                            <p className="mt-1 text-xs text-red-400">{errors.email}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Username Field */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-white/90">
                                        Username
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 bg-white/5 border ${errors.username
                                                ? 'border-red-500/50 focus:border-red-500'
                                                : 'border-white/20 focus:border-coral-500'
                                                } rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-coral-500/30 transition-all duration-300 group-hover:bg-white/10`}
                                            placeholder="Choose a username"
                                        />
                                        {errors.username && (
                                            <p className="mt-1 text-xs text-red-400">{errors.username}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-white/90">
                                        Password
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 pr-12 bg-white/5 border ${errors.password
                                                ? 'border-red-500/50 focus:border-red-500'
                                                : 'border-white/20 focus:border-coral-500'
                                                } rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-coral-500/30 transition-all duration-300 group-hover:bg-white/10`}
                                            placeholder="Create a password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
                                        >
                                            {showPassword ? '👁️' : '👁️‍🗨️'}
                                        </button>
                                        {errors.password && (
                                            <p className="mt-1 text-xs text-red-400">{errors.password}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Confirm Password Field */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-white/90">
                                        Confirm Password
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 pr-12 bg-white/5 border ${errors.confirmPassword
                                                ? 'border-red-500/50 focus:border-red-500'
                                                : 'border-white/20 focus:border-coral-500'
                                                } rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-coral-500/30 transition-all duration-300 group-hover:bg-white/10`}
                                            placeholder="Confirm your password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
                                        >
                                            {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                        </button>
                                        {errors.confirmPassword && (
                                            <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-coral-500/25 focus:outline-none focus:ring-2 focus:ring-coral-500/50 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                            Creating Account...
                                        </div>
                                    ) : (
                                        'Create Account'
                                    )}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="my-6 flex items-center">
                                <div className="flex-1 h-px bg-white/20"></div>
                                <span className="px-4 text-white/60 text-sm">or</span>
                                <div className="flex-1 h-px bg-white/20"></div>
                            </div>

                            {/* Steam Connect Button */}
                            <button className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 group">
                                <span className="text-lg">🎮</span>
                                <span className="group-hover:text-blue-300 transition-colors duration-300">Connect with Steam</span>
                            </button>

                            {/* Login Link */}
                            <p className="mt-6 text-center text-white/70 text-sm">
                                Already have an account?{' '}
                                <Link
                                    to="/login"
                                    className="text-coral-400 hover:text-coral-300 font-medium transition-colors duration-300 hover:underline"
                                >
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed CSS styles - proper syntax */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
            `}</style>
        </>
    );
};