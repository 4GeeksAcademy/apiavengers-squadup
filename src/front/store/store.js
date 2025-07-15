// src/front/store/store.js - ENHANCED VERSION with better synchronization

// ENHANCED: More robust initial state function
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
        message: null,
        // Authentication state - ENHANCED
        user: storedUser,
        token: storedToken,
        isAuthenticated: initialAuth,
        authLoading: true, // Start as loading until authService checks
        authError: null,
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

// Action types
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
    
    // Message actions
    SET_MESSAGE: 'set_message',
    CLEAR_MESSAGE: 'clear_message',

    // Animation actions
    TOGGLE_ANIMATIONS: 'toggle_animations'
};

// ENHANCED: More robust reducer with better state validation
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
            
            // ENHANCED: More thorough logout cleanup
            const logoutState = {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                authError: null,
                authLoading: false // Important: stop loading on logout
            };
            
            console.log('🚪 LOGOUT new state:', {
                hasUser: !!logoutState.user,
                hasToken: !!logoutState.token,
                isAuthenticated: logoutState.isAuthenticated
            });
            
            return logoutState;

        // Message actions
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

        default:
            console.log('⚠️ Unknown action type:', action.type);
            return state;
    }
};

// ENHANCED: Add state validation helper
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
    
    if (errors.length > 0) {
        console.error('🚨 State validation errors:', errors);
    }
    
    return errors.length === 0;
};

export default storeReducer;