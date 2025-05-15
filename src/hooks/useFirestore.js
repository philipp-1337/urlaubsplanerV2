import { useState, useEffect, useContext } from 'react';
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
    currentMonth,
    ansichtModus,
    ausgewaehltePersonId, 
    setPersonen, // Setter für Personen aus dem Context
    setTagDaten,
    setResturlaub,
    setEmploymentData, // Setter für Beschäftigungsdaten
    setLoginError,
  } = useContext(CalendarContext);

  const [isLoadingData, setIsLoadingData] = useState(false);

  // Fetch data from Firestore
  useEffect(() => {
    if (!isLoggedIn) {
      setPersonen([]);
      setTagDaten({});
      setResturlaub({});
      setEmploymentData({});
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

        // 3. Fetch Employment Data (dependent on fetchedPersons)
        // Assuming one employmentData entry per person, keyed by personId or a query
        const employmentQuery = query(collection(db, 'employmentData'), where('userId', '==', currentUser.uid));
        const employmentSnapshot = await getDocs(employmentQuery);
        const newEmploymentData = {};
        employmentSnapshot.forEach((doc) => {
          const data = doc.data();
          // doc.id is the employmentData document's ID, data.personId links to the person
          newEmploymentData[data.personId] = { type: data.type, percentage: data.percentage, id: doc.id };
        });
        setEmploymentData(newEmploymentData);

        // 4. Fetch TagDaten based on ansichtModus and current view context
        let dayStatusQuery;
        if (ansichtModus === 'liste' || (ansichtModus === 'kalender' && ausgewaehltePersonId)) {
          // For list view or specific person's calendar: fetch data for the currentMonth of currentYear
          dayStatusQuery = query(collection(db, 'dayStatusEntries'), 
                             where('userId', '==', currentUser.uid),
                             where('year', '==', currentYear), 
                             where('month', '==', currentMonth));
        } else if (ansichtModus === 'jahresuebersicht' || (ansichtModus === 'jahresdetail' && ausgewaehltePersonId)) {
          // For yearly overview or specific person's year detail: fetch all data for the currentYear
          dayStatusQuery = query(collection(db, 'dayStatusEntries'), 
                             where('userId', '==', currentUser.uid),
                             where('year', '==', currentYear));
        } else {
          // Fallback or initial state before any specific view is fully determined
          setTagDaten({});
          setIsLoadingData(false);
          return;
        }

        if (dayStatusQuery) { // Ensure query is defined before executing
          const dayStatusSnapshot = await getDocs(dayStatusQuery);
          const newTagDaten = {};
          dayStatusSnapshot.forEach((doc) => {
            const data = doc.data();
            const key = `${data.personId}-${data.year}-${data.month}-${data.day}`;
            newTagDaten[key] = data.status;
          });
          setTagDaten(newTagDaten);
        }
      } catch (error) {
        console.error("Error fetching data from Firestore: ", error);
        setLoginError("Fehler beim Laden der Daten von Firestore.");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  // Ensure all setters from context are stable and included if needed, or rely on their stability.
  // currentUser object is now a dependency.
  }, [isLoggedIn, currentMonth, currentYear, ansichtModus, ausgewaehltePersonId, currentUser, setPersonen, setTagDaten, setResturlaub, setEmploymentData, setLoginError]);

  // Function to update tag status in Firestore
  const setTagStatus = async (personId, tag, status, monat = currentMonth, jahr = currentYear) => {
    const personIdStr = String(personId);
    const docId = `${currentUser.uid}_${personIdStr}-${jahr}-${monat}-${tag}`; // User-specific doc ID
    const entryRef = doc(db, 'dayStatusEntries', docId);

    const localKey = `${personIdStr}-${jahr}-${monat}-${tag}`;
    
    // We need current tag data for rollback
    setLoginError(''); // Clear previous errors

    // Firestore update
    try {
      if (status === null) {
        await deleteDoc(entryRef);
      } else {
        await setDoc(entryRef, { 
          personId: personIdStr,
          userId: currentUser.uid, // Store userId
          year: jahr,
          month: monat,
          day: tag,
          status: status 
        });
      }
      
      // Update local state after successful Firestore operation
      setTagDaten(prev => {
        const neueTagDatenState = { ...prev };
        if (status === null) {
          delete neueTagDatenState[localKey];
        } else {
          neueTagDatenState[localKey] = status;
        }
        return neueTagDatenState;
      });
      
    } catch (error) {
      console.error("Error updating tag status in Firestore: ", error);
      setLoginError(`Fehler beim Speichern: ${error.message}. Bitte erneut versuchen.`);
    }
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
  const saveEmploymentData = async (personId, empData) => { // empData = { type, percentage }
    // Use personId as docId if one employment record per person, and user-specific
    const docId = `${currentUser.uid}_${personId}`;
    const entryRef = doc(db, 'employmentData', docId);
    try {
      await setDoc(entryRef, { userId: currentUser.uid, personId, ...empData });
      setEmploymentData(prev => ({ ...prev, [personId]: { ...empData, id: docId, personId } })); // id here is docId
      return { success: true };
    } catch (error) {
      console.error("Error saving employment data: ", error);
      setLoginError("Fehler beim Speichern der Beschäftigungsdaten.");
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
  };
};