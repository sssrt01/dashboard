import apiClient from "./api.jsx";

const login = async (username, password) => {
  const response = await apiClient.post('token/', { username, password });

  if (response.data.access) {
    localStorage.setItem('accessToken', response.data.access);
    localStorage.setItem('refreshToken', response.data.refresh);
  }

  return response.data;
};

const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

const getAccessToken = () => localStorage.getItem('accessToken');

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');

  if (refreshToken) {
    try {
      const response = await apiClient.post('token/refresh/', {
        refresh: refreshToken,
      });
      localStorage.setItem('accessToken', response.data.access);
      return response.data.access;
    } catch (error) {
      console.error('Error refreshing token:', error);
      logout();
    }
  }
  return null;
};

const authService = { login, logout, getAccessToken, refreshAccessToken };

export default authService;
