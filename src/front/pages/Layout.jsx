// src/front/pages/Layout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { AccessibilityToggle } from "../components/AccessibilityToggle"; // ✅ 1. Import the new component

export const Layout = () => {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Only show navbar on non-auth pages */}
            <Navbar />
            
            {/* Main content area */}
            <main className="flex-1">
                {/* The <Outlet> is where your pages like Home and SignUp will be rendered */}
                <Outlet />
            </main>
            
            {/* Footer */}
            <Footer />

            {/* ✅ 2. Add the Accessibility Toggle component here. It will be fixed to the viewport. */}
            <AccessibilityToggle />
        </div>
    );
};