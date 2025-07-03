import React from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const Footer = () => {
    const location = useLocation();
    
    // Don't show footer on auth pages
    const authPages = ['/login', '/signup'];
    const isAuthPage = authPages.includes(location.pathname);
    
    if (isAuthPage) {
        return null;
    }

    return (
        <footer className="relative z-10 mt-auto">
            <div className="glass-dark border-t border-white/10 mt-20">
                <div className="max-w-6xl mx-auto px-4 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        
                        {/* Brand Section */}
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-r from-coral-500 to-marine-500 rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="text-white font-bold text-lg">S</span>
                                </div>
                                <span className="text-white font-bold text-2xl">SquadUp</span>
                            </div>
                            <p className="text-white/70 max-w-md leading-relaxed">
                                The ultimate platform for finding your perfect gaming squad. 
                                Connect with friends, sync your Steam library, and vote on what to play next.
                            </p>
                            <div className="flex space-x-4 mt-6">
                                <button className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors duration-300">
                                    <span className="text-lg">🎮</span>
                                </button>
                                <button className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors duration-300">
                                    <span className="text-lg">💬</span>
                                </button>
                                <button className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors duration-300">
                                    <span className="text-lg">🐦</span>
                                </button>
                                <button className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors duration-300">
                                    <span className="text-lg">📺</span>
                                </button>
                            </div>
                        </div>

                        {/* Product Links */}
                        <div>
                            <h3 className="text-white font-semibold mb-4">Product</h3>
                            <ul className="space-y-2">
                                <li><a href="#" className="text-white/70 hover:text-white transition-colors duration-200">Features</a></li>
                                <li><a href="#" className="text-white/70 hover:text-white transition-colors duration-200">Pricing</a></li>
                                <li><a href="#" className="text-white/70 hover:text-white transition-colors duration-200">Steam Integration</a></li>
                                <li><a href="#" className="text-white/70 hover:text-white transition-colors duration-200">Discord Bot</a></li>
                                <li><a href="#" className="text-white/70 hover:text-white transition-colors duration-200">Mobile App</a></li>
                            </ul>
                        </div>

                        {/* Support Links */}
                        <div>
                            <h3 className="text-white font-semibold mb-4">Support</h3>
                            <ul className="space-y-2">
                                <li><a href="#" className="text-white/70 hover:text-white transition-colors duration-200">Help Center</a></li>
                                <li><a href="#" className="text-white/70 hover:text-white transition-colors duration-200">Community</a></li>
                                <li><a href="#" className="text-white/70 hover:text-white transition-colors duration-200">Contact Us</a></li>
                                <li><a href="#" className="text-white/70 hover:text-white transition-colors duration-200">Status</a></li>
                                <li><a href="#" className="text-white/70 hover:text-white transition-colors duration-200">Bug Reports</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center space-x-6 mb-4 md:mb-0">
                            <span className="text-white/60 text-sm">
                                © 2024 SquadUp. All rights reserved.
                            </span>
                        </div>
                        <div className="flex items-center space-x-6">
                            <a href="#" className="text-white/60 hover:text-white text-sm transition-colors duration-200">Privacy Policy</a>
                            <a href="#" className="text-white/60 hover:text-white text-sm transition-colors duration-200">Terms of Service</a>
                            <a href="#" className="text-white/60 hover:text-white text-sm transition-colors duration-200">Cookies</a>
                        </div>
                    </div>

                    {/* Developer Credit */}
                    <div className="text-center mt-6 pt-6 border-t border-white/10">
                        <p className="text-white/50 text-sm">
                            Made with <span className="text-red-400">❤️</span> by{" "}
                            <a 
                                href="http://www.4geeksacademy.com" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-coral-400 hover:text-coral-300 transition-colors duration-200"
                            >
                                4Geeks Academy
                            </a>
                        </p>
                        <p className="text-white/40 text-xs mt-2">
                            Check the{" "}
                            <a 
                                target="_blank" 
                                href="https://4geeks.com/docs/start/react-flask-template"
                                className="text-coral-400/70 hover:text-coral-300 transition-colors duration-200"
                            >
                                template documentation
                            </a>{" "}
                            for help.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};
