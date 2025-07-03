import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Mock user data for demo
const mockUser = {
  id: '1',
  name: 'Demo User',
  email: 'demo@example.com',
  avatar: null,
  phone: '+1234567890'
};

const mockChats = [
  {
    id: '1',
    name: 'John Doe',
    type: 'direct',
    participants: [
      { id: '1', name: 'Demo User', email: 'demo@example.com' },
      { id: '2', name: 'John Doe', email: 'john@example.com', avatar: null }
    ],
    lastMessage: {
      id: '1',
      content: 'Hey! How are you doing?',
      type: 'text',
      sender: { id: '2', name: 'John Doe' },
      createdAt: new Date().toISOString()
    },
    unreadCount: 2,
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Sarah Wilson',
    type: 'direct',
    participants: [
      { id: '1', name: 'Demo User', email: 'demo@example.com' },
      { id: '3', name: 'Sarah Wilson', email: 'sarah@example.com', avatar: null }
    ],
    lastMessage: {
      id: '2',
      content: 'Thanks for the help yesterday!',
      type: 'text',
      sender: { id: '3', name: 'Sarah Wilson' },
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '3',
    name: 'Team Project',
    type: 'group',
    participants: [
      { id: '1', name: 'Demo User', email: 'demo@example.com' },
      { id: '4', name: 'Mike Johnson', email: 'mike@example.com' },
      { id: '5', name: 'Lisa Chen', email: 'lisa@example.com' }
    ],
    lastMessage: {
      id: '3',
      content: 'Meeting at 3 PM today',
      type: 'text',
      sender: { id: '4', name: 'Mike Johnson' },
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    unreadCount: 1,
    updatedAt: new Date(Date.now() - 7200000).toISOString()
  }
];

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // Mock authentication - accept any email/password for demo
      if (email && password) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockResponse = {
          user: mockUser,
          access_token: 'mock-jwt-token',
          refresh_token: 'mock-refresh-token'
        };
        
        localStorage.setItem('token', mockResponse.access_token);
        localStorage.setItem('refreshToken', mockResponse.refresh_token);
        localStorage.setItem('mockChats', JSON.stringify(mockChats));
        
        return mockResponse;
      } else {
        throw new Error('Email and password required');
      }
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      // Mock registration
      if (name && email && password) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockResponse = {
          user: { ...mockUser, name, email },
          access_token: 'mock-jwt-token',
          refresh_token: 'mock-refresh-token'
        };
        
        localStorage.setItem('token', mockResponse.access_token);
        localStorage.setItem('refreshToken', mockResponse.refresh_token);
        localStorage.setItem('mockChats', JSON.stringify(mockChats));
        
        return mockResponse;
      } else {
        throw new Error('All fields are required');
      }
    } catch (error) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('mockChats');
      return {};
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Logout failed');
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('refreshToken');
      if (token) {
        const response = {
          access_token: 'mock-jwt-token-refreshed',
          refresh_token: 'mock-refresh-token-refreshed'
        };
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('refreshToken', response.refresh_token);
        return response;
      } else {
        throw new Error('No refresh token');
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return rejectWithValue(error.message || 'Token refresh failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token'),
    refreshToken: localStorage.getItem('refreshToken'),
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('mockChats');
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      })
      // Refresh Token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.isAuthenticated = true;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;