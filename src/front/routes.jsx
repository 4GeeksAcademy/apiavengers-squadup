// src/front/routes.jsx

import React from "react";
import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";

// Import your existing page components
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { SignUp } from "./pages/SignUp";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { ProtectedRoute } from "./components/ProtectedRoute";
import JoinGroup from "./pages/JoinGroup";

// --- ADD THESE TWO LINES ---
import GroupPage from "./pages/GroupPage";
import ResultsPage from "./pages/ResultsPage";

import { SteamCallback } from "./pages/SteamCallback";

export const router = createBrowserRouter(
    createRoutesFromElements(
        <Route errorElement={<h1>Something went wrong!</h1>}>
            
            {/* Routes with the main Navbar and Footer */}
            <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                
                {/* Your existing routes are correct */}
                <Route path="/groups/:groupId" element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
                <Route path="/sessions/:sessionId/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
            </Route>

            {/* Standalone routes */}
            <Route path="/join/:inviteCode" element={<JoinGroup />} />
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/single/:theId" element={<Single />} />
            <Route path= "/steam/callback" element= {<SteamCallback /> }/>

            {/* Authentication Routes */}
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

        </Route>
    )
);