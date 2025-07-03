import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setUser, clearAuth } from '../store/slices/authSlice';
import { socketService } from '../services/socket';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, isAuthenticated, loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken && !user) {
        try {
          // Mock user profile
          const mockUser = {
            id: '1',
            name: 'Demo User',
            email: 'demo@example.com',
            avatar: null,
            phone: '+1234567890'
          };
          
          dispatch(setUser(mockUser));
          
          // Connect to mock socket
          socketService.connect(storedToken);
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          dispatch(clearAuth());
        }
      } else if (isAuthenticated && token) {
        // Connect to mock socket if authenticated
        socketService.connect(token);
      }
    };

    initializeAuth();

    // Cleanup socket on unmount or logout
    return () => {
      if (!isAuthenticated) {
        socketService.disconnect();
      }
    };
  }, [dispatch, user, token, isAuthenticated]);

  return {
    user,
    token,
    isAuthenticated,
    loading,
    error,
  };
};