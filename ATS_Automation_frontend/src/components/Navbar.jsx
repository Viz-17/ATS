import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

function Navbar() {
    const { isDarkMode, toggleTheme } = useTheme();
    const location = useLocation();

    // STRICT SECURITY:
    // Hide Navbar completely on Test Environment AND Candidate Dashboard
    // to prevent navigating away during an active session.
    if (location.pathname === '/test' || location.pathname.startsWith('/candidate/dashboard') || location.pathname.startsWith('/candidate/application')) {
        return null;
    }

    // Admin Session View
    if (location.pathname === '/admin/dashboard') {
        return (
            <nav className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-8 py-4 flex justify-between items-center transition-colors duration-200">
                <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500 cursor-default">
                    Softrate <span className="text-xs text-gray-400 font-mono">ADMIN</span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        SECURE SESSION
                    </span>
                    <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xl">
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>
                </div>
            </nav>
        );
    }

    // Public / Login View
    return (
        <nav className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-8 py-4 flex justify-between items-center transition-colors duration-200">
            <Link to="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-80 transition-opacity">
                Softrate
            </Link>

            <div className="flex items-center gap-6">
                <Link to="/admin" className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors">
                    Recruiter Login
                </Link>
                <Link to="/candidate" className="bg-purple-600 text-white px-5 py-2 rounded-full font-bold hover:bg-purple-700 transition-all shadow-lg hover:shadow-purple-500/30">
                    Candidate? Start Here
                </Link>
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xl"
                    title="Toggle Theme"
                >
                    {isDarkMode ? '☀️' : '🌙'}
                </button>
            </div>
        </nav>
    );
}

export default Navbar;
