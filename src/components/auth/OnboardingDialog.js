import React, { useContext, useState } from 'react';
import AuthContext from '../../context/AuthContext';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';

/**
 * Zeigt einen Dialog an, wenn der eingeloggte User noch keinem Tenant zugeordnet ist.
 * Ermöglicht das Anlegen eines neuen Tenants und des eigenen Person-Dokuments mit Rolle 'admin'.
 */
export default function OnboardingDialog() {
  const { currentUser, userTenantRole, loadingUserTenantRole, refreshUserTenantRole } = useContext(AuthContext);
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const db = getFirestore();

  if (loadingUserTenantRole || userTenantRole) return null;
  if (!currentUser) return null;

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 1. Tenant anlegen
      const tenantRef = await addDoc(collection(db, 'tenants'), {
        name: tenantName,
        createdAt: new Date(),
      });
      const tenantId = tenantRef.id;
      // 2. Person-Dokument für User anlegen
      const personRef = doc(db, 'tenants', tenantId, 'persons', currentUser.uid);
      await setDoc(personRef, {
        name: currentUser.displayName || currentUser.email || 'Admin',
        userId: currentUser.uid,
        role: 'admin',
        orderIndex: 0,
        createdAt: new Date(),
      });
      // 3. Mapping in privateInfo speichern
      const privateInfoRef = doc(db, 'users', currentUser.uid, 'privateInfo', 'user_tenant_role');
      await setDoc(privateInfoRef, {
        tenantId,
        personId: currentUser.uid,
        role: 'admin',
      });
      // 4. Context refreshen
      await refreshUserTenantRole();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-dialog-backdrop">
      <div className="onboarding-dialog">
        <h2>Willkommen!</h2>
        <p>Um zu starten, lege bitte einen neuen Mandanten (Team) an.</p>
        <form onSubmit={handleCreateTenant}>
          <label>
            Team-/Mandantenname:
            <input
              type="text"
              value={tenantName}
              onChange={e => setTenantName(e.target.value)}
              required
              disabled={loading}
            />
          </label>
          <button type="submit" disabled={loading || !tenantName}>Mandant anlegen</button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>
      <style>{`
        .onboarding-dialog-backdrop {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .onboarding-dialog {
          background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 16px rgba(0,0,0,0.2);
          min-width: 320px; max-width: 90vw;
        }
        .onboarding-dialog h2 { margin-top: 0; }
        .onboarding-dialog .error { color: red; margin-top: 1rem; }
      `}</style>
    </div>
  );
}
