import React from 'react';
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useLocation,
    useNavigate,
} from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import CreateInvoice from './pages/CreateInvoice';
import ViewInvoice from './pages/ViewInvoice';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import Login from './pages/Login';

import Pricing from './pages/public/Pricing';
import Contact from './pages/public/Contact';
import About from './pages/public/About';
import Terms from './pages/public/Terms';
import Privacy from './pages/public/Privacy';
import Refund from './pages/public/Refund';

import PublicLayout from './layouts/PublicLayout';

/* -------- Protected Route -------- */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

/* -------- Login Wrapper -------- */
const LoginWrapper: React.FC = () => {
    const navigate = useNavigate();

    const handleLoginSuccess = () => {
        localStorage.setItem('isAuthenticated', 'true');
        navigate('/dashboard', { replace: true });
    };

    return <Login onLoginSuccess={handleLoginSuccess} />;
};

/* -------- App -------- */
const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>

                {/* Public Layout */}
                <Route element={<PublicLayout />}>
                    <Route path="/login" element={<LoginWrapper />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/refund" element={<Refund />} />
                </Route>

                {/* Default */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Public invoice view */}
                <Route path="/view/:id" element={<ViewInvoice />} />

                {/* Protected */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/create"
                    element={
                        <ProtectedRoute>
                            <CreateInvoice />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/products"
                    element={
                        <ProtectedRoute>
                            <Products />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/customers"
                    element={
                        <ProtectedRoute>
                            <Customers />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <Settings />
                        </ProtectedRoute>
                    }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/login" replace />} />

            </Routes>
        </BrowserRouter>
    );
};

export default App;
