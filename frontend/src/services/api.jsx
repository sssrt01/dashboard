import axios from 'axios';
import authService from './authService';
import {API_CONFIG} from "../constants/api.js";

const AUTH_HEADER = 'Bearer';
const HTTP_UNAUTHORIZED = 401;

/**
 * Создание настроенного экземпляра axios
 */
const apiClient = axios.create({
    baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Добавляет токен авторизации в заголовки запроса
 * @param {string} token - Токен авторизации
 * @returns {string} Форматированный заголовок авторизации
 */
const formatAuthHeader = (token) => `${AUTH_HEADER} ${token}`;

/**
 * Применяет токен авторизации к конфигурации запроса
 * @param {Object} config - Конфигурация запроса
 * @param {string} token - Токен авторизации
 */
const applyAuthToken = (config, token) => {
    config.headers.Authorization = formatAuthHeader(token);
};

// Перехватчик запросов
apiClient.interceptors.request.use(
  async (config) => {
    let token = authService.getAccessToken();

      if (!token) {
      token = await authService.refreshAccessToken();
    }

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
      const newToken = await authService.refreshAccessToken();

          if (newToken) {
              applyAuthToken(axios.defaults.headers.common, newToken);
              applyAuthToken(originalRequest, newToken);
        return apiClient(originalRequest);
      }
    }

      return Promise.reject(error);
  }
);

export default apiClient;