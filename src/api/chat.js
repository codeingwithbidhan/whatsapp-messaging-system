// src/api/auth.js
import api from './axios';

export const getChats = (data) => api.get('/chats', data);
export const getMessages = (chatId) => api.get(`/chats/${chatId}/messages`);
export const sendMessages = (data) => api.post('/send/messages', data);
export const addReaction = (data) => api.post('/add/reaction', data);



