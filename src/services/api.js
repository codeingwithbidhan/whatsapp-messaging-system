// Mock API service for frontend-only demo
const API_BASE_URL = 'http://localhost:3001'; // Not used in mock mode

// Mock API responses
const mockAPI = {
  login: async (credentials) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      data: {
        user: { id: '1', name: 'Demo User', email: credentials.email },
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token'
      }
    };
  },
  
  register: async (userData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      data: {
        user: { id: '1', ...userData },
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token'
      }
    };
  },
  
  getProfile: async () => {
    return {
      data: { id: '1', name: 'Demo User', email: 'demo@example.com' }
    };
  },
  
  getChats: async () => {
    const mockChats = JSON.parse(localStorage.getItem('mockChats') || '[]');
    return { data: mockChats };
  },
  
  getMessages: async (chatId) => {
    return { data: { messages: [], hasMore: false } };
  },
  
  sendMessage: async (chatId, messageData) => {
    return {
      data: {
        id: Date.now().toString(),
        ...messageData,
        chatId,
        createdAt: new Date().toISOString()
      }
    };
  }
};

// Auth API
export const authAPI = {
  login: mockAPI.login,
  register: mockAPI.register,
  logout: async () => ({ data: {} }),
  refreshToken: async () => ({ data: { access_token: 'new-token', refresh_token: 'new-refresh' } }),
  getProfile: mockAPI.getProfile,
};

// Chat API
export const chatAPI = {
  getChats: mockAPI.getChats,
  getMessages: mockAPI.getMessages,
  sendMessage: mockAPI.sendMessage,
  createChat: async (chatData) => ({ data: { id: Date.now().toString(), ...chatData } }),
  updateMessage: async (messageId, data) => ({ data: { id: messageId, ...data } }),
  deleteMessage: async (messageId) => ({ data: { id: messageId } }),
};

// User API
export const userAPI = {
  getUsers: async () => ({ data: [] }),
  getUserById: async (userId) => ({ data: { id: userId } }),
  updateProfile: async (data) => ({ data }),
  searchUsers: async (query) => ({ data: [] }),
};

// Media API
export const mediaAPI = {
  uploadFile: async (file) => {
    return { data: { url: URL.createObjectURL(file) } };
  },
};

export default {
  authAPI,
  chatAPI,
  userAPI,
  mediaAPI
};