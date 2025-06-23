// src/front/routes.jsx
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

// Import the components that make up your pages
import { Layout } from './pages/Layout.jsx';
import { Home } from './pages/Home.jsx';
import { SignUp } from './pages/SignUp.jsx';
// Dev B will add the Login import here later

// This creates the router configuration that main.jsx uses
export const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout />, // Use Layout for Navbar/Footer on all pages
        children: [
            {
                index: true,
                element: <Home />
            },
            {
                path: "signup",
                element: <SignUp />
            },
            // Dev B will add the login route here
        ]
    }
]);