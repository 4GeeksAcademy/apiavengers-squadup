import React, { useEffect } from "react";
// Fixed import - no circular dependency
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

export const Home = () => {
    const { store, dispatch } = useGlobalReducer();

    const loadMessage = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;

            if (!backendUrl) throw new Error("VITE_BACKEND_URL is not defined in .env file");

            const response = await fetch(backendUrl + "/api/hello");
            const data = await response.json();

            if (response.ok) dispatch({ type: "set_hello", payload: data.message });

            return data;
        } catch (error) {
            if (error.message) throw new Error(
                `Could not fetch the message from the backend.
                Please check if the backend is running and the backend port is public.`
            );
        }
    };

    useEffect(() => {
        loadMessage();
    }, []);

    const navigateToSignUp = () => {
        window.location.href = '/signup';
    };

    const navigateToLogin = () => {
        window.location.href = '/login';
    };

    const navigateToDashboard = () => {
        window.location.href = '/dashboard';
    };

    return (
        <>
            <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                {/* Animated Background Mesh */}
                <div className="absolute inset-0 bg-mesh"></div>
                
                {/* Floating Particles */}
                <div className="particles">
                    {[...Array(60)].map((_, i) => (
                        <div 
                            key={i}
                            className="particle animate-float"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 6}s`,
                                animationDuration: `${4 + Math.random() * 4}s`
                            }}
                        ></div>
                    ))}
                </div>

                {/* Navigation */}
                <nav className="relative z-50 mx-4 mt-4">
                    <div className="navbar-glass">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3 group cursor-pointer">
                                <div className="w-10 h-10 bg-gradient-to-r from-coral-500 to-marine-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                    <span className="text-white font-bold text-lg">S</span>
                                </div>
                                <span className="text-white font-bold text-2xl group-hover:text-coral-400 transition-colors duration-300 text-shadow">
                                    SquadUp
                                </span>
                            </div>
                            <div className="flex items-center space-x-4">
                                <button 
                                    onClick={navigateToLogin}
                                    className="text-white/80 hover:text-white transition-colors duration-300 font-medium"
                                >
                                    Login
                                </button>
                                <button
                                    onClick={navigateToSignUp}
                                    className="btn-coral"
                                >
                                    Get Started
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <div className="relative z-10 flex items-center justify-center min-h-screen px-4 text-center">
                    <div className="max-w-5xl mx-auto animate-fade-in">
                        
                        {/* Hero Content */}
                        <div className="mb-12">
                            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-white mb-6 text-shadow-lg">
                                Squad
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-coral-500 via-marine-400 to-lavender-500">
                                    Up
                                </span>
                            </h1>
                            <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed">
                                Find your gaming squad instantly. Vote on games, sync your Steam library, 
                                and discover the perfect matches for epic gaming sessions.
                            </p>
                            
                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                                <button
                                    onClick={navigateToSignUp}
                                    className="btn-coral text-lg px-8 py-4 w-full sm:w-auto group"
                                >
                                    <span className="flex items-center justify-center space-x-2">
                                        <span>Start Gaming Together</span>
                                        <span className="group-hover:translate-x-1 transition-transform duration-300">🎮</span>
                                    </span>
                                </button>
                                <button
                                    onClick={navigateToDashboard}
                                    className="btn-ghost text-lg px-8 py-4 w-full sm:w-auto"
                                >
                                    View Demo
                                </button>
                            </div>

                            {/* Backend Status */}
                            <div className="glass rounded-2xl p-6 max-w-md mx-auto">
                                <div className="flex items-center justify-center space-x-3">
                                    <div className={`w-3 h-3 rounded-full ${store.message ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                                    <span className="text-white/90 font-medium">
                                        {store.message ? 'Backend Connected' : 'Connecting to Backend...'}
                                    </span>
                                </div>
                                {store.message && (
                                    <p className="text-white/70 text-sm mt-2">
                                        {store.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Feature Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            
                            {/* Feature 1 */}
                            <div className="card-glass text-center group">
                                <div className="w-16 h-16 bg-gradient-to-r from-coral-500 to-coral-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-glow">
                                    <span className="text-3xl">🎯</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">Smart Matching</h3>
                                <p className="text-white/70 leading-relaxed">
                                    Our algorithm finds common games in your group's Steam libraries, 
                                    so you always know what everyone can play together.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="card-glass text-center group">
                                <div className="w-16 h-16 bg-gradient-to-r from-marine-500 to-marine-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-glow">
                                    <span className="text-3xl">🗳️</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">Group Voting</h3>
                                <p className="text-white/70 leading-relaxed">
                                    Democratic game selection through voting sessions. 
                                    Let your squad decide what to play next, fairly and efficiently.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="card-glass text-center group">
                                <div className="w-16 h-16 bg-gradient-to-r from-lavender-500 to-lavender-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-glow">
                                    <span className="text-3xl">🎮</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">Steam Integration</h3>
                                <p className="text-white/70 leading-relaxed">
                                    Seamlessly sync your Steam library and see real-time availability 
                                    of games across your gaming group.
                                </p>
                            </div>
                        </div>

                        {/* Stats Section */}
                        <div className="mt-20 glass rounded-3xl p-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                                <div>
                                    <div className="text-3xl md:text-4xl font-black text-coral-400 mb-2">500+</div>
                                    <div className="text-white/70 text-sm uppercase tracking-wide">Active Squads</div>
                                </div>
                                <div>
                                    <div className="text-3xl md:text-4xl font-black text-marine-400 mb-2">10K+</div>
                                    <div className="text-white/70 text-sm uppercase tracking-wide">Games Matched</div>
                                </div>
                                <div>
                                    <div className="text-3xl md:text-4xl font-black text-lavender-400 mb-2">2.5K+</div>
                                    <div className="text-white/70 text-sm uppercase tracking-wide">Happy Gamers</div>
                                </div>
                                <div>
                                    <div className="text-3xl md:text-4xl font-black text-green-400 mb-2">95%</div>
                                    <div className="text-white/70 text-sm uppercase tracking-wide">Success Rate</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="relative z-10 pb-12">
                    <div className="max-w-4xl mx-auto text-center px-4">
                        <div className="glass rounded-3xl p-12">
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                                Ready to level up your gaming?
                            </h2>
                            <p className="text-xl text-white/80 mb-8">
                                Join thousands of gamers who've found their perfect squads
                            </p>
                            <button
                                onClick={navigateToSignUp}
                                className="btn-coral text-xl px-12 py-6 group"
                            >
                                <span className="flex items-center justify-center space-x-3">
                                    <span>Create Your Squad</span>
                                    <span className="group-hover:translate-x-2 transition-transform duration-300">→</span>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};