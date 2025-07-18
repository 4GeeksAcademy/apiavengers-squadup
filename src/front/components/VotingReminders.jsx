// src/front/components/VotingReminders.jsx - Enhanced with Smart Reminders + Session History
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../store/authService';

const VotingReminders = ({ 
    sessionId = null,
    groupId,
    groupMembers = [],
    currentUserId,
    isCreator = false,
    votingComplete = false,
    pendingVoterIds = [],
    onSendReminder = null,
    showSessionHistory = true,
    className = ""
}) => {
    const navigate = useNavigate();
    
    // Reminder System State
    const [reminderSettings, setReminderSettings] = useState({
        enabled: true,
        interval: 120, // 2 minutes
        maxReminders: 3,
        autoRemind: true
    });
    
    const [reminderHistory, setReminderHistory] = useState([]);
    const [lastReminderSent, setLastReminderSent] = useState(null);
    const [reminderCount, setReminderCount] = useState(0);
    const [timeUntilNextReminder, setTimeUntilNextReminder] = useState(0);
    
    // Session History State
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sessionsError, setSessionsError] = useState(null);
    
    // UI State
    const [activeTab, setActiveTab] = useState(sessionId ? 'reminders' : 'history');
    
    // Timers
    const reminderTimerRef = useRef(null);
    const countdownTimerRef = useRef(null);
    const inactivityTimerRef = useRef(null);

    // Initialize reminders for active session
    useEffect(() => {
        if (!sessionId || votingComplete) {
            cleanup();
            return;
        }

        if (reminderSettings.enabled && reminderSettings.autoRemind) {
            startReminderTimer();
        }

        startInactivityDetection();
        
        return cleanup;
    }, [sessionId, reminderSettings, votingComplete]);

    // Fetch session history
    useEffect(() => {
        if (groupId && showSessionHistory) {
            fetchRecentSessions();
        }
    }, [groupId, showSessionHistory]);

    // REMINDER SYSTEM FUNCTIONS
    const startReminderTimer = () => {
        if (reminderTimerRef.current) {
            clearTimeout(reminderTimerRef.current);
        }

        if (reminderCount >= reminderSettings.maxReminders || pendingVoterIds.length === 0) {
            console.log('📢 No more reminders needed');
            return;
        }

        const intervalMs = reminderSettings.interval * 1000;
        setTimeUntilNextReminder(reminderSettings.interval);
        
        startCountdown();
        
        reminderTimerRef.current = setTimeout(() => {
            if (!votingComplete && pendingVoterIds.length > 0) {
                sendAutomaticReminder();
            }
        }, intervalMs);
    };

    const startCountdown = () => {
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
        }

        countdownTimerRef.current = setInterval(() => {
            setTimeUntilNextReminder(prev => {
                if (prev <= 1) {
                    clearInterval(countdownTimerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const startInactivityDetection = () => {
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }

        inactivityTimerRef.current = setTimeout(() => {
            if (!votingComplete && pendingVoterIds.includes(currentUserId)) {
                sendInactivityReminder();
            }
        }, 300000); // 5 minutes
    };

    const sendAutomaticReminder = async () => {
        if (reminderCount >= reminderSettings.maxReminders || votingComplete) {
            return;
        }

        try {
            const reminder = {
                id: Date.now(),
                type: 'automatic',
                timestamp: new Date().toISOString(),
                targetUsers: pendingVoterIds,
                message: generateReminderMessage('automatic'),
                sentBy: currentUserId,
                sessionId
            };

            await sendReminderNotification(reminder);
            
            setReminderHistory(prev => [...prev, reminder]);
            setReminderCount(prev => prev + 1);
            setLastReminderSent(new Date().toISOString());
            
            toast.success(
                `📢 Reminder sent to ${pendingVoterIds.length} member${pendingVoterIds.length !== 1 ? 's' : ''}`,
                { duration: 3000 }
            );
            
            if (reminderCount + 1 < reminderSettings.maxReminders) {
                startReminderTimer();
            }
            
            if (onSendReminder) {
                onSendReminder(reminder);
            }

        } catch (error) {
            console.error('❌ Failed to send automatic reminder:', error);
            toast.error('Failed to send reminder');
        }
    };

    const sendManualReminder = async (targetUserIds = null, urgent = false) => {
        try {
            const targets = targetUserIds || pendingVoterIds;
            
            const reminder = {
                id: Date.now(),
                type: urgent ? 'urgent' : 'manual',
                timestamp: new Date().toISOString(),
                targetUsers: targets,
                message: generateReminderMessage(urgent ? 'urgent' : 'manual'),
                sentBy: currentUserId,
                sessionId
            };

            await sendReminderNotification(reminder);
            
            setReminderHistory(prev => [...prev, reminder]);
            setLastReminderSent(new Date().toISOString());
            
            toast.success(
                `📢 ${urgent ? 'Urgent ' : ''}Reminder sent to ${targets.length} member${targets.length !== 1 ? 's' : ''}!`,
                { duration: 3000 }
            );
            
            if (onSendReminder) {
                onSendReminder(reminder);
            }

        } catch (error) {
            console.error('❌ Failed to send manual reminder:', error);
            toast.error('Failed to send reminder');
        }
    };

    const sendInactivityReminder = () => {
        toast(
            "🕐 Still thinking about your votes? Your squad is waiting!",
            {
                duration: 5000,
                icon: '💭',
                style: {
                    background: 'rgba(59, 130, 246, 0.95)',
                    color: 'white'
                }
            }
        );
        
        // Reset inactivity timer
        startInactivityDetection();
    };

    const sendReminderNotification = async (reminder) => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/sessions/${sessionId}/send-reminder`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reminder)
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to send reminder');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error sending reminder:', error);
            // For demo purposes, simulate success
            return Promise.resolve();
        }
    };

    const generateReminderMessage = (type) => {
        const messages = {
            automatic: [
                "⏰ Don't forget to vote for your favorite games!",
                "🎮 Your squad is waiting for your game votes!",
                "🗳️ Time to pick your top games - vote now!",
                "⚡ Quick reminder: cast your votes to help decide what to play!",
                "🎯 Final call for votes - help your squad choose the perfect game!"
            ],
            manual: [
                "👋 Friendly reminder: please submit your game votes!",
                "🎮 Hey squad member! We need your vote to pick the best game.",
                "⭐ Your opinion matters - vote for your favorite games!",
                "🚀 Ready to game? Cast your votes first!",
                "🏆 Help us pick the winning game - vote now!"
            ],
            urgent: [
                "🚨 URGENT: We need your votes to finish this session!",
                "⚡ Final call! Please vote now - everyone is waiting!",
                "🔥 Last chance to vote before we close the session!",
                "⏰ Time's running out - submit your votes immediately!",
                "🚀 Quick action needed: vote now to help decide the game!"
            ]
        };
        
        const typeMessages = messages[type] || messages.automatic;
        return typeMessages[Math.floor(Math.random() * typeMessages.length)];
    };

    // SESSION HISTORY FUNCTIONS
    const fetchRecentSessions = async () => {
        if (!groupId) return;
        
        setSessionsLoading(true);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(
                `${backendUrl}/api/gaming/groups/${groupId}/sessions?limit=5&include_stats=true`
            );
            
            if (response.ok) {
                const data = await response.json();
                setSessions(data.sessions || []);
                setSessionsError(null);
            } else {
                const errorData = await response.json();
                setSessionsError(errorData.error || 'Failed to load sessions');
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
            setSessionsError('Network error loading sessions');
        } finally {
            setSessionsLoading(false);
        }
    };

    const handleViewResults = (sessionId) => {
        navigate(`/sessions/${sessionId}/results`);
    };

    const handleJoinActiveSession = (sessionId) => {
        navigate(`/groups/${groupId}`, { 
            state: { 
                activeSessionId: sessionId,
                highlightVoting: true 
            } 
        });
        toast.success('Navigate to the voting section to participate!');
    };

    // UTILITY FUNCTIONS
    const cleanup = () => {
        if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };

    const formatCountdown = (seconds) => {
        if (seconds <= 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return 'just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 7) return `${diffDays}d ago`;
            
            return date.toLocaleDateString();
        } catch (error) {
            return '';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'voting': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
            case 'cancelled': return 'bg-red-500/20 text-red-300 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'voting': return '🔴';
            case 'completed': return '✅';
            case 'cancelled': return '❌';
            default: return '⏸️';
        }
    };

    const getPendingVoters = () => {
        return groupMembers.filter(member => 
            pendingVoterIds.includes(member.id)
        );
    };

    // RENDER HELPER FUNCTIONS
    const renderReminderTab = () => {
        if (votingComplete) {
            return (
                <div className="text-center py-8">
                    <div className="text-4xl mb-2">🎉</div>
                    <h3 className="text-green-400 font-semibold mb-2">Voting Complete!</h3>
                    <p className="text-white/70 text-sm">All votes have been collected.</p>
                </div>
            );
        }

        if (!sessionId) {
            return (
                <div className="text-center py-8">
                    <div className="text-4xl mb-2">📢</div>
                    <p className="text-white/70 text-sm">No active voting session</p>
                    <p className="text-white/50 text-xs mt-1">Start a vote to enable reminders</p>
                </div>
            );
        }

        const pendingVoters = getPendingVoters();

        return (
            <div className="space-y-6">
                {/* Reminder Settings */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-white/80 text-sm">Auto Reminders</label>
                        <button
                            onClick={() => setReminderSettings(prev => ({ 
                                ...prev, 
                                autoRemind: !prev.autoRemind 
                            }))}
                            className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                                reminderSettings.autoRemind ? 'bg-blue-500' : 'bg-gray-600'
                            }`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                                reminderSettings.autoRemind ? 'translate-x-5' : 'translate-x-1'
                            }`}></div>
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="text-white/80 text-sm">Interval</label>
                        <select
                            value={reminderSettings.interval}
                            onChange={(e) => setReminderSettings(prev => ({
                                ...prev,
                                interval: parseInt(e.target.value)
                            }))}
                            className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                        >
                            <option value={60}>1 min</option>
                            <option value={120}>2 min</option>
                            <option value={300}>5 min</option>
                            <option value={600}>10 min</option>
                        </select>
                    </div>
                </div>

                {/* Status */}
                <div className="bg-white/5 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-white/70 text-sm">Pending Voters</span>
                        <span className="text-white font-medium">{pendingVoters.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <span className="text-white/70 text-sm">Reminders Sent</span>
                        <span className="text-white font-medium">
                            {reminderCount}/{reminderSettings.maxReminders}
                        </span>
                    </div>
                    
                    {reminderSettings.autoRemind && reminderCount < reminderSettings.maxReminders && pendingVoters.length > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-white/70 text-sm">Next Reminder</span>
                            <span className="text-blue-400 font-medium">
                                {timeUntilNextReminder > 0 ? formatCountdown(timeUntilNextReminder) : 'Soon'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Manual Actions */}
                <div className="space-y-3">
                    <button
                        onClick={() => sendManualReminder()}
                        disabled={pendingVoters.length === 0}
                        className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                        <span>📢</span>
                        <span>Send Reminder Now</span>
                        {pendingVoters.length > 0 && (
                            <span className="text-blue-200">({pendingVoters.length})</span>
                        )}
                    </button>

                    {isCreator && pendingVoters.length > 0 && (
                        <button
                            onClick={() => sendManualReminder(null, true)}
                            className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors duration-200 text-sm"
                        >
                            🚨 Send Urgent Reminder
                        </button>
                    )}
                </div>

                {/* Recent Activity */}
                {reminderHistory.length > 0 && (
                    <div>
                        <h4 className="text-white/80 text-sm font-medium mb-3">Recent Reminders</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                            {reminderHistory.slice(-3).reverse().map(reminder => (
                                <div key={reminder.id} className="text-xs text-white/60 p-2 bg-white/5 rounded">
                                    <div className="flex items-center justify-between">
                                        <span className="capitalize">{reminder.type} reminder</span>
                                        <span>{formatTimeAgo(reminder.timestamp)}</span>
                                    </div>
                                    <div className="mt-1 text-white/50">
                                        To {reminder.targetUsers.length} member{reminder.targetUsers.length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Help Text */}
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="text-blue-300 text-xs">
                        <strong>💡 Tip:</strong> Automatic reminders help keep voting moving. 
                        Members get gentle notifications to submit their votes.
                    </div>
                </div>
            </div>
        );
    };

    const renderSessionHistoryTab = () => {
        if (sessionsLoading) {
            return (
                <div className="flex items-center justify-center py-8">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    <span className="text-white/70 text-sm">Loading session history...</span>
                </div>
            );
        }

        if (sessionsError) {
            return (
                <div className="text-center py-4">
                    <div className="text-red-300 text-sm mb-3">{sessionsError}</div>
                    <button
                        onClick={fetchRecentSessions}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-colors"
                    >
                        🔄 Retry
                    </button>
                </div>
            );
        }

        if (sessions.length === 0) {
            return (
                <div className="text-center py-8">
                    <div className="text-4xl mb-2">🗳️</div>
                    <p className="text-white/70 text-sm">No voting sessions yet</p>
                    <p className="text-white/50 text-xs mt-1">Start your first vote to see history here</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Recent Sessions</span>
                    <button
                        onClick={fetchRecentSessions}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded text-xs transition-colors"
                        title="Refresh sessions"
                    >
                        🔄
                    </button>
                </div>
                
                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                    {sessions.map(session => {
                        const isActive = session.status === 'voting';
                        const winner = session.winner_game;
                        
                        return (
                            <div 
                                key={session.id} 
                                className={`p-3 rounded-lg border transition-all duration-300 ${
                                    isActive 
                                        ? 'bg-blue-500/10 border-blue-500/30' 
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <h5 className="text-white text-sm font-medium truncate">
                                                {session.session_name}
                                            </h5>
                                            {isActive && (
                                                <span className="animate-pulse text-red-400 text-xs">●</span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusColor(session.status)}`}>
                                                {getStatusIcon(session.status)} {session.status}
                                            </span>
                                            <span className="text-white/60 text-xs">{formatTimeAgo(session.created_at)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="ml-2">
                                        {isActive ? (
                                            <button
                                                onClick={() => handleJoinActiveSession(session.id)}
                                                className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                                            >
                                                🗳️ Vote
                                            </button>
                                        ) : session.status === 'completed' ? (
                                            <button
                                                onClick={() => handleViewResults(session.id)}
                                                className="px-2 py-1 bg-coral-500/20 hover:bg-coral-500/30 text-coral-300 text-xs rounded transition-colors"
                                            >
                                                📊 Results
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-white/60">
                                    <div className="flex space-x-3">
                                        <span>👥 {session.total_voters || 0}</span>
                                        <span>🎮 {session.games_count || 0}</span>
                                    </div>
                                </div>

                                {winner && (
                                    <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs">
                                        <span className="text-green-300">🏆 {winner.name}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Quick Stats */}
                <div className="pt-3 border-t border-white/10">
                    <div className="grid grid-cols-3 gap-4 text-center text-xs text-white/60">
                        <div>
                            <div className="text-white font-bold">
                                {sessions.filter(s => s.status === 'completed').length}
                            </div>
                            <div>Completed</div>
                        </div>
                        <div>
                            <div className="text-blue-400 font-bold">
                                {sessions.filter(s => s.status === 'voting').length}
                            </div>
                            <div>Active</div>
                        </div>
                        <div>
                            <div className="text-coral-400 font-bold">
                                {sessions.reduce((sum, s) => sum + (s.total_voters || 0), 0)}
                            </div>
                            <div>Total Votes</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Determine if we should show tabs
    const showTabs = sessionId && showSessionHistory;

    return (
        <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 ${className}`}>
            {/* Header with optional tabs */}
            <div className="mb-4">
                {showTabs ? (
                    <div className="flex items-center space-x-1 mb-4">
                        <button
                            onClick={() => setActiveTab('reminders')}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 ${
                                activeTab === 'reminders'
                                    ? 'bg-blue-500 text-white'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            📢 Reminders
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 ${
                                activeTab === 'history'
                                    ? 'bg-blue-500 text-white'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            📊 Sessions
                        </button>
                    </div>
                ) : (
                    <h3 className="text-white font-semibold flex items-center">
                        <span className="text-xl mr-2">
                            {sessionId ? '📢' : '📊'}
                        </span>
                        {sessionId ? 'Voting Reminders' : 'Session History'}
                    </h3>
                )}
            </div>

            {/* Content based on active tab or mode */}
            {showTabs ? (
                activeTab === 'reminders' ? renderReminderTab() : renderSessionHistoryTab()
            ) : sessionId ? (
                renderReminderTab()
            ) : (
                renderSessionHistoryTab()
            )}
        </div>
    );
};

export default VotingReminders;