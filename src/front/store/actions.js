// src/front/store/actions.js - CORRECTED with proper URL prefixes

import authService from './authService.js';

// ============================================================================
// GAMING GROUP MANAGEMENT ACTIONS - CORRECTED URLS
// ============================================================================

// Transfer group ownership
export const transferGroupOwnership = async (dispatch, groupId, userId) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/groups/${groupId}/transfer-ownership/${userId}`,
            { method: 'POST' }
        );

        const data = await response.json();

        if (response.ok && data.success) {
            dispatch({
                type: 'SET_MESSAGE',
                payload: {
                    type: 'success',
                    text: data.message,
                    details: `Ownership transferred from ${data.old_creator} to ${data.new_creator}`
                }
            });
            return { success: true, data: data };
        } else {
            throw new Error(data.error || 'Failed to transfer ownership');
        }
    } catch (error) {
        console.error('Transfer ownership error:', error);
        dispatch({
            type: 'SET_MESSAGE',
            payload: {
                type: 'error',
                text: 'Failed to transfer group ownership',
                details: error.message
            }
        });
        return { success: false, error: error.message };
    }
};

// Get detailed group members
export const fetchGroupMembers = async (dispatch, groupId) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/groups/${groupId}/members`
        );

        const data = await response.json();

        if (response.ok && data.success) {
            return { 
                success: true, 
                members: data.members,
                stats: {
                    total: data.total_members,
                    steamConnected: data.steam_connected_count,
                    currentUserIsCreator: data.current_user_is_creator
                }
            };
        } else {
            throw new Error(data.error || 'Failed to fetch group members');
        }
    } catch (error) {
        console.error('Fetch group members error:', error);
        dispatch({
            type: 'SET_MESSAGE',
            payload: {
                type: 'error',
                text: 'Failed to load group members',
                details: error.message
            }
        });
        return { success: false, error: error.message };
    }
};

// Enhanced kick member with vote cleanup
export const kickGroupMember = async (dispatch, groupId, userId) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/groups/${groupId}/kick/${userId}`,
            { method: 'POST' }
        );

        const data = await response.json();

        if (response.ok && data.success) {
            dispatch({
                type: 'SET_MESSAGE',
                payload: {
                    type: 'success',
                    text: data.message,
                    details: `${data.kicked_user} has been removed from the group`
                }
            });
            return { 
                success: true, 
                kickedUser: data.kicked_user,
                remainingMembers: data.remaining_members 
            };
        } else {
            throw new Error(data.error || 'Failed to kick member');
        }
    } catch (error) {
        console.error('Kick member error:', error);
        dispatch({
            type: 'SET_MESSAGE',
            payload: {
                type: 'error',
                text: 'Failed to kick group member',
                details: error.message
            }
        });
        return { success: false, error: error.message };
    }
};

// ============================================================================
// ENHANCED VOTING SYSTEM ACTIONS - CORRECTED URLS
// ============================================================================

// Submit votes using new Vote model
export const submitVotes = async (dispatch, sessionId, gameVotes) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/sessions/${sessionId}/vote`,
            {
                method: 'POST',
                body: JSON.stringify({ game_votes: gameVotes })
            }
        );

        const data = await response.json();

        if (response.ok && data.success) {
            dispatch({
                type: 'SET_MESSAGE',
                payload: {
                    type: 'success',
                    text: data.message,
                    details: `Submitted ${data.votes_created} votes. ${data.total_voters}/${data.total_members} members have voted.`
                }
            });
            return { 
                success: true, 
                sessionStatus: data.session_status,
                totalVoters: data.total_voters,
                totalMembers: data.total_members,
                votesCreated: data.votes_created
            };
        } else {
            throw new Error(data.error || 'Failed to submit votes');
        }
    } catch (error) {
        console.error('Submit votes error:', error);
        dispatch({
            type: 'SET_MESSAGE',
            payload: {
                type: 'error',
                text: 'Failed to submit votes',
                details: error.message
            }
        });
        return { success: false, error: error.message };
    }
};

