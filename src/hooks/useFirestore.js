import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { 
  db,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc, // Import addDoc for creating new documents
  query,
  where,
  writeBatch // Import writeBatch for saving order
} from '../firebase';
import { useAuth } from '../context/AuthContext';
import CalendarContext from '../context/CalendarContext';
import { toast } from 'sonner';

const GLOBAL_PERSON_ID_MARKER = "___GLOBAL___";
export const useFirestore = () => {
  const { isLoggedIn, currentUser, userTenantRole, loadingUserTenantRole } = useAuth(); // NEU: userTenantRole
  const {
    personen, // Get current personen list from context for addPerson
    currentYear,
    currentMonth, // Wird für setTagStatus Defaults benötigt
    tagDaten, // Wird für setTagStatus Rollback und batchSetGlobalDayStatus benötigt
    setPersonen, // Setter für Personen aus dem Context
    setGlobalTagDaten, // Setter für globale Tageseinstellungen
    setTagDaten,
    setResturlaub,
    setEmploymentData, // Setter für Beschäftigungsdaten
    setYearConfigurations, // Setter from CalendarContext
    setLoginError,
  } = useContext(CalendarContext);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const debounceTimers = useRef({}); // Für die Debounce-Timer

  // Define sorting function centrally for persons
  const personSortFn = useCallback((a, b) => {
    const orderA = a.orderIndex === undefined ? Infinity : a.orderIndex;
    const orderB = b.orderIndex === undefined ? Infinity : b.orderIndex;
    if (orderA === orderB) {
      return a.name.localeCompare(b.name); // Secondary sort by name
    }
    return orderA - orderB;
  }, []);

  // Hilfsfunktion für Tenant-Pfade
  const getTenantPath = useCallback((...segments) => {
    if (!userTenantRole || !userTenantRole.tenantId) throw new Error('Kein tenantId verfügbar!');
    return ['tenants', userTenantRole.tenantId, ...segments];
  }, [userTenantRole]);

  // Fetch data from Firestore
  useEffect(() => {
    if (!isLoggedIn || loadingUserTenantRole) {
      // Clear any pending debounce timers on logout
      Object.values(debounceTimers.current).forEach(clearTimeout);
      debounceTimers.current = {};

      setPersonen([]);
      setGlobalTagDaten({});
      setTagDaten({});
      setResturlaub({});
      setEmploymentData({});
      setYearConfigurations([]);
      return;
    }
    if (!currentUser || !userTenantRole || !userTenantRole.tenantId) {
      setIsLoadingData(false);
      return;
    }
    const fetchData = async () => {
      setIsLoadingData(true);
      setLoginError('');
      try {
        // 1. Fetch Persons
        const personsPath = collection(db, ...getTenantPath('persons'));
        const personsQuery = query(personsPath);
        const personsSnapshot = await getDocs(personsQuery);
        const fetchedPersonsData = personsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPersonen(fetchedPersonsData.sort(personSortFn));
        // 2. Fetch Resturlaub
        const resturlaubPath = collection(db, ...getTenantPath('resturlaubData'));
        const resturlaubQuery = query(resturlaubPath, where('forYear', '==', currentYear));
        const resturlaubSnapshot = await getDocs(resturlaubQuery);
        const newResturlaub = {};
        fetchedPersonsData.forEach(p => newResturlaub[String(p.id)] = 0);
        resturlaubSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.personId) newResturlaub[data.personId] = data.tage;
        });
        setResturlaub(newResturlaub);
        // 3. Fetch Employment Data
        const employmentPath = collection(db, ...getTenantPath('employmentData'));
        const employmentQuery = query(employmentPath, where('forYear', '==', currentYear));
        const employmentSnapshot = await getDocs(employmentQuery);
        const newEmploymentData = {};
        employmentSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.personId) {
            newEmploymentData[data.personId] = {
              type: data.type,
              percentage: data.percentage,
              daysPerWeek: data.daysPerWeek,
              id: doc.id
            };
          }
        });
        setEmploymentData(newEmploymentData);
        // 4. Fetch Year Configurations
        const yearConfigsPath = collection(db, ...getTenantPath('yearConfigurations'));
        const yearConfigsQuery = query(yearConfigsPath);
        const yearConfigsSnapshot = await getDocs(yearConfigsQuery);
        const fetchedYearConfigs = yearConfigsSnapshot.docs.map(doc => ({ id: doc.id, year: parseInt(doc.id, 10), ...doc.data() })).sort((a,b) => a.year - b.year);
        setYearConfigurations(fetchedYearConfigs);
        // 5. Fetch TagDaten
        const dayStatusPath = collection(db, ...getTenantPath('dayStatusEntries'));
        const dayStatusQuery = query(dayStatusPath, where('year', '==', currentYear));
        const dayStatusSnapshot = await getDocs(dayStatusQuery);
        const newTagDaten = {};
        const newGlobalTagDaten = {};
        dayStatusSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.personId === GLOBAL_PERSON_ID_MARKER) {
            const globalKey = `${data.year}-${data.month}-${data.day}`;
            newGlobalTagDaten[globalKey] = data.status;
          } else {
            const personSpecificKey = `${data.personId}-${data.year}-${data.month}-${data.day}`;
            newTagDaten[personSpecificKey] = data.status;
          }
        });
        setTagDaten(newTagDaten);
        setGlobalTagDaten(newGlobalTagDaten);
      } catch (error) {
        console.error("Error fetching data from Firestore: ", error);
        setLoginError("Fehler beim Laden der Daten von Firestore.");
        toast.error("Fehler beim Laden der Daten von Firestore.");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [isLoggedIn, currentYear, currentUser, userTenantRole, loadingUserTenantRole, setPersonen, setTagDaten, setGlobalTagDaten, setResturlaub, setEmploymentData, setYearConfigurations, setLoginError, personSortFn, getTenantPath]);

  // Function to update tag status in Firestore
  const setTagStatus = async (personId, tag, status, monat = currentMonth, jahr = currentYear) => {
    const personIdStr = String(personId);
    const localKey = `${personIdStr}-${jahr}-${monat}-${tag}`;
    const timerKey = localKey; // Use the same key for the debounce timer

    // Defensive: Only allow writing to dayStatusEntries if personId is set and currentUser exists
    if (!currentUser || !personIdStr) {
      setLoginError("Fehler: Kein Benutzer oder keine Person ausgewählt.");
      toast.error("Fehler: Kein Benutzer oder keine Person ausgewählt.");
      return;
    }

    // Store the previous status for potential rollback
    const previousStatus = tagDaten[localKey] || null;

    // Optimistic UI update: Update local state immediately
    setTagDaten(prev => {
      const neueTagDatenState = { ...prev };
      if (status === null) {
        delete neueTagDatenState[localKey];
      } else {
        neueTagDatenState[localKey] = status;
      }
      return neueTagDatenState;
    });

    // Clear existing timer for this specific day entry
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }

    // Set a new timer
    debounceTimers.current[timerKey] = setTimeout(async () => {
      // Document ID within the user's dayStatusEntries subcollection
      const docId = `${personIdStr}-${jahr}-${monat}-${tag}`;
      const entryRef = doc(db, 'users', currentUser.uid, 'dayStatusEntries', docId);

      setLoginError(''); // Clear previous errors

      console.log(`[Firestore POST] Attempting to save status for Person: ${personIdStr}, Date: ${tag}.${monat + 1}.${jahr}, New Status: ${status === null ? 'NONE (deleting)' : status}`);
      console.log(`[Firestore POST] Writing to collection: dayStatusEntries, docId: ${docId}`);

      // Firestore update
      try {
        if (status === null) {
          await deleteDoc(entryRef);
          console.log(`[Firestore POST SUCCESS] Deleted status for Person: ${personIdStr}, Date: ${tag}.${monat + 1}.${jahr}`);
        } else {
          await setDoc(entryRef, { 
            personId: personIdStr,
            // userId: currentUser.uid, // Redundant, path implies user
            year: jahr,
            month: monat,
            day: tag,
            status: status 
          });
          console.log(`[Firestore POST SUCCESS] Saved status for Person: ${personIdStr}, Date: ${tag}.${monat + 1}.${jahr}, Status: ${status}`);
        }

        // Local state is already updated optimistically. No action needed on success.
      } catch (error) {
        // Add more detailed error logging
        console.error("[Firestore POST ERROR] Error updating tag status in Firestore: ", error, {
          docId,
          personIdStr,
          // userId: currentUser.uid, // Redundant
          collection: 'dayStatusEntries',
          attemptedStatus: status
        });
        setLoginError(`Fehler beim Speichern: ${error.message}. Bitte erneut versuchen.`);
        toast.error(`Fehler beim Speichern: ${error.message}. Bitte erneut versuchen.`);

        // Rollback optimistic UI update on error
        setTagDaten(prev => {
          const revertedState = { ...prev };
          if (previousStatus === null) {
            delete revertedState[localKey];
          } else {
            revertedState[localKey] = previousStatus;
          }
          return revertedState;
        });
      }
    }, 1000); // 1s debounce time
  };

  // CRUD for Persons
  const addPerson = async (name) => {
    if (!currentUser) return { success: false, error: "User not authenticated" };
    try {
      // Determine the next orderIndex using the 'personen' from context
      const newOrderIndex = personen.length > 0 ? Math.max(...personen.map(p => p.orderIndex ?? -1)) + 1 : 0;

      const personsCollectionRef = collection(db, 'users', currentUser.uid, 'persons');
      const newPersonRef = await addDoc(personsCollectionRef, {
        name,
        // userId: currentUser.uid, // Redundant
        orderIndex: newOrderIndex // Add orderIndex
      });
      const newPerson = { id: newPersonRef.id, name, /* userId: currentUser.uid, */ orderIndex: newOrderIndex };
      setPersonen(prev => [...prev, newPerson].sort(personSortFn)); // Keep sorted
      return { success: true, id: newPersonRef.id };
    } catch (error) {
      console.error("Error adding person: ", error);
      setLoginError("Fehler beim Hinzufügen der Person.");
      toast.error("Fehler beim Hinzufügen der Person.");
      return { success: false, error };
    }
  };
  const memoizedAddPerson = useCallback(addPerson, [currentUser, setLoginError, setPersonen, personen, personSortFn]);

  const updatePersonName = async (personId, newName) => {
    const personRef = doc(db, 'users', currentUser.uid, 'persons', personId);
    try {
      await setDoc(personRef, { name: newName }, { merge: true });
      setPersonen(prev => prev.map(p => p.id === personId ? { ...p, name: newName } : p).sort(personSortFn));
      return { success: true };
    } catch (error) {
      console.error("Error updating person name: ", error);
      setLoginError("Fehler beim Aktualisieren des Namens.");
      toast.error("Fehler beim Aktualisieren des Namens.");
      return { success: false, error };
    }
  };

  const deletePersonFirebase = async (personId) => {
    if (!currentUser) {
      setLoginError("Fehler: Benutzer nicht authentifiziert zum Löschen der Person.");
      toast.error("Fehler: Benutzer nicht authentifiziert zum Löschen der Person.");
      return { success: false, error: "User not authenticated" };
    }

    const batch = writeBatch(db);
    const personDocRef = doc(db, 'users', currentUser.uid, 'persons', personId);

    try {
      // 1. Finde und füge alle zugehörigen resturlaubData-Dokumente zum Batch hinzu
      const resturlaubQuery = query(collection(db, 'users', currentUser.uid, 'resturlaubData'), where('personId', '==', personId));
      const resturlaubSnapshot = await getDocs(resturlaubQuery);
      resturlaubSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      console.log(`[Firestore Delete] Added ${resturlaubSnapshot.size} resturlaubData docs to batch for person ${personId}.`);

      // 2. Finde und füge alle zugehörigen employmentData-Dokumente zum Batch hinzu
      const employmentQuery = query(collection(db, 'users', currentUser.uid, 'employmentData'), where('personId', '==', personId));
      const employmentSnapshot = await getDocs(employmentQuery);
      employmentSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      console.log(`[Firestore Delete] Added ${employmentSnapshot.size} employmentData docs to batch for person ${personId}.`);

      // 3. Finde und füge alle zugehörigen dayStatusEntries-Dokumente zum Batch hinzu
      const dayStatusQuery = query(collection(db, 'users', currentUser.uid, 'dayStatusEntries'), where('personId', '==', personId));
      const dayStatusSnapshot = await getDocs(dayStatusQuery);
      dayStatusSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      console.log(`[Firestore Delete] Added ${dayStatusSnapshot.size} dayStatusEntries docs to batch for person ${personId}.`);

      // 4. Füge das Person-Dokument selbst zum Batch hinzu
      batch.delete(personDocRef);

      // 5. Führe den Batch aus
      await batch.commit();
      console.log(`[Firestore Delete] Successfully committed batch for deleting person ${personId} and related data.`);

      setPersonen(prev => prev.filter(p => p.id !== personId)); // Filter preserves order, re-sort not strictly needed if prev was sorted
      // Also clear related data from local context state if necessary
      setTagDaten(prev => {
        const newState = {...prev};
        Object.keys(newState).forEach(key => {
          if (key.startsWith(`${personId}-`)) {
            delete newState[key];
          }
        });
        return newState;
      });
      setResturlaub(prev => { const newState = {...prev}; delete newState[personId]; return newState; });
      setEmploymentData(prev => { const newState = {...prev}; delete newState[personId]; return newState; });
      return { success: true };
    } catch (error) {
      console.error(`[Firestore Delete ERROR] Error deleting person ${personId} or related data: `, error);
      setLoginError("Fehler beim Löschen der Person.");
      toast.error("Fehler beim Löschen der Person.");
      return { success: false, error };
    }
  };

  // Save Person Order
  const savePersonOrder = async (orderedPersonsList) => { // orderedPersonsList is the full person objects, sorted
    if (!currentUser) return { success: false, error: "User not authenticated" };

    const batch = writeBatch(db);
    orderedPersonsList.forEach((person, index) => {
      const personRef = doc(db, 'users', currentUser.uid, 'persons', person.id);
      batch.update(personRef, { orderIndex: index });
    });

    try {
      await batch.commit();
      // Update local context state to reflect the new order
      // The list passed in is already correctly ordered and contains all necessary data
      setPersonen(orderedPersonsList.map((p, index) => ({ ...p, orderIndex: index }))); // Ensure orderIndex is updated in context objects
      return { success: true };
    } catch (error) {
      console.error("Error saving person order: ", error);
      setLoginError("Fehler beim Speichern der Personenreihenfolge.");
      toast.error("Fehler beim Speichern der Personenreihenfolge.");
      return { success: false, error };
    }
  };
  const memoizedSavePersonOrder = useCallback(savePersonOrder, [currentUser, setLoginError, setPersonen]);

  // Save Resturlaub
  const saveResturlaub = async (personId, forYear, tage) => {
    // Document ID is now just personId_forYear within the user's subcollection
    const docId = `${personId}_${forYear}`;
    const entryRef = doc(db, 'users', currentUser.uid, 'resturlaubData', docId);
    try {
      await setDoc(entryRef, { personId, forYear, tage /*, userId: currentUser.uid Redundant */ });
      setResturlaub(prev => ({ ...prev, [personId]: tage }));
      return { success: true };
    } catch (error) {
      console.error("Error saving resturlaub: ", error);
      setLoginError("Fehler beim Speichern des Resturlaubs.");
      toast.error("Fehler beim Speichern des Resturlaubs.");
      return { success: false, error };
    }
  };
  // Save Employment Data
  const saveEmploymentData = async (personId, empData, forYear) => { // empData = { type, percentage }
    if (!forYear) {
      console.error("saveEmploymentData: forYear is required");
      setLoginError("Fehler: Jahr nicht spezifiziert für Beschäftigungsdaten.");
      toast.error("Fehler: Jahr nicht spezifiziert für Beschäftigungsdaten.");
      return { success: false, error: "forYear is required" };
    }
    const docId = `${personId}_${forYear}`;
    const entryRef = doc(db, 'users', currentUser.uid, 'employmentData', docId);
    const dataToSave = { 
      personId, 
      forYear, 
      type: empData.type, 
      percentage: empData.percentage 
      // userId: currentUser.uid, // Redundant
    };
    if (empData.type === 'part-time') {
      dataToSave.daysPerWeek = empData.daysPerWeek; // Should be a number 1-5, validated by SettingsPage
    } else {
      dataToSave.daysPerWeek = null; // Explicitly null for full-time
    }
    try {
      await setDoc(entryRef, dataToSave); // Overwrite with new structure
      // If the saved data is for the current global year, update the context.
      // Otherwise, SettingsPage will manage its own state for the selectedConfigYear.
      if (forYear === currentYear) {
        setEmploymentData(prev => ({ 
          ...prev, 
          [personId]: { ...empData, id: docId, personId, forYear } 
        }));
      }
      return { success: true };
    } catch (error) {
      console.error("Error saving employment data: ", error);
      setLoginError("Fehler beim Speichern der Beschäftigungsdaten.");
      toast.error("Fehler beim Speichern der Beschäftigungsdaten.");
      return { success: false, error };
    }
  };

  // --- Year Configuration Functions ---
  const fetchYearConfigurations = async () => {
    if (!currentUser) return [];    
    try {
      const yearConfigsCollectionRef = collection(db, 'users', currentUser.uid, 'yearConfigurations');
      const q = query(yearConfigsCollectionRef); // Removed setIsLoadingData(true)
      const snapshot = await getDocs(q);
      const configs = snapshot.docs.map(doc => ({
        id: doc.id,
        year: parseInt(doc.id, 10),
        holidaysImported: doc.data().holidaysImported || false, // Lade den Status, default false
        ...doc.data()
      })); // doc.id is the year
      return configs.sort((a, b) => a.year - b.year); // Sort by year
    } catch (error) {
      console.error("Error fetching year configurations: ", error);
      setLoginError("Fehler beim Laden der Jahreskonfigurationen.");
      toast.error("Fehler beim Laden der Jahreskonfigurationen.");
      return [];
    } finally {
      // Removed setIsLoadingData(false)
    }
  };
  const memoizedFetchYearConfigurations = useCallback(fetchYearConfigurations, [currentUser, setLoginError]);

  const addYearConfiguration = async (year, urlaubsanspruch) => {
    if (!currentUser) return { success: false, error: "User not authenticated" };
    const docId = String(year); // Document ID is the year itself
    const entryRef = doc(db, 'users', currentUser.uid, 'yearConfigurations', docId);
    try {
      await setDoc(entryRef, {
        urlaubsanspruch,
        holidaysImported: false // Initialisiere mit false
        /*, userId: currentUser.uid, year Redundant */
      });
      setYearConfigurations(prev => [...prev, {
        id: docId,
        year: parseInt(docId, 10),
        urlaubsanspruch,
        holidaysImported: false }].sort((a,b) => a.year - b.year));
      return { success: true, id: docId }; // Return new config to update local state if needed
    } catch (error) {
      console.error("Error adding year configuration: ", error);
      setLoginError("Fehler beim Hinzufügen der Jahreskonfiguration.");
      toast.error("Fehler beim Hinzufügen der Jahreskonfiguration.");
      return { success: false, error };
    }
  };
  const memoizedAddYearConfiguration = useCallback(addYearConfiguration, [currentUser, setLoginError, setYearConfigurations]);

  const updateYearConfiguration = async (yearStringId, dataToUpdate) => { // dataToUpdate kann { urlaubsanspruch } oder { holidaysImported } sein
    // yearStringId is the year as a string (e.g., "2024")
    const entryRef = doc(db, 'users', currentUser.uid, 'yearConfigurations', yearStringId);
    try {
      await setDoc(entryRef, dataToUpdate, { merge: true }); // year and userId are implicit
      setYearConfigurations(prev => prev.map(yc => yc.id === yearStringId ? {...yc, ...dataToUpdate} : yc).sort((a,b) => a.year - b.year) );
      return { success: true };
    } catch (error) {
      console.error("Error updating year configuration: ", error);
      setLoginError("Fehler beim Aktualisieren der Jahreskonfiguration.");
      toast.error("Fehler beim Aktualisieren der Jahreskonfiguration.");
      return { success: false, error };
    }
  };
  // Spezifische Funktion, um nur den Importstatus zu aktualisieren
  const updateYearConfigurationImportStatus = async (yearStringId, importedStatus) => {
    if (!currentUser) return { success: false, error: "User not authenticated" };
    const entryRef = doc(db, 'users', currentUser.uid, 'yearConfigurations', yearStringId);
    try {
      await setDoc(entryRef, { holidaysImported: importedStatus }, { merge: true });
      // Update local context state
      setYearConfigurations(prev => prev.map(yc => yc.id === yearStringId ? { ...yc, holidaysImported: importedStatus } : yc).sort((a, b) => a.year - b.year));
      return { success: true };
    } catch (error) {
      console.error("Error updating year configuration import status: ", error);
      setLoginError("Fehler beim Aktualisieren des Feiertagsimport-Status.");
      toast.error("Fehler beim Aktualisieren des Feiertagsimport-Status.");
      return { success: false, error };
    }
  };
  const memoizedUpdateYearConfiguration = useCallback(updateYearConfiguration, [currentUser?.uid, setLoginError, setYearConfigurations]);

  const deleteYearConfiguration = async (yearStringId) => {
    if (!currentUser) {
      setLoginError("Benutzer nicht authentifiziert.");
      toast.error("Benutzer nicht authentifiziert.");
      return { success: false, error: "User not authenticated" };
    }
    if (!yearStringId) {
      setLoginError("Kein Jahr zum Löschen angegeben.");
      toast.error("Kein Jahr zum Löschen angegeben.");
      return { success: false, error: "Year ID not provided" };
    }

    const yearToDelete = parseInt(yearStringId, 10);
    if (isNaN(yearToDelete)) {
      setLoginError("Ungültige Jahres-ID.");
      toast.error("Ungültige Jahres-ID.");
      return { success: false, error: "Invalid year ID" };
    }

    const batch = writeBatch(db);

    // 1. Delete YearConfiguration document
    const yearConfigRef = doc(db, 'users', currentUser.uid, 'yearConfigurations', yearStringId);
    batch.delete(yearConfigRef);

    // 2. Query and delete associated resturlaubData
    const resturlaubPath = collection(db, 'users', currentUser.uid, 'resturlaubData');
    const resturlaubQuery = query(resturlaubPath, where('forYear', '==', yearToDelete));
    const resturlaubSnapshot = await getDocs(resturlaubQuery);
    resturlaubSnapshot.forEach(doc => batch.delete(doc.ref));
    console.log(`[Firestore Delete] Added ${resturlaubSnapshot.size} resturlaubData docs for year ${yearToDelete} to batch.`);

    // 3. Query and delete associated employmentData
    const employmentPath = collection(db, 'users', currentUser.uid, 'employmentData');
    const employmentQuery = query(employmentPath, where('forYear', '==', yearToDelete));
    const employmentSnapshot = await getDocs(employmentQuery);
    employmentSnapshot.forEach(doc => batch.delete(doc.ref));
    console.log(`[Firestore Delete] Added ${employmentSnapshot.size} employmentData docs for year ${yearToDelete} to batch.`);

    // 4. Query and delete associated dayStatusEntries (person-specific and global)
    const dayStatusPath = collection(db, 'users', currentUser.uid, 'dayStatusEntries');
    const dayStatusQuery = query(dayStatusPath, where('year', '==', yearToDelete));
    const dayStatusSnapshot = await getDocs(dayStatusQuery);
    dayStatusSnapshot.forEach(doc => batch.delete(doc.ref));
    console.log(`[Firestore Delete] Added ${dayStatusSnapshot.size} dayStatusEntries docs for year ${yearToDelete} to batch.`);

    try {
      await batch.commit();
      console.log(`[Firestore Delete SUCCESS] Successfully deleted year configuration ${yearStringId} and all associated data.`);
      setYearConfigurations(prev => prev.filter(yc => yc.id !== yearStringId).sort((a,b) => a.year - b.year));
      return { success: true };
    } catch (error) {
      console.error(`Error deleting year configuration ${yearStringId} and associated data: `, error);
      setLoginError("Fehler beim Löschen der Jahreskonfiguration und zugehöriger Daten.");
      toast.error("Fehler beim Löschen der Jahreskonfiguration und zugehöriger Daten.");
      return { success: false, error };
    }
  };
  const memoizedDeleteYearConfiguration = useCallback(deleteYearConfiguration, [currentUser, setLoginError, setYearConfigurations]);

  // --- Functions to fetch person-specific data for a given year (for SettingsPage) ---
  const fetchPersonSpecificDataForYear = async (personId, year) => {
    if (!currentUser) return null;
    try {
      // const resturlaubDocId = `${currentUser.uid}_${personId}_${year}`; // Platzhalter: ID wird noch nicht verwendet
      // const employmentDocId = `${currentUser.uid}_${personId}_${year}`; // Platzhalter: ID wird noch nicht verwendet

      // const resturlaubRef = doc(db, 'resturlaubData', resturlaubDocId); // Platzhalter: Ref wird noch nicht verwendet
      // const employmentRef = doc(db, 'employmentData', employmentDocId); // Platzhalter: Ref wird noch nicht verwendet
      // This part needs to be completed: fetch these two docs and return their data.
      // For simplicity, SettingsPage might fetch these directly or this function needs to be fleshed out.
      // For now, SettingsPage will handle its own fetching for specific years if needed.
      console.warn("fetchPersonSpecificDataForYear is a placeholder and needs full implementation if used.");
      return null; 
    } catch (error) {
      console.error(`Error fetching person-specific data for year ${year}:`, error);
      return { success: false, error };
    }
  };

  // Set or update a global day setting (e.g., Feiertag for all)
  const setGlobalDaySetting = async (day, month, year, statusToSet) => {
    if (!currentUser) {
      throw new Error("Benutzer nicht authentifiziert für globale Tageseinstellung.");
    }
    const docId = `${GLOBAL_PERSON_ID_MARKER}_${year}-${month}-${day}`; // Marker in DocID, user implied by path
    const entryRef = doc(db, 'users', currentUser.uid, 'dayStatusEntries', docId);
    const dataToSet = {
      // userId: currentUser.uid, // Redundant
      year: year,
      month: month, // 0-indexed month
      day: day,
      status: statusToSet,
      personId: GLOBAL_PERSON_ID_MARKER // Setze den Marker als personId
    };

    try {
      await setDoc(entryRef, dataToSet);
      console.log(`[Firestore GlobalDay SUCCESS] Status '${statusToSet}' für Tag ${day}.${month + 1}.${year} global gesetzt.`);
      // Update local state if it's for the current year
      if (year === currentYear) {
        setGlobalTagDaten(prev => ({ ...prev, [`${year}-${month}-${day}`]: statusToSet }));
      }
      return { success: true };
    } catch (error) {
      console.error("[Firestore GlobalDay ERROR] Fehler beim Setzen des globalen Tagesstatus: ", error);
      setLoginError(`Fehler beim globalen Setzen des Status: ${error.message}.`);
      toast.error(`Fehler beim globalen Setzen des Status: ${error.message}.`);
      throw error; // Erneut werfen, damit SettingsPage den Fehler behandeln kann
    }
  };

  // Delete a global day setting
  const deleteGlobalDaySetting = async (day, month, year) => {
    if (!currentUser) {
      throw new Error("Benutzer nicht authentifiziert für Löschen globaler Tageseinstellung.");
    }
    const docId = `${GLOBAL_PERSON_ID_MARKER}_${year}-${month}-${day}`; // Marker in DocID
    const entryRef = doc(db, 'users', currentUser.uid, 'dayStatusEntries', docId);

    try {
      await deleteDoc(entryRef);
      console.log(`[Firestore GlobalDay SUCCESS] Globale Einstellung für Tag ${day}.${month + 1}.${year} gelöscht.`);
      // Update local state if it's for the current year
      if (year === currentYear) {
        setGlobalTagDaten(prev => {
          const newState = { ...prev };
          delete newState[`${year}-${month}-${day}`];
          return newState;
        });
      }
      return { success: true };
    } catch (error) {
      console.error("[Firestore GlobalDay ERROR] Fehler beim Löschen des globalen Tagesstatus: ", error);
      setLoginError(`Fehler beim Löschen des globalen Status: ${error.message}.`);
      toast.error(`Fehler beim Löschen des globalen Status: ${error.message}.`);
      throw error;
    }
  };

  // Batch set global day settings
  const batchSetGlobalDaySettings = async (year, holidays, status) => {
    if (!currentUser) throw new Error("Benutzer nicht authentifiziert für Batch-Setzen globaler Tage.");
    if (!holidays || holidays.length === 0) return { success: true, message: "Keine Tage zum Setzen vorhanden." };

    const batch = writeBatch(db);
    const newGlobalEntriesForContext = {};

    holidays.forEach(holiday => { // holiday = { day: D, month: M (0-indexed) }
      const docId = `${GLOBAL_PERSON_ID_MARKER}_${year}-${holiday.month}-${holiday.day}`; // Marker in DocID
      const entryRef = doc(db, 'users', currentUser.uid, 'dayStatusEntries', docId);
      const dataToSet = {
        // userId: currentUser.uid, // Redundant
        year: year,
        month: holiday.month, // 0-indexed month
        day: holiday.day,
        status: status,
        personId: GLOBAL_PERSON_ID_MARKER // Setze den Marker als personId
      };
      batch.set(entryRef, dataToSet);
      if (year === currentYear) { // Prepare for context update if it's the current global year
        newGlobalEntriesForContext[`${year}-${holiday.month}-${holiday.day}`] = status;
      }
    });

    try {
      await batch.commit();
      console.log(`[Firestore BatchGlobalDay SUCCESS] Batch set ${holidays.length} Tage für Jahr ${year} auf Status '${status}'.`);
      if (year === currentYear && Object.keys(newGlobalEntriesForContext).length > 0) {
        setGlobalTagDaten(prev => ({ ...prev, ...newGlobalEntriesForContext }));
      }
      return { success: true };
    } catch (error) {
      console.error("[Firestore BatchGlobalDay ERROR] Fehler beim Batch-Setzen globaler Tagesstatus: ", error);
      setLoginError(`Fehler beim globalen Setzen der Status (Batch): ${error.message}.`);
      toast.error(`Fehler beim globalen Setzen der Status (Batch): ${error.message}.`);
      throw error;
    }
  };

  return {
    isLoadingData,
    setTagStatus,
    addPerson: memoizedAddPerson,
    updatePersonName,
    deletePersonFirebase,
    saveResturlaub,
    saveEmploymentData,
    // Year Config functions
    fetchYearConfigurations: memoizedFetchYearConfigurations,
    addYearConfiguration: memoizedAddYearConfiguration,
    updateYearConfiguration: memoizedUpdateYearConfiguration,
    deleteYearConfiguration: memoizedDeleteYearConfiguration,
    updateYearConfigurationImportStatus, // Neue Funktion exportieren
    fetchPersonSpecificDataForYear, // Expose placeholder
    setGlobalDaySetting,    // Neue Funktion zum Setzen globaler Tage
    deleteGlobalDaySetting, // Neue Funktion zum Löschen globaler Tage
    batchSetGlobalDaySettings, // Neue Funktion für Batch-Import
    savePersonOrder: memoizedSavePersonOrder, // Expose new function
  };
};

// NOTE: If you get "Missing or insufficient permissions" when writing to dayStatusEntries,
// check your Firestore security rules. You must allow the current user to write documents
// to dayStatusEntries where userId == currentUser.uid and personId is valid.
// Example rule (pseudo):
// match /dayStatusEntries/{docId} {
//   allow read, write: if request.auth != null && request.resource.data.userId == request.auth.uid;
// }