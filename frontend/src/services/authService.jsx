import apiClient from "./api.jsx";
import {STORAGE_KEYS} from "../constants/storage.js";

const AUTH_ENDPOINTS = {
  LOGIN: 'token/',
  REFRESH: 'token/refresh/'
};

class AuthService {
  /**
   * Управляет аутентификацией и работой с токенами
   */
  constructor() {
    this.tokenStorage = {
      setTokens: (access, refresh) => {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
      },
      clearTokens: () => {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      },
      getAccessToken: () => localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
      getRefreshToken: () => localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
    };
  }

  /**
   * Аутентификация пользователя
   * @throws {Error} При неудачной аутентификации
   */
  async login(username, password) {
    try {
      const response = await apiClient.post(AUTH_ENDPOINTS.LOGIN, {username, password});
      const {access, refresh} = response.data;

      if (!access || !refresh) {
        throw new Error('Токены отсутствуют в ответе');
      }

      this.tokenStorage.setTokens(access, refresh);
      return response.data;
    } catch (error) {
      console.error('Ошибка аутентификации:', error);
      throw error;
    }
  }

  /**
   * Выход пользователя
   */
  logout() {
    this.tokenStorage.clearTokens();
  }

  /**
   * Получение текущего access token
   */
  getAccessToken() {
    return this.tokenStorage.getAccessToken();
  }

  /**
   * Обновление access token
   * @throws {Error} При ошибке обновления токена
   */
  async refreshAccessToken() {
    const refreshToken = this.tokenStorage.getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await apiClient.post(AUTH_ENDPOINTS.REFRESH, {
        refresh: refreshToken
      });

      const {access} = response.data;
      if (!access) {
        throw new Error('Новый access token отсутствует в ответе');
      }

      this.tokenStorage.setTokens(access, refreshToken);
      return access;
    } catch (error) {
      console.error('Ошибка обновления токена:', error);
      this.logout();
      throw error;
    }
  }
}

const authService = new AuthService();
export default authService;