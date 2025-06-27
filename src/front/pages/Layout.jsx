// src/front/pages/Layout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export const Layout = () => {
    return (
        <div>
            <Navbar />
            <main className="container my-5">
                {/* The <Outlet> is where your pages like Home and SignUp will be rendered */}
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};
