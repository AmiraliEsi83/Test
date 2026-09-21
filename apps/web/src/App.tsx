import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TradingProvider } from './context/TradingContext';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { StrategiesPage } from './pages/StrategiesPage';
import { SignalsPage } from './pages/SignalsPage';
import { PositionsPage } from './pages/PositionsPage';
import { OrdersPage } from './pages/OrdersPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BacktestPage } from './pages/BacktestPage';
import { BrokersPage } from './pages/BrokersPage';
import { AutomationPage } from './pages/AutomationPage';
import { CalendarPage } from './pages/CalendarPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogPage } from './pages/AuditLogPage';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080b10] flex items-center justify-center text-slate-400 font-mono text-xs">
        <div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full mr-2" />
        Authenticating institutional terminal session...
      </div>
    );
  }

  // If user is not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TradingProvider>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Terminal Application Pages (Protected) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/terminal"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="/strategies"
              element={
                <ProtectedRoute>
                  <StrategiesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/signals"
              element={
                <ProtectedRoute>
                  <SignalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/positions"
              element={
                <ProtectedRoute>
                  <PositionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backtest"
              element={
                <ProtectedRoute>
                  <BacktestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brokers"
              element={
                <ProtectedRoute>
                  <BrokersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/automation"
              element={
                <ProtectedRoute>
                  <AutomationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <CalendarPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit"
              element={
                <ProtectedRoute>
                  <AuditLogPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TradingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
