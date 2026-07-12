import axios from 'axios';

const api = axios.create();

api.interceptors.request.use((config) => {
    window.dispatchEvent(new Event('api-load-start'));
    
    // Implement Option A Dynamic Endpoint Routing
    let customEndpoint = sessionStorage.getItem('api_endpoint');
    const token = sessionStorage.getItem('access_token');
    
    if (customEndpoint) {
        // Support Wi-Fi sharing: replace local addresses with the currently used hostname
        if (customEndpoint.includes('127.0.0.1')) {
            customEndpoint = customEndpoint.replace('127.0.0.1', window.location.hostname);
        } else if (customEndpoint.includes('localhost')) {
            customEndpoint = customEndpoint.replace('localhost', window.location.hostname);
        }
    }
    
    if (customEndpoint && config.url?.startsWith('/')) {
        // Strip trailing slash from endpoint if it has one
        const base = customEndpoint.endsWith('/') ? customEndpoint.slice(0, -1) : customEndpoint;
        config.baseURL = base;
    } else if (!config.baseURL) {
        config.baseURL = `http://${window.location.hostname}:8000`; // Fallback to master API
    }

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Simple response interceptor to handle token expiration (401)
api.interceptors.response.use(
    (response) => {
        window.dispatchEvent(new Event('api-load-end'));
        return response;
    },
    (error) => {
        window.dispatchEvent(new Event('api-load-end'));
        if (error.response?.status === 401) {
            // In a real app, attempt to use refresh_token here
            sessionStorage.removeItem('access_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
