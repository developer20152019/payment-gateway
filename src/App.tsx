import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import CreateInvoice from './pages/CreateInvoice';
import ViewInvoice from './pages/ViewInvoice';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import Login from './pages/Login';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const location = useLocation();

    if (!isAuthenticated) {
        // redirect to login and save the original location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

// Login Wrapper to handle redirect after login
const LoginWrapper: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from?.pathname || '/';

    const handleLoginSuccess = () => {
        localStorage.setItem('isAuthenticated', 'true');
        navigate(from, { replace: true });
    };

    return <Login onLoginSuccess={handleLoginSuccess} />;
};

const App: React.FC = () => {
    return (
        <HashRouter>
            <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-800">
                <Routes>
                    {/* Login Route */}
                    <Route path="/login" element={<LoginWrapper />} />

                    {/* Public Route (View Invoice without login) */}
                    <Route path="/view/:id" element={<ViewInvoice />} />

                    {/* Protected Routes */}
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/create" element={<ProtectedRoute><CreateInvoice /></ProtectedRoute>} />
                    <Route path="/edit/:id" element={<ProtectedRoute><CreateInvoice /></ProtectedRoute>} />
                    <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                    <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                    {/* Fallback Route */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </HashRouter>
    );
};

export default App;
