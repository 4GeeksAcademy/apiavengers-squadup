// src/front/store/store.js - ENHANCED VERSION with gaming state

// ENHANCED: More robust initial state function with gaming state
export const initialStore = () => {
    // Get stored values, but validate them first
    const getStoredToken = () => {
        const token = localStorage.getItem('squadup_access_token') || sessionStorage.getItem('squadup_access_token');
        if (!token) return null;
        
        try {
            // Validate token format
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            
            // Check if token is expired
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                // Token is expired, clear it
                localStorage.removeItem('squadup_access_token');
                sessionStorage.removeItem('squadup_access_token');
                return null;
            }
            
            return token;
        } catch (error) {
            console.error('Invalid stored token:', error);
            // Clear invalid token
            localStorage.removeItem('squadup_access_token');
            sessionStorage.removeItem('squadup_access_token');
            return null;
        }
    };

    const getStoredUser = () => {
        const userStr = localStorage.getItem('squadup_user') || sessionStorage.getItem('squadup_user');
        if (!userStr) return null;
        
        try {
            const user = JSON.parse(userStr);
            // Validate user object has required fields
            if (user && typeof user === 'object' && user.id && user.username) {
                return user;
            }
            return null;
        } catch (error) {
            console.error('Invalid stored user:', error);
            // Clear invalid user data
            localStorage.removeItem('squadup_user');
            sessionStorage.removeItem('squadup_user');
            return null;
        }
    };

    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    
    // ENHANCED: Only consider authenticated if BOTH token and user are valid
    const initialAuth = !!(storedToken && storedUser);
    
    console.log('🏗️ Initializing store with:', {
        hasStoredToken: !!storedToken,
        hasStoredUser: !!storedUser,
        initialAuth
    });

    return {
        // Messages - Enhanced to support different message types
        message: null,
        messages: [], // Support for multiple messages/notifications
        
        // Authentication state - ENHANCED
        user: storedUser,
        token: storedToken,
        isAuthenticated: initialAuth,
        authLoading: true, // Start as loading until authService checks
        authError: null,
        
        // Gaming state - NEW
        gaming: {
            // Groups
            currentGroup: null,
            userGroups: [],
            groupMembers: [],
            groupLoading: false,
            groupError: null,
            
            // Voting sessions
            activeSession: null,
            sessionResults: null,
            sessionVoters: [],
            userVotes: [],
            votingLoading: false,
            votingError: null,
            
            // Live voting
            liveResultsEventSource: null,
            liveResults: null,
            
            // UI state
            showMemberModal: false,
            showVotingModal: false,
            selectedGame: null
        },
        
        // Animation state
        animationsEnabled: true, 
        
        // Demo data for existing functionality
        todos: [
            {
                id: 1,
                title: "FIRST",
                background: "white",
                initial: "white"
            },
            {
                id: 2,
                title: "SECOND", 
                background: "white",
                initial: "white"
            }
        ]
    };
};

// Action types - Enhanced with gaming actions
export const ACTION_TYPES = {
    // Demo actions
    SET_HELLO: 'set_hello',
    ADD_TASK: 'add_task',
    
    // Auth actions
    SET_USER: 'set_user',
    SET_TOKEN: 'set_token',
    SET_LOADING: 'set_loading',
    SET_ERROR: 'set_error',
    CLEAR_ERROR: 'clear_error',
    LOGOUT: 'logout',
    LOGIN_SUCCESS: 'login_success',
    
    // Message actions - Enhanced
    SET_MESSAGE: 'set_message',
    CLEAR_MESSAGE: 'clear_message',
    ADD_MESSAGE: 'add_message',
    REMOVE_MESSAGE: 'remove_message',

    // Animation actions
    TOGGLE_ANIMATIONS: 'toggle_animations',
    
    // Gaming actions - NEW
    // Groups
    SET_CURRENT_GROUP: 'set_current_group',
    SET_USER_GROUPS: 'set_user_groups',
    SET_GROUP_MEMBERS: 'set_group_members',
    SET_GROUP_LOADING: 'set_group_loading',
    SET_GROUP_ERROR: 'set_group_error',
    UPDATE_GROUP: 'update_group',
    REMOVE_GROUP: 'remove_group',
    
    // Voting
    SET_ACTIVE_SESSION: 'set_active_session',
    SET_SESSION_RESULTS: 'set_session_results',
    SET_SESSION_VOTERS: 'set_session_voters',
    SET_USER_VOTES: 'set_user_votes',
    SET_VOTING_LOADING: 'set_voting_loading',
    SET_VOTING_ERROR: 'set_voting_error',
    
    // Live voting
    SET_LIVE_RESULTS: 'set_live_results',
    SET_LIVE_RESULTS_SOURCE: 'set_live_results_source',
    CLEAR_LIVE_RESULTS: 'clear_live_results',
    
    // UI state
    TOGGLE_MEMBER_MODAL: 'toggle_member_modal',
    TOGGLE_VOTING_MODAL: 'toggle_voting_modal',
    SET_SELECTED_GAME: 'set_selected_game'
};

