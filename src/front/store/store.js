// src/front/store/actions.js - Enhanced with authentication actions

const getState = ({ getStore, getActions, setStore }) => {
    return {
        store: {
            message: null,
            // Authentication state
            user: null,
            token: localStorage.getItem('token') || null,
            isAuthenticated: false,
            authLoading: false,
            authError: null,
            // Existing demo data
            demo: [
                {
                    title: "FIRST",
                    background: "white",
                    initial: "white"
                },
                {
                    title: "SECOND", 
                    background: "white",
                    initial: "white"
                }
            ]
        },
        actions: {
            // Existing actions
            exampleFunction: () => {
                getActions().changeColor(0, "green");
            },

            getMessage: async () => {
                try {
                    const store = getStore();
                    const response = await fetch(process.env.BACKEND_URL + "/api/hello");
                    const data = await response.json();
                    setStore({ message: data.message });
                    return data;
                } catch (error) {
                    console.log("Error loading message from backend", error);
                }
            },

            changeColor: (index, color) => {
                const store = getStore();
                const demo = store.demo.map((item, i) => {
                    if (i === index) item.background = color;
                    return item;
                });
                setStore({ demo: demo });
            },

            // Authentication actions
            setAuthLoading: (loading) => {
                setStore({ authLoading: loading });
            },

            setAuthError: (error) => {
                setStore({ authError: error });
            },

            clearAuthError: () => {
                setStore({ authError: null });
            },

            register: async (userData) => {
                const actions = getActions();
                actions.setAuthLoading(true);
                actions.clearAuthError();

                try {
                    const backendUrl = process.env.BACKEND_URL || import.meta.env.VITE_BACKEND_URL;
                    
                    const response = await fetch(`${backendUrl}/api/auth/register`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(userData)
                    });

                    const data = await response.json();

                    if (response.ok) {
                        // Store token and user data
                        localStorage.setItem('token', data.access_token);
                        setStore({
                            user: data.user,
                            token: data.access_token,
                            isAuthenticated: true,
                            authLoading: false,
                            authError: null
                        });
                        
                        return { success: true, data };
                    } else {
                        actions.setAuthError(data.error || 'Registration failed');
                        return { success: false, error: data.error };
                    }
                } catch (error) {
                    const errorMsg = 'Network error. Please check your connection and try again.';
                    actions.setAuthError(errorMsg);
                    return { success: false, error: errorMsg };
                } finally {
                    actions.setAuthLoading(false);
                }
            },

            login: async (credentials) => {
                const actions = getActions();
                actions.setAuthLoading(true);
                actions.clearAuthError();

                try {
                    const backendUrl = process.env.BACKEND_URL || import.meta.env.VITE_BACKEND_URL;
                    
                    const response = await fetch(`${backendUrl}/api/auth/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(credentials)
                    });

                    const data = await response.json();

                    if (response.ok) {
                        // Store token and user data
                        if (credentials.rememberMe) {
                            localStorage.setItem('token', data.access_token);
                        } else {
                            sessionStorage.setItem('token', data.access_token);
                        }
                        
                        setStore({
                            user: data.user,
                            token: data.access_token,
                            isAuthenticated: true,
                            authLoading: false,
                            authError: null
                        });
                        
                        return { success: true, data };
                    } else {
                        actions.setAuthError(data.error || 'Login failed');
                        return { success: false, error: data.error };
                    }
                } catch (error) {
                    const errorMsg = 'Network error. Please check your connection and try again.';
                    actions.setAuthError(errorMsg);
                    return { success: false, error: errorMsg };
                } finally {
                    actions.setAuthLoading(false);
                }
            },

            logout: () => {
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                setStore({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    authError: null
                });
            },

            verifyToken: async () => {
                const store = getStore();
                const token = store.token || localStorage.getItem('token') || sessionStorage.getItem('token');
                
                if (!token) {
                    return { success: false, error: 'No token found' };
                }

                try {
                    const backendUrl = process.env.BACKEND_URL || import.meta.env.VITE_BACKEND_URL;
                    
                    const response = await fetch(`${backendUrl}/api/auth/verify`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        }
                    });

                    const data = await response.json();

                    if (response.ok) {
                        setStore({
                            user: data.user,
                            token: token,
                            isAuthenticated: true,
                            authError: null
                        });
                        return { success: true, data };
                    } else {
                        // Token is invalid, clear it
                        getActions().logout();
                        return { success: false, error: data.error };
                    }
                } catch (error) {
                    getActions().logout();
                    return { success: false, error: 'Token verification failed' };
                }
            },

            updateProfile: async (profileData) => {
                const actions = getActions();
                const store = getStore();
                const token = store.token;

                if (!token) {
                    return { success: false, error: 'Not authenticated' };
                }

                try {
                    const backendUrl = process.env.BACKEND_URL || import.meta.env.VITE_BACKEND_URL;
                    
                    const response = await fetch(`${backendUrl}/api/auth/profile`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(profileData)
                    });

                    const data = await response.json();

                    if (response.ok) {
                        setStore({
                            user: data.user
                        });
                        return { success: true, data };
                    } else {
                        return { success: false, error: data.error };
                    }
                } catch (error) {
                    return { success: false, error: 'Failed to update profile' };
                }
            },

            // Initialize authentication state on app load
            initAuth: async () => {
                const actions = getActions();
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                
                if (token) {
                    await actions.verifyToken();
                }
            }
        }
    };
};

export default getState;