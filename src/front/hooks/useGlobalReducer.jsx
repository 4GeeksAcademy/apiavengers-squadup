import { useContext, useReducer, createContext, useEffect } from "react";
import storeReducer, { initialStore, ACTION_TYPES } from "../store/store";

const StoreContext = createContext();

export function StoreProvider({ children }) {
    const [store, dispatch] = useReducer(storeReducer, initialStore());
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (token) {
                dispatch({ type: ACTION_TYPES.SET_TOKEN, payload: token });
                try {
                    const backendUrl = import.meta.env.VITE_BACKEND_URL;
                    if (backendUrl) {
                        const response = await fetch(`${backendUrl}/api/auth/verify`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
                        if (response.ok) {
                            const data = await response.json();
                            dispatch({ type: ACTION_TYPES.LOGIN_SUCCESS, payload: { user: data.user, token: token } });
                        } else {
                            localStorage.removeItem('token');
                            sessionStorage.removeItem('token');
                            dispatch({ type: ACTION_TYPES.LOGOUT });
                        }
                    }
                } catch (error) { console.error('Auth verification failed:', error); }
            }
        };
        checkAuth();
    }, []);

    const contextValue = {
        store, dispatch,
        actions: {
            login: (user, token) => { localStorage.setItem('token', token); dispatch({ type: ACTION_TYPES.LOGIN_SUCCESS, payload: { user, token } }); },
            logout: () => { localStorage.removeItem('token'); sessionStorage.removeItem('token'); localStorage.removeItem('user'); dispatch({ type: ACTION_TYPES.LOGOUT }); },
            setUser: (user) => { dispatch({ type: ACTION_TYPES.SET_USER, payload: user }); },
            setLoading: (loading) => { dispatch({ type: ACTION_TYPES.SET_LOADING, payload: loading }); },
            setError: (error) => { dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error }); },
            clearError: () => { dispatch({ type: ACTION_TYPES.CLEAR_ERROR }); },
            setMessage: (message) => { dispatch({ type: ACTION_TYPES.SET_MESSAGE, payload: message }); if (message?.type === 'success') { setTimeout(() => { dispatch({ type: ACTION_TYPES.CLEAR_MESSAGE }); }, 5000); } },
            clearMessage: () => { dispatch({ type: ACTION_TYPES.CLEAR_MESSAGE }); },
            setHello: (message) => { dispatch({ type: ACTION_TYPES.SET_HELLO, payload: message }); },
            changeTaskColor: (id, color) => { dispatch({ type: ACTION_TYPES.ADD_TASK, payload: { id, color } }); }
        }
    };
    return ( <StoreContext.Provider value={contextValue}> {children} </StoreContext.Provider> );
}

function useGlobalReducer() {
    const context = useContext(StoreContext);
    if (!context) { throw new Error('useGlobalReducer must be used within a StoreProvider'); }
    const { store, dispatch, actions } = context;
    return { store, dispatch, actions, isAuthenticated: store.isAuthenticated, user: store.user, isLoading: store.authLoading, error: store.authError, message: store.message };
}

export default useGlobalReducer;