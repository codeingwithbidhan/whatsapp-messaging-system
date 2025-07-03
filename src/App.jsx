import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store/store';
import Auth from './components/Auth/Auth';
import Chat from './components/Chat/Chat';
import { useAuth } from './hooks/useAuth';

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/auth" 
        element={!isAuthenticated ? <Auth /> : <Navigate to="/chat" />} 
      />
      <Route 
        path="/chat" 
        element={isAuthenticated ? <Chat /> : <Navigate to="/auth" />} 
      />
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/chat" : "/auth"} />} 
      />
    </Routes>
  );
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <AppRoutes />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#374151',
                color: '#ffffff',
              },
            }}
          />
        </div>
      </Router>
    </Provider>
  );
}

export default App;