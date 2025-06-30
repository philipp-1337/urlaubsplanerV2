import React, { useState } from 'react';
import PersonClaimDialog from '../common/PersonClaimDialog';
import { useAuth } from '../../context/AuthContext';

const ManualOnboardingSection = () => {
  const { currentUser, userTenantRole } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [tenantId, setTenantId] = useState('');

  // Zeige Button nur, wenn kein Mapping existiert
  if (!currentUser || userTenantRole) return null;

  const handleStart = () => {
    if (!tenantId) {
      const tId = window.prompt('Bitte Tenant-ID eingeben (vom Admin erhalten):');
      if (tId) setTenantId(tId);
      else return;
    }
    setShowDialog(true);
  };

  return (
    <section style={{ marginTop: 32, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>Onboarding / Person zuordnen</h2>
      <p>
        Du bist noch keiner Person im System zugeordnet. Klicke auf den Button, um dich einer bestehenden Person zuzuordnen.
      </p>
      <button onClick={handleStart} style={{ marginTop: 12 }}>
        Person zuordnen
      </button>
      {showDialog && tenantId && <PersonClaimDialog tenantId={tenantId} />}
    </section>
  );
};

export default ManualOnboardingSection;
