// src/front/hooks/useGlobalReducer.jsx - Optimized for 429 Prevention

import { useContext, useReducer, createContext, useMemo } from "react";
import storeReducer, { initialStore, ACTION_TYPES } from "../store/store"
import authService from "../store/authService.js";

// Create a context to hold the global state of the application
const StoreContext = createContext();

// Provider component that wraps the app and provides global state
export function StoreProvider({ children }) {
    // Initialize reducer with the initial state
    const [store, dispatch] = useReducer(storeReducer, initialStore());

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        store,
        dispatch,
        
        // Helper functions for common actions
        actions: {
            // Authentication helpers - optimized
            login: (user, token) => {
                localStorage.setItem('token', token);
                dispatch({ 
                    type: ACTION_TYPES.LOGIN_SUCCESS, 
                    payload: { user, token } 
                });
            },
            
            logout: () => {
                // Use authService to ensure proper cleanup
                authService.clearTokens();
                dispatch({ type: ACTION_TYPES.LOGOUT });
            },
            
            setUser: (user) => {
                dispatch({ type: ACTION_TYPES.SET_USER, payload: user });
            },
            
            setLoading: (loading) => {
                dispatch({ type: ACTION_TYPES.SET_LOADING, payload: loading });
            },
            
            setError: (error) => {
                dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error });
            },
            
            clearError: () => {
                dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
            },
            
            // Message helpers
            setMessage: (message) => {
                dispatch({ type: ACTION_TYPES.SET_MESSAGE, payload: message });
                
                // Auto-clear success messages after 5 seconds
                if (message?.type === 'success') {
                    setTimeout(() => {
                        dispatch({ type: ACTION_TYPES.CLEAR_MESSAGE });
                    }, 5000);
                }
            },
            
            clearMessage: () => {
                dispatch({ type: ACTION_TYPES.CLEAR_MESSAGE });
            },
            
            // Demo helpers (for existing functionality)
            setHello: (message) => {
                dispatch({ type: ACTION_TYPES.SET_HELLO, payload: message });
            },
            
            changeTaskColor: (id, color) => {
                dispatch({ 
                    type: ACTION_TYPES.ADD_TASK, 
                    payload: { id, color } 
                });
            }
        }
    }), [store, dispatch]);

    return (
        <StoreContext.Provider value={contextValue}>
            {children}
        </StoreContext.Provider>
    );
}

// Custom hook to access the global state and dispatch function
function useGlobalReducer() {
    const context = useContext(StoreContext);
    
    if (!context) {
        throw new Error('useGlobalReducer must be used within a StoreProvider');
    }
    
    const { store, dispatch, actions } = context;
    
    // Memoize the return value to prevent unnecessary re-renders
    return useMemo(() => ({ 
        store, 
        dispatch, 
        actions,
        
        // Computed values for convenience
        isAuthenticated: store.isAuthenticated,
        user: store.user,
        isLoading: store.authLoading,
        error: store.authError,
        message: store.message
    }), [store, dispatch, actions]);
}

// Export as default
export default useGlobalReducer;
