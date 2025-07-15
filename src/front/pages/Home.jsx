import React, { useState } from 'react';
import { GamingAnimations, GamingCard, GamingLink } from '../components/GamingAnimations'; // ✅ CORRECT: Import shared components

export const Home = () => {
  const [activeTab, setActiveTab] = useState(null);
  
  const tabs = [
    { id: 'profile', label: 'Profile', description: 'Profile is where your account information is!' },
    { id: 'features', label: 'Features', description: 'The WebApp lets you connect your steam and it will find your existing games and match you with other gamers' },
    { id: 'gaming', label: 'Gaming', description: 'This WebApp lets you match with a friend and both of your steam profiles will have matching games and will let you vote on matched games found!' },
    { id: 'community', label: 'Community', description: 'Coming Soon!' }
  ];

  const toggleTab = (tabId) => {
    setActiveTab(activeTab === tabId ? null : tabId);
  };

  return (
    <GamingAnimations className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-12" data-animate="true">
          <h1 className="text-6xl font-black mb-4 magnetic">
            Squad<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Up</span>
          </h1>
          <p className="text-xl text-white/80 mb-8">
            Next-generation gaming platform with cutting-edge motion design
          </p>
        </div>

        <div className="flex justify-center mb-12 relative" data-animate="true">
          <div className="backdrop-blur-xl bg-white/10 border border-cyan-400/30 rounded-2xl p-2 flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => toggleTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 magnetic ${activeTab === tab.id ? 'bg-cyan-400 text-black' : 'text-white hover:bg-white/10'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab && (
          <div className="flex justify-center mb-12">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl max-w-2xl text-center transition-all duration-300 animate-fadeIn">
              <p className="text-white/90 text-lg">
                {tabs.find(t => t.id === activeTab)?.description}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <GamingCard>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 magnetic">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Smart Matching</h3>
              <p className="text-white/70 leading-relaxed">
                AI-powered game matching that analyzes your preferences and finds perfect squad mates.
              </p>
            </div>
          </GamingCard>
          <GamingCard>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 magnetic">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Real-time Sync</h3>
              <p className="text-white/70 leading-relaxed">
                Instant synchronization across all devices with seamless multiplayer coordination.
              </p>
            </div>
          </GamingCard>
          <GamingCard>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6 magnetic">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Lightning Fast</h3>
              <p className="text-white/70 leading-relaxed">
                Optimized performance with sub-millisecond response times for competitive gaming.
              </p>
            </div>
          </GamingCard>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-12" data-animate="true">
          <GamingLink variant="primary" to="/signup">Start Gaming</GamingLink>
          <GamingLink variant="neon" to="/demo">Try Demo</GamingLink>
          <GamingLink variant="ghost" to="/login">Sign In</GamingLink>
        </div>

        <GamingCard data-animate="true">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="magnetic">
              <div className="stat-number text-4xl font-black text-cyan-400 mb-2" data-target="1000000" data-suffix="+">0</div>
              <div className="text-white/70 text-sm uppercase tracking-wide">Active Players</div>
            </div>
            <div className="magnetic">
              <div className="stat-number text-4xl font-black text-purple-400 mb-2" data-target="50000" data-suffix="+">0</div>
              <div className="text-white/70 text-sm uppercase tracking-wide">Games Matched</div>
            </div>
            <div className="magnetic">
              <div className="stat-number text-4xl font-black text-green-400 mb-2" data-target="99" data-suffix="%">0</div>
              <div className="text-white/70 text-sm uppercase tracking-wide">Uptime</div>
            </div>
            <div className="magnetic">
              <div className="stat-number text-4xl font-black text-orange-400 mb-2" data-target="24" data-suffix="/7">0</div>
              <div className="text-white/70 text-sm uppercase tracking-wide">Support</div>
            </div>
          </div>
        </GamingCard>

        <div className="text-center mt-16" data-animate="true">
          <GamingCard className="magnetic">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-coral-500 to-marine-500">Squad Up</span>?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of gamers finding their perfect squad. Connect your Steam library, create groups, and vote on what to play next!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <GamingLink variant="primary" className="text-lg px-12 py-4" to="/signup">Get Started Free</GamingLink>
              <GamingLink variant="ghost" className="text-lg px-12 py-4" to="/demo">Watch Demo</GamingLink>
            </div>
          </GamingCard>
        </div>
      </div>
    </GamingAnimations>
  );
};