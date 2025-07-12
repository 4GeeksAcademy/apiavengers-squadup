import React from 'react';
import { useLocation, Link } from 'react-router-dom'; // ✅ Import Link
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const Footer = () => {
    const location = useLocation();
    
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
                                {/* These can remain buttons as they likely trigger actions, not navigation */}
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
                                {/* ✅ FIXED: Replaced <a> with <Link> */}
                                <li><Link to="#" className="text-white/70 hover:text-white transition-colors duration-200">Features</Link></li>
                                <li><Link to="#" className="text-white/70 hover:text-white transition-colors duration-200">Pricing</Link></li>
                                <li><Link to="#" className="text-white/70 hover:text-white transition-colors duration-200">Steam Integration</Link></li>
                                <li><Link to="#" className="text-white/70 hover:text-white transition-colors duration-200">Discord Bot</Link></li>
                                <li><Link to="#" className="text-white/70 hover:text-white transition-colors duration-200">Mobile App</Link></li>
                            </ul>
                        </div>

                        {/* Support Links */}
                        <div>
                            <h3 className="text-white font-semibold mb-4">Support</h3>
                            <ul className="space-y-2">
                                {/* ✅ FIXED: Replaced <a> with <Link> */}
                                <li><Link to="#" className="text-white/70 hover:text-white transition-colors duration-200">Help Center</Link></li>
                                <li><Link to="#" className="text-white/70 hover:text-white transition-colors duration-200">Community</Link></li>
                                <li><Link to="#" className="text-white/70 hover:text-white transition-colors duration-200">Contact Us</Link></li>
                                <li><Link to="#" className="text-white/70 hover:text-white transition-colors duration-200">Status</Link></li>
                                <li><Link to="#" className="text-white/70 hover:text-white transition-colors duration-200">Bug Reports</Link></li>
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
                            {/* ✅ FIXED: Replaced <a> with <Link> */}
                            <Link to="#" className="text-white/60 hover:text-white text-sm transition-colors duration-200">Privacy Policy</Link>
                            <Link to="#" className="text-white/60 hover:text-white text-sm transition-colors duration-200">Terms of Service</Link>
                            <Link to="#" className="text-white/60 hover:text-white text-sm transition-colors duration-200">Cookies</Link>
                        </div>
                    </div>

                    {/* Developer Credit - External links remain <a> tags */}
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