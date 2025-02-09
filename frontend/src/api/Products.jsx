import apiClient from "../services/api.jsx";


const getProducts = async () => {
  try {
    const response = await apiClient.get('/products/');
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};
