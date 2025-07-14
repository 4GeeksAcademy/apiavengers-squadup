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

// --- ADD THIS IMPORT ---
import { Demo } from "./pages/Demo";  // Add this line

// Add imports for new pages (create these files if they don't exist)
import FindGames from "./pages/FindGames.jsx";  // For /sessions route
import Friends from "./pages/Friends.jsx";  // For /friends route

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
                
                {/* --- ADD THIS ROUTE --- */}
                <Route path="/demo" element={<Demo />} />  // Add this line (unprotected for easy demo access)
                
                {/* Added routes for missing navbar links */}
                <Route path="/sessions" element={<ProtectedRoute><FindGames /></ProtectedRoute>} />  {/* For Find Games */}
                <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />  {/* For Friends */}
            </Route>

            {/* Standalone routes */}
            <Route path="/join/:inviteCode" element={<JoinGroup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

        </Route>
    )
);