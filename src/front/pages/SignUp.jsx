// src/front/pages/SignUp.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { signUp } from "../store/actions";

// This is the main component for the Sign Up page.
export const SignUp = () => {
    // Get access to the global store and the dispatch function from our custom hook
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    // Local state to manage the form inputs
    const [formData, setFormData] = useState({
        email: "",
        username: "",
        password: "",
        confirmPassword: ""
    });

    // A single function to handle changes in all form inputs
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // This function runs when the user submits the form
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent the default form submission behavior

        // Client-side validation: check if passwords match
        if (formData.password !== formData.confirmPassword) {
            dispatch({ type: 'SET_ERROR', payload: "Passwords do not match." });
            return; // Stop the submission if they don't match
        }

        // Prepare the data to send to the backend (we don't need to send confirmPassword)
        const { confirmPassword, ...userDataToSend } = formData;

        // Call the signUp action from actions.js
        const result = await signUp(dispatch, userDataToSend);

        // If the signUp action reports success, redirect the user
        if (result.success) {
            // Redirect to a dashboard or profile page after successful registration
            navigate("/dashboard"); 
        }
    };

    return (
        <div className="row justify-content-center">
            <div className="col-md-6 col-lg-5">
                <div className="card shadow-sm">
                    <div className="card-body p-4">
                        <h3 className="card-title text-center mb-4">Create Your SquadUp Account</h3>
                        
                        {/* Show a loading spinner if the app is currently fetching from the API */}
                        {store.isLoading && (
                            <div className="text-center my-3">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        )}

                        {/* Show an error message from the global store if one exists and we are not loading */}
                        {store.error && !store.isLoading && (
                            <div className="alert alert-danger">{store.error}</div>
                        )}

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="mb-3">
                                <label htmlFor="email" className="form-label">Email</label>
                                <input type="email" name="email" className="form-control" id="email" required onChange={handleChange} />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="username" className="form-label">Username</label>
                                <input type="text" name="username" className="form-control" id="username" required onChange={handleChange} />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="password">Password</label>
                                <input type="password" name="password" className="form-control" id="password" required onChange={handleChange} />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <input type="password" name="confirmPassword" className="form-control" id="confirmPassword" required onChange={handleChange} />
                            </div>
                            <button type="submit" className="btn btn-primary w-100" disabled={store.isLoading}>
                                Sign Up
                            </button>
                        </form>

                        <div className="text-center mt-3">
                            <p>Already have an account? <Link to="/login">Log In</Link></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};