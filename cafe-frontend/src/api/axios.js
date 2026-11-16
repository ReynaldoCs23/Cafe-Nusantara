import axios from 'axios';

// Alamat backend; atur VITE_API_URL di .env untuk staging/produksi.
export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

const api = axios.create({
    baseURL: `${API_ORIGIN}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Sesi habis: hanya arahkan ke login jika memang sedang login
        if (error.response?.status === 401 && localStorage.getItem('access_token')) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