// ENHANCED: More robust reducer with gaming state management
const storeReducer = (state, action) => {
    console.log('🔄 Reducer called:', action.type, action.payload);
    
    switch (action.type) {
        // Animation actions
        case ACTION_TYPES.TOGGLE_ANIMATIONS:
            return {
                ...state,
                animationsEnabled: !state.animationsEnabled
            };
            
        // Demo actions
        case ACTION_TYPES.SET_HELLO:
            return {
                ...state,
                message: action.payload
            };

        case ACTION_TYPES.ADD_TASK:
            return {
                ...state,
                todos: state.todos.map(todo => 
                    todo.id === action.payload.id 
                        ? { ...todo, background: action.payload.color }
                        : todo
                )
            };

        // ENHANCED: Authentication actions with better validation
        case ACTION_TYPES.SET_USER:
            console.log('✅ SET_USER reducer:', action.payload);
            
            // Validate user payload
            const isValidUser = action.payload && 
                                typeof action.payload === 'object' && 
                                action.payload.id && 
                                action.payload.username;
            
            if (!isValidUser && action.payload !== null) {
                console.error('❌ Invalid user payload in SET_USER:', action.payload);
                return state;
            }
            
            return {
                ...state,
                user: action.payload,
                isAuthenticated: !!(action.payload && state.token), // Need both user AND token
                authError: null // Clear any previous errors
            };

        case ACTION_TYPES.SET_TOKEN:
            console.log('✅ SET_TOKEN reducer:', !!action.payload);
            
            // Validate token if provided
            if (action.payload && typeof action.payload !== 'string') {
                console.error('❌ Invalid token payload in SET_TOKEN:', typeof action.payload);
                return state;
            }
            
            return {
                ...state,
                token: action.payload,
                isAuthenticated: !!(action.payload && state.user), // Need both token AND user
                authError: null
            };

        case ACTION_TYPES.SET_LOADING:
            console.log('✅ SET_LOADING reducer:', action.payload);
            return {
                ...state,
                authLoading: !!action.payload // Ensure boolean
            };

        case ACTION_TYPES.SET_ERROR:
            console.log('❌ SET_ERROR reducer:', action.payload);
            return {
                ...state,
                authError: action.payload,
                authLoading: false // Stop loading on error
            };

        case ACTION_TYPES.CLEAR_ERROR:
            return {
                ...state,
                authError: null
            };

        case ACTION_TYPES.LOGIN_SUCCESS:
            console.log('🎉 LOGIN_SUCCESS reducer called with:', action.payload);
            
            // ENHANCED: Validate login success payload
            if (!action.payload || !action.payload.user || !action.payload.token) {
                console.error('❌ Invalid LOGIN_SUCCESS payload:', action.payload);
                return {
                    ...state,
                    authError: 'Invalid login response',
                    authLoading: false
                };
            }
            
            const newState = {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
                authLoading: false,
                authError: null
            };
            
            console.log('🎉 LOGIN_SUCCESS new state:', {
                hasUser: !!newState.user,
                hasToken: !!newState.token,
                isAuthenticated: newState.isAuthenticated,
                authLoading: newState.authLoading,
                userName: newState.user?.username
            });
            
            return newState;

        case ACTION_TYPES.LOGOUT:
            console.log('🚪 LOGOUT reducer called');
            
            // ENHANCED: More thorough logout cleanup including gaming state
            const logoutState = {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                authError: null,
                authLoading: false,
                // Clear gaming state on logout
                gaming: {
                    ...state.gaming,
                    currentGroup: null,
                    userGroups: [],
                    groupMembers: [],
                    activeSession: null,
                    sessionResults: null,
                    sessionVoters: [],
                    userVotes: [],
                    liveResults: null,
                    // Close live results connection
                    liveResultsEventSource: state.gaming.liveResultsEventSource ? 
                        (state.gaming.liveResultsEventSource.close(), null) : null
                }
            };
            
            console.log('🚪 LOGOUT new state:', {
                hasUser: !!logoutState.user,
                hasToken: !!logoutState.token,
                isAuthenticated: logoutState.isAuthenticated
            });
            
            return logoutState;

        // Enhanced message actions
        case ACTION_TYPES.SET_MESSAGE:
            return {
                ...state,
                message: action.payload
            };

        case ACTION_TYPES.CLEAR_MESSAGE:
            return {
                ...state,
                message: null
            };

        case ACTION_TYPES.ADD_MESSAGE:
            return {
                ...state,
                messages: [...state.messages, { 
                    id: Date.now(), 
                    timestamp: new Date(),
                    ...action.payload 
                }]
            };

        case ACTION_TYPES.REMOVE_MESSAGE:
            return {
                ...state,
                messages: state.messages.filter(msg => msg.id !== action.payload)
            };

        // Gaming Group Actions - NEW
        case ACTION_TYPES.SET_CURRENT_GROUP:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    currentGroup: action.payload,
                    groupError: null
                }
            };

        case ACTION_TYPES.SET_USER_GROUPS:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    userGroups: action.payload || [],
                    groupError: null
                }
            };

        case ACTION_TYPES.SET_GROUP_MEMBERS:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    groupMembers: action.payload || [],
                    groupError: null
                }
            };

        case ACTION_TYPES.SET_GROUP_LOADING:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    groupLoading: !!action.payload
                }
            };

        case ACTION_TYPES.SET_GROUP_ERROR:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    groupError: action.payload,
                    groupLoading: false
                }
            };

        case ACTION_TYPES.UPDATE_GROUP:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    userGroups: state.gaming.userGroups.map(group =>
                        group.id === action.payload.id ? { ...group, ...action.payload } : group
                    ),
                    currentGroup: state.gaming.currentGroup && state.gaming.currentGroup.id === action.payload.id
                        ? { ...state.gaming.currentGroup, ...action.payload }
                        : state.gaming.currentGroup
                }
            };

        case ACTION_TYPES.REMOVE_GROUP:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    userGroups: state.gaming.userGroups.filter(group => group.id !== action.payload),
                    currentGroup: state.gaming.currentGroup && state.gaming.currentGroup.id === action.payload 
                        ? null 
                        : state.gaming.currentGroup
                }
            };

        // Voting Actions - NEW
        case ACTION_TYPES.SET_ACTIVE_SESSION:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    activeSession: action.payload,
                    votingError: null
                }
            };

        case ACTION_TYPES.SET_SESSION_RESULTS:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    sessionResults: action.payload,
                    votingError: null
                }
            };

        case ACTION_TYPES.SET_SESSION_VOTERS:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    sessionVoters: action.payload || [],
                    votingError: null
                }
            };

        case ACTION_TYPES.SET_USER_VOTES:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    userVotes: action.payload || [],
                    votingError: null
                }
            };

        case ACTION_TYPES.SET_VOTING_LOADING:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    votingLoading: !!action.payload
                }
            };

        case ACTION_TYPES.SET_VOTING_ERROR:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    votingError: action.payload,
                    votingLoading: false
                }
            };

        // Live Voting Actions - NEW
        case ACTION_TYPES.SET_LIVE_RESULTS:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    liveResults: action.payload
                }
            };

        case ACTION_TYPES.SET_LIVE_RESULTS_SOURCE:
            // Close existing connection if any
            if (state.gaming.liveResultsEventSource) {
                state.gaming.liveResultsEventSource.close();
            }
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    liveResultsEventSource: action.payload
                }
            };

        case ACTION_TYPES.CLEAR_LIVE_RESULTS:
            if (state.gaming.liveResultsEventSource) {
                state.gaming.liveResultsEventSource.close();
            }
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    liveResults: null,
                    liveResultsEventSource: null
                }
            };

        // UI State Actions - NEW
        case ACTION_TYPES.TOGGLE_MEMBER_MODAL:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    showMemberModal: !state.gaming.showMemberModal
                }
            };

        case ACTION_TYPES.TOGGLE_VOTING_MODAL:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    showVotingModal: !state.gaming.showVotingModal
                }
            };

        case ACTION_TYPES.SET_SELECTED_GAME:
            return {
                ...state,
                gaming: {
                    ...state.gaming,
                    selectedGame: action.payload
                }
            };

        default:
            console.log('⚠️ Unknown action type:', action.type);
            return state;
    }
};