// Get session results using Vote model
export const fetchSessionResults = async (dispatch, sessionId) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/sessions/${sessionId}/results`
        );

        const data = await response.json();

        if (response.ok && data.success) {
            return { 
                success: true, 
                session: data.session,
                results: data.results,
                winner: data.winner,
                stats: {
                    totalVoters: data.total_voters,
                    totalMembers: data.total_members,
                    participationRate: data.participation_rate,
                    votingComplete: data.voting_complete
                },
                userInfo: {
                    hasVoted: data.user_has_voted,
                    votes: data.user_votes
                }
            };
        } else {
            throw new Error(data.error || 'Failed to fetch results');
        }
    } catch (error) {
        console.error('Fetch session results error:', error);
        dispatch({
            type: 'SET_MESSAGE',
            payload: {
                type: 'error',
                text: 'Failed to load voting results',
                details: error.message
            }
        });
        return { success: false, error: error.message };
    }
};

// Get session voters and their status
export const fetchSessionVoters = async (dispatch, sessionId) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/sessions/${sessionId}/voters`
        );

        const data = await response.json();

        if (response.ok && data.success) {
            return { 
                success: true, 
                voters: data.voters,
                pendingVoters: data.pending_voters,
                stats: {
                    totalVoted: data.total_voted,
                    totalPending: data.total_pending,
                    totalMembers: data.total_members,
                    completionRate: data.completion_rate
                }
            };
        } else {
            throw new Error(data.error || 'Failed to fetch voters');
        }
    } catch (error) {
        console.error('Fetch session voters error:', error);
        dispatch({
            type: 'SET_MESSAGE',
            payload: {
                type: 'error',
                text: 'Failed to load voter information',
                details: error.message
            }
        });
        return { success: false, error: error.message };
    }
};

// Get current user's votes for a session
export const fetchMyVotes = async (dispatch, sessionId) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/sessions/${sessionId}/my-votes`
        );

        const data = await response.json();

        if (response.ok && data.success) {
            return { 
                success: true, 
                hasVoted: data.has_voted,
                votes: data.votes,
                voteCount: data.vote_count,
                canVote: data.can_vote
            };
        } else {
            throw new Error(data.error || 'Failed to fetch your votes');
        }
    } catch (error) {
        console.error('Fetch my votes error:', error);
        return { success: false, error: error.message };
    }
};

// Start a new voting session
export const startVotingSession = async (dispatch, groupId, sessionData) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/groups/${groupId}/start-vote`,
            {
                method: 'POST',
                body: JSON.stringify(sessionData)
            }
        );

        const data = await response.json();

        if (response.ok && data.success) {
            dispatch({
                type: 'SET_MESSAGE',
                payload: {
                    type: 'success',
                    text: data.message,
                    details: `Voting session "${data.session.session_name}" has been started`
                }
            });
            return { 
                success: true, 
                session: data.session,
                commonGames: data.common_games,
                instructions: data.voting_instructions
            };
        } else {
            throw new Error(data.error || 'Failed to start voting session');
        }
    } catch (error) {
        console.error('Start voting session error:', error);
        dispatch({
            type: 'SET_MESSAGE',
            payload: {
                type: 'error',
                text: 'Failed to start voting session',
                details: error.message
            }
        });
        return { success: false, error: error.message };
    }
};

// Close a voting session
export const closeVotingSession = async (dispatch, sessionId) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/sessions/${sessionId}/close`,
            { method: 'POST' }
        );

        const data = await response.json();

        if (response.ok && data.success) {
            dispatch({
                type: 'SET_MESSAGE',
                payload: {
                    type: 'success',
                    text: data.message,
                    details: data.winner ? `Winner: ${data.winner.game.name}` : 'No votes were cast'
                }
            });
            return { 
                success: true, 
                finalResults: data.final_results,
                totalVoters: data.total_voters,
                winner: data.winner
            };
        } else {
            throw new Error(data.error || 'Failed to close voting session');
        }
    } catch (error) {
        console.error('Close voting session error:', error);
        dispatch({
            type: 'SET_MESSAGE',
            payload: {
                type: 'error',
                text: 'Failed to close voting session',
                details: error.message
            }
        });
        return { success: false, error: error.message };
    }
};

// ============================================================================
// EXISTING GROUP ACTIONS - CORRECTED URLS
// ============================================================================

// Create a new group
export const createGroup = async (dispatch, groupData) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/groups`,
            {
                method: 'POST',
                body: JSON.stringify(groupData)
            }
        );

        const data = await response.json();

        if (response.ok && data.success) {
            dispatch({
                type: 'SET_MESSAGE',
                payload: {
                    type: 'success',
                    text: data.message,
                    details: `Group "${data.group.name}" created with invite code: ${data.group.invite_code}`
                }
            });
            return { success: true, group: data.group };
        } else {
            throw new Error(data.error || 'Failed to create group');
        }
    } catch (error) {
        console.error('Create group error:', error);
        dispatch({
            type: 'SET_MESSAGE',
            payload: {
                type: 'error',
                text: 'Failed to create group',
                details: error.message
            }
        });
        return { success: false, error: error.message };
    }
};

