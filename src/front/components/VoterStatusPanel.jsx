import React from 'react';

const VoterStatusPanel = ({ session, members = [], votes = [], className = '' }) => {
    if (!session) return null;

    const totalMembers = members.length;
    const votersCount = votes.length;
    const participationRate = totalMembers > 0 ? (votersCount / totalMembers) * 100 : 0;

    return (
        <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 ${className}`}>
            <h3 className="text-lg font-bold text-white mb-4">📊 Voting Status</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <div className="text-2xl font-bold text-coral-400">{votersCount}</div>
                    <div className="text-white/70 text-sm">Voted</div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-blue-400">{totalMembers - votersCount}</div>
                    <div className="text-white/70 text-sm">Pending</div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-green-400">{Math.round(participationRate)}%</div>
                    <div className="text-white/70 text-sm">Participation</div>
                </div>
            </div>
        </div>
    );
};

export default VoterStatusPanel;
