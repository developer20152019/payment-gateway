import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

const PublicLayout: React.FC = () => {
    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
            {/* Header */}
            <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 shadow-sm z-10">
                <div className="max-w-7xl mx-auto w-full flex items-center">
                    <Link
                        to="/login"
                        className="flex items-center gap-2 text-indigo-600 font-bold text-lg hover:text-indigo-700 transition-colors"
                    >
                        <DocumentTextIcon className="h-7 w-7" />
                        <span>Wappie Finance</span>
                    </Link>
                </div>
            </header>

            {/* Page Content (Scrollable Area) */}
            <main className="flex-1 overflow-auto relative scroll-smooth">
                {/* The Outlet renders the Login Page or Public Pages here */}
                <Outlet />
            </main>

            {/* Static Footer */}
            <footer className="shrink-0 border-t border-gray-200 bg-white py-6">
                <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-gray-500">
                    <Link to="/pricing" className="hover:text-indigo-600 transition-colors">Pricing</Link>
                    <Link to="/contact" className="hover:text-indigo-600 transition-colors">Contact</Link>
                    <Link to="/about" className="hover:text-indigo-600 transition-colors">About</Link>
                    <Link to="/terms" className="hover:text-indigo-600 transition-colors">Terms and Conditions</Link>
                    <Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link>
                    <Link to="/refund" className="hover:text-indigo-600 transition-colors">Refund Policy</Link>
                </div>
                <div className="mt-4 text-center text-xs text-gray-400">
                    © {new Date().getFullYear()} Wappie Finance. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

export default PublicLayout;