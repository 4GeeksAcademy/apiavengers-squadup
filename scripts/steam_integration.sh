#!/bin/bash

echo "🎮 EnhancedSteamFeatures Integration Plan"
echo "========================================"

# Step 1: Copy the EnhancedSteamFeatures component
echo "📁 Step 1: Setting up EnhancedSteamFeatures component..."
mkdir -p src/front/components/Steam
cp paste.txt src/front/components/Steam/EnhancedSteamFeatures.jsx
echo "✅ EnhancedSteamFeatures.jsx copied to Steam directory"

# Step 2: Create a new GroupGamingTab component for dedicated gaming features
echo "🎮 Step 2: Creating dedicated GroupGamingTab component..."
cat > src/front/components/GroupGamingTab.jsx << 'GAMING_EOF'
// src/front/components/GroupGamingTab.jsx - Dedicated gaming features tab
import React, { useState, useEffect } from 'react';
import EnhancedSteamFeatures from './Steam/EnhancedSteamFeatures';
import { GamingCard } from './GamingAnimations';

const GroupGamingTab = ({ group, members, user }) => {
    const [steamStats, setSteamStats] = useState({
        connected: 0,
        total: 0,
        coverage: 0
    });

    useEffect(() => {
        if (members?.length > 0) {
            const connected = members.filter(m => m.steam_connected).length;
            const total = members.length;
            setSteamStats({
                connected,
                total,
                coverage: total > 0 ? (connected / total) * 100 : 0
            });
        }
    }, [members]);

    if (!group || !members) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-white/70">Loading gaming features...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Gaming Header */}
            <GamingCard className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">
                    🎮 Gaming Hub
                </h2>
                <p className="text-white/70">
                    Find common games, check Steam connectivity, and start your gaming sessions
                </p>
            </GamingCard>

            {/* Enhanced Steam Features - Full Dashboard */}
            <EnhancedSteamFeatures 
                groupMembers={members} 
                groupId={group.id}
                variant="full"
            />

            {/* Additional Gaming Features */}
            {steamStats.connected >= 2 && (
                <GamingCard>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                        <span className="mr-2">🎲</span>
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button className="p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-white/20 hover:border-white/40 transition-colors">
                            <div className="text-lg font-bold text-white">🗳️ Start Vote</div>
                            <div className="text-white/70 text-sm">Vote on games to play</div>
                        </button>
                        <button className="p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg border border-white/20 hover:border-white/40 transition-colors">
                            <div className="text-lg font-bold text-white">🔄 Sync All</div>
                            <div className="text-white/70 text-sm">Sync everyone's libraries</div>
                        </button>
                    </div>
                </GamingCard>
            )}

            {/* Gaming Tips */}
            {steamStats.coverage < 50 && (
                <GamingCard className="border-yellow-500/30 bg-yellow-500/10">
                    <h3 className="text-lg font-bold text-yellow-300 mb-3">
                        💡 Boost Your Gaming Experience
                    </h3>
                    <div className="space-y-2 text-yellow-200/80 text-sm">
                        <p>• Get more members to connect their Steam accounts ({steamStats.connected}/{steamStats.total} connected)</p>
                        <p>• Ensure Steam profiles are public or friend each other</p>
                        <p>• Sync libraries regularly for the best game recommendations</p>
                        <p>• Use voting features to decide what to play together</p>
                    </div>
                </GamingCard>
            )}
        </div>
    );
};

export default GroupGamingTab;
GAMING_EOF

echo "✅ Created GroupGamingTab.jsx"

# Step 3: Verification
echo "📋 Step 3: Verification"
echo ""
echo "✅ Files Created/Updated:"
ls -la src/front/components/Steam/EnhancedSteamFeatures.jsx 2>/dev/null && echo "  📄 EnhancedSteamFeatures.jsx" || echo "  ❌ EnhancedSteamFeatures.jsx - FAILED"
ls -la src/front/components/GroupGamingTab.jsx 2>/dev/null && echo "  📄 GroupGamingTab.jsx" || echo "  ❌ GroupGamingTab.jsx - FAILED"

echo ""
echo "🎯 Integration Points Available:"
echo "  • GroupMembersTab.jsx - Can add: import EnhancedSteamFeatures from './Steam/EnhancedSteamFeatures'"
echo "  • GroupGamingTab.jsx - NEW dedicated gaming hub"
echo "  • LiveVotingSession.jsx - Can add Steam dashboard during voting"
echo ""
echo "📁 Current Steam Files:"
find src/front/components -name "*Steam*" -type f 2>/dev/null
echo ""
echo "🚀 Next Steps:"
echo "1. Test the new components in your app"
echo "2. Add GroupGamingTab to your group page navigation"
echo "3. Import and use EnhancedSteamFeatures in existing components"
echo ""
echo "💡 Quick Usage Example:"
echo "  import EnhancedSteamFeatures from './Steam/EnhancedSteamFeatures';"
echo "  <EnhancedSteamFeatures groupMembers={members} groupId={groupId} variant=\"full\" />"
echo ""
echo "🎮 Integration complete! Ready to enhance your gaming features!"
