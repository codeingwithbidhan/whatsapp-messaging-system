import api from './axios';

export const getChats = (data) => api.get('/chats', data);
export const getMessages = (chatId) => api.get(`/chats/${chatId}/messages`);
export const sendMessages = (data) => api.post('/send/messages', data);
export const addReaction = (data) => api.post('/add/reaction', data);
export const searchUsers = (query) => api.get(`/users/search?q=${query}`);
export const createChatAPI = (partnerId) => api.post('/add-contact', { partnerId });
export const createGroupChatAPI = (data) => api.post('/chats/group', data);
export const uploadFile = (formData, config) => api.post('/upload/file', formData, config);

// agora token
export const fetchAgoraToken = (data) => api.post('/agora/rtc-token', data);