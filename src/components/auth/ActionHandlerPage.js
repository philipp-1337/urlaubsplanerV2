import React from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import ResetPasswordForm from './ResetPasswordForm';
// In Zukunft könnten hier weitere Aktionen (verifyEmail, etc.) behandelt werden.

const ActionHandlerPage = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  // const apiKey = searchParams.get('apiKey'); // Wird von Firebase mitgesendet, aber nicht direkt von uns benötigt

  // Minimalistisches Layout für diese Seite
  const pageStyle = "flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4";
  const containerStyle = "w-full max-w-md p-8 bg-white rounded-lg shadow-md";

  if (!mode || !oobCode) {
    // Wenn Parameter fehlen, zur Login-Seite weiterleiten oder Fehler anzeigen
    return <Navigate to="/login" replace />;
  }

  switch (mode) {
    case 'resetPassword':
      return (
        <div className={pageStyle}>
          <div className={containerStyle}>
            <h1 className="mb-6 text-2xl font-bold text-center text-primary">Passwort zurücksetzen</h1>
            <ResetPasswordForm oobCode={oobCode} />
          </div>
        </div>
      );
    // case 'verifyEmail':
    //   return <VerifyEmailAction oobCode={oobCode} />;
    default:
      return <Navigate to="/login" replace />; // Unbekannter Modus
  }
};

export default ActionHandlerPage;