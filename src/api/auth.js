import api from './axios';

export const login = (data) => api.post('/login', data);
export const getMe = () => api.get('/me');
export const register = (data) => api.post('/register', data);
export const logout = () => api.post('/logout');
export const refreshToken = () => api.post('/refresh-token');
