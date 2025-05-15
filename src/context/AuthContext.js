import { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '../firebase'; // Import Firebase auth instance

// Kontext für die Authentifizierung
const AuthContext = createContext();

// Provider-Komponente für den Auth-Kontext
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState(''); // Changed from username to email
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(true); // To track auth state loading

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoggedIn(!!user);
      setLoadingAuth(false);
    });
    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  // Login-Funktionalität
  const login = async () => {
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // setIsLoggedIn(true) will be handled by onAuthStateChanged
      setLoginError('');
      return true;
    } catch (error) {
      console.error("Firebase login error:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError('Falsche E-Mail-Adresse oder Passwort.');
      } else if (error.code === 'auth/invalid-email') {
        setLoginError('Ungültiges E-Mail-Format.');
      } else {
        setLoginError('Ein Fehler ist beim Login aufgetreten.');
      }
      return false;
    }
  };

  // Logout-Funktionalität
  const logout = async () => {
    try {
      await signOut(auth);
      // setIsLoggedIn(false) and setCurrentUser(null) will be handled by onAuthStateChanged
    } catch (error) {
      console.error("Firebase logout error:", error);
      // Optionally set an error message for logout failure
    }
    setEmail(''); // Clear email and password fields on logout
    setPassword('');
    setLoginError('');
  };

  // Bereitgestellte Werte und Funktionen
  const value = {
    isLoggedIn,
    currentUser,
    email, // Changed from username
    setEmail, // Changed from setUsername
    password,
    setPassword,
    loginError,
    setLoginError,
    login,
    logout,
    loadingAuth // Expose loading state
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