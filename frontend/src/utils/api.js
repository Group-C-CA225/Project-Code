// API utility functions for making requests to PHP backend

const API_BASE_URL = 'http://localhost/quiz_platform/backend';

// Get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('teacher_token');
}

// Generic API request function
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    // Get auth token
    const token = getAuthToken();
    
    const config = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
        credentials: 'include',
        ...options,
    };

    // Only add body for non-GET requests
    if (options.body && config.method !== 'GET') {
        config.body = options.body;
    }

    try {
        const response = await fetch(url, config);

        const text = await response.text();
        let data = {};

        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                console.error('Server response:', text);
                throw new Error('Server did not return valid JSON');
            }
        }

        if (!response.ok) {
            console.error('API Error:', {
                status: response.status,
                url: url,
                data: data
            });
            throw new Error(data.error || data.message || `HTTP ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error.message);
        throw error;
    }
}

// ================= AUTH =================
export const auth = {
    register(userData) {
        return apiRequest('/api/teacher/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },

    login(credentials) {
        return apiRequest('/api/teacher/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    },
};

// ================= API OBJECT WITH GET/POST METHODS =================
const api = {
    get(endpoint, options = {}) {
        return apiRequest(endpoint, {
            ...options,
            method: 'GET',
        });
    },

    post(endpoint, data, options = {}) {
        return apiRequest(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    put(endpoint, data, options = {}) {
        return apiRequest(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    delete(endpoint, options = {}) {
        return apiRequest(endpoint, {
            ...options,
            method: 'DELETE',
        });
    },
};

// Export both named exports and default
export { api };
export default api;
