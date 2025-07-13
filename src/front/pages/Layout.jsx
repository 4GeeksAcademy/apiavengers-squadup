// src/front/pages/Layout.jsx

import React, { useEffect } from "react"; // ADD useEffect
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import useGlobalReducer from "../hooks/useGlobalReducer";
import authService from "../store/authService"; // ADD authService import

export const Layout = () => {
    // Get the dispatch function from your hook
    const { dispatch } = useGlobalReducer();

    // ADD THIS useEffect BLOCK
    // This will run only once when the application starts
    useEffect(() => {
        // Push the dispatch function into the authService
        authService.setDispatch(dispatch);
    }, []); // The empty array ensures this effect runs only once

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};