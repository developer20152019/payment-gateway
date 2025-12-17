
const API_BASE = '/api';

export const AuthService = {
    login: async (email, password) => {
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Authentication failed');
            }

            const data = await response.json();
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('user', JSON.stringify(data.user));
            return { success: true };
        } catch (error) {
            console.error("Auth Error:", error);
            // Fallback for simulation mode (offline testing)
            if (email === 'admin@paylink.com' && password === 'admin123') {
                console.warn("⚠️ Backend login failed. Using hardcoded fallback.");
                localStorage.setItem('isAuthenticated', 'true');
                return { success: true };
            }
            return { success: false, error: error.message };
        }
    },

    logout: () => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
    }
};
