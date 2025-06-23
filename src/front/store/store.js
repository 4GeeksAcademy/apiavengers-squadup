// src/front/store/store.js

// Initial state
export const initialState = {
    user: null,
    token: null,
    isLoading: false,
    error: null
};

// Reducer function
export const reducer = (state, action) => {
    switch (action.type) {
        case 'SET_USER':
            return {
                ...state,
                user: action.payload,
                error: null
            };
        
        case 'SET_TOKEN':
            return {
                ...state,
                token: action.payload
            };
        
        case 'SET_LOADING':
            return {
                ...state,
                isLoading: action.payload
            };
        
        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload,
                isLoading: false
            };
        
        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null
            };
        
        case 'LOGOUT':
            return {
                ...state,
                user: null,
                token: null,
                error: null
            };
        
        default:
            return state;
    }
};