// Join a group by invite code
export const joinGroup = async (dispatch, inviteCode) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/groups/join/${inviteCode}`,
            { method: 'POST' }
        );

        const data = await response.json();

        if (response.ok && data.success) {
            dispatch({
                type: 'SET_MESSAGE',
                payload: {
                    type: 'success',
                    text: data.message,
                    details: `You are now a member of "${data.group.name}"`
                }
            });
            return { success: true, group: data.group };
        } else {
            throw new Error(data.error || 'Failed to join group');
        }
    } catch (error) {
        console.error('Join group error:', error);
        dispatch({
            type: 'SET_MESSAGE',
            payload: {
                type: 'error',
                text: 'Failed to join group',
                details: error.message
            }
        });
        return { success: false, error: error.message };
    }
};

// Leave a group
export const leaveGroup = async (dispatch, groupId) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/groups/${groupId}/leave`,
            { method: 'POST' }
        );

        const data = await response.json();

        if (response.ok && data.success) {
            dispatch({
                type: 'SET_MESSAGE',
                payload: {
                    type: 'success',
                    text: data.message,
                    details: data.new_creator ? `Ownership transferred to ${data.new_creator}` : 
                             data.group_deleted ? 'Group was deleted' : 'You have left the group'
                }
            });
            return { 
                success: true, 
                action: data.action,
                groupDeleted: data.group_deleted,
                newCreator: data.new_creator
            };
        } else {
            throw new Error(data.error || 'Failed to leave group');
        }
    } catch (error) {
        console.error('Leave group error:', error);
        dispatch({
            type: 'SET_MESSAGE',
            payload: {
                type: 'error',
                text: 'Failed to leave group',
                details: error.message
            }
        });
        return { success: false, error: error.message };
    }
};

// Delete a group (creator only)
export const deleteGroup = async (dispatch, groupId) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/groups/${groupId}`,
            { method: 'DELETE' }
        );

        const data = await response.json();

        if (response.ok && data.success) {
            dispatch({
                type: 'SET_MESSAGE',
                payload: {
                    type: 'success',
                    text: data.message,
                    details: `${data.members_removed} members were removed`
                }
            });
            return { 
                success: true, 
                action: data.action,
                membersRemoved: data.members_removed
            };
        } else {
            throw new Error(data.error || 'Failed to delete group');
        }
    } catch (error) {
        console.error('Delete group error:', error);
        dispatch({
            type: 'SET_MESSAGE',
            payload: {
                type: 'error',
                text: 'Failed to delete group',
                details: error.message
            }
        });
        return { success: false, error: error.message };
    }
};

// Fetch user's groups
export const fetchUserGroups = async (dispatch) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/groups`
        );

        const data = await response.json();

        if (response.ok && data.success) {
            return { success: true, groups: data.groups };
        } else {
            throw new Error(data.error || 'Failed to fetch groups');
        }
    } catch (error) {
        console.error('Fetch user groups error:', error);
        dispatch({
            type: 'SET_MESSAGE',
            payload: {
                type: 'error',
                text: 'Failed to load your groups',
                details: error.message
            }
        });
        return { success: false, error: error.message };
    }
};

// Fetch specific group details
export const fetchGroupDetails = async (dispatch, groupId) => {
    try {
        const response = await authService.authenticatedFetch(
            `${authService.getApiUrl()}/api/gaming/groups/${groupId}`
        );

        const data = await response.json();

        if (response.ok && data.success) {
            return { success: true, group: data.group };
        } else {
            throw new Error(data.error || 'Failed to fetch group details');
        }
    } catch (error) {
        console.error('Fetch group details error:', error);
        dispatch({
            type: 'SET_MESSAGE',
            payload: {
                type: 'error',
                text: 'Failed to load group details',
                details: error.message
            }
        });
        return { success: false, error: error.message };
    }
};

// Real-time live results stream
export const createLiveResultsStream = (sessionId, onUpdate, onError) => {
    const token = authService.getAccessToken();
    if (!token) {
        onError(new Error('No authentication token'));
        return null;
    }

    const eventSource = new EventSource(
        `${authService.getApiUrl()}/api/gaming/sessions/${sessionId}/live-results?authorization=${encodeURIComponent(token)}`
    );

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.error) {
                onError(new Error(data.error));
            } else {
                onUpdate(data);
            }
        } catch (error) {
            onError(error);
        }
    };

    eventSource.onerror = (error) => {
        onError(error);
    };

    return eventSource;
};

// Export all functions
export default {
    // Group management
    transferGroupOwnership,
    fetchGroupMembers,
    kickGroupMember,
    createGroup,
    joinGroup,
    leaveGroup,
    deleteGroup,
    fetchUserGroups,
    fetchGroupDetails,
    
    // Voting system
    submitVotes,
    fetchSessionResults,
    fetchSessionVoters,
    fetchMyVotes,
    startVotingSession,
    closeVotingSession,
    
    // Utilities
    createLiveResultsStream
};