import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ResetPasswordForm = ({ oobCode }) => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  useEffect(() => {
    const verifyCode = async () => {
      setIsLoading(true);
      try {
        await verifyPasswordResetCode(auth, oobCode);
        setIsVerified(true);
        setVerificationError('');
      } catch (err) {
        console.error("Error verifying password reset code:", err);
        setVerificationError("Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.");
        setIsVerified(false);
      } finally {
        setIsLoading(false);
      }
    };
    verifyCode();
  }, [oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Die Passwörter stimmen nicht überein.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    setIsLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      toast.success("Ihr Passwort wurde erfolgreich geändert. Sie können sich jetzt mit Ihrem neuen Passwort anmelden.");
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      console.error("Error confirming password reset:", err);
      toast.error("Fehler beim Ändern des Passworts. Der Link könnte abgelaufen sein oder das Passwort entspricht nicht den Anforderungen.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !isVerified && !verificationError) {
    return <div className="text-center"><Loader2 className="inline-block w-8 h-8 animate-spin text-primary" /> <p>Code wird überprüft...</p></div>;
  }

  if (verificationError) {
    return <p className="text-red-600">{verificationError}</p>;
  }

  if (!isVerified) {
    // Sollte nicht erreicht werden, wenn isLoading false und kein verificationError
    return <p className="text-gray-500">Überprüfung des Links steht aus.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="newPassword" className="block mb-1 text-sm font-medium text-gray-700">Neues Passwort</label>
        <input
          type="password"
          id="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block mb-1 text-sm font-medium text-gray-700">Neues Passwort bestätigen</label>
        <input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <button type="submit" disabled={isLoading} className="w-full px-4 py-2 text-white bg-primary rounded-md hover:bg-accent hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-400 flex items-center justify-center">
        {isLoading && <Loader2 size={18} className="mr-2 animate-spin" />}
        Passwort speichern
      </button>
    </form>
  );
};

export default ResetPasswordForm;