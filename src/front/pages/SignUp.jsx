import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// You still need these components if you created them
import InteractiveBackground from '../components/InteractiveBackground';
import MagneticButton from '../components/MagneticButton';

export const SignUp = () => {
    const [formData, setFormData] = useState({ email: '', username: '', password: '', confirmPassword: '' });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    // Framer Motion animation variants for a staggered, modern feel
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { 
            y: 0, 
            opacity: 1,
            transition: { type: 'spring', stiffness: 100 }
        }
    };

    return (
        <div className="min-h-screen w-full grid place-items-center p-4 relative overflow-hidden">
            <InteractiveBackground />
            
            <motion.div 
                className="w-full max-w-md"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* This card uses the new classes, e.g., bg-dark-800, border-dark-700 */}
                <div className="relative z-10 backdrop-blur-2xl bg-dark-800/60 border border-dark-700 rounded-3xl p-8 shadow-2xl shadow-brand/5">
                    
                    <motion.div variants={itemVariants} className="text-center mb-8">
                        <h1 className="font-display text-4xl font-bold text-white mb-2">
                            Join the Squad
                        </h1>
                        <p className="text-neutral-text-muted">
                            Start your journey in the ultimate gaming universe.
                        </p>
                    </motion.div>

                    <form className="space-y-5">
                        <motion.div variants={itemVariants} className="space-y-2">
                            <label className="text-sm font-medium text-neutral-text-muted">Email Address</label>
                            <input type="email" placeholder="you@squadup.com" className="w-full p-3 bg-dark-900/70 border border-dark-700 rounded-lg text-white placeholder:text-dark-600 focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-300" />
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-2">
                            <label className="text-sm font-medium text-neutral-text-muted">Username</label>
                            <input type="text" placeholder="your_gamer_tag" className="w-full p-3 bg-dark-900/70 border border-dark-700 rounded-lg text-white placeholder:text-dark-600 focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-300" />
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-2">
                            <label className="text-sm font-medium text-neutral-text-muted">Password</label>
                            <input type="password" placeholder="••••••••" className="w-full p-3 bg-dark-900/70 border border-dark-700 rounded-lg text-white placeholder:text-dark-600 focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-300" />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <MagneticButton
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 mt-2 font-bold text-white bg-brand hover:bg-brand-hover rounded-lg shadow-lg shadow-brand/20 hover:shadow-brand/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Creating Account...' : 'Create Account & Enter'}
                            </MagneticButton>
                        </motion.div>
                    </form>

                    <motion.div variants={itemVariants} className="mt-8 text-center text-sm text-neutral-text-muted">
                        <p>
                            Already have an account?{' '}
                            <Link to="/login" className="font-bold text-brand hover:underline">
                                Sign In
                            </Link>
                        </p>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};