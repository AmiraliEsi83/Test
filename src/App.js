import React from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TradingProvider } from "./context/TradingContext";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AlertToasts } from "./components/alerts/AlertList";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import Terminal from "./pages/Terminal";
import Algorithms from "./pages/Algorithms";
import Brokers from "./pages/Brokers";
import Alerts from "./pages/Alerts";
import Account from "./pages/Account";

function Shell() {
  const { user } = useAuth();
  return (
    <div className="app-shell">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <Signup />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/algorithms" element={<Algorithms />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/terminal"
          element={
            <ProtectedRoute>
              <Terminal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brokers"
          element={
            <ProtectedRoute>
              <Brokers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <Alerts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && <AlertToasts />}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <TradingProvider>
          <Shell />
        </TradingProvider>
      </AuthProvider>
    </HashRouter>
  );
}
