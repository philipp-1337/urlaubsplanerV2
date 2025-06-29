import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import { toast } from 'sonner';

/**
 * Ermöglicht es Admins, neue Personen (Mitglieder) zum Tenant einzuladen.
 * Optional: E-Mail für Einladung (Self-Service kann später ergänzt werden).
 */
export default function InviteMemberSection() {
  const { userTenantRole } = useAuth();
  const { addPerson } = useFirestore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const isAdmin = userTenantRole?.role === 'admin';

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      // Person anlegen (ohne userId, wird erst nach Registrierung gesetzt)
      const result = await addPerson(name.trim(), email.trim());
      if (result.success) {
        setSuccess(true);
        setName('');
        setEmail('');
        toast.success('Person erfolgreich angelegt.');
      } else {
        toast.error('Fehler beim Anlegen der Person.');
      }
    } catch (err) {
      toast.error('Fehler: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <section className="p-6 mb-8 bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-xl font-semibold text-gray-700">Mitglied einladen</h2>
      <form onSubmit={handleInvite} className="flex flex-col md:flex-row md:items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">E-Mail (optional)</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <button type="submit" disabled={loading || !name.trim()} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-accent hover:text-primary">
          {loading ? 'Einladen...' : 'Einladen'}
        </button>
      </form>
      {success && <div className="mt-2 text-green-600">Mitglied wurde erfolgreich angelegt.</div>}
    </section>
  );
}
