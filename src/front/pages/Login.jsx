import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import authService from '../store/authService';

export const Login = () => {
    const [formData, setFormData] = useState({
        login: '', // Changed from 'email' to 'login' to support both email and username
        password: '',
        remember: false
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect if already authenticated
    useEffect(() => {
        if (authService.isAuthenticated()) {
            const intendedPath = location.state?.from?.pathname || '/dashboard';
            navigate(intendedPath, { replace: true });
        }
    }, [navigate, location]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
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
        
        // Login field validation (email or username)
        if (!formData.login) {
            newErrors.login = 'Email or username is required';
        } else if (formData.login.length < 3) {
            newErrors.login = 'Email or username must be at least 3 characters';
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
        setErrors({});
        
        try {
            console.log('🔐 Attempting login with:', { login: formData.login });
            
            const result = await authService.login({
                login: formData.login, // Send as 'login' field to support both email and username
                password: formData.password
            }, formData.remember);
            
            if (result.success) {
                console.log('✅ Login successful, redirecting...');
                
                // Redirect to intended page or dashboard
                const intendedPath = location.state?.from?.pathname || '/dashboard';
                navigate(intendedPath, { replace: true });
            } else {
                // Handle specific error cases with user-friendly messages
                let errorMessage = result.error || 'Login failed';
                
                if (errorMessage.includes('Invalid credentials')) {
                    setErrors({ 
                        submit: 'Invalid email/username or password. Please check your credentials and try again.' 
                    });
                } else if (errorMessage.includes('rate_limit')) {
                    setErrors({ 
                        submit: 'Too many login attempts. Please wait a few minutes before trying again.' 
                    });
                } else if (errorMessage.includes('Account is deactivated')) {
                    setErrors({ 
                        submit: 'Your account has been deactivated. Please contact support for assistance.' 
                    });
                } else if (errorMessage.includes('required')) {
                    setErrors({ 
                        submit: 'Please enter both your email/username and password.' 
                    });
                } else {
                    setErrors({ submit: errorMessage });
                }
                
                console.log('❌ Login failed:', errorMessage);
            }
        } catch (error) {
            console.error('💥 Login error:', error);
            setErrors({ 
                submit: 'Unable to connect to the server. Please check your internet connection and try again.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => {
        // TODO: Implement forgot password functionality
        alert('Forgot password functionality will be implemented soon!');
    };

    const handleSteamLogin = () => {
        // TODO: Implement Steam OAuth
        alert('Steam login will be available soon!');
    };

    // Development helper
    const handleDemoLogin = () => {
        if (import.meta.env.DEV) {
            setFormData({
                login: 'demo@squadup.com', // Can be email or username
                password: 'DemoPassword123',
                remember: false
            });
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
                            <div className="flex items-center space-x-4">
                                <Link 
                                    to="/signup" 
                                    className="text-white/80 hover:text-white transition-colors duration-300 font-medium"
                                >
                                    Need an account?
                                </Link>
                                {/* Development helper */}
                                {import.meta.env.DEV && (
                                    <button
                                        onClick={handleDemoLogin}
                                        className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded transition-colors duration-200"
                                        title="Fill demo credentials"
                                    >
                                        Demo
                                    </button>
                                )}
                            </div>
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

                            {/* Error Display */}
                            {errors.submit && (
                                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                                    <div className="flex items-start space-x-2">
                                        <span className="text-red-400 mt-0.5">⚠️</span>
                                        <span>{errors.submit}</span>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Login Field (Email or Username) */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-white/90">
                                        Email or Username
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            name="login"
                                            value={formData.login}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 bg-white/5 border ${
                                                errors.login 
                                                    ? 'border-red-500/50 focus:border-red-500' 
                                                    : 'border-white/20 focus:border-coral-500'
                                            } rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-coral-500/30 transition-all duration-300 group-hover:bg-white/10`}
                                            placeholder="Enter your email or username"
                                            disabled={isLoading}
                                            autoComplete="username"
                                        />
                                        {errors.login && (
                                            <p className="mt-1 text-xs text-red-400">{errors.login}</p>
                                        )}
                                    </div>
                                    <p className="text-xs text-white/50">
                                        You can use either your email address or username to sign in
                                    </p>
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
                                            disabled={isLoading}
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
                                            disabled={isLoading}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? '👁️' : '👁️‍🗨️'}
                                        </button>
                                        {errors.password && (
                                            <p className="mt-1 text-xs text-red-400">{errors.password}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Remember Me & Forgot Password */}
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="remember"
                                            checked={formData.remember}
                                            onChange={handleChange}
                                            disabled={isLoading}
                                            className="w-4 h-4 bg-white/10 border border-white/30 rounded focus:ring-coral-500 focus:ring-2 text-coral-500"
                                        />
                                        <span className="text-sm text-white/80">Remember me</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-coral-400 hover:text-coral-300 text-sm transition-colors duration-300 hover:underline"
                                        disabled={isLoading}
                                    >
                                        Forgot password?
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
                            <button 
                                onClick={handleSteamLogin}
                                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 group"
                                disabled={isLoading}
                            >
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

                            {/* Development Info */}
                            {import.meta.env.DEV && (
                                <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-300 text-xs">
                                    <div className="flex items-center space-x-2">
                                        <span>🚀</span>
                                        <div>
                                            <strong>Dev Mode:</strong> Click "Demo" to auto-fill test credentials.
                                            <br />
                                            <strong>Login Support:</strong> Use either email or username to sign in.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Security Notice */}
                        <div className="mt-6 text-center">
                            <p className="text-white/50 text-xs">
                                🔒 Your connection is secure and encrypted
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
                        <div className="w-12 h-12 border-3 border-white/30 border-t-coral-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white font-medium">Authenticating...</p>
                        <p className="text-white/70 text-sm mt-1">Verifying your credentials</p>
                    </div>
                </div>
            )}

            {/* Custom Styles */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                
                /* Custom checkbox styling */
                input[type="checkbox"]:checked {
                    background-color: #ff7f50;
                    border-color: #ff7f50;
                }
                
                /* Focus ring for accessibility */
                input:focus,
                button:focus {
                    outline: 2px solid #ff7f50;
                    outline-offset: 2px;
                }
            `}</style>
        </>
    );
};