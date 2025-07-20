// src/front/components/VotingReminders.jsx - Voting reminders and notifications

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const VotingReminders = ({ 
    session, 
    userHasVoted, 
    timeRemaining,
    onVoteNow,
    onDismiss,
    className = "" 
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [reminderType, setReminderType] = useState('gentle');

    useEffect(() => {
        if (!session || userHasVoted || session.status !== 'voting') {
            setIsVisible(false);
            return;
        }

        // Show reminders based on time remaining and urgency
        if (timeRemaining) {
            if (timeRemaining < 60000) { // Less than 1 minute
                setReminderType('urgent');
                setIsVisible(true);
            } else if (timeRemaining < 300000) { // Less than 5 minutes
                setReminderType('moderate');
                setIsVisible(true);
            } else {
                setReminderType('gentle');
                setIsVisible(true);
            }
        } else {
            setIsVisible(true);
        }
    }, [session, userHasVoted, timeRemaining]);

    const formatTimeRemaining = (ms) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    };

    const getReminderConfig = () => {
        switch (reminderType) {
            case 'urgent':
                return {
                    bgColor: 'bg-red-500/20',
                    borderColor: 'border-red-500/50',
                    iconColor: 'text-red-400',
                    icon: '🚨',
                    title: 'Vote Now!',
                    message: 'Voting ends soon - cast your vote now!',
                    buttonColor: 'bg-red-500 hover:bg-red-600'
                };
            case 'moderate':
                return {
                    bgColor: 'bg-yellow-500/20',
                    borderColor: 'border-yellow-500/50',
                    iconColor: 'text-yellow-400',
                    icon: '⏰',
                    title: 'Reminder to Vote',
                    message: 'Don\'t forget to cast your vote!',
                    buttonColor: 'bg-yellow-500 hover:bg-yellow-600'
                };
            default:
                return {
                    bgColor: 'bg-blue-500/20',
                    borderColor: 'border-blue-500/50',
                    iconColor: 'text-blue-400',
                    icon: '🗳️',
                    title: 'Time to Vote!',
                    message: 'A new voting session has started.',
                    buttonColor: 'bg-blue-500 hover:bg-blue-600'
                };
        }
    };

    const config = getReminderConfig();

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.9 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`fixed top-20 right-4 z-50 max-w-sm ${className}`}
            >
                <div className={`
                    ${config.bgColor} ${config.borderColor}
                    backdrop-blur-xl border rounded-xl p-4 shadow-2xl
                    transform transition-all duration-300
                `}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                            <span className={`text-xl ${config.iconColor}`}>
                                {config.icon}
                            </span>
                            <h3 className="font-semibold text-white">
                                {config.title}
                            </h3>
                        </div>
                        
                        <button
                            onClick={() => {
                                setIsVisible(false);
                                onDismiss?.();
                            }}
                            className="text-white/60 hover:text-white/80 transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Message */}
                    <p className="text-white/80 text-sm mb-3">
                        {config.message}
                    </p>

                    {/* Session Info */}
                    {session && (
                        <div className="bg-white/10 rounded-lg p-2 mb-3 text-xs text-white/70">
                            <div className="flex justify-between">
                                <span>Session:</span>
                                <span className="font-medium">
                                    {session.session_name || 'Quick Vote'}
                                </span>
                            </div>
                            {timeRemaining && (
                                <div className="flex justify-between mt-1">
                                    <span>Time left:</span>
                                    <span className={`font-medium ${reminderType === 'urgent' ? 'text-red-300' : ''}`}>
                                        {formatTimeRemaining(timeRemaining)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                        <button
                            onClick={() => {
                                setIsVisible(false);
                                onVoteNow?.();
                            }}
                            className={`
                                flex-1 px-3 py-2 ${config.buttonColor} text-white 
                                rounded-lg font-medium text-sm transition-colors
                                transform hover:scale-105
                            `}
                        >
                            Vote Now
                        </button>
                        
                        <button
                            onClick={() => {
                                setIsVisible(false);
                                onDismiss?.();
                            }}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-sm transition-colors"
                        >
                            Later
                        </button>
                    </div>

                    {/* Progress indicator if urgency */}
                    {reminderType === 'urgent' && timeRemaining && (
                        <div className="mt-3">
                            <div className="w-full bg-white/20 rounded-full h-1">
                                <motion.div
                                    className="h-1 bg-red-400 rounded-full"
                                    initial={{ width: "100%" }}
                                    animate={{ width: "0%" }}
                                    transition={{ duration: timeRemaining / 1000, ease: "linear" }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

// Hook for managing voting reminders
export const useVotingReminders = (session, userHasVoted) => {
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [showReminder, setShowReminder] = useState(false);

    useEffect(() => {
        if (!session || userHasVoted || session.status !== 'voting') {
            setShowReminder(false);
            return;
        }

        // Calculate time remaining (if session has an end time)
        if (session.end_time) {
            const endTime = new Date(session.end_time).getTime();
            const now = Date.now();
            const remaining = endTime - now;

            if (remaining > 0) {
                setTimeRemaining(remaining);
                setShowReminder(true);

                // Update countdown
                const interval = setInterval(() => {
                    const newRemaining = endTime - Date.now();
                    if (newRemaining <= 0) {
                        setTimeRemaining(0);
                        setShowReminder(false);
                        clearInterval(interval);
                    } else {
                        setTimeRemaining(newRemaining);
                    }
                }, 1000);

                return () => clearInterval(interval);
            }
        } else {
            // No end time, show reminder anyway
            setShowReminder(true);
        }
    }, [session, userHasVoted]);

    return {
        showReminder,
        timeRemaining,
        hideReminder: () => setShowReminder(false)
    };
};

export default VotingReminders;