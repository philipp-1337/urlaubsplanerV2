import { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, db, doc, getDoc } from '../firebase'; // Import db, doc, getDoc
import { toast } from 'sonner'; // Import toast for error notifications
// Import UserTenantRole JSDoc typedef
import '../context/UserTenantRole';

// Kontext für die Authentifizierung
const AuthContext = createContext();

// Provider-Komponente für den Auth-Kontext
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState(''); // Changed from username to email
  const [password, setPassword] = useState('');
  // const [loginError, setLoginError] = useState(''); // Removed, will use toast
  const [loadingAuth, setLoadingAuth] = useState(true); // To track auth state loading
  const [userTenantRole, setUserTenantRole] = useState(null); // { tenantId, personId, role }
  const [loadingUserTenantRole, setLoadingUserTenantRole] = useState(true);
  const [userTenantRoleError, setUserTenantRoleError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoggedIn(!!user);
      setLoadingAuth(false);
    });
    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUserTenantRole(null);
      setLoadingUserTenantRole(false);
      return;
    }
    setLoadingUserTenantRole(true);
    setUserTenantRoleError(null);
    // Firestore: /users/{userId}/privateInfo/user_tenant_role
    const ref = doc(db, 'users', currentUser.uid, 'privateInfo', 'user_tenant_role');
    getDoc(ref)
      .then((snap) => {
        if (snap.exists()) {
          setUserTenantRole(snap.data());
        } else {
          setUserTenantRole(null);
        }
        setLoadingUserTenantRole(false);
      })
      .catch((err) => {
        setUserTenantRoleError(err);
        setUserTenantRole(null);
        setLoadingUserTenantRole(false);
      });
  }, [currentUser]);

  // Login-Funktionalität
  const login = async () => {
    // setLoginError(''); // Removed
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // setIsLoggedIn(true) will be handled by onAuthStateChanged
      // setLoginError(''); // Removed
      return true;
    } catch (error) {
      console.error("Firebase login error:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Falsche E-Mail-Adresse oder Passwort.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Ungültiges E-Mail-Format.');
      } else {
        toast.error('Ein Fehler ist beim Login aufgetreten.');
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
    // setLoginError(''); // Removed
  };

  // Funktion zum manuellen Refresh der UserTenantRole
  const refreshUserTenantRole = async () => {
    if (!currentUser) {
      setUserTenantRole(null);
      setLoadingUserTenantRole(false);
      return;
    }
    setLoadingUserTenantRole(true);
    setUserTenantRoleError(null);
    const ref = doc(db, 'users', currentUser.uid, 'privateInfo', 'user_tenant_role');
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setUserTenantRole(snap.data());
      } else {
        setUserTenantRole(null);
      }
    } catch (err) {
      setUserTenantRoleError(err);
      setUserTenantRole(null);
    } finally {
      setLoadingUserTenantRole(false);
    }
  };

  // Bereitgestellte Werte und Funktionen
  const value = {
    isLoggedIn,
    currentUser,
    email, // Changed from username
    setEmail, // Changed from setUsername
    password,
    setPassword,
    // loginError, // Removed
    // setLoginError, // Removed
    login,
    logout,
    loadingAuth, // Expose loading state
    userTenantRole, // { tenantId, personId, role }
    loadingUserTenantRole,
    userTenantRoleError,
    refreshUserTenantRole
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