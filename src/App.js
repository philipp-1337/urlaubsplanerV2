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

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loadingAuth } = useAuth();
  
  if (loadingAuth) {
    return <div>Lade Authentifizierung...</div>; // Or a proper loading spinner
  }
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function MainApp() {
   const { isLoggedIn, loadingAuth } = useAuth();
  
  if (loadingAuth) { // Optional: Show loading state for the whole app
    return <div className="flex items-center justify-center min-h-screen">Lade Anwendung...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <Routes>
        <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <LoginForm />} />
        {/* LoginForm now handles its own errors via useAuth */}
        <Route path="/" element={<ProtectedRoute><MonthlyView /></ProtectedRoute>} />
        <Route path="/calendar/:personId" element={<ProtectedRoute><CalendarView /></ProtectedRoute>} />
        <Route path="/yearly-overview" element={<ProtectedRoute><YearlyOverview /></ProtectedRoute>} />
        <Route path="/monthly-detail/:personId" element={<ProtectedRoute><MonthlyDetail /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

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