// ENHANCED: Add state validation helper with gaming validation
export const validateState = (state) => {
    const errors = [];
    
    // Validate authentication state consistency
    if (state.isAuthenticated && (!state.user || !state.token)) {
        errors.push('isAuthenticated is true but missing user or token');
    }
    
    if (!state.isAuthenticated && (state.user || state.token)) {
        errors.push('isAuthenticated is false but user or token still present');
    }
    
    // Validate user object structure
    if (state.user && (!state.user.id || !state.user.username)) {
        errors.push('user object is missing required fields (id, username)');
    }
    
    // Validate token format
    if (state.token && typeof state.token !== 'string') {
        errors.push('token is not a string');
    }
    
    // Validate gaming state structure
    if (!state.gaming || typeof state.gaming !== 'object') {
        errors.push('gaming state is missing or invalid');
    }
    
    // Validate gaming state arrays
    if (state.gaming) {
        if (!Array.isArray(state.gaming.userGroups)) {
            errors.push('gaming.userGroups is not an array');
        }
        if (!Array.isArray(state.gaming.groupMembers)) {
            errors.push('gaming.groupMembers is not an array');
        }
        if (!Array.isArray(state.gaming.sessionVoters)) {
            errors.push('gaming.sessionVoters is not an array');
        }
        if (!Array.isArray(state.gaming.userVotes)) {
            errors.push('gaming.userVotes is not an array');
        }
        if (!Array.isArray(state.messages)) {
            errors.push('messages is not an array');
        }
    }
    
    if (errors.length > 0) {
        console.error('🚨 State validation errors:', errors);
    }
    
    return errors.length === 0;
};

