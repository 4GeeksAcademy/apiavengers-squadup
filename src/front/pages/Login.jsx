import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';

export const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
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
        
        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
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
            
            const response = await fetch(`${backendUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store user data and token
                localStorage.setItem('token', data.access_token);
                dispatch({ 
                    type: 'set_user', 
                    payload: data.user 
                });
                
                // Show success message and redirect
                dispatch({
                    type: 'set_message',
                    payload: { 
                        type: 'success', 
                        text: 'Welcome back to SquadUp!' 
                    }
                });
                
                navigate('/dashboard');
            } else {
                setErrors({ submit: data.error || 'Login failed' });
            }
        } catch (error) {
            setErrors({ submit: 'Network error. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => {
        // You can implement forgot password functionality here
        alert('Forgot password functionality will be implemented soon!');
        // navigate('/forgot-password');
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
                                to="/signup" 
                                className="text-white/80 hover:text-white transition-colors duration-300 font-medium"
                            >
                                Need an account?
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
                                    Welcome back
                                </h1>
                                <p className="text-white/70">
                                    Sign in to continue your gaming journey!
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
                                            className={`w-full px-4 py-3 bg-white/5 border ${
                                                errors.email 
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
                                            className={`w-full px-4 py-3 pr-12 bg-white/5 border ${
                                                errors.password 
                                                    ? 'border-red-500/50 focus:border-red-500' 
                                                    : 'border-white/20 focus:border-coral-500'
                                            } rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-coral-500/30 transition-all duration-300 group-hover:bg-white/10`}
                                            placeholder="Enter your password"
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

                                {/* Forgot Password */}
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-coral-400 hover:text-coral-300 text-sm transition-colors duration-300 hover:underline"
                                    >
                                        Forgot your password?
                                    </button>
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
                                            Signing in...
                                        </div>
                                    ) : (
                                        'Sign In'
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
                                <span className="group-hover:text-blue-300 transition-colors duration-300">Continue with Steam</span>
                            </button>

                            {/* Signup Link */}
                            <p className="mt-6 text-center text-white/70 text-sm">
                                Don't have an account?{' '}
                                <Link 
                                    to="/signup" 
                                    className="text-coral-400 hover:text-coral-300 font-medium transition-colors duration-300 hover:underline"
                                >
                                    Sign up
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