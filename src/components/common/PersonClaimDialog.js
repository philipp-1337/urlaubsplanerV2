import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, collection, getDocs, setDoc, doc, updateDoc } from '../../firebase';
import { toast } from 'sonner';

/**
 * Dialog für User, die noch keiner Person im Tenant zugeordnet sind.
 * Zeigt offene Personen (ohne userId) und ermöglicht "Das bin ich"-Verknüpfung.
 */
const PersonClaimDialog = ({ tenantId }) => {
  const { currentUser } = useAuth();
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    getDocs(collection(db, 'tenants', tenantId, 'persons'))
      .then((snap) => {
        const openPersons = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => !p.userId);
        setPersons(openPersons);
      })
      .catch(() => setPersons([]))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const handleClaim = async (person) => {
    if (!currentUser) return;
    setClaiming(true);
    try {
      // 1. Setze userId im Person-Dokument
      await updateDoc(doc(db, 'tenants', tenantId, 'persons', person.id), {
        userId: currentUser.uid
      });
      // 2. Lege Mapping an
      await setDoc(doc(db, 'users', currentUser.uid, 'privateInfo', 'user_tenant_role'), {
        tenantId,
        personId: person.id,
        role: person.role || 'member',
      });
      toast.success('Verknüpfung erfolgreich!');
      window.location.reload(); // App-Context neu laden
    } catch (e) {
      toast.error('Fehler beim Verknüpfen: ' + e.message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return null;
  if (!persons.length) return null;

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 24, maxWidth: 400, margin: '40px auto' }}>
      <h2 style={{ fontSize: 20, marginBottom: 12 }}>Person zuordnen</h2>
      <p>Wähle deinen Namen aus der Liste, um dich mit einer bestehenden Person zu verknüpfen:</p>
      <ul style={{ margin: '16px 0' }}>
        {persons.map(person => (
          <li key={person.id} style={{ marginBottom: 12 }}>
            <span style={{ marginRight: 12 }}>{person.name}</span>
            <button onClick={() => handleClaim(person)} disabled={claiming}>
              Das bin ich
            </button>
          </li>
        ))}
      </ul>
      <p style={{ fontSize: 13, color: '#888' }}>Falls dein Name nicht erscheint, kontaktiere den Admin.</p>
    </div>
  );
};

export default PersonClaimDialog;
