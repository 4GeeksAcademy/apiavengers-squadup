
//--------------------------------------------------------------
//  Global auth / API actions – Optimized for 429 Prevention
//--------------------------------------------------------------
import authService from '../store/authService.js'
import { ACTION_TYPES } from './store';

//------------------------------------------------------------------
// Internal helpers
//------------------------------------------------------------------
const setLoading = (dispatch, on) =>
  dispatch({ type: ACTION_TYPES.SET_LOADING, payload: on });

const setError = (dispatch, msg) =>
  dispatch({ type: ACTION_TYPES.SET_ERROR, payload: msg });

const clearError = (dispatch) =>
  dispatch({ type: ACTION_TYPES.CLEAR_ERROR });

//------------------------------------------------------------------
// SIGN-UP
//------------------------------------------------------------------
export const signUp = (userData) => async (dispatch) => {
  setLoading(dispatch, true);
  clearError(dispatch);

  const { success, user, error } = await authService.register(userData);

  if (success) {
    dispatch({
      type: ACTION_TYPES.LOGIN_SUCCESS,
      payload: { user, token: authService.getAccessToken() }
    });
  } else {
    setError(dispatch, error || 'Signup failed');
  }

  setLoading(dispatch, false);
};

//------------------------------------------------------------------
// LOG-IN
//------------------------------------------------------------------
export const logIn =
  (credentials, rememberMe = true) =>
  async (dispatch) => {
    setLoading(dispatch, true);
    clearError(dispatch);

    const { success, user, error } = await authService.login(credentials);

    if (success) {
      // move tokens to sessionStorage if "remember me" is off
      if (!rememberMe) {
        sessionStorage.setItem('access_token', authService.getAccessToken());
        sessionStorage.setItem('refresh_token', authService.getRefreshToken());
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expiration');
      }

      dispatch({
        type: ACTION_TYPES.LOGIN_SUCCESS,
        payload: { user, token: authService.getAccessToken() }
      });
    } else {
      setError(dispatch, error || 'Login failed');
    }

    setLoading(dispatch, false);
  };

//------------------------------------------------------------------
// LOG-OUT
//------------------------------------------------------------------
export const logOut = () => async (dispatch) => {
  await authService.logout();
  dispatch({ type: ACTION_TYPES.LOGOUT });
};

//------------------------------------------------------------------
// BOOTSTRAP / VERIFY – Optimized for 429 Prevention
//------------------------------------------------------------------
let verifyLatch = null;      // ensures single verify per tab
let lastBootstrapTime = 0;   // track last bootstrap time
const BOOTSTRAP_THROTTLE = 60000; // 60 seconds - increased to reduce API calls

export const bootstrapAuth = () => async (dispatch) => {
  const now = Date.now();
  
  // Throttle bootstrap calls to prevent 429 errors
  if (now - lastBootstrapTime < BOOTSTRAP_THROTTLE && verifyLatch) {
    console.log('🚀 Skipping bootstrap - throttled');
    return verifyLatch;
  }
  
  lastBootstrapTime = now;
  
  // optimistic local state (no network)
  const cached = authService.getCurrentUser();
  if (cached) {
    console.log('📦 Using cached user data');
    dispatch({ type: ACTION_TYPES.SET_USER, payload: cached });
    
    // If we have cached data, only verify if token is expired
    if (!authService.isTokenExpired()) {
      console.log('✅ Using cached auth - token still valid');
      return Promise.resolve(true);
    }
  }

  // network verify (deduped inside service; latch dedupes thunks)
  if (verifyLatch) {
    console.log('🔄 Reusing existing bootstrap request');
    return verifyLatch;
  }

  console.log('🌐 Starting bootstrap auth verification');
  
  verifyLatch = authService.checkAuthStatus(false).then((ok) => { // Don't force verification
    if (ok) {
      const user = authService.getCurrentUser();
      console.log('✅ Bootstrap successful, user:', user?.username);
      dispatch({
        type: ACTION_TYPES.SET_USER,
        payload: user
      });
    } else {
      console.log('❌ Bootstrap failed - user not authenticated');
      dispatch({ type: ACTION_TYPES.LOGOUT });
    }
    verifyLatch = null;
  }).catch((error) => {
    console.error('❌ Bootstrap error:', error);
    dispatch({ type: ACTION_TYPES.LOGOUT });
    verifyLatch = null;
  });

  return verifyLatch;
};

//------------------------------------------------------------------
// VERIFY AUTH STATUS - For components that need fresh verification
//------------------------------------------------------------------
export const verifyAuthStatus = (force = false) => async (dispatch) => {
  // Use the optimized authService method with throttling
  const isAuthenticated = await authService.checkAuthStatus(force);
  
  if (isAuthenticated) {
    const user = authService.getCurrentUser();
    dispatch({
      type: ACTION_TYPES.SET_USER,
      payload: user
    });
  } else {
    dispatch({ type: ACTION_TYPES.LOGOUT });
  }
  
  return isAuthenticated;
};

//------------------------------------------------------------------
// UPDATE USER DATA - For profile updates etc.
//------------------------------------------------------------------
export const updateUserData = (userData) => (dispatch) => {
  // Update both localStorage and store
  localStorage.setItem('user', JSON.stringify(userData));
  dispatch({ type: ACTION_TYPES.SET_USER, payload: userData });
};

//------------------------------------------------------------------
// Handy helpers for UI components
//------------------------------------------------------------------
export const clearAuthError = () => (dispatch) => clearError(dispatch);

export const setMessage = (msg) =>
  (dispatch) => dispatch({ type: ACTION_TYPES.SET_MESSAGE, payload: msg });

export const clearMessage = () =>
  (dispatch) => dispatch({ type: ACTION_TYPES.CLEAR_MESSAGE });
