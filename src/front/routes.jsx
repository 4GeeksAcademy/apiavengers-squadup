import React from "react";
import { createBrowserRouter, createRoutesFromElements, Route, useParams } from "react-router-dom";

// Import your existing page components
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { SignUp } from "./pages/SignUp";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import ProtectedRoute, { SteamProtectedRoute, GroupMemberRoute, GroupCreatorRoute } from './components/ProtectedRoute.jsx';
import JoinGroup from "./pages/JoinGroup";
import GroupPage from "./pages/GroupPage";
import ResultsPage from "./pages/ResultsPage";
import { Demo } from "./pages/Demo";
import FindGames from "./pages/FindGames.jsx";
import Friends from "./pages/Friends.jsx";
import { GameLibrary } from "./pages/GameLibrary";

// Helper component to get groupId from URL params for protected routes
const GroupPageWithProtection = () => {
    const { groupId } = useParams();
    return (
        <GroupMemberRoute groupId={groupId}>
            <GroupPage />
        </GroupMemberRoute>
    );
};

const ResultsPageWithProtection = () => {
    const { sessionId } = useParams();
    // Results page might need group membership based on session
    return (
        <ProtectedRoute>
            <ResultsPage />
        </ProtectedRoute>
    );
};

export const router = createBrowserRouter(
    createRoutesFromElements(
        <Route errorElement={<h1>Something went wrong!</h1>}>
            
            {/* Routes with the main Navbar and Footer */}
            <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                
                {/* Protected main app routes */}
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />
                
                <Route path="/profile" element={
                    <ProtectedRoute>
                        <Profile />
                    </ProtectedRoute>
                } />
                
                {/* Group-related routes with enhanced protection */}
                <Route path="/groups/:groupId" element={<GroupPageWithProtection />} />
                
                {/* Group management route (creator only) */}
                <Route path="/groups/:groupId/manage" element={
                    <GroupCreatorRoute groupId={useParams().groupId}>
                        <GroupPage />  {/* You might want to create a separate GroupManagement component */}
                    </GroupCreatorRoute>
                } />
                
                {/* Voting results - protected but not group-specific for now */}
                <Route path="/sessions/:sessionId/results" element={<ResultsPageWithProtection />} />
                
                {/* Demo route - unprotected for easy access */}
                <Route path="/demo" element={<Demo />} />
                
                {/* Steam-required features */}
                <Route path="/find-games" element={
                    <SteamProtectedRoute>
                        <FindGames />
                    </SteamProtectedRoute>
                } />
                
                {/* Game Library requires Steam connection */}
                <Route path="/game-library" element={
                    <SteamProtectedRoute>
                        <GameLibrary />
                    </SteamProtectedRoute>
                } />
                
                {/* Legacy route for navbar - also requires Steam */}
                <Route path="/sessions" element={
                    <SteamProtectedRoute>
                        <FindGames />
                    </SteamProtectedRoute>
                } />
                
                {/* Friends - basic protection for now, could be enhanced later */}
                <Route path="/friends" element={
                    <ProtectedRoute>
                        <Friends />
                    </ProtectedRoute>
                } />
                
                {/* Additional gaming routes you might want to add */}
                
                {/* Group voting page - requires Steam + group membership */}
                <Route path="/groups/:groupId/vote" element={
                    <ProtectedRoute requireSteam={true} requireGroupMembership={true} groupId={useParams().groupId}>
                        <GroupPage />  {/* This would render the voting tab */}
                    </ProtectedRoute>
                } />
                
                {/* Group members management - requires group creator */}
                <Route path="/groups/:groupId/members" element={
                    <GroupCreatorRoute groupId={useParams().groupId}>
                        <GroupPage />  {/* This would render the members tab */}
                    </GroupCreatorRoute>
                } />
                
                {/* Steam connection page - shows Steam connection status */}
                <Route path="/steam" element={
                    <ProtectedRoute>
                        <Profile />  {/* Could redirect to profile Steam section */}
                    </ProtectedRoute>
                } />
                
                {/* Steam callback handling - no protection needed */}
                <Route path="/steam/callback" element={
                    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-coral-500/30 border-t-coral-500 rounded-full animate-spin mx-auto mb-4"></div>
                            <h2 className="text-xl font-bold text-white mb-2">Connecting Steam...</h2>
                            <p className="text-white/60">Please wait while we link your Steam account</p>
                        </div>
                    </div>
                } />
            </Route>
            
            {/* Standalone routes (no layout) */}
            
            {/* Group joining - no protection, but shows group info before joining */}
            <Route path="/join/:inviteCode" element={<JoinGroup />} />
            
            {/* Auth routes - no protection */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            
            {/* Steam auth routes - handled by backend, but good to have placeholders */}
            <Route path="/auth/steam" element={
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-4">🎮</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Redirecting to Steam...</h2>
                        <p className="text-white/60">You will be redirected to Steam for authentication</p>
                    </div>
                </div>
            } />
            
            {/* 404 fallback */}
            <Route path="*" element={
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-4">🤔</div>
                        <h2 className="text-2xl font-bold text-white mb-4">Page Not Found</h2>
                        <p className="text-white/60 mb-6">The page you're looking for doesn't exist.</p>
                        <a 
                            href="/dashboard" 
                            className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-xl transition-colors inline-block"
                        >
                            Go to Dashboard
                        </a>
                    </div>
                </div>
            } />
        </Route>
    ),
    {
        future: {
            v7_startTransition: true  // Add this to remove warning
        }
    }
);