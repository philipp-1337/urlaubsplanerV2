import { useState } from 'react';
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
  const { isLoggedIn } = useAuth();
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function MainApp() {
  const { isLoggedIn } = useAuth();
  const [loginError, setLoginError] = useState('');
  
  if (!isLoggedIn) {
    return <LoginForm loginError={loginError} setLoginError={setLoginError} />;
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <Routes>
        <Route path="/" element={<ProtectedRoute><MonthlyView /></ProtectedRoute>} />
        <Route path="/calendar/:personId" element={<ProtectedRoute><CalendarView /></ProtectedRoute>} />
        <Route path="/yearly-overview" element={<ProtectedRoute><YearlyOverview /></ProtectedRoute>} />
        <Route path="/monthly-detail/:personId" element={<ProtectedRoute><MonthlyDetail /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CalendarProvider>
          <MainApp />
        </CalendarProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;