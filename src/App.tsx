import React, { useState, useEffect } from 'react';
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useLocation,
    useNavigate,
    Outlet
} from 'react-router-dom';
import axios from 'axios';

// --- Pages ---
import Dashboard from './pages/Dashboard';
import CreateInvoice from './pages/CreateInvoice';
import ViewInvoice from './pages/ViewInvoice';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import Login from './pages/Login';

// --- Public Pages ---
import Pricing from './pages/public/Pricing';
import Contact from './pages/public/Contact';
import About from './pages/public/About';
import Terms from './pages/public/Terms';
import Privacy from './pages/public/Privacy';
import Refund from './pages/public/Refund';

// --- Layouts ---
import PublicLayout from './layouts/PublicLayout';

// 1. AXIOS CONFIG
axios.defaults.withCredentials = true;

// 2. PROTECTED ROUTE COMPONENT
const ProtectedRoute: React.FC<{ isAuth: boolean; children: React.ReactNode }> = ({ isAuth, children }) => {
    const location = useLocation();
    if (!isAuth) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
};

// 3. LOGIN WRAPPER
const LoginWrapper: React.FC<{ setIsAuthenticated: (val: boolean) => void; isAuth: boolean }> = ({ setIsAuthenticated, isAuth }) => {
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuth) navigate('/dashboard', { replace: true });
    }, [isAuth, navigate]);

    return <Login onLoginSuccess={() => {
        setIsAuthenticated(true);
        navigate('/dashboard', { replace: true });
    }} />;
};

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // 4. CHECK SESSION ON LOAD
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await axios.get('/api/check-auth');
                setIsAuthenticated(res.data.authenticated);
            } catch (error) {
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, []);

    if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

    return (
        <BrowserRouter>
            <Routes>

                {/* --- A. PUBLIC LAYOUT ROUTES --- */}
                <Route element={<PublicLayout />}>
                    <Route
                        path="/login"
                        element={
                            <LoginWrapper
                                setIsAuthenticated={setIsAuthenticated}
                                isAuth={isAuthenticated}
                            />
                        }
                    />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/refund" element={<Refund />} />
                </Route>

                {/* --- B. STANDALONE PUBLIC ROUTE --- */}
                <Route path="/view/:id" element={<ViewInvoice />} />

                {/* --- C. PRIVATE ROUTES --- */}
                <Route element={<ProtectedRoute isAuth={isAuthenticated}><Outlet /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/create" element={<CreateInvoice />} />
                    <Route path="/edit/:id" element={<CreateInvoice />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/login" replace />} />

            </Routes>
        </BrowserRouter>
    );
};

export default App;