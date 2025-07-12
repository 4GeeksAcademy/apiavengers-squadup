// src/front/store/store.js - Updated with Accessibility Feature

// Initial state function
export const initialStore = () => ({
    message: null,
    // Authentication state
    user: null,
    token: localStorage.getItem('token') || sessionStorage.getItem('token') || null,
    isAuthenticated: false,
    authLoading: false,
    authError: null,
    // ✅ 1. Add animation state here
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

    // ✅ 2. Add the new action type
    TOGGLE_ANIMATIONS: 'toggle_animations'
};

// Main reducer function
const storeReducer = (state, action) => {
    switch (action.type) {
        // ✅ 3. Add the new case for toggling animations
        case ACTION_TYPES.TOGGLE_ANIMATIONS:
            return {
                ...state,
                animationsEnabled: !state.animationsEnabled
            };
            
        // --- Existing Actions ---
        
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
            return {
                ...state,
                user: action.payload,
                isAuthenticated: !!action.payload
            };

        case ACTION_TYPES.SET_TOKEN:
            return {
                ...state,
                token: action.payload,
                isAuthenticated: !!action.payload
            };

        case ACTION_TYPES.SET_LOADING:
            return {
                ...state,
                authLoading: action.payload
            };

        case ACTION_TYPES.SET_ERROR:
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
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
                authLoading: false,
                authError: null
            };

        case ACTION_TYPES.LOGOUT:
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                authError: null
            };

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
            return state;
    }
};

export default storeReducer;