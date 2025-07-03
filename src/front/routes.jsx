// src/front/routes.jsx - Fixed with correct file imports

import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Single } from "./pages/Single";
import { Demo } from "./pages/Demo";
import { SignUp } from "./pages/SignUp";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter(
    createRoutesFromElements(
        // Root Route: All navigation will start from here
        <Route path="/" element={<Layout />} errorElement={<h1>Not found!</h1>}>
            
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/single/:theId" element={<Single />} />
            
            {/* Authentication Routes */}
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes - Require Authentication */}
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
            
            {/* Gaming Routes - Future implementation */}
            <Route path="/sessions" element={
                <ProtectedRoute>
                    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4">
                        <div className="max-w-4xl mx-auto">
                            <div className="glass rounded-3xl p-8 text-center">
                                <h1 className="text-3xl font-bold text-white mb-4">Gaming Sessions</h1>
                                <p className="text-white/70">Coming soon! This will show all your gaming sessions.</p>
                            </div>
                        </div>
                    </div>
                </ProtectedRoute>
            } />
            
            <Route path="/friends" element={
                <ProtectedRoute>
                    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-24 px-4">
                        <div className="max-w-4xl mx-auto">
                            <div className="glass rounded-3xl p-8 text-center">
                                <h1 className="text-3xl font-bold text-white mb-4">Friends</h1>
                                <p className="text-white/70">Coming soon! This will show your gaming friends.</p>
                            </div>
                        </div>
                    </div>
                </ProtectedRoute>
            } />
            
        </Route>
    )
);