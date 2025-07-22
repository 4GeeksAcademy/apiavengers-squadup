import React from 'react';
import MemberCard from './MemberCard';
import LoadingState from '../LoadingState';

const MembersList = ({ 
    members = [], 
    currentUser, 
    isCreator, 
    onKick, 
    onTransferOwnership, 
    actionLoading = {},
    loading = false,
    searchTerm = '',
    filter = 'all'
}) => {
    if (loading) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-12">
                <LoadingState message="Loading members..." />
            </div>
        );
    }
    
    if (members.length === 0) {
        return (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-12 text-center">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl font-bold text-white mb-2">
                    {searchTerm ? `No members match "${searchTerm}"` : 
                     filter === 'steam' ? 'No Steam Connected Members' : 
                     filter === 'no-steam' ? 'All Members Have Steam Connected' :
                     'No Members Found'}
                </h3>
                <p className="text-white/60 mb-6">
                    {searchTerm ? 'Try adjusting your search terms.' :
                     filter === 'steam' ? 'Encourage members to connect their Steam accounts.' :
                     filter === 'no-steam' ? 'Great! All members have Steam connected.' :
                     'This group appears to be empty.'}
                </p>
                {(searchTerm || filter !== 'all') && (
                    <button
                        onClick={() => {
                            // This would need to be passed down as props
                            console.log('Clear filters requested');
                        }}
                        className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg transition-colors duration-200"
                    >
                        Clear Filters
                    </button>
                )}
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {members.map((member) => (
                <MemberCard
                    key={member.id}
                    member={member}
                    currentUser={currentUser}
                    isCreator={isCreator}
                    onKick={onKick}
                    onTransferOwnership={onTransferOwnership}
                    actionLoading={actionLoading}
                />
            ))}
        </div>
    );
};

export default MembersList;