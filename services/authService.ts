
const API_BASE = '/api';

export const AuthService = {
    login: async (email, password) => {
        try {
            // Log for debugging
            console.log(`[AuthService] Attempting login to ${API_BASE}/login...`);

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
                    // This is where the user sees the HTML error. 
                    // It means Vite couldn't find the backend.
                    const text = await response.text();
                    console.error("[AuthService] Received non-JSON response:", text.substring(0, 200));
                    throw new Error('Backend unreachable. Ensure "npm run dev" is running and port 3000 is open.');
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
            console.error("[AuthService] Login Error:", error);
            
            // Fallback for simulation mode (very useful when DB/Backend is hard to configure)
            if (email === 'admin@paylink.com' && password === 'admin123') {
                console.warn("⚠️ Using admin fallback because backend/DB failed.");
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('user', JSON.stringify({ Email: 'admin@paylink.com', Name: 'Administrator (Fallback)' }));
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
