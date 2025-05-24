import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase'; // Importiere Firebase auth Instanz
import { sendPasswordResetEmail } from 'firebase/auth'; // Importiere die Funktion
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

function LoginForm() {
  const { 
    email,         // Changed from username
    setEmail,      // Changed from setUsername
    password, 
    setPassword, 
    login, 
    // loginError // Removed, using toast now
  } = useAuth();

  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordResetEmail, setPasswordResetEmail] = useState(''); // Eigene E-Mail für das Reset-Formular
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Submit mit Enter-Taste
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  // Login-Handler mit Lade-Indikation
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!passwordResetEmail) { // E-Mail aus dem Reset-Formular verwenden
      toast.error("Bitte geben Sie Ihre E-Mail-Adresse ein.");
      return;
    }
    setIsSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, passwordResetEmail); // E-Mail aus dem Reset-Formular verwenden
      toast.success("Eine E-Mail zum Zurücksetzen des Passworts wurde an Ihre Adresse gesendet. Bitte überprüfen Sie Ihr Postfach.");
    } catch (err) {
      console.error("Error sending password reset email:", err);
      // Hier könntest du spezifischere Fehlermeldungen basierend auf err.code hinzufügen
      toast.error("Fehler beim Senden der Passwort-Reset-E-Mail. Bitte überprüfen Sie die E-Mail-Adresse oder versuchen Sie es später erneut.");
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  if (showPasswordReset) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow py-12"> {/* Added flex-grow */}
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md"> {/* bg-white is fine here for the card */}
          <h1 className="mb-6 text-2xl font-bold text-center text-primary">Passwort zurücksetzen</h1>          
          { // Das Formular wird immer angezeigt, Feedback kommt per Toast
            <div className="space-y-6">
              <div>
                <label htmlFor="reset-email" className="block mb-2 text-sm font-medium text-gray-700">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  id="reset-email"
                  value={passwordResetEmail}
                  onChange={(e) => setPasswordResetEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ihre registrierte E-Mail"
                />
              </div>
              <button
                onClick={handleForgotPassword}
                disabled={isSendingResetEmail}
                className="w-full px-4 py-2 text-white bg-primary rounded-md hover:bg-accent hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-400"
              >
                {isSendingResetEmail ? 'Sende E-Mail...' : 'Passwort-Reset anfordern'}
              </button>
            </div>
          }

          <div className="mt-6 text-sm text-center">
            <button
              type="button"
              onClick={() => {
                setShowPasswordReset(false);
                setPasswordResetEmail(''); // E-Mail-Feld für Reset zurücksetzen
              }}
              className="font-medium text-primary hover:text-accent"
            >
              Zurück zum Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-grow py-12"> {/* Added flex-grow */}
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md"> {/* bg-white is fine here for the card */}
        <h1 className="mb-6 text-2xl font-bold text-center text-primary">Urlaubsplaner Login</h1>        
        
        <div className="space-y-6">
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700">
              E-Mail
            </label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700">
              Passwort
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full px-4 py-2 text-white bg-primary rounded-md hover:bg-accent hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-400 flex items-center justify-center"
          >
            {isLoggingIn && <Loader2 size={18} className="mr-2 animate-spin" />}
            {isLoggingIn ? 'Anmelden...' : 'Anmelden'}
          </button>

          <div className="mt-4 text-sm text-center">
            <button
              type="button"
              onClick={() => {
                setShowPasswordReset(true);
                // Optional: Die E-Mail aus dem Login-Formular in das Reset-Formular übernehmen, falls sie schon eingegeben wurde
                // setPasswordResetEmail(email); 
              }}
              className="font-medium text-primary hover:text-accent"
            >
              Passwort vergessen?
            </button>
          </div>

          {/* Demo Zugangsdaten ggf. hier lassen oder entfernen, je nach Bedarf */}
          {/* <div className="mt-8 text-sm text-center text-gray-600">
            <p>Demo Zugangsdaten:</p>
            <p>E-Mail: demo@example.com</p>
            <p>Passwort: Demo!337#</p>
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default LoginForm;