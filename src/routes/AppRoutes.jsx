import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "../components/Auth/Auth";
import Chat from "../components/Chat/Chat";
import { useAuth } from "../hooks/useAuth";

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

export default AppRoutes;
