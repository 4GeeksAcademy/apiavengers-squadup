// src/front/routes.jsx - ENHANCED VERSION with Admin Dashboard

import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './pages/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// ✅ FIXED: All imports now use named imports for consistency
import { Home } from './pages/Home';
import { Demo } from './pages/Demo';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Profile } from './pages/Profile';
import { Dashboard } from './pages/Dashboard';
import { GameLibrary } from './pages/GameLibrary';
import { FindGames } from './pages/FindGames';
import { Friends } from './pages/Friends';
import { JoinGroup } from './pages/JoinGroup';
import { GroupPage } from './pages/GroupPage';
import { ResultsPage } from './pages/ResultsPage';

// ADD: Import AdminPerformanceDashboard
import { AdminPerformanceDashboard } from './components/SystemStatusIndicator';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      // Public routes
      {
        index: true,
        element: <Home />
      },
      {
        path: "demo",
        element: <Demo />
      },
      {
        path: "login",
        element: <Login />
      },
      {
        path: "signup",
        element: <SignUp />
      },
      
      // Join group route - can be accessed without being logged in, but will redirect to login if needed
      {
        path: "join/:inviteCode",
        element: <JoinGroup />
      },
      
      // Protected routes
      {
        path: "dashboard",
        element: <ProtectedRoute><Dashboard /></ProtectedRoute>
      },
      {
        path: "profile", 
        element: <ProtectedRoute><Profile /></ProtectedRoute>
      },
      {
        path: "game-library",
        element: <ProtectedRoute><GameLibrary /></ProtectedRoute>
      },
      {
        path: "find-games",
        element: <ProtectedRoute><FindGames /></ProtectedRoute>
      },
      {
        path: "sessions", // Alternative path for find-games
        element: <ProtectedRoute><FindGames /></ProtectedRoute>
      },
      {
        path: "friends",
        element: <ProtectedRoute><Friends /></ProtectedRoute>
      },
      {
        path: "groups/:groupId",
        element: <ProtectedRoute><GroupPage /></ProtectedRoute>
      },
      {
        path: "groups", // Alternative path that redirects to dashboard
        element: <ProtectedRoute><Dashboard /></ProtectedRoute>
      },
      {
        path: "results/:sessionId",
        element: <ProtectedRoute><ResultsPage /></ProtectedRoute>
      },
      
      // ADD: Admin routes (requires admin privileges)
      {
        path: "admin/performance",
        element: (
          <ProtectedRoute adminOnly={true}>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
              <AdminPerformanceDashboard />
            </div>
          </ProtectedRoute>
        )
      },
      
      // 404 - Catch all route
      {
        path: "*",
        element: (
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
        )
      }
    ]
  }
]);