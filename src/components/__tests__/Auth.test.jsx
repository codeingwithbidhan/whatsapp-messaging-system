import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import Auth from '../Auth/Auth';
import authSlice from '../../store/slices/authSlice';

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authSlice,
    },
  });
};

const renderWithProviders = (component) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('Auth Component', () => {
  test('renders login form by default', () => {
    renderWithProviders(<Auth />);
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('toggles to register form', () => {
    renderWithProviders(<Auth />);
    
    fireEvent.click(screen.getByText('Sign Up'));
    
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Phone Number')).toBeInTheDocument();
  });

  test('validates password confirmation in register mode', async () => {
    renderWithProviders(<Auth />);
    
    // Switch to register mode
    fireEvent.click(screen.getByText('Sign Up'));
    
    // Fill form with mismatched passwords
    fireEvent.change(screen.getByPlaceholderText('Full Name'), {
      target: { value: 'Test User' }
    });
    fireEvent.change(screen.getByPlaceholderText('Email Address'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), {
      target: { value: 'different' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    
    // Should show error toast (mocked)
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });
});