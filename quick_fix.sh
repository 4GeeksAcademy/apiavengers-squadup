#!/bin/bash
echo "🔧 Quick Fixes for SquadUp Issues"
echo "================================="

# Fix 1: Update the comment in VotingStatusPanel.jsx
echo "📝 Fixing VotingStatusPanel.jsx comment..."
sed -i 's/\/\/ Merges VotersStatusPanel\.jsx and LiveMembersStatus\.jsx into single component/\/\/ Combines VotingStatusPanel and LiveMembersStatus into single component/' src/front/components/VotingStatusPanel.jsx
echo "✅ Fixed VotingStatusPanel.jsx comment"

# Fix 2: Remove SteamProgressBar from GroupMembersTab.jsx  
echo "🗑️  Removing SteamProgressBar from GroupMembersTab.jsx..."
cp src/front/components/GroupMembersTab.jsx src/front/components/GroupMembersTab.jsx.backup
grep -v "SteamProgressBar" src/front/components/GroupMembersTab.jsx.backup > src/front/components/GroupMembersTab.jsx.temp
mv src/front/components/GroupMembersTab.jsx.temp src/front/components/GroupMembersTab.jsx
echo "✅ Removed SteamProgressBar references"

# Fix 3: Ensure Steam directory exists
mkdir -p src/front/components/Steam
echo "✅ Steam directory ready"

echo "🎯 Verification:"
grep -r "VotersStatusPanel\|SteamProgressBar" src/front/ --include="*.jsx" --include="*.js" | grep -v backup || echo "✅ All references cleaned up!"
