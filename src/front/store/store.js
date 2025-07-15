// src/front/store/store.js - FIXED VERSION with debugging

// Initial state function
export const initialStore = () => ({
    message: null,
    // Authentication state
    user: null,
    token: localStorage.getItem('squadup_access_token') || sessionStorage.getItem('squadup_access_token') || null, // FIXED: Use correct token key
    isAuthenticated: false,
    authLoading: false,
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
});

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

// Main reducer function
const storeReducer = (state, action) => {
    console.log('🔄 Reducer called:', action.type, action.payload); // ADD: Debug all actions
    
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

        // Authentication actions
        case ACTION_TYPES.SET_USER:
            console.log('✅ SET_USER reducer:', action.payload);
            return {
                ...state,
                user: action.payload,
                isAuthenticated: !!action.payload
            };

        case ACTION_TYPES.SET_TOKEN:
            console.log('✅ SET_TOKEN reducer:', !!action.payload);
            return {
                ...state,
                token: action.payload,
                isAuthenticated: !!action.payload && !!state.user // FIXED: Need both token AND user
            };

        case ACTION_TYPES.SET_LOADING:
            console.log('✅ SET_LOADING reducer:', action.payload);
            return {
                ...state,
                authLoading: action.payload
            };

        case ACTION_TYPES.SET_ERROR:
            console.log('❌ SET_ERROR reducer:', action.payload);
            return {
                ...state,
                authError: action.payload
            };

        case ACTION_TYPES.CLEAR_ERROR:
            return {
                ...state,
                authError: null
            };

        case ACTION_TYPES.LOGIN_SUCCESS:
            console.log('🎉 LOGIN_SUCCESS reducer called with:', action.payload);
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
                authLoading: newState.authLoading
            });
            return newState;

        case ACTION_TYPES.LOGOUT:
            console.log('🚪 LOGOUT reducer called');
            const logoutState = {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                authError: null
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

export default storeReducer;