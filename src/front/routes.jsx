import React from "react";
import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";
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


export const router = createBrowserRouter(
    createRoutesFromElements(
        <Route errorElement={<h1>Something went wrong!</h1>}>

            {/* Routes with the main Navbar and Footer */}
            <Route element={<Layout />}>
                <Route path="/" element={<Home />} />

                {/* Protected main app routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                {/* Group-related routes */}
                <Route path="/groups/:groupId" element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
                <Route path="/sessions/:sessionId/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />

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
            v7_startTransition: true  // Add this to remove warning
        }
    }
);