import React, { useEffect } from "react";
import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import {Provider, useDispatch, useSelector} from "react-redux";
import { store } from "./store/store";
import Auth from "./components/Auth/Auth.jsx";
import Chat from "./components/Chat/Chat";
import socketService from "./socket/socket.js";
import * as authAPI from "./api/auth.js";
import { clearAuth, setUser } from "./store/slices/authSlice.js";

function AppRoutes() {
    const dispatch = useDispatch();
    const { user, isAuthenticated, loading } = useSelector((state) => state.auth);
    const initializeAuth = async () => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            try {
                const response = await authAPI.getMe(storedToken);
                dispatch(setUser(response.data)); // backend থেকে user object আসছে কিনা নিশ্চিত হও
            } catch (error) {
                console.error('Failed to initialize auth:', error);
                dispatch(clearAuth());
                localStorage.removeItem('token');
            }
        }
    };

    useEffect(() => {
        const storedToken = localStorage.getItem('token');

        // Step 1: page reload হলে user restore করো
        if (storedToken && !user) {
            initializeAuth();
        }

        // Step 2: user আসলে তবেই socket connect করো
        if (storedToken && user && isAuthenticated) {
            if (!socketService.socket) {
                socketService.connect(user.id, storedToken);
            }
        }

        return () => {
            if (!storedToken) {
                socketService.disconnect();
            }
        };
    }, [dispatch, user, isAuthenticated]);

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
                path="/"
                element={!isAuthenticated ? <Auth /> : <Navigate to="/chat" />}
            />
            <Route
                path="/chat"
                element={isAuthenticated ? <Chat /> : <Navigate to="/" />}
            />
        </Routes>
    );
}

// Main App
function App() {
    return (
        <Provider store={store}>
            <BrowserRouter
                future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                }}
            >
                <AppRoutes />
            </BrowserRouter>
        </Provider>
    );
}

export default App;
