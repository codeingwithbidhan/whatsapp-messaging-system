import axios from 'axios';

// const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
const API_BASE = import.meta.env.VITE_API_BASE;

// Axios instance
const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor: Attach JWT token if exists
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor: Handle common errors globally
api.interceptors.response.use(
    (response) => response,
    async  (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const res = await api.post("/refresh");
                localStorage.setItem("token", res.data.access_token);
                api.defaults.headers.common[
                    "Authorization"
                    ] = `Bearer ${res.data.access_token}`;
                return api(originalRequest);
            } catch (err) {
                console.error("Refresh failed", err);
                localStorage.removeItem("token");
                window.location.href = "/";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
