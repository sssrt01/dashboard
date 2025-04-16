import apiClient from "../services/api.jsx";

const fetchTaskDetails = async (taskId) => {
    try {
      const response = await apiClient.get(`/tasks/${taskId}/`);
      return response.data;
    } catch (error) {
      console.error(`Ошибка при получении данных задания ${taskId}:`, error);
      return null;
    }
  };

export default fetchTaskDetails