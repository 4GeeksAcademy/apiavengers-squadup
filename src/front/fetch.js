import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
/*
export const loginFetch = async (username, password, dispatch) => {
  try {

    const API_URL =
      "https://animated-eureka-5grpx4q7wvpgf66g-3001.app.github.dev";


      const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    });


    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.msg || `HTTP error! Status: ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new Error("No access token received");
    }

    localStorage.setItem("access_token", data.access_token);

    dispatch({
      type: "fetchedToken",
      payload: {
        message: "Login successful",
        token: data.access_token,
        isLoginSuccessful: true,
        loggedIn: true,
      },
    });

    return data;
  } catch (err) {
    console.error("Login error:", err);


    let errorMessage = err.message;
    if (err.message.includes("Failed to fetch")) {
      errorMessage = "Cannot reach server.";
    }

    throw new Error(errorMessage);
  }
};

export const logout = (dispatch) => {
  localStorage.removeItem("access_token");
  dispatch({
    type: "loggedOut",
  });

  Navigate("/Home");
};

export const signOut = async (username, password, dispatch) => {
  const options = {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: username,
      password: password,
    }),
  };
};
*/