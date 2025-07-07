
//--------------------------------------------------------------
//  Global auth / API actions – now powered by authService
//--------------------------------------------------------------
import authService from '../store/authService.js'
import { ACTION_TYPES }   from './store';

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
// BOOTSTRAP / VERIFY  –  call once at app start
//------------------------------------------------------------------
let verifyLatch = null;      // ensures single verify per tab

export const bootstrapAuth = () => async (dispatch) => {
  // optimistic local state (no network)
  const cached = authService.getCurrentUser();
  if (cached) dispatch({ type: ACTION_TYPES.SET_USER, payload: cached });

  // network verify (deduped inside service; latch dedupes thunks)
  if (verifyLatch) return verifyLatch;

  verifyLatch = authService.checkAuthStatus(true).then((ok) => {
    if (ok) {
      dispatch({
        type: ACTION_TYPES.SET_USER,
        payload: authService.getCurrentUser()
      });
    } else {
      dispatch({ type: ACTION_TYPES.LOGOUT });
    }
    verifyLatch = null;
  });

  return verifyLatch;
};


//------------------------------------------------------------------
// Handy helpers for UI components
//------------------------------------------------------------------
export const clearAuthError = () => (dispatch) => clearError(dispatch);

export const setMessage = (msg) =>
  (dispatch) => dispatch({ type: ACTION_TYPES.SET_MESSAGE, payload: msg });

export const clearMessage = () =>
  (dispatch) => dispatch({ type: ACTION_TYPES.CLEAR_MESSAGE });
