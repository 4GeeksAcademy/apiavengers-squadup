import { useEffect } from "react";
import { useLocation } from "react-router-dom"; // ✅ Import the useLocation hook
import PropTypes from "prop-types";

// This component scrolls the window to the top on every route change.
// This version uses hooks to be self-contained and is the modern standard for React Router v6.
const ScrollToTop = ({ children }) => {
    // ✅ Get the pathname from the current location
    const { pathname } = useLocation();

    // ✅ The effect now runs automatically whenever the pathname changes
    useEffect(() => {
        // This will scroll the window to the top of the page
        window.scrollTo(0, 0);
    }, [pathname]); // The dependency array ensures this effect runs only when the pathname changes

    // The component simply renders its children
    return children;
};

export default ScrollToTop;

// ✅ Updated PropTypes to remove the location requirement
ScrollToTop.propTypes = {
    children: PropTypes.any.isRequired
};