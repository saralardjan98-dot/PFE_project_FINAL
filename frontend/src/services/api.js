import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');

  // أضيفي هذا السطر للتأكد من الرابط في الـ Console
  console.log(`Sending request to: ${config.url} with token: ${token ? 'Exists' : 'Empty'}`);

  if (token) {
    // الطريقة الأصح والأضمن لإضافة التوكن في Axios
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};


export const createUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};


export const updateUserRole = async (userId, role) => {
  const response = await api.patch(`/users/${userId}/role`, { role });
  return response.data;
};


export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};
export const createWell = async (wellData) => {
  // تأكدي من استخدام 'api' المعرف مسبقاً الذي يحمل التوكن في الـ Headers
  const response = await api.post("/wells/", wellData);
  return response.data;
};
export default api;