import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('pt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const registerUser = data => api.post('/users/register', data).then(r => r.data);

export const loginUser = data => api.post('/users/login', data).then(r => r.data);

export const getProducts = () => api.get('/products').then(r => r.data);

export const createProduct = data => api.post('/products', data).then(r => r.data);

export const getProduct = id => api.get(`/products/${id}`).then(r => r.data);

export const getPriceHistory = (id, days = 30) =>
  api.get(`/products/${id}/price-history?days=${days}`).then(r => r.data);

export const getProductStats = id => api.get(`/products/${id}/stats`).then(r => r.data);

export const getAlerts = (userId, includeFired = false) =>
  api.get(`/alerts?userId=${userId}${includeFired ? '&includefired=true' : ''}`).then(r => r.data);

export const createAlert = data => api.post('/alerts', data).then(r => r.data);

export const deleteAlert = id => api.delete(`/alerts/${id}`).then(r => r.data);

export default api;
