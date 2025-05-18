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
  where
} from '../firebase';
import { useAuth } from '../context/AuthContext';
import CalendarContext from '../context/CalendarContext';
export const useFirestore = () => {
  const { isLoggedIn, currentUser } = useAuth(); // Get currentUser from useAuth
  const {
    currentYear,
    currentMonth, // currentMonth wird für setTagStatus benötigt, also hier wieder aufnehmen
    tagDaten, // tagDaten hier hinzufügen
    setPersonen, // Setter für Personen aus dem Context
    setTagDaten,
    setResturlaub,
    setEmploymentData, // Setter für Beschäftigungsdaten
    setYearConfigurations, // Setter from CalendarContext
    setLoginError,
  } = useContext(CalendarContext);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const debounceTimers = useRef({}); // Für die Debounce-Timer

  // Fetch data from Firestore
  useEffect(() => {
    if (!isLoggedIn) {
      // Clear any pending debounce timers on logout
      Object.values(debounceTimers.current).forEach(clearTimeout);
      debounceTimers.current = {};

      setPersonen([]);
      setTagDaten({});
      setResturlaub({});
      setEmploymentData({});
      setYearConfigurations([]);
      return;
    }

    if (!currentUser) { // Wait for currentUser to be available
      setIsLoadingData(false);
      return;
    }

    const fetchData = async () => {
      setIsLoadingData(true);
      setLoginError(''); // Clear previous errors
      try {
        // 1. Fetch Persons
        const personsQuery = query(collection(db, 'persons'), where('userId', '==', currentUser.uid));
        const personsSnapshot = await getDocs(personsQuery);
        const fetchedPersons = personsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPersonen(fetchedPersons);

        // 2. Fetch Resturlaub for the currentYear (dependent on fetchedPersons)
        const resturlaubQuery = query(collection(db, 'resturlaubData'), 
                                  where('userId', '==', currentUser.uid),
                                  where('forYear', '==', currentYear));
        const resturlaubSnapshot = await getDocs(resturlaubQuery);
        const newResturlaub = {};
        fetchedPersons.forEach(p => newResturlaub[String(p.id)] = 0); // Initialize with 0 for all fetched persons
        resturlaubSnapshot.forEach((doc) => {
          const data = doc.data();
          newResturlaub[data.personId] = data.tage;
        });
        setResturlaub(newResturlaub);

        // 3. Fetch Employment Data for the currentYear (dependent on fetchedPersons)
        const employmentQuery = query(
          collection(db, 'employmentData'), 
          where('userId', '==', currentUser.uid),
          where('forYear', '==', currentYear) // Fetch only for the current global year
        );
        const employmentSnapshot = await getDocs(employmentQuery);
        const newEmploymentData = {};
        employmentSnapshot.forEach((doc) => {
          const data = doc.data();
          // For the main app, employmentData in context is for the currentYear.
          // SettingsPage will fetch for other years separately.
          // Key by personId for easy lookup for the currentYear.
          newEmploymentData[data.personId] = { type: data.type, percentage: data.percentage, id: doc.id };
        });
        setEmploymentData(newEmploymentData);

        // 4. Fetch Year Configurations
        const yearConfigsQuery = query(collection(db, 'yearConfigurations'), where('userId', '==', currentUser.uid));
        const yearConfigsSnapshot = await getDocs(yearConfigsQuery);
        const fetchedYearConfigs = yearConfigsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => a.year - b.year);
        setYearConfigurations(fetchedYearConfigs);

        // 5. Fetch TagDaten - IMMER FÜR DAS GESAMTE AKTUELLE JAHR
        // Die Unterscheidung nach ansichtModus oder currentMonth für das Laden der dayStatusEntries entfällt.
        // Wir laden immer alle Einträge für das currentYear des currentUser.
        const dayStatusQuery = query(collection(db, 'dayStatusEntries'),
                             where('userId', '==', currentUser.uid),
                             where('year', '==', currentYear));

        const dayStatusSnapshot = await getDocs(dayStatusQuery);
        const newTagDaten = {};
        dayStatusSnapshot.forEach((doc) => {
          const data = doc.data();
          const key = `${data.personId}-${data.year}-${data.month}-${data.day}`;
          newTagDaten[key] = data.status;
        });
        setTagDaten(newTagDaten); // Speichert alle Einträge des Jahres

      } catch (error) {
        console.error("Error fetching data from Firestore: ", error);
        setLoginError("Fehler beim Laden der Daten von Firestore.");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  // ANGEPASSTE ABHÄNGIGKEITSLISTE:
  // currentMonth, ansichtModus, ausgewaehltePersonId wurden entfernt, da tagDaten jetzt jahresweise geladen werden
  // und diese Änderungen kein Neuladen der Jahresdaten aus Firestore auslösen sollen.
  // Die Setter-Funktionen (setPersonen, setTagDaten etc.) sind hier enthalten, da sie im Effekt verwendet werden.
  // Sie sind durch useState und useContext stabil.
  }, [isLoggedIn, currentYear, currentUser, setPersonen, setTagDaten, setResturlaub, setEmploymentData, setYearConfigurations, setLoginError]);

  // Function to update tag status in Firestore
  const setTagStatus = async (personId, tag, status, monat = currentMonth, jahr = currentYear) => {
    const personIdStr = String(personId);
    const localKey = `${personIdStr}-${jahr}-${monat}-${tag}`;
    const timerKey = localKey; // Use the same key for the debounce timer
    
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
      const docId = `${currentUser.uid}_${personIdStr}-${jahr}-${monat}-${tag}`; // User-specific doc ID
      const entryRef = doc(db, 'dayStatusEntries', docId);
      
      setLoginError(''); // Clear previous errors

      console.log(`[Firestore POST] Attempting to save status for Person: ${personIdStr}, Date: ${tag}.${monat + 1}.${jahr}, New Status: ${status === null ? 'NONE (deleting)' : status}`);

      // Firestore update
      try {
        if (status === null) {
          await deleteDoc(entryRef);
          console.log(`[Firestore POST SUCCESS] Deleted status for Person: ${personIdStr}, Date: ${tag}.${monat + 1}.${jahr}`);
        } else {
          await setDoc(entryRef, { 
            personId: personIdStr,
            userId: currentUser.uid, // Store userId
            year: jahr,
            month: monat,
            day: tag,
            status: status 
          });
          console.log(`[Firestore POST SUCCESS] Saved status for Person: ${personIdStr}, Date: ${tag}.${monat + 1}.${jahr}, Status: ${status}`);
        }
        
        // Local state is already updated optimistically. No action needed on success.
      } catch (error) {
        console.error("[Firestore POST ERROR] Error updating tag status in Firestore: ", error);
        setLoginError(`Fehler beim Speichern: ${error.message}. Bitte erneut versuchen.`);
        
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
    try {
      const newPersonRef = await addDoc(collection(db, 'persons'), {
        name,
        userId: currentUser.uid // Associate person with the current user
      });
      setPersonen(prev => [...prev, { id: newPersonRef.id, name, userId: currentUser.uid }]);
      return { success: true, id: newPersonRef.id };
    } catch (error) {
      console.error("Error adding person: ", error);
      setLoginError("Fehler beim Hinzufügen der Person.");
      return { success: false, error };
    }
  };

  const updatePersonName = async (personId, newName) => {
    const personRef = doc(db, 'persons', personId);
    try {
      await setDoc(personRef, { name: newName }, { merge: true });
      setPersonen(prev => prev.map(p => p.id === personId ? { ...p, name: newName } : p));
      return { success: true };
    } catch (error) {
      console.error("Error updating person name: ", error);
      setLoginError("Fehler beim Aktualisieren des Namens.");
      return { success: false, error };
    }
  };

  const deletePersonFirebase = async (personId) => {
    // Note: Consider deleting related data (dayStatusEntries, resturlaubData, employmentData) for this person.
    // This can be complex and might require batched writes or a Cloud Function.
    // For now, just deleting the person entry.
    const personRef = doc(db, 'persons', personId);
    try {
      await deleteDoc(personRef);
      setPersonen(prev => prev.filter(p => p.id !== personId));
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
      console.error("Error deleting person: ", error);
      setLoginError("Fehler beim Löschen der Person.");
      return { success: false, error };
    }
  };

  // Save Resturlaub
  const saveResturlaub = async (personId, forYear, tage) => {
    // Use a composite key for docId if resturlaub is per person per year, and user-specific
    const docId = `${currentUser.uid}_${personId}_${forYear}`;
    const entryRef = doc(db, 'resturlaubData', docId);
    try {
      await setDoc(entryRef, { userId: currentUser.uid, personId, forYear, tage });
      setResturlaub(prev => ({ ...prev, [personId]: tage }));
      return { success: true };
    } catch (error) {
      console.error("Error saving resturlaub: ", error);
      setLoginError("Fehler beim Speichern des Resturlaubs.");
      return { success: false, error };
    }
  };
  // Save Employment Data
  const saveEmploymentData = async (personId, empData, forYear) => { // empData = { type, percentage }
    if (!forYear) {
      console.error("saveEmploymentData: forYear is required");
      setLoginError("Fehler: Jahr nicht spezifiziert für Beschäftigungsdaten.");
      return { success: false, error: "forYear is required" };
    }
    const docId = `${currentUser.uid}_${personId}_${forYear}`;
    const entryRef = doc(db, 'employmentData', docId);
    try {
      await setDoc(entryRef, { userId: currentUser.uid, personId, forYear, ...empData });
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
      return { success: false, error };
    }
  };

  // --- Year Configuration Functions ---
  const fetchYearConfigurations = async () => {
    if (!currentUser) return [];    
    try {
      const q = query(collection(db, 'yearConfigurations'), where('userId', '==', currentUser.uid)); // Removed setIsLoadingData(true)
      const snapshot = await getDocs(q);
      const configs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return configs.sort((a, b) => a.year - b.year); // Sort by year
    } catch (error) {
      console.error("Error fetching year configurations: ", error);
      setLoginError("Fehler beim Laden der Jahreskonfigurationen.");
      return [];
    } finally {
      // Removed setIsLoadingData(false)
    }
  };
  const memoizedFetchYearConfigurations = useCallback(fetchYearConfigurations, [currentUser, setLoginError]);

  const addYearConfiguration = async (year, urlaubsanspruch) => {
    if (!currentUser) return { success: false, error: "User not authenticated" };
    const docId = `${currentUser.uid}_${year}`;
    const entryRef = doc(db, 'yearConfigurations', docId);
    try {
      await setDoc(entryRef, { userId: currentUser.uid, year, urlaubsanspruch });      
      setYearConfigurations(prev => [...prev, { id: docId, userId: currentUser.uid, year, urlaubsanspruch }].sort((a,b) => a.year - b.year));
      return { success: true, id: docId }; // Return new config to update local state if needed
    } catch (error) {
      console.error("Error adding year configuration: ", error);
      setLoginError("Fehler beim Hinzufügen der Jahreskonfiguration.");
      return { success: false, error };
    }
  };
  const memoizedAddYearConfiguration = useCallback(addYearConfiguration, [currentUser, setLoginError, setYearConfigurations]);

  const updateYearConfiguration = async (docId, urlaubsanspruch) => {
    // docId is already userId_year
    const entryRef = doc(db, 'yearConfigurations', docId);
    try {
      await setDoc(entryRef, { urlaubsanspruch }, { merge: true });
      setYearConfigurations(prev => prev.map(yc => yc.id === docId ? {...yc, urlaubsanspruch} : yc).sort((a,b) => a.year - b.year) );
      return { success: true };
    } catch (error) {
      console.error("Error updating year configuration: ", error);
      setLoginError("Fehler beim Aktualisieren der Jahreskonfiguration.");
      return { success: false, error };
    }
  };
  const memoizedUpdateYearConfiguration = useCallback(updateYearConfiguration, [setLoginError, setYearConfigurations]);

  const deleteYearConfiguration = async (docId) => {
    const entryRef = doc(db, 'yearConfigurations', docId);
    try {
      await deleteDoc(entryRef);
      setYearConfigurations(prev => prev.filter(yc => yc.id !== docId).sort((a,b) => a.year - b.year));
      return { success: true };
    } catch (error) {
      console.error("Error deleting year configuration: ", error);
      setLoginError("Fehler beim Löschen der Jahreskonfiguration.");
      return { success: false, error };
    }
  };
  const memoizedDeleteYearConfiguration = useCallback(deleteYearConfiguration, [setLoginError, setYearConfigurations]);

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

  return {
    isLoadingData,
    setTagStatus,
    addPerson,
    updatePersonName,
    deletePersonFirebase,
    saveResturlaub,
    saveEmploymentData,
    // Year Config functions
    fetchYearConfigurations: memoizedFetchYearConfigurations,
    addYearConfiguration: memoizedAddYearConfiguration,
    updateYearConfiguration: memoizedUpdateYearConfiguration,
    deleteYearConfiguration: memoizedDeleteYearConfiguration,
    fetchPersonSpecificDataForYear, // Expose placeholder
  };
};