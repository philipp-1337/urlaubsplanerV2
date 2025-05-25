import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner'; // Importiere Toaster
import { AuthProvider, useAuth } from './context/AuthContext';
import { CalendarProvider } from './context/CalendarContext';
// import './safe-area.css'; // Entfernen, da nicht mehr benötigt
// import useServiceWorkerUpdate from './hooks/useServiceWorkerUpdate'; // Entfernt
// import { showServiceWorkerUpdateToast } from './components/common/ServiceWorkerUpdateToast'; // Wird in index.js verwendet

// Import components
import LoginForm from './components/auth/LoginForm';
import Header from './components/common/Header';
import Footer from './components/common/Footer'; // Import Footer
import MonthlyView from './components/dashboard/MonthlyView';
import CalendarView from './components/calendar/CalendarView';
import YearlyOverview from './components/dashboard/YearlyOverview';
import MonthlyDetail from './components/dashboard/MonthlyDetail';
import SettingsPage from './components/settings/SettingsPage';
import ActionHandlerPage from './components/auth/ActionHandlerPage'; // Import der neuen Seite
import PrivacyPolicyPage from './components/legal/PrivacyPolicyPage'; // Import PrivacyPolicyPage
import ImprintPage from './components/legal/ImprintPage'; // Import ImprintPage

function AppContent() {
  const { isLoggedIn, loadingAuth } = useAuth();

  // Service Worker Update Logik wird jetzt in src/index.js über serviceWorkerRegistration gehandhabt

  if (loadingAuth) {
    // Adjusted to be flex-grow as parent div handles min-h-screen
    return <div className="flex-grow flex items-center justify-center bg-gray-100 text-xl">Authentifizierung wird geladen...</div>;
  }

  return (
    <>
      {isLoggedIn && <Header />} {/* Header is rendered conditionally here */}
      <main className="flex flex-col flex-grow bg-gray-100"> {/* Make main a flex container that arranges children vertically and grows */}
        <Routes>
          {/* Public routes accessible always */}
          <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <LoginForm />} />
          <Route path="/auth/action" element={<ActionHandlerPage />} />
          <Route path="/datenschutz" element={<PrivacyPolicyPage />} />
          <Route path="/impressum" element={<ImprintPage />} />

          {/* Protected routes logic */}
          {isLoggedIn ? (
            <>
              {/* 
                The /* catch-all for logged-in users is handled by nesting these routes.
                If a logged-in user tries to access a non-defined path, 
                the outer <Route path="/*" element={...}> below will redirect to /login if not caught here.
                So, we add a specific catch-all for logged-in users.
              */}
              <Route path="/" element={<MonthlyView />} />
              <Route path="/calendar/:personId" element={<CalendarView />} />
              <Route path="/yearly-overview" element={<YearlyOverview />} />
              <Route path="/monthly-detail/:personId" element={<MonthlyDetail />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} /> {/* Catch-all for logged-in users */}
            </>
          ) : (
            // If not logged in, any path not matching /login, /auth/action, /datenschutz, /impressum
            // will lead to a redirect to /login. We need a catch-all for this.
            // This is implicitly handled by the outer Route path="/*" below if no other match.
            // To be explicit for non-logged-in users trying to access protected paths:
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CalendarProvider>
          <div className="flex flex-col min-h-screen">
            <AppContent />
            {/* Add safe-area to Toaster wrapper for iOS safe area */}
            <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
              <Toaster richColors position="bottom-right" />
            </div>
            <Footer />
          </div>
        </CalendarProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;