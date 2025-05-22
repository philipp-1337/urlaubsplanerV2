import React from 'react';
import { useAuth } from '../../context/AuthContext';

const UserDataManagementSection = () => {
  const { currentUser } = useAuth();

  return (
    <section className="p-6 mb-8 bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-2xl font-semibold text-gray-700">Benutzerdaten verwalten</h2>
      {currentUser && currentUser.email ? (
        <div>
          <p className="text-gray-700">
            Sie sind aktuell eingeloggt als: <span className="font-semibold text-primary">{currentUser.email}</span>
          </p>
          {/* Hier könnten in Zukunft weitere Benutzerverwaltungsoptionen hinzugefügt werden,
              z.B. Passwort ändern, E-Mail-Adresse ändern (falls unterstützt) etc. */}
        </div>
      ) : (
        <p className="text-gray-500">Benutzerinformationen konnten nicht geladen werden.</p>
      )}
    </section>
  );
};

export default UserDataManagementSection;