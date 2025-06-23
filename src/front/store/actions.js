// src/front/store/actions.js

const getAPIUrl = () => {
    return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
};

export const signUp = async (dispatch, userData) => {
    // Set loading state
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
        console.log('🚀 Attempting signup with:', userData);
        console.log('🔗 Backend URL:', getAPIUrl());

        const response = await fetch(`${getAPIUrl()}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        console.log('📥 Response:', data);

        if (response.ok) {
            // Success - store user data and token
            dispatch({ type: 'SET_USER', payload: data.user });
            dispatch({ type: 'SET_TOKEN', payload: data.token });
            dispatch({ type: 'SET_LOADING', payload: false });
            
            // Store token in localStorage for persistence
            localStorage.setItem('token', data.token);
            
            console.log('✅ Signup successful!');
            return { success: true, data };
        } else {
            // API returned an error
            dispatch({ type: 'SET_ERROR', payload: data.message || 'Signup failed' });
            dispatch({ type: 'SET_LOADING', payload: false });
            console.log('❌ Signup failed:', data.message);
            return { success: false, error: data.message };
        }
    } catch (error) {
        // Network or other error
        const errorMessage = `Network error: ${error.message}`;
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        dispatch({ type: 'SET_LOADING', payload: false });
        console.log('💥 Network error:', error);
        return { success: false, error: errorMessage };
    }
};

// Add other actions here as needed
export const clearError = (dispatch) => {
    dispatch({ type: 'CLEAR_ERROR' });
};

export const logout = (dispatch) => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
};



//src/front/store/actions.js

// This file contains the functions that will interact with OUR backend API.
// It keeps your data-fetching logic separate from your UI section or component/

// ===================================
//  Developer A (Sign Up)
// ===================================
// This is the function that MY SignUp.jsx page will call.

// export const signUp = async (dispatch, userData) => {
//     // 1. Set the loading state to true and clear any previous errors.
//     dispatch({ type: 'SET_LOADING', payload: true });
//     dispatch({ type: 'SET_ERROR', payload: null });

//     try {
//         // 2. Make the API call to your backend's registration endpoint.
//         const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/register`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(userData)
//         });

//         // 3. Get the JSON data from the response.
//         const data = await response.json();

//         // 4. Check if the response was successful (status code 2xx).
//         if (!response.ok) {
//             // If not, throw an error with the message from the backend.
//             throw new Error(data.message || 'An unknown error occurred.');
//         }

//         // 5. On success, save the authentication token to the browser's local storage.
//         // This is how the user stays logged in after refreshing the page.
//         localStorage.setItem("token", data.token);

//         // 6. Dispatch the 'LOGIN_SUCCESS' action to update the global store.
//         // This puts the user's token and info into your app's state.
//         dispatch({
//             type: 'LOGIN_SUCCESS',
//             payload: { token: data.token, user: data.user }
//         });

//         // 7. Return a success status to the component.
//         return { success: true };

//     } catch (error) {
//         // 8. If any error occurred during the try block, it gets caught
//         // Dispatch the 'SET_ERROR' action to display the error message in the UI.
//         dispatch({ type: 'SET_ERROR', payload: error.message });

//         // 9. Return a failure status to the component.
//         return { success: false };

//     } finally {
//         // 10. This block runs whether the request succeeded or failed.
//         // Set the loading state back to false.
//         dispatch({ type: 'SET_LOADING', payload: false });
//     }
// };


// // ======================================================================
// //  Developer B (Log In & Session Management) - WORK TO BE DONE
// // ======================================================================

// /*
//  *  Developer B: You Darius tasks will be to implement the 'logIn' and 'logout' functions below.
//  */

// // Placeholder for the login action.
// export const logIn = async (dispatch, credentials) => {
//     console.log("Developer B will implement the login logic here.", credentials);
// };

// // Placeholder for the logout action.
// export const logout = (dispatch) => {
//     console.log("Developer B will connect this to the logout button.");
// };