import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase'; // Direkter Import von auth
import { sendPasswordResetEmail } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

const UserDataManagementSection = () => {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentUser || !currentUser.email) {
      setError("Benutzerinformationen nicht verfügbar, um das Passwort zu ändern.");
      return;
    }
    setIsLoading(true);
    setMessage('');
    setError('');
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setMessage("Eine E-Mail zum Zurücksetzen des Passworts wurde an Ihre Adresse gesendet. Bitte überprüfen Sie Ihr Postfach.");
    } catch (err) {
      console.error("Error sending password reset email:", err);
      setError("Fehler beim Senden der Passwort-Reset-E-Mail. Bitte versuchen Sie es später erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="p-6 mb-8 bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-2xl font-semibold text-gray-700">Benutzerdaten verwalten</h2>
      {currentUser && currentUser.email ? (
        <div className="space-y-4">
          <p className="text-gray-700">
            Sie sind aktuell eingeloggt als: <span className="font-semibold text-primary">{currentUser.email}</span>
          </p>
          <div>
            <button
              onClick={handleChangePassword}
              disabled={isLoading}
              className="px-4 py-2 text-white bg-primary rounded-md hover:bg-accent hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-400 flex items-center"
            >
              {isLoading && <Loader2 size={18} className="mr-2 animate-spin" />}
              Passwort ändern
            </button>
          </div>
          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <p className="text-gray-500">Benutzerinformationen konnten nicht geladen werden.</p>
      )}
    </section>
  );
};

export default UserDataManagementSection;