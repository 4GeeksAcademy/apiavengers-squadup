import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import authService from '../store/authService.js'
import { logOut } from '../store/actions';
import useGlobalReducer from '../hooks/useGlobalReducer'
import { clearAuthError } from '../store/actions'
import { ACTION_TYPES } from '../store/store';

export const Login = () => {
    const { isAuthenticated, error: authError, actions, dispatch } = useGlobalReducer();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ login: '', password: '' });
    const [errors, setErrors] = useState({});
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);     // single loading flag
    const [remember, setRemember] = useState(false);
    const [success, setSuccess] = useState('');
    const navigateToHome = () => navigate('/');
    const navigateToSignUp = () => navigate('/signup');

    /* ───────── if already logged-in, bounce ───────── */
    if (isAuthenticated) return <Navigate to="/dashboard" replace />;

    /* ───────── helpers ───────── */
    const onChange = e => {
        const { name, value, checked, type } = e.target;
        if (type === 'checkbox') setRemember(checked);
        else {
            setFormData(f => ({ ...f, [name]: value }));
            if (errors[name]) setErrors({ ...errors, [name]: null });
            dispatch(clearAuthError);                        // clear store error
        }
    };

    const validate = () => {
        const e = {};
        if (!formData.login) e.login = 'Email or username is required';
        if (!formData.password) e.password = 'Password is required';
        setErrors(e);
        return !Object.keys(e).length;
    };

    /* ───────── submit ───────── */
    const onSubmit = async e => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        const { success, user, error } = await authService.login(formData);

        if (success) {
            // move tokens to sessionStorage if "Remember me" NOT checked
            if (!remember) {
                sessionStorage.setItem('access_token', authService.getAccessToken());
                sessionStorage.setItem('refresh_token', authService.getRefreshToken());
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('token_expiration');
            }

            dispatch({
                type: ACTION_TYPES.LOGIN_SUCCESS,
                payload: { user, token: authService.getAccessToken() }
            });

            setSuccess('Login successful! Welcome back!');
            setFormData({ login: '', password: '' });
            navigate('/profile', { replace: true });


        } else {
            setErrors({ submit: error || 'Login failed' });
        }
        setLoading(false);
    };

    const handleForgotPassword = () => {
        navigate('/forgot-password');
    };

    return (
        <>
            <div className="min-h-screen relative overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,127,80,0.15),transparent_50%)]"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(138,43,226,0.15),transparent_50%)]"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,191,255,0.1),transparent_50%)]"></div>
                </div>

                {/* Floating Particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(40)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full opacity-30 animate-pulse"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 4}s`,
                                animationDuration: `${3 + Math.random() * 2}s`
                            }}
                        ></div>
                    ))}
                </div>

                {/* Glassmorphism Navbar */}
                <nav className="relative z-50 mx-4 mt-4">
                    <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-6 py-4 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <button onClick={navigateToHome} className="flex items-center space-x-3 group">
                                <div className="w-8 h-8 bg-gradient-to-r from-coral-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-white font-bold text-sm">S</span>
                                </div>
                                <span className="text-white font-bold text-xl group-hover:text-coral-400 transition-colors duration-300">
                                    SquadUp
                                </span>
                            </button>
                            <button
                                onClick={navigateToSignUp}
                                className="text-white/80 hover:text-white transition-colors duration-300 font-medium"
                            >
                                Need an account?
                            </button>
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
                                    Welcome back!
                                </h1>
                                <p className="text-white/70">
                                    We're so excited to see you again!
                                </p>
                            </div>

                            {success && (
                                <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-sm">
                                    {success}
                                </div>
                            )}

                            {errors.submit && (
                                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                                    {errors.submit}
                                </div>
                            )}

                            <div className="space-y-6">
                                {/* Login Field (Email or Username) */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-white/90 uppercase tracking-wide">
                                        Email or Username <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            name="login"
                                            value={formData.login}
                                            onChange={onChange}
                                            className={`w-full px-4 py-3 bg-slate-800/50 border ${errors.login
                                                    ? 'border-red-500/50 focus:border-red-500'
                                                    : 'border-white/20 focus:border-coral-500'
                                                } rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-coral-500/30 transition-all duration-300 group-hover:bg-slate-800/70`}
                                            placeholder="Enter your email or username"
                                        />
                                        {errors.login && (
                                            <p className="mt-1 text-xs text-red-400">{errors.login}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-white/90 uppercase tracking-wide">
                                        Password <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type={showPw ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={onChange}
                                            className={`w-full px-4 py-3 pr-12 bg-slate-800/50 border ${errors.password
                                                    ? 'border-red-500/50 focus:border-red-500'
                                                    : 'border-white/20 focus:border-coral-500'
                                                } rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-coral-500/30 transition-all duration-300 group-hover:bg-slate-800/70`}
                                            placeholder="Enter your password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(!showPw)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
                                        >
                                            {showPw ? '👁️' : '👁️‍🗨️'}
                                        </button>
                                        {errors.password && (
                                            <p className="mt-1 text-xs text-red-400">{errors.password}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Remember Me & Forgot Password */}
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={remember}
                                            onChange={(e) => setRemember(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-4 h-4 border-2 rounded flex items-center justify-center mr-2 transition-all duration-200 ${remember
                                                ? 'bg-coral-500 border-coral-500'
                                                : 'border-white/40 group-hover:border-white/60'
                                            }`}>
                                            {remember && <span className="text-white text-xs">✓</span>}
                                        </div>
                                        <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors duration-200">
                                            Remember me
                                        </span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-sm text-coral-400 hover:text-coral-300 transition-colors duration-200 hover:underline"
                                    >
                                        Forgot your password?
                                    </button>
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={onSubmit}
                                    disabled={loading}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-coral-500/25 focus:outline-none focus:ring-2 focus:ring-coral-500/50 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                            Logging in...
                                        </div>
                                    ) : (
                                        'Log In'
                                    )}
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="my-6 flex items-center">
                                <div className="flex-1 h-px bg-white/20"></div>
                                <span className="px-4 text-white/60 text-sm">or continue with</span>
                                <div className="flex-1 h-px bg-white/20"></div>
                            </div>

                            {/* Social Login Buttons */}
                            <div className="space-y-3">
                                <button className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 group">
                                    <span className="text-lg">🎮</span>
                                    <span className="group-hover:text-blue-300 transition-colors duration-300">Continue with Steam</span>
                                </button>

                                <button className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 group">
                                    <span className="text-lg">🎵</span>
                                    <span className="group-hover:text-purple-300 transition-colors duration-300">Continue with Discord</span>
                                </button>
                            </div>

                            {/* Sign Up Link */}
                            <p className="mt-6 text-center text-white/70 text-sm">
                                Need an account?{' '}
                                <button
                                    onClick={navigateToSignUp}
                                    className="text-coral-400 hover:text-coral-300 font-medium transition-colors duration-300 hover:underline"
                                >
                                    Register
                                </button>
                            </p>
                        </div>

                        {/* QR Code Section */}
                        <div className="mt-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                            <div className="w-32 h-32 bg-white/10 rounded-xl mx-auto mb-4 flex items-center justify-center">
                                <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">📱</span>
                                </div>
                            </div>
                            <h3 className="text-white font-medium mb-2">Log in with QR Code</h3>
                            <p className="text-white/60 text-sm">
                                Scan this with the <strong>SquadUp mobile app</strong> to log in instantly.
                            </p>
                            <button className="mt-3 text-coral-400 hover:text-coral-300 text-sm font-medium transition-colors duration-200 hover:underline">
                                Or, sign in with passkey
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Regular CSS styles - no jsx attribute */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
            `}</style>
        </>
    );
};
