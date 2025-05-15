import { createContext, useState, useContext } from 'react';

// Standard-Benutzer
const DEFAULT_USER = { username: 'admin', password: '12345' };

// Kontext für die Authentifizierung
const AuthContext = createContext();

// Provider-Komponente für den Auth-Kontext
export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Login-Funktionalität
  const login = () => {
    if (username === DEFAULT_USER.username && password === DEFAULT_USER.password) {
      setIsLoggedIn(true);
      setLoginError('');
      return true;
    } else {
      setLoginError('Falscher Benutzername oder Passwort');
      return false;
    }
  };

  // Logout-Funktionalität
  const logout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setLoginError('');
  };

  // Bereitgestellte Werte und Funktionen
  const value = {
    isLoggedIn,
    username,
    setUsername,
    password,
    setPassword,
    loginError,
    setLoginError,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom Hook für den Zugriff auf den Auth-Kontext
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;