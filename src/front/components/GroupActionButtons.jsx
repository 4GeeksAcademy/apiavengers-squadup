// src/front/components/GroupActionButtons.jsx - Enhanced with ownership transfer and state management
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { leaveGroup, deleteGroup, transferGroupOwnership, startVotingSession } from '../store/actions.js';
import useGlobalReducer from '../hooks/useGlobalReducer'; // Fixed: default import
import { getGamingSelectors, ACTION_TYPES } from '../store/store.js';

const GroupActionButtons = ({ group, onGroupUpdate, onVotingStart }) => {
    const { store, dispatch } = useGlobalReducer();
    const selectors = getGamingSelectors(store);
    
    const [loading, setLoading] = useState({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showVotingModal, setShowVotingModal] = useState(false);
    
    const user = store.user;
    const isCreator = selectors.isCurrentUserGroupCreator();
    const canManageGroup = selectors.canUserManageGroup();
    const groupMembers = selectors.getGroupMembers();
    const activeSession = selectors.getActiveSession();
    
    // Get eligible members for ownership transfer (exclude current user)
    const eligibleMembers = groupMembers.filter(member => 
        member.id !== user?.id && member.id !== group?.creator?.id
    );

    const handleLeaveGroup = async () => {
        const confirmMessage = isCreator 
            ? `Leave group "${group.name}"?\n\n${eligibleMembers.length > 0 
                ? '⚠️ As creator, ownership will be transferred to the next member.' 
                : '⚠️ As the only member, this group will be deleted permanently.'}`
            : `Leave group "${group.name}"?\n\nYou can rejoin later with the invite code.`;
        
        if (!window.confirm(confirmMessage)) {
            return;
        }

        setLoading(prev => ({ ...prev, leave: true }));
        
        try {
            const result = await leaveGroup(dispatch, group.id);
            
            if (result.success) {
                // Update global state - remove group from user's groups
                const currentGroups = selectors.getUserGroups();
                const updatedGroups = currentGroups.filter(g => g.id !== group.id);
                dispatch({ 
                    type: ACTION_TYPES.SET_USER_GROUPS, 
                    payload: updatedGroups 
                });
                
                if (onGroupUpdate) {
                    onGroupUpdate(result.action, result.groupDeleted, {
                        newCreator: result.newCreator
                    });
                }
                
                // Redirect to dashboard after leaving
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            }
        } catch (error) {
            console.error('Error leaving group:', error);
            toast.error('Failed to leave group');
        } finally {
            setLoading(prev => ({ ...prev, leave: false }));
        }
    };

    const handleDeleteGroup = async () => {
        setLoading(prev => ({ ...prev, delete: true }));
        
        try {
            const result = await deleteGroup(dispatch, group.id);
            
            if (result.success) {
                // Update global state - remove group from user's groups
                const currentGroups = selectors.getUserGroups();
                const updatedGroups = currentGroups.filter(g => g.id !== group.id);
                dispatch({ 
                    type: ACTION_TYPES.SET_USER_GROUPS, 
                    payload: updatedGroups 
                });
                
                if (onGroupUpdate) {
                    onGroupUpdate(result.action, true, {
                        membersRemoved: result.membersRemoved
                    });
                }
                
                // Redirect to dashboard after deletion
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            }
        } catch (error) {
            console.error('Error deleting group:', error);
            toast.error('Failed to delete group');
        } finally {
            setLoading(prev => ({ ...prev, delete: false }));
            setShowDeleteConfirm(false);
        }
    };

    const handleTransferOwnership = async (newOwnerId) => {
        setLoading(prev => ({ ...prev, transfer: true }));
        
        try {
            const newOwner = groupMembers.find(m => m.id === newOwnerId);
            const result = await transferGroupOwnership(dispatch, group.id, newOwnerId);
            
            if (result.success) {
                // Update group in global state
                dispatch({
                    type: ACTION_TYPES.UPDATE_GROUP,
                    payload: result.data.group
                });
                
                if (onGroupUpdate) {
                    onGroupUpdate('ownership_transferred', false, {
                        newCreatorId: newOwnerId,
                        newCreatorUsername: newOwner?.username,
                        oldCreator: result.data.old_creator,
                        newCreator: result.data.new_creator
                    });
                }
                
                setShowTransferModal(false);
                
                // Refresh page since user is no longer creator
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        } catch (error) {
            console.error('Error transferring ownership:', error);
            toast.error('Failed to transfer ownership');
        } finally {
            setLoading(prev => ({ ...prev, transfer: false }));
        }
    };

    const handleStartVoting = async (sessionData) => {
        setLoading(prev => ({ ...prev, voting: true }));
        
        try {
            const result = await startVotingSession(dispatch, group.id, sessionData);
            
            if (result.success) {
                // Update active session in global state
                dispatch({
                    type: ACTION_TYPES.SET_ACTIVE_SESSION,
                    payload: result.session
                });
                
                if (onVotingStart) {
                    onVotingStart(result.session, result.commonGames);
                }
                
                setShowVotingModal(false);
            }
        } catch (error) {
            console.error('Error starting voting session:', error);
            toast.error('Failed to start voting session');
        } finally {
            setLoading(prev => ({ ...prev, voting: false }));
        }
    };

    return (
        <div className="space-y-4">
            {/* Primary Actions */}
            <div className="flex flex-wrap gap-3">
                {/* Start Voting Button */}
                {!activeSession && (
                    <button
                        onClick={() => setShowVotingModal(true)}
                        disabled={groupMembers.length < 2}
                        className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                        title={groupMembers.length < 2 ? "Need at least 2 members to start voting" : "Start a game voting session"}
                    >
                        <span className="text-xl">🗳️</span>
                        <span>Start Vote</span>
                    </button>
                )}

                {/* Active Session Indicator */}
                {activeSession && (
                    <div className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl shadow-lg">
                        <span className="text-xl animate-pulse">🔴</span>
                        <span>Voting Active</span>
                    </div>
                )}

                {/* Creator Actions */}
                {isCreator && (
                    <>
                        {eligibleMembers.length > 0 && (
                            <button
                                onClick={() => setShowTransferModal(true)}
                                className="flex items-center space-x-2 px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 font-medium rounded-xl transition-all duration-200"
                            >
                                <span>👑</span>
                                <span>Transfer Ownership</span>
                            </button>
                        )}
                        
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center space-x-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-medium rounded-xl transition-all duration-200"
                        >
                            <span>🗑️</span>
                            <span>Delete Group</span>
                        </button>
                    </>
                )}

                {/* Leave Group Button */}
                <button
                    onClick={handleLeaveGroup}
                    disabled={loading.leave}
                    className="flex items-center space-x-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/30 text-white/70 hover:text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                    {loading.leave ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <span>🚪</span>
                    )}
                    <span>{isCreator ? 'Leave & Transfer' : 'Leave Group'}</span>
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center space-x-2 text-white/60">
                    <span>👥</span>
                    <span>{groupMembers.length} members</span>
                </div>
                <div className="flex items-center space-x-2 text-white/60">
                    <span>🎮</span>
                    <span>{groupMembers.filter(m => m.steam_connected).length} Steam connected</span>
                </div>
                <div className="flex items-center space-x-2 text-white/60">
                    <span>🔗</span>
                    <span>Code: {group.invite_code}</span>
                </div>
                <div className="flex items-center space-x-2 text-white/60">
                    <span>📅</span>
                    <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 max-w-md w-full mx-4">
                        <div className="text-center">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h3 className="text-xl font-bold text-white mb-4">Delete Group?</h3>
                            <p className="text-white/70 mb-6">
                                This will permanently delete "{group.name}" and remove all {groupMembers.length} members. 
                                This action cannot be undone.
                            </p>
                            
                            <div className="flex space-x-3 justify-center">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteGroup}
                                    disabled={loading.delete}
                                    className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center space-x-2"
                                >
                                    {loading.delete ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <span>🗑️</span>
                                    )}
                                    <span>Delete Forever</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Ownership Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                            <span className="text-2xl mr-2">👑</span>
                            Transfer Ownership
                        </h3>
                        <p className="text-white/70 mb-6">
                            Choose a new group creator. You will lose all creator privileges and cannot undo this action.
                        </p>
                        
                        <div className="space-y-3 mb-6">
                            {eligibleMembers.map(member => (
                                <button
                                    key={member.id}
                                    onClick={() => handleTransferOwnership(member.id)}
                                    disabled={loading.transfer}
                                    className="w-full flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    <img 
                                        src={member.steam_avatar_url || `https://ui-avatars.com/api/?name=${member.username}&background=coral&color=fff`}
                                        alt={member.username}
                                        className="w-10 h-10 rounded-full"
                                    />
                                    <div className="flex-1 text-left">
                                        <div className="text-white font-medium">{member.username}</div>
                                        {member.steam_connected && (
                                            <div className="text-green-400 text-sm">✓ Steam Connected</div>
                                        )}
                                    </div>
                                    {loading.transfer ? (
                                        <span className="w-5 h-5 border-2 border-coral-500/30 border-t-coral-500 rounded-full animate-spin"></span>
                                    ) : (
                                        <span className="text-coral-400">→</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowTransferModal(false)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Voting Session Modal */}
            {showVotingModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                            <span className="text-2xl mr-2">🗳️</span>
                            Start Voting Session
                        </h3>
                        
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            handleStartVoting({
                                session_name: formData.get('session_name'),
                                description: formData.get('description')
                            });
                        }}>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-white/70 text-sm mb-2">Session Name</label>
                                    <input
                                        type="text"
                                        name="session_name"
                                        defaultValue={`Game Vote - ${new Date().toLocaleDateString()}`}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-white/70 text-sm mb-2">Description</label>
                                    <textarea
                                        name="description"
                                        defaultValue="Vote for the next game to play together!"
                                        rows={3}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 resize-none"
                                    />
                                </div>
                                
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                    <p className="text-blue-300 text-sm">
                                        💡 Members can vote for up to 3 games with weighted scores (3pts, 2pts, 1pt)
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowVotingModal(false)}
                                    className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading.voting}
                                    className="flex-1 px-4 py-3 bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center space-x-2"
                                >
                                    {loading.voting ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <>
                                            <span>🚀</span>
                                            <span>Start Voting</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupActionButtons;