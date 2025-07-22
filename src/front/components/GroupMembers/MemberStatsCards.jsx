import React from 'react';

const MemberStatsCards = ({ members = [], loading = false }) => {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                        <div className="animate-pulse">
                            <div className="h-8 bg-white/20 rounded mb-2"></div>
                            <div className="h-4 bg-white/10 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    
    // Calculate stats
    const totalMembers = members.length;
    const steamConnectedCount = members.filter(m => m.steam_connected).length;
    const steamConnectedPercentage = totalMembers > 0 ? (steamConnectedCount / totalMembers) * 100 : 0;
    const averageGames = totalMembers > 0 ? 
        Math.round(members.reduce((sum, m) => sum + (m.total_games || 0), 0) / totalMembers) : 0;
    const creatorsCount = members.filter(m => m.is_creator).length;
    
    const stats = [
        {
            value: totalMembers,
            label: 'Total Members',
            color: 'text-coral-400',
            icon: '👥',
            description: 'Active group members'
        },
        {
            value: steamConnectedCount,
            label: 'Steam Connected',
            color: 'text-green-400',
            icon: '🎮',
            description: `${Math.round(steamConnectedPercentage)}% coverage`
        },
        {
            value: averageGames,
            label: 'Avg Games',
            color: 'text-purple-400',
            icon: '📚',
            description: 'Per member library'
        },
        {
            value: `${Math.round(steamConnectedPercentage)}%`,
            label: 'Steam Coverage',
            color: 'text-blue-400',
            icon: '📊',
            description: 'Group connectivity'
        }
    ];
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => (
                <div key={index} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 text-center hover:bg-white/15 transition-all duration-200">
                    <div className="flex items-center justify-center mb-2">
                        <span className="text-2xl mr-2">{stat.icon}</span>
                        <div className={`text-2xl font-bold ${stat.color}`}>
                            {stat.value}
                        </div>
                    </div>
                    <div className="text-white/70 text-sm font-medium mb-1">
                        {stat.label}
                    </div>
                    <div className="text-white/50 text-xs">
                        {stat.description}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MemberStatsCards;