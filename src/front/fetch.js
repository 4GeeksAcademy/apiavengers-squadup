import { useState,useEffect } from 'react';


export const login = async (username, password, dispatch) => {
    try {
        const response = await fetch('https://animated-eureka-5grpx4q7wvpgf66g-3001.app.github.dev/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.msg || 'Login failed');
        }

        localStorage.setItem('access_token', data.access_token);
        
        dispatch({
            type: 'fetchedToken',
            payload: {
                message: 'Login successful', // Fixed undefined variable
                token: data.access_token,   // Fixed undefined variable
                isLoginSuccessful: true,
                loggedIn: true,
            }
        });

        return data;
    } catch (err) {
        console.error("Login error:", err);
        throw err; // Rethrow for handling in handleSubmit
    }
};

export const logout = (dispatch) => {
  sessionStorage.removeItem('token');
  dispatch({
        type: 'loggedOut',
        payload: {
          message: null,
          token: null,
          isLoginSuccessful: false,
          loggedIn: false
        }
      });
}

export const signOut = async(username, password, dispatch) => {
    const options = {
      method: 'POST',
      mode: 'cors',
      headers : {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          username: username,
          password: password
      })
  }
}