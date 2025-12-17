
const API_BASE = '/api';

export const AuthService = {
    login: async (email, password) => {
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const contentType = response.headers.get("content-type");
            
            // Handle non-OK responses (401, 500, 404, etc)
            if (!response.ok) {
                if (contentType && contentType.includes("application/json")) {
                    const data = await response.json();
                    throw new Error(data.error || 'Authentication failed');
                } else {
                    // We got HTML or something else (likely a 404 or 504 from the proxy/server)
                    const text = await response.text();
                    console.error("Expected JSON but received:", text.substring(0, 100));
                    throw new Error('Server unreachable or misconfigured. Ensure backend is running on port 3000.');
                }
            }

            // Handle successful response
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true };
            } else {
                throw new Error("Invalid response format from server.");
            }

        } catch (error) {
            console.error("Auth Error Details:", error);
            
            // Fallback for simulation mode / local development without DB
            if (email === 'admin@paylink.com' && password === 'admin123') {
                console.warn("⚠️ Backend login failed. Using hardcoded fallback for admin account.");
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('user', JSON.stringify({ Email: 'admin@paylink.com', Name: 'Administrator (Offline)' }));
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
