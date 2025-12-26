import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

const PublicLayout: React.FC = () => {
    return (
        <div
            style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
               // overflow: 'hidden'
            }}
        >
            {/* Header */}
            <header
                style={{
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#fff',
                    padding: '12px 16px',
                    flexShrink: 0
                }}
            >
                <Link
                    to="/login"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#4f46e5',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '18px'
                    }}
                >
                    <DocumentTextIcon style={{ height: 24, width: 24 }} />
                    Wappie Finance
                </Link>
            </header>

            {/* Page Content */}
            <main
                style={{
                    flex: 1,
                    overflow: 'auto' // only content scrolls if needed
                }}
            >
                <Outlet />
            </main>

            {/* Static Footer */}
            <footer
                style={{
                    borderTop: '1px solid #e5e7eb',
                    backgroundColor: '#fff',
                    padding: '16px',
                    fontSize: '14px',
                    color: '#4b5563',
                    flexShrink: 0
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: '24px'
                    }}
                >
                    <Link to="/pricing">Pricing</Link>
                    <Link to="/contact">Contact</Link>
                    <Link to="/about">About</Link>
                    <Link to="/terms">Terms and Conditions</Link>
                    <Link to="/privacy">Privacy Policy</Link>
                    <Link to="/refund">Refund Policy</Link>
                </div>
            </footer>
        </div>
    );
};

export default PublicLayout;
