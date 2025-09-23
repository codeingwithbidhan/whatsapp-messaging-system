import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as authAPI from '../../api/auth.js';

// Login
export const loginUser = createAsyncThunk(
    'auth/login',
    async (userData, { rejectWithValue }) => {
      try {
        const response = await authAPI.login(userData);
        localStorage.setItem('token', response.data.token);
        // localStorage.setItem('refreshToken', response.data.refresh_token);
        return response.data;
      } catch (err) {
        return rejectWithValue(err.response?.data || 'Login failed');
      }
    }
);

// Register
export const registerUser = createAsyncThunk(
    'auth/register',
    async (userData, { rejectWithValue }) => {
      try {
        const response = await authAPI.register(userData);
        localStorage.setItem('token', response.data.token);
        // localStorage.setItem('refreshToken', response.data.refresh_token);
        return response.data;
      } catch (err) {
        return rejectWithValue(err.response?.data || 'Registration failed');
      }
    }
);

// Logout
export const logoutUser = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
      try {
          const response = await authAPI.logout(); // JWT middleware protected
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          return response.data;
      } catch (err) {
        return rejectWithValue(err.response?.data || 'Logout failed');
      }
    }
);

// Refresh token
export const refreshTokenUser = createAsyncThunk(
    'auth/refreshToken',
    async (_, { rejectWithValue }) => {
      try {
        const response = await authAPI.refreshToken();
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('refreshToken', response.data.refresh_token);
        return response.data;
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        return rejectWithValue(err.response?.data || 'Token refresh failed');
      }
    }
);

// Slice
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
    clearError: (state) => { state.error = null; },
    setUser: (state, action) => { state.user = action.payload; },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    },
  },
  extraReducers: (builder) => {
    builder
        // Login
        .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
        .addCase(loginUser.fulfilled, (state, action) => {
          state.loading = false;
          state.user = action.payload.user;
          state.token = action.payload.token;
          // state.refreshToken = action.payload.refresh_token;
          state.isAuthenticated = true;
          state.error = null;
        })
        .addCase(loginUser.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload;
          state.isAuthenticated = false;
        })

        // Register
        .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
        .addCase(registerUser.fulfilled, (state, action) => {
          state.loading = false;
          state.user = action.payload.user;
          state.token = action.payload.token;
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
        .addCase(refreshTokenUser.fulfilled, (state, action) => {
          state.token = action.payload.access_token;
          state.refreshToken = action.payload.refresh_token;
          state.isAuthenticated = true;
        })
        .addCase(refreshTokenUser.rejected, (state) => {
          state.user = null;
          state.token = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
        });
  },
});

export const { clearError, setUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;
