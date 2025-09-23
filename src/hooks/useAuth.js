import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setUser, clearAuth } from '../store/slices/authSlice';
// import { socketService } from '../services/socket.js';
import { socketService } from '../socket/socket.js';
import * as authAPI from '../api/auth.js';
export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, isAuthenticated, loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    // const initializeAuth = async () => {
    //   const storedToken = localStorage.getItem('token');
    //
    //   if (storedToken && !user) {
    //     try {
    //       const response = await authAPI.getMe(storedToken);
    //       dispatch(setUser(response.data));
    //       // socketService.connect(storedToken);
    //     } catch (error) {
    //       console.error('Failed to initialize auth:', error);
    //       dispatch(clearAuth());
    //     }
    //   } else if (isAuthenticated && token && user) {
    //     // Connect to mock socket if authenticated
    //     console.log('user user =>', user)
    //     socketService.connect(user.id);
    //   }
    // };
    //
    // initializeAuth();
    //
    // // Cleanup socket on unmount or logout
    // return () => {
    //   if (!isAuthenticated) {
    //     console.log('disconnection')
    //     socketService.disconnect();
    //   }
    // };
    // const initializeAuth = async () => {
    //   const storedToken = localStorage.getItem('token');
    //
    //   if (storedToken && !user) {
    //     try {
    //       const response = await authAPI.getMe(storedToken);
    //       dispatch(setUser(response.data));
    //       // socketService.connect(storedToken);
    //     } catch (error) {
    //       console.error('Failed to initialize auth:', error);
    //       dispatch(clearAuth());
    //     }
    //   }
    // }
    // initializeAuth()
  }, [dispatch, user, token, isAuthenticated]);

  return {
    user,
    token,
    isAuthenticated,
    loading,
    error,
  };
};