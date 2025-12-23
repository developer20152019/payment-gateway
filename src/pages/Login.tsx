import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockClosedIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const Login: React.FC = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Login failed');
                return;
            }

            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('user', JSON.stringify(data.user));

            navigate('/');
        } catch {
            setError('Server not reachable');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white p-8 shadow-md rounded w-full max-w-md">
                <div className="flex justify-center text-indigo-600 mb-4">
                    <DocumentTextIcon className="h-10 w-10" />
                </div>

                <h2 className="text-center text-2xl font-bold mb-6">
                    Sign in to Wappie Finance
                </h2>

                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        required
                        className="w-full border px-3 py-2 rounded"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        required
                        className="w-full border px-3 py-2 rounded"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />

                    {error && (
                        <div className="text-red-600 text-sm">{error}</div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white py-2 rounded flex justify-center items-center gap-2"
                    >
                        <LockClosedIcon className="h-4 w-4" />
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
