import React from "react";
import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";

// Import your existing page components
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { SignUp } from "./pages/SignUp";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import ProtectedRoute from './components/ProtectedRoute.jsx';
import JoinGroup from "./pages/JoinGroup";
import GroupPage from "./pages/GroupPage";
import ResultsPage from "./pages/ResultsPage";
import { Demo } from "./pages/Demo";
import FindGames from "./pages/FindGames.jsx";
import Friends from "./pages/Friends.jsx";
import { GameLibrary } from "./pages/GameLibrary";
import LiveVotingSession from "./components/LiveVotingSession";

export const router = createBrowserRouter(
    createRoutesFromElements(
        <Route errorElement={<div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center"><div className="text-white text-center"><h1 className="text-4xl font-bold mb-4">Oops! Something went wrong</h1><p className="text-white/70">Please refresh the page or go back to home.</p><button onClick={() => window.location.href = '/'} className="mt-4 px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl">Go Home</button></div></div>}>
            
            {/* Routes with the main Navbar and Footer */}
            <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                
                {/* Protected main app routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                
                {/* Group-related routes */}
                <Route path="/groups" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/groups/:groupId" element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
                <Route path="/sessions/:sessionId/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
                
                {/* NEW: Live Voting Session Route */}
                <Route path="/live-voting/:sessionId" element={<ProtectedRoute><LiveVotingSession /></ProtectedRoute>} />
                
                {/* Demo route - unprotected for easy access */}
                <Route path="/demo" element={<Demo />} />
                
                {/* Main app feature routes */}
                <Route path="/find-games" element={<ProtectedRoute><FindGames /></ProtectedRoute>} />
                <Route path="/sessions" element={<ProtectedRoute><FindGames /></ProtectedRoute>} /> {/* Legacy route for navbar */}
                <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
                <Route path="/game-library" element={<ProtectedRoute><GameLibrary /></ProtectedRoute>} />
            </Route>
            
            {/* Standalone routes (no layout) */}
            <Route path="/join/:inviteCode" element={<JoinGroup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
        </Route>
    ),
    {
        future: {
            v7_startTransition: true,
        },
    }
);