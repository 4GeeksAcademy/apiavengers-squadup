import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../store/authService.js'
import useGlobalReducer from '../hooks/useGlobalReducer';
import { Navigate } from 'react-router-dom';
import { ConnectSteamButton } from "../components/ConnectSteamButton";

export const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        totalSessions: 0,
        totalVotes: 0,
        favoriteGame: 'None',
        winRate: 0
    });
    const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading]               = useState(true);
    const navigate   = useNavigate();
    const backendUrl = authService.getApiUrl();
    const { isAuthenticated } = useGlobalReducer();
    
    
useEffect(() => {
  let cancelled = false;

  const fetchAll = async () => {
    try {
      
      if (!storeUser) {
        const prof = await authService.makeAuthenticatedRequest(
          `${authService.getApiUrl()}/api/auth/profile`
        );

        if (!cancelled && prof.ok) {
          const { user } = await prof.json();
          setUser(user);
          dispatch({ type: 'SET_USER', payload: user }); // ✅ global cache
        }
      } else {
        setUser(storeUser);
      }


      if (!cancelled) {
          setStats({
            totalSessions : 12,
            totalVotes    : 47,
            favoriteGame  : 'Valorant',
            winRate       : 73
          });
        }

        if (!cancelled) {
          setRecentSessions([
            {
              id: 1,
              gameName    : 'Valorant',
              participants: ['You', 'Player2', 'Player3'],
              winner      : 'Valorant',
              date        : '2024-01-15',
              status      : 'completed'
            },
            {
              id: 2,
              gameName    : 'Apex Legends',
              participants: ['You', 'GamerTag1'],
              winner      : 'Apex Legends',
              date        : '2024-01-14',
              status      : 'completed'
            },
            {
              id: 3,
              gameName    : 'CS2',
              participants: ['You', 'Friend1', 'Friend2', 'Friend3'],
              winner      : 'Pending',
              date        : '2024-01-16',
              status      : 'active'
            }
          ]);
        }
      } catch (err) {
        console.error('Dashboard load failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();

    /* clean-up to avoid setState on unmounted component            */
    return () => { cancelled = true; };
  }, []);



const toSessions = () => navigate('/sessions');
const toProfile  = () => navigate('/profile');

    const createNewSession = () => {
        console.log('Create new session - implement later');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-white/70">Loading your dashboard...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4 pb-12">
            {/* Floating Particles Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(30)].map((_, i) => (
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

            <div className="max-w-6xl mx-auto relative z-10">
                
                {/* Welcome Header */}
                <div className="mb-8">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">
                                    Welcome back, {user?.username || 'Gamer'}! 🎮
                                </h1>
                                <p className="text-white/70">
                                    Ready to squad up and find your next gaming session?
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={toSessions}
                                    className="px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-coral-500/25 transition-all duration-300 transform hover:-translate-y-0.5"
                                >
                                    + New Session
                                </button>
                                <button
                                    onClick={toProfile}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all duration-300"
                                >
                                    Edit Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    
                    {/* Total Sessions */}
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl hover:bg-white/15 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Total Sessions</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats.totalSessions}</p>
                            </div>
                            <div className="w-12 h-12 bg-coral-500/20 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">🎯</span>
                            </div>
                        </div>
                    </div>

                    {/* Total Votes */}
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl hover:bg-white/15 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Total Votes</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats.totalVotes}</p>
                            </div>
                            <div className="w-12 h-12 bg-marine-500/20 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">🗳️</span>
                            </div>
                        </div>
                    </div>

                    {/* Win Rate */}
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl hover:bg-white/15 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Win Rate</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats.winRate}%</p>
                            </div>
                            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">🏆</span>
                            </div>
                        </div>
                    </div>

                    {/* Favorite Game */}
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl hover:bg-white/15 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Favorite Game</p>
                                <p className="text-xl font-bold text-white mt-1">{stats.favoriteGame}</p>
                            </div>
                            <div className="w-12 h-12 bg-lavender-500/20 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">⭐</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Recent Sessions */}
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Recent Sessions</h2>
                            <button
                                onClick={toSessions}
                                className="text-coral-400 hover:text-coral-300 font-medium text-sm transition-colors duration-200"
                            >
                                View All →
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {recentSessions.map((session) => (
                                <div key={session.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-white">{session.gameName}</h3>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                            session.status === 'completed' 
                                                ? 'bg-green-500/20 text-green-300' 
                                                : 'bg-yellow-500/20 text-yellow-300'
                                        }`}>
                                            {session.status === 'completed' ? 'Completed' : 'Active'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-white/70">
                                        <span>{session.participants.length} players</span>
                                        <span>{session.date}</span>
                                    </div>
                                    {session.status === 'completed' && (
                                        <div className="mt-2 text-sm">
                                            <span className="text-green-300">Winner: {session.winner}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {recentSessions.length === 0 && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🎮</span>
                                </div>
                                <p className="text-white/70 mb-4">No sessions yet</p>
                                <button
                                    onClick={createNewSession}
                                    className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg transition-colors duration-200"
                                >
                                    Create Your First Session
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions & Steam Integration */}
                    <div className="space-y-6">
                        
                        {/* Quick Actions */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                            <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
                            
                            <div className="space-y-4">
                                <button
                                    onClick={createNewSession}
                                    className="w-full p-4 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-coral-500/25"
                                >
                                    🎯 Create New Session
                                </button>
                                
                                <button className="w-full p-4 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center space-x-2">
                                    <span>👥</span>
                                    <span>Find Friends</span>
                                </button>
                                
                                <button className="w-full p-4 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center space-x-2">
                                    <span>🔍</span>
                                    <span>Browse Public Sessions</span>
                                </button>
                            </div>
                        </div>

                        {/* Steam Integration */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
                            <h2 className="text-2xl font-bold text-white mb-6">Steam Integration</h2>
                            
                            {user?.is_steam_connected ? (
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
                                        <div className="w-10 h-10 bg-green-500/30 rounded-full flex items-center justify-center">
                                            <span className="text-lg">✅</span>
                                        </div>
                                        <div>
                                            <p className="text-green-300 font-medium">Steam Connected</p>
                                            <p className="text-green-300/70 text-sm">Your game library is synced</p>
                                        </div>
                                    </div>
                                    
                                    <button className="w-full p-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all duration-300">
                                        🔄 Sync Game Library
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-center py-4">
                                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <span className="text-2xl">🎮</span>
                                        </div>
                                        <p className="text-white/70 mb-2">Connect your Steam account</p>
                                        <p className="text-white/50 text-sm">Access your game library and find sessions with games you own</p>
                                    </div>
                                   {/* Steam Integration */}
<div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
  <h2 className="text-2xl font-bold text-white mb-6">Steam Integration</h2>

  {user?.is_steam_connected ? (
    <>
      {/* already linked */}
      <div className="flex items-center space-x-3 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
        <div className="w-10 h-10 bg-green-500/30 rounded-full flex items-center justify-center">
          <span className="text-lg">✅</span>
        </div>
        <div>
          <p className="text-green-300 font-medium">Steam Connected</p>
          <p className="text-green-300/70 text-sm">Your game library is synced</p>
        </div>
      </div>

      <button
        /* TODO: add real handler when ready */
        className="w-full p-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium rounded-xl transition-all duration-300"
      >
        🔄 Sync Game Library
      </button>
    </>
  ) : (
    <ConnectSteamButton />
  )}
</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};