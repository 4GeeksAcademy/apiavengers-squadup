// src/front/Routes.jsx - UPDATED with Live Voting Route

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Import pages
import { Home } from './pages/Home';
import { Demo } from './pages/Demo';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Profile } from './pages/Profile';
import { Dashboard } from './pages/Dashboard';
import { GameLibrary } from './pages/GameLibrary';
import FindGames from './pages/FindGames';
import Friends from './pages/Friends';
import JoinGroup from './pages/JoinGroup';
import GroupPage from './pages/GroupPage';
import ResultsPage from './pages/ResultsPage';

// NEW: Import Live Voting Session
import LiveVotingSession from './components/LiveVotingSession';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      
      {/* Join group route - can be accessed without being logged in, but will redirect to login if needed */}
      <Route path="/join/:inviteCode" element={<JoinGroup />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute><Profile /></ProtectedRoute>
      } />
      
      <Route path="/game-library" element={
        <ProtectedRoute><GameLibrary /></ProtectedRoute>
      } />
      
      <Route path="/find-games" element={
        <ProtectedRoute><FindGames /></ProtectedRoute>
      } />
      
      <Route path="/friends" element={
        <ProtectedRoute><Friends /></ProtectedRoute>
      } />
      
      <Route path="/groups/:groupId" element={
        <ProtectedRoute><GroupPage /></ProtectedRoute>
      } />
      
      <Route path="/results/:sessionId" element={
        <ProtectedRoute><ResultsPage /></ProtectedRoute>
      } />
      
      {/* NEW: Live Voting Route */}
      <Route path="/live-voting/:sessionId" element={
        <ProtectedRoute><LiveVotingSession /></ProtectedRoute>
      } />
      
      {/* Alternative paths for better UX */}
      <Route path="/sessions" element={
        <ProtectedRoute><FindGames /></ProtectedRoute>
      } />
      
      <Route path="/groups" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      
      {/* 404 - Catch all route */}
      <Route path="*" element={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
            <h1 className="text-4xl font-bold text-white mb-4">404</h1>
            <p className="text-white/70 mb-6">Page not found</p>
            <a 
              href="/dashboard" 
              className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      } />
    </Routes>
  );
};

export default AppRoutes;