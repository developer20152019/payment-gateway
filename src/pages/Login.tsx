import React, { useState } from 'react';
import { LockClosedIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data?.error || 'Invalid email or password');
                setLoading(false);
                return;
            }

            // ✅ SINGLE SOURCE OF TRUTH
            localStorage.setItem('user', JSON.stringify(data.user));

            // ✅ REDIRECT
            onLoginSuccess();

        } catch {
            setError('Server not reachable');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full w-full bg-gray-50 grid place-items-center px-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">

                {/* Logo */}
                <div className="flex justify-center text-indigo-600 mb-4">
                    <DocumentTextIcon className="h-10 w-10" />
                </div>

                {/* Title */}
                <h2 className="text-center text-2xl font-bold mb-6">
                    Sign in to Wappie Finance
                </h2>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        required
                        className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        required
                        className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {error && (
                        <div className="text-red-600 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-2 rounded flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        <LockClosedIcon className="h-4 w-4" />
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

            </div>
        </div>
    );
};

export default Login;
