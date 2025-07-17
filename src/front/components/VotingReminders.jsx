// src/front/components/VotingReminders.jsx - NEW COMPONENT
import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';

const VotingReminders = ({ 
    pendingVoters = [], 
    timeRemaining = null, 
    onSendReminder = null,
    className = "" 
}) => {
    const [remindersSent, setRemindersSent] = useState(new Set());
    const [timeLeft, setTimeLeft] = useState(timeRemaining);

    // Update time left every minute
    useEffect(() => {
        if (!timeRemaining) return;

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev && prev > 60000) { // More than 1 minute left
                    return prev - 60000;
                } else {
                    clearInterval(interval);
                    return 0;
                }
            });
        }, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [timeRemaining]);

    const formatTimeRemaining = (ms) => {
        if (!ms || ms <= 0) return null;
        
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h remaining`;
        if (hours > 0) return `${hours}h ${minutes % 60}m remaining`;
        if (minutes > 0) return `${minutes}m remaining`;
        return 'Less than 1m remaining';
    };

    const handleSendReminder = async (voterId) => {
        if (onSendReminder) {
            try {
                await onSendReminder(voterId);
                setRemindersSent(prev => new Set([...prev, voterId]));
            } catch (error) {
                console.error('Failed to send reminder:', error);
            }
        }
    };

    const getUrgencyLevel = () => {
        if (!timeLeft) return 'normal';
        
        const hours = timeLeft / (1000 * 60 * 60);
        if (hours < 1) return 'urgent';
        if (hours < 6) return 'warning';
        return 'normal';
    };

    const urgency = getUrgencyLevel();
    const formattedTime = formatTimeRemaining(timeLeft);

    if (pendingVoters.length === 0) return null;

    return (
        <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-semibold flex items-center">
                    <span className="text-xl mr-2">⏰</span>
                    Waiting for Votes
                </h4>
                {formattedTime && (
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        urgency === 'urgent' 
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse' 
                            : urgency === 'warning'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                        {formattedTime}
                    </div>
                )}
            </div>

            {/* Time Warning */}
            {urgency === 'urgent' && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                    <div className="flex items-center space-x-2">
                        <span className="text-red-400 text-lg animate-pulse">🚨</span>
                        <div>
                            <p className="text-red-300 font-semibold text-sm">Voting closes soon!</p>
                            <p className="text-red-200 text-xs">Encourage your squad to vote now.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Voters List */}
            <div className="space-y-3">
                <p className="text-white/70 text-sm mb-3">
                    Still waiting for {pendingVoters.length} member{pendingVoters.length !== 1 ? 's' : ''}:
                </p>
                
                <div className="grid grid-cols-1 gap-2">
                    {pendingVoters.map(voter => {
                        const reminderSent = remindersSent.has(voter.id);
                        
                        return (
                            <div 
                                key={voter.id} 
                                className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-200"
                            >
                                <div className="flex items-center space-x-3">
                                    <Avatar name={voter.username} size={28} />
                                    <div>
                                        <span className="text-white font-medium">{voter.username}</span>
                                        <div className="text-white/60 text-xs">
                                            {voter.steam_connected ? '🎮 Steam connected' : '❌ No Steam'}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    {reminderSent ? (
                                        <span className="text-green-400 text-xs flex items-center space-x-1">
                                            <span>✅</span>
                                            <span>Reminded</span>
                                        </span>
                                    ) : onSendReminder ? (
                                        <button
                                            onClick={() => handleSendReminder(voter.id)}
                                            className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 rounded text-xs transition-colors duration-200"
                                            title="Send reminder"
                                        >
                                            📧 Remind
                                        </button>
                                    ) : null}
                                    
                                    <span className="text-yellow-400 animate-pulse">⏳</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex flex-wrap gap-2 justify-center">
                    <button
                        onClick={() => {
                            // Copy a reminder message to clipboard
                            const message = `🗳️ Don't forget to vote in our SquadUp session! ${pendingVoters.length} members still need to vote. ${formattedTime ? `Time remaining: ${formattedTime}` : ''}`;
                            navigator.clipboard.writeText(message);
                        }}
                        className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-lg text-xs transition-colors duration-200"
                    >
                        📋 Copy Reminder
                    </button>
                    
                    {onSendReminder && (
                        <button
                            onClick={() => {
                                // Send reminder to all pending voters
                                pendingVoters.forEach(voter => {
                                    if (!remindersSent.has(voter.id)) {
                                        handleSendReminder(voter.id);
                                    }
                                });
                            }}
                            className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 rounded-lg text-xs transition-colors duration-200"
                            disabled={pendingVoters.every(voter => remindersSent.has(voter.id))}
                        >
                            📢 Remind All
                        </button>
                    )}
                </div>
            </div>

            {/* Tips */}
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-xs flex items-start space-x-2">
                    <span className="text-blue-400 mt-0.5">💡</span>
                    <span>
                        Tip: Share the group invite link or remind members in your Discord/chat. 
                        Voting works best when everyone participates!
                    </span>
                </p>
            </div>
        </div>
    );
};

export default VotingReminders;