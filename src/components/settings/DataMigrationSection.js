import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, collection, getDocs, setDoc, doc } from '../../firebase';
import { toast } from 'sonner';
import PersonSelectionDialog from './PersonSelectionDialog';

/**
 * Bereich für die Migration alter Benutzerdaten in die neue Tenant-Struktur.
 * Nur für Admins sichtbar.
 */
const DataMigrationSection = () => {
  const { currentUser, userTenantRole } = useAuth();
  // Debug-Ausgabe für Fehlersuche
  console.log('[DataMigrationSection]', { currentUser, userTenantRole });

  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState(null);
  const [persons, setPersons] = useState([]);
  const [showPersonDialog, setShowPersonDialog] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  if (!currentUser || !userTenantRole || userTenantRole.role !== 'admin') return null;

  // Lädt alle Personen aus der alten Struktur
  const loadPersons = async () => {
    const userId = currentUser.uid;
    const personsSnap = await getDocs(collection(db, 'users', userId, 'persons'));
    const list = personsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    setPersons(list);
    setShowPersonDialog(true);
  };

  // Startet die Migration nach Auswahl der Person
  const handleMigrate = async () => {
    await loadPersons();
  };

  // Führt die eigentliche Migration durch
  const runMigration = async (myPerson) => {
    setIsMigrating(true);
    setResult(null);
    setShowPersonDialog(false);
    try {
      const userId = currentUser.uid;
      const tenantId = userTenantRole.tenantId;
      // 1. Personen migrieren
      const personsSnap = await getDocs(collection(db, 'users', userId, 'persons'));
      const migratedPersons = [];
      for (const personDoc of personsSnap.docs) {
        const data = personDoc.data();
        if (personDoc.id === myPerson.id) {
          // Ausgewählte Person mit userId und admin-Rolle versehen
          await setDoc(doc(db, 'tenants', tenantId, 'persons', personDoc.id), {
            ...data,
            userId,
            role: 'admin',
          });
        } else {
          // Andere Personen wie gehabt übernehmen
          await setDoc(doc(db, 'tenants', tenantId, 'persons', personDoc.id), data);
        }
        migratedPersons.push(personDoc.id);
      }
      // 2. Weitere Subkollektionen migrieren (personId-Referenzen anpassen!)
      const subcollections = [
        'resturlaubData',
        'employmentData',
        'yearConfigurations',
        'dayStatusEntries',
      ];
      for (const sub of subcollections) {
        const snap = await getDocs(collection(db, 'users', userId, sub));
        for (const docSnap of snap.docs) {
          let data = docSnap.data();
          // Für alle Einträge, die auf die alte Person referenzieren, personId auf die ausgewählte Person umbiegen
          if (data.personId === myPerson.id) {
            data = { ...data, personId: myPerson.id };
          }
          await setDoc(doc(db, 'tenants', tenantId, sub, docSnap.id), data);
        }
      }
      // Mapping-Dokument für den aktuellen User setzen
      await setDoc(doc(db, 'users', userId, 'privateInfo', 'user_tenant_role'), {
        tenantId,
        personId: myPerson.id,
        role: 'admin',
      });
      setResult({ success: true, persons: migratedPersons.length });
      toast.success('Migration erfolgreich abgeschlossen!');
    } catch (e) {
      setResult({ success: false, error: e.message });
      toast.error('Migration fehlgeschlagen: ' + e.message);
    } finally {
      setIsMigrating(false);
    }
  };

  // Callback nach Personenauswahl
  const handlePersonSelect = (person) => {
    setSelectedPerson(person);
    runMigration(person);
  };

  return (
    <section style={{ marginTop: 32, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>Datenmigration</h2>
      <p>
        Migriere deine bisherigen Benutzerdaten aus der alten Struktur in den aktuellen Tenant.<br />
        Wähle dazu aus, welche Person du bist. Dieser Vorgang ist nur einmal nötig und sollte vor der weiteren Nutzung erfolgen.
      </p>
      <button onClick={handleMigrate} disabled={isMigrating} style={{ marginTop: 12 }}>
        {isMigrating ? 'Migration läuft...' : 'Migration starten'}
      </button>
      {showPersonDialog && (
        <PersonSelectionDialog persons={persons} onSelect={handlePersonSelect} />
      )}
      {result && result.success && (
        <div style={{ color: 'green', marginTop: 8 }}>✔ Migration erfolgreich ({result.persons} Personen migriert)</div>
      )}
      {result && !result.success && (
        <div style={{ color: 'red', marginTop: 8 }}>Fehler: {result.error}</div>
      )}
    </section>
  );
};

export default DataMigrationSection;
