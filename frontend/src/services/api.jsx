import axios from 'axios';

const AUTH_HEADER = 'Bearer';
const HTTP_UNAUTHORIZED = 401;

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

const formatAuthHeader = (token) => `${AUTH_HEADER} ${token}`;

const applyAuthToken = (config, token) => {
    if (!config.headers) {
        config.headers = {};
    }
    config.headers.Authorization = formatAuthHeader(token);
};

// Перехватчик запросов
apiClient.interceptors.request.use(
    async (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            applyAuthToken(config, token);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Перехватчик ответов
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isUnauthorizedError = error.response?.status === HTTP_UNAUTHORIZED;
        const isFirstRetry = !originalRequest._retry;

        if (isUnauthorizedError && isFirstRetry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    // Если нет refresh токена - разлогиниваем
                    window.location.href = '/login';
                    return Promise.reject(error);
                }

                const response = await apiClient.post('token/refresh/', {
                    refresh: refreshToken
                });

                const newToken = response.data.access;
                localStorage.setItem('accessToken', newToken);

                applyAuthToken(originalRequest, newToken);
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Если не удалось обновить токен - разлогиниваем
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;