// Gaming state selectors - NEW
export const getGamingSelectors = (state) => ({
    // Group selectors
    getCurrentGroup: () => state.gaming.currentGroup,
    getUserGroups: () => state.gaming.userGroups,
    getGroupMembers: () => state.gaming.groupMembers,
    isGroupLoading: () => state.gaming.groupLoading,
    getGroupError: () => state.gaming.groupError,
    
    // Voting selectors
    getActiveSession: () => state.gaming.activeSession,
    getSessionResults: () => state.gaming.sessionResults,
    getSessionVoters: () => state.gaming.sessionVoters,
    getUserVotes: () => state.gaming.userVotes,
    isVotingLoading: () => state.gaming.votingLoading,
    getVotingError: () => state.gaming.votingError,
    
    // Live voting selectors
    getLiveResults: () => state.gaming.liveResults,
    hasLiveConnection: () => !!state.gaming.liveResultsEventSource,
    
    // UI selectors
    isMemberModalOpen: () => state.gaming.showMemberModal,
    isVotingModalOpen: () => state.gaming.showVotingModal,
    getSelectedGame: () => state.gaming.selectedGame,
    
    // User role selectors
    isCurrentUserGroupCreator: () => {
        const user = state.user;
        const group = state.gaming.currentGroup;
        return !!(user && group && group.creator && group.creator.id === user.id);
    },
    
    canUserManageGroup: () => {
        const user = state.user;
        const group = state.gaming.currentGroup;
        return !!(user && group && group.creator && group.creator.id === user.id);
    }
});

export default storeReducer;