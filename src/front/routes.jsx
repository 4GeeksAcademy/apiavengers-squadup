import React from "react";
import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";

// Import your page components
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { SignUp } from "./pages/SignUp";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Demo } from "./pages/Demo";
import { Single } from "./pages/Single";
import { Profile } from "./pages/Profile";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter(
    createRoutesFromElements(
        <Route errorElement={<h1>Something went wrong! A custom error page would be better.</h1>}>
            
            {/* Routes with the main Navbar and Footer */}
            <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/demo" element={<Demo />} />
                <Route path="/single/:theId" element={<Single />} />
                
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                
                {/* Add other protected routes that use the main layout here */}
                <Route path="/sessions" element={<ProtectedRoute><div>Sessions Page</div></ProtectedRoute>} />
                <Route path="/friends" element={<ProtectedRoute><div>Friends Page</div></ProtectedRoute>} />
            </Route>

            {/* Standalone routes without the main Navbar/Footer */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

        </Route>
    )
);