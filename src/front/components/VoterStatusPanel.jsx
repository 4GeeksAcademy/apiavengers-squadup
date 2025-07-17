// src/front/components/VoterStatusPanel.jsx - Real-time voter status with new actions
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { fetchSessionVoters, createLiveResultsStream, fetchSessionResults } from '../store/actions.js';
import useGlobalReducer from '../hooks/useGlobalReducer'; // Fixed: default import
import { getGamingSelectors, ACTION_TYPES } from '../store/store.js';
import Avatar from './Avatar';

const VoterStatusPanel = ({ sessionId, groupMembers = [] }) => {
    const { store, dispatch } = useGlobalReducer();
    const selectors = getGamingSelectors(store);
    
    // Local state
    const [voters, setVoters] = useState([]);
    const [pendingVoters, setPendingVoters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [liveResults, setLiveResults] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    
    // Refs
    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const mountedRef = useRef(true);

    // Global state
    const sessionVoters = selectors.getSessionVoters();
    const globalLiveResults = selectors.getLiveResults();
    const hasLiveConnection = selectors.hasLiveConnection();

    useEffect(() => {
        if (sessionId) {
            loadVoters();
            setupLiveConnection();
        }

        return () => {
            mountedRef.current = false;
            cleanup();
        };
    }, [sessionId]);

    const loadVoters = async () => {
        if (!sessionId) return;

        setLoading(true);
        try {
            const result = await fetchSessionVoters(dispatch, sessionId);
            
            if (result.success && mountedRef.current) {
                setVoters(result.voters);
                setPendingVoters(result.pendingVoters);
                
                // Update global state
                dispatch({
                    type: ACTION_TYPES.SET_SESSION_VOTERS,
                    payload: result.voters
                });
            }
        } catch (error) {
            console.error('Error loading voters:', error);
            if (mountedRef.current) {
                toast.error('Failed to load voter status');
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    };

    const setupLiveConnection = () => {
        if (!sessionId || eventSourceRef.current) return;

        try {
            setConnectionStatus('connecting');
            
            const eventSource = createLiveResultsStream(
                sessionId,
                handleLiveUpdate,
                handleConnectionError
            );

            if (eventSource) {
                eventSourceRef.current = eventSource;
                
                // Update global state
                dispatch({
                    type: ACTION_TYPES.SET_LIVE_RESULTS_SOURCE,
                    payload: eventSource
                });

                eventSource.onopen = () => {
                    if (mountedRef.current) {
                        setConnectionStatus('connected');
                        console.log('✅ Live results connection established');
                    }
                };

                eventSource.onerror = () => {
                    if (mountedRef.current) {
                        setConnectionStatus('error');
                        scheduleReconnect();
                    }
                };
            }
        } catch (error) {
            console.error('Error setting up live connection:', error);
            setConnectionStatus('error');
            scheduleReconnect();
        }
    };

    const handleLiveUpdate = (data) => {
        if (!mountedRef.current) return;

        try {
            setLiveResults(data);
            
            // Update global state
            dispatch({
                type: ACTION_TYPES.SET_LIVE_RESULTS,
                payload: data
            });

            // Update local voter counts if provided
            if (data.total_voters !== undefined) {
                // Refresh voter list if count changed significantly
                const currentVoterCount = voters.length;
                if (Math.abs(data.total_voters - currentVoterCount) > 0) {
                    loadVoters();
                }
            }

            // Show notifications for voting completion
            if (data.voting_complete && data.results && data.results.length > 0) {
                const winner = data.results[0];
                toast.success(`🎉 Voting complete! Winner: ${winner.game.name}`);
            }

        } catch (error) {
            console.error('Error handling live update:', error);
        }
    };

    const handleConnectionError = (error) => {
        if (!mountedRef.current) return;
        
        console.error('Live connection error:', error);
        setConnectionStatus('error');
        scheduleReconnect();
    };

    const scheduleReconnect = () => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && sessionId) {
                console.log('🔄 Attempting to reconnect live results...');
                cleanup();
                setupLiveConnection();
            }
        }, 5000); // Reconnect after 5 seconds
    };

    const cleanup = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Clear global state
        dispatch({ type: ACTION_TYPES.CLEAR_LIVE_RESULTS });
    };

    const handleRefreshVoters = async () => {
        await loadVoters();
        toast.success('Voter status refreshed');
    };

    const handleViewResults = async () => {
        try {
            const result = await fetchSessionResults(dispatch, sessionId);
            if (result.success) {
                // Results would be displayed in a modal or navigate to results page
                toast.info('Results loaded - implement results modal/page');
            }
        } catch (error) {
            toast.error('Failed to load results');
        }
    };

    // Calculate stats
    const totalMembers = groupMembers.length || (voters.length + pendingVoters.length);
    const votedCount = voters.length;
    const pendingCount = pendingVoters.length;
    const participationRate = totalMembers > 0 ? (votedCount / totalMembers) * 100 : 0;
    
    // Use live results or local state
    const currentResults = globalLiveResults || liveResults;
    const votingComplete = currentResults?.voting_complete || false;

    if (loading && voters.length === 0) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-3 border-coral-500/30 border-t-coral-500 rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Connection Status */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center">
                        <span className="text-xl mr-2">📊</span>
                        Voting Status
                    </h3>
                    
                    <div className="flex items-center space-x-2">
                        {/* Live connection indicator */}
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                            connectionStatus === 'connected' 
                                ? 'bg-green-500/20 text-green-300'
                                : connectionStatus === 'connecting'
                                ? 'bg-yellow-500/20 text-yellow-300'
                                : 'bg-red-500/20 text-red-300'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${
                                connectionStatus === 'connected' 
                                    ? 'bg-green-400 animate-pulse'
                                    : connectionStatus === 'connecting'
                                    ? 'bg-yellow-400 animate-spin'
                                    : 'bg-red-400'
                            }`}></span>
                            <span>
                                {connectionStatus === 'connected' ? 'Live' :
                                 connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}
                            </span>
                        </div>
                        
                        <button
                            onClick={handleRefreshVoters}
                            className="p-1 text-white/60 hover:text-white transition-colors"
                            title="Refresh voter status"
                        >
                            <span className="text-sm">🔄</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Voting Progress */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">Participation Progress</span>
                        <span className="text-white/60 text-sm">{votedCount}/{totalMembers} voted</span>
                    </div>
                    
                    <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                        <div 
                            className={`h-4 rounded-full transition-all duration-500 ${
                                votingComplete 
                                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                                    : 'bg-gradient-to-r from-coral-500 to-coral-600'
                            }`}
                            style={{ width: `${Math.min(participationRate, 100)}%` }}
                        >
                            {participationRate >= 20 && (
                                <div className="flex items-center justify-center h-full text-white text-xs font-bold">
                                    {Math.round(participationRate)}%
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex justify-between mt-2 text-xs">
                        <span className="text-white/60">
                            {participationRate < 50 ? '🔴 Low' : 
                             participationRate < 80 ? '🟡 Good' : '🟢 Excellent'} participation
                        </span>
                        <span className="text-white/60">
                            {votingComplete ? '✅ Complete' : `${pendingCount} pending`}
                        </span>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                        <div className="text-lg font-bold text-green-400">{votedCount}</div>
                        <div className="text-white/60 text-xs">Voted</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-yellow-400">{pendingCount}</div>
                        <div className="text-white/60 text-xs">Pending</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-blue-400">{totalMembers}</div>
                        <div className="text-white/60 text-xs">Total</div>
                    </div>
                </div>
            </div>

            {/* Voters List */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h4 className="font-bold text-white flex items-center justify-between">
                        <span>Member Status</span>
                        {currentResults && (
                            <button
                                onClick={handleViewResults}
                                className="text-xs px-2 py-1 bg-coral-500/20 text-coral-300 border border-coral-500/30 rounded-full hover:bg-coral-500/30 transition-colors"
                            >
                                View Results
                            </button>
                        )}
                    </h4>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                    {/* Voted Members */}
                    {voters.map(voter => (
                        <div key={voter.user_id} className="flex items-center justify-between p-3 border-b border-white/5 last:border-b-0">
                            <div className="flex items-center space-x-3">
                                <div className="relative">
                                    <img 
                                        src={voter.avatar_url || `https://ui-avatars.com/api/?name=${voter.username}&background=coral&color=fff`}
                                        alt={voter.username}
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border border-slate-800 rounded-full"></div>
                                </div>
                                <div>
                                    <div className="text-white font-medium text-sm">{voter.username}</div>
                                    <div className="text-green-300 text-xs">
                                        ✓ {voter.vote_count} vote{voter.vote_count !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            </div>
                            <div className="text-green-400 text-xs">
                                Done
                            </div>
                        </div>
                    ))}
                    
                    {/* Pending Members */}
                    {pendingVoters.map(pending => (
                        <div key={pending.user_id} className="flex items-center justify-between p-3 border-b border-white/5 last:border-b-0 opacity-60">
                            <div className="flex items-center space-x-3">
                                <div className="relative">
                                    <img 
                                        src={pending.avatar_url || `https://ui-avatars.com/api/?name=${pending.username}&background=gray&color=fff`}
                                        alt={pending.username}
                                        className="w-8 h-8 rounded-full grayscale"
                                    />
                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gray-500 border border-slate-800 rounded-full"></div>
                                </div>
                                <div>
                                    <div className="text-white/70 font-medium text-sm">{pending.username}</div>
                                    <div className="text-white/50 text-xs">Waiting to vote...</div>
                                </div>
                            </div>
                            <div className="text-yellow-400 text-xs">
                                Pending
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {voters.length === 0 && pendingVoters.length === 0 && !loading && (
                    <div className="p-8 text-center">
                        <div className="text-4xl mb-2">🗳️</div>
                        <div className="text-white/60 text-sm">No voter data available</div>
                    </div>
                )}
            </div>

            {/* Live Results Preview */}
            {currentResults && currentResults.results && currentResults.results.length > 0 && (
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-white text-sm">Live Results</h4>
                        <span className="text-xs text-white/60">
                            {currentResults.timestamp ? new Date(currentResults.timestamp).toLocaleTimeString() : 'Live'}
                        </span>
                    </div>
                    
                    <div className="space-y-2">
                        {currentResults.results.slice(0, 3).map((result, index) => (
                            <div key={result.game.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <span className={`text-xs font-bold ${
                                        index === 0 ? 'text-yellow-400' :
                                        index === 1 ? 'text-gray-300' :
                                        'text-orange-400'
                                    }`}>
                                        #{index + 1}
                                    </span>
                                    <span className="text-white text-sm font-medium truncate">
                                        {result.game.name}
                                    </span>
                                </div>
                                <div className="text-coral-400 font-bold text-sm">
                                    {result.total_points} pts
                                </div>
                            </div>
                        ))}
                        
                        {currentResults.results.length > 3 && (
                            <div className="text-center text-white/60 text-xs py-1">
                                +{currentResults.results.length - 3} more games
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoterStatusPanel;