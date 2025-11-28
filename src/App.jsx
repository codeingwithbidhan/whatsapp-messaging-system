import React, { useEffect, useRef } from "react";
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
    const isAuthInitialized = useRef(false);

    // ১. Auth Initialization Effect
    useEffect(() => {
        const initializeAuth = async () => {
            const storedToken = localStorage.getItem('token');
            
            // যদি টোকেন থাকে, ইউজার না থাকে এবং আমরা আগে কল না করে থাকি
            if (storedToken && !user && !isAuthInitialized.current) {
                isAuthInitialized.current = true; // ফ্ল্যাগ সেট করে দিন যাতে দ্বিতীয়বার কল না হয়

                try {
                    const response = await authAPI.getMe(storedToken);
                    dispatch(setUser(response.data));
                } catch (error) {
                    console.error('Failed to initialize auth:', error);
                    dispatch(clearAuth());
                    localStorage.removeItem('token');
                    isAuthInitialized.current = false; // ফেইল করলে ফ্ল্যাগ রিসেট করতে পারেন (অপশনাল)
                }
            }
        };

        initializeAuth();
    }, [dispatch, user]); // এখানে isAuthenticated সরিয়ে দেওয়া যেতে পারে যদি শুধু user লোড করা লক্ষ্য হয়

    // ২. Socket Connection Effect
    useEffect(() => {
        const storedToken = localStorage.getItem('token');

        if (storedToken && user && isAuthenticated) {
            if (!socketService.socket) {
                socketService.connect(user.id, storedToken);
            }
        }

        // Cleanup function
        return () => {
            // সতর্কবার্তা: পেজ রিফ্রেশ বা ন্যাভিগেশনে সকেট যাতে হুট করে ডিসকানেক্ট না হয়, 
            // সেটি আপনার অ্যাপের লজিকের ওপর নির্ভর করে। তবে আনমাউন্ট হলে ডিসকানেক্ট করা ভালো প্র্যাকটিস।
            if (!storedToken){
                socketService.disconnect();
            }
        };
    }, [user, isAuthenticated]);

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
