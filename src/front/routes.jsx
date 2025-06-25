// src/front/routes.jsx - Updated with authentication routes

import {
    createBrowserRouter,
    createRoutesFromElements,
    Route,
} from "react-router-dom";
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { Single } from "./pages/Single";
import { Demo } from "./pages/Demo";
import { SignUp } from "./pages/SignUp";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard"; // You'll need to create this
import { Profile } from "./pages/Profile"; // You'll need to create this
import { ProtectedRoute } from "./components/ProtectedRoute"; // You'll need to create this

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
                    <div>Gaming Sessions Page</div>
                </ProtectedRoute>
            } />
            
            <Route path="/friends" element={
                <ProtectedRoute>
                    <div>Friends Page</div>
                </ProtectedRoute>
            } />
            
        </Route>
    )
);