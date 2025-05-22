import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CalendarProvider } from './context/CalendarContext';

// Import components
import LoginForm from './components/auth/LoginForm';
import Header from './components/common/Header';
import MonthlyView from './components/dashboard/MonthlyView';
import CalendarView from './components/calendar/CalendarView';
import YearlyOverview from './components/dashboard/YearlyOverview';
import MonthlyDetail from './components/dashboard/MonthlyDetail';
import SettingsPage from './components/settings/SettingsPage';

function AppRoutes() {
  const { isLoggedIn, loadingAuth } = useAuth();

  if (loadingAuth) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-100 text-xl">Authentifizierung wird geladen...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <LoginForm />} />
      <Route path="/*" element={
        isLoggedIn ? (
          <div className="min-h-screen bg-gray-100">
            <Header />
            <Routes>
              <Route path="/" element={<MonthlyView />} />
              <Route path="/calendar/:personId" element={<CalendarView />} />
              <Route path="/yearly-overview" element={<YearlyOverview />} />
              <Route path="/monthly-detail/:personId" element={<MonthlyDetail />} />
              <Route path="/settings" element={<SettingsPage />} /> {/* Add Settings Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        ) : (
          <Navigate to="/login" replace />
        )
      } />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CalendarProvider>
          <AppRoutes /> {/* Using AppRoutes which handles auth loading and routes */}
        </CalendarProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;