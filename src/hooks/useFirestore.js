import { useState, useEffect, useContext } from 'react';
import { 
  db,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where
} from '../firebase';
import { useAuth } from '../context/AuthContext';
import CalendarContext from '../context/CalendarContext';

export const useFirestore = () => {
  const { isLoggedIn } = useAuth();
  const { 
    personen,
    currentYear,
    currentMonth,
    ansichtModus,
    ausgewaehltePersonId, 
    setTagDaten,
    setResturlaub,
    setLoginError
  } = useContext(CalendarContext);
  
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Fetch data from Firestore
  useEffect(() => {
    if (!isLoggedIn) {
      setTagDaten({});
      setResturlaub({});
      return;
    }

    const fetchData = async () => {
      setIsLoadingData(true);
      setLoginError(''); // Clear previous errors
      try {
        // Fetch Resturlaub for the currentYear
        const resturlaubQuery = query(collection(db, 'resturlaubData'), 
                                  where('forYear', '==', currentYear));
        const resturlaubSnapshot = await getDocs(resturlaubQuery);
        const newResturlaub = {};
        personen.forEach(p => newResturlaub[String(p.id)] = 0); // Initialize with 0 for all persons
        resturlaubSnapshot.forEach((doc) => {
          const data = doc.data();
          newResturlaub[data.personId] = data.tage;
        });
        setResturlaub(newResturlaub);

        // Fetch TagDaten based on ansichtModus and current view context
        let dayStatusQuery;
        if (ansichtModus === 'liste' || (ansichtModus === 'kalender' && ausgewaehltePersonId)) {
          // For list view or specific person's calendar: fetch data for the currentMonth of currentYear
          dayStatusQuery = query(collection(db, 'dayStatusEntries'), 
                             where('year', '==', currentYear), 
                             where('month', '==', currentMonth));
        } else if (ansichtModus === 'jahresuebersicht' || (ansichtModus === 'jahresdetail' && ausgewaehltePersonId)) {
          // For yearly overview or specific person's year detail: fetch all data for the currentYear
          dayStatusQuery = query(collection(db, 'dayStatusEntries'), 
                             where('year', '==', currentYear));
        } else {
          // Fallback or initial state before any specific view is fully determined
          setTagDaten({});
          setIsLoadingData(false);
          return;
        }
        
        const dayStatusSnapshot = await getDocs(dayStatusQuery);
        const newTagDaten = {};
        dayStatusSnapshot.forEach((doc) => {
          const data = doc.data();
          const key = `${data.personId}-${data.year}-${data.month}-${data.day}`;
          newTagDaten[key] = data.status;
        });
        setTagDaten(newTagDaten);
      } catch (error) {
        console.error("Error fetching data from Firestore: ", error);
        setLoginError("Fehler beim Laden der Daten von Firestore.");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [isLoggedIn, currentMonth, currentYear, ansichtModus, ausgewaehltePersonId, personen, setTagDaten, setResturlaub, setLoginError]);

  // Function to update tag status in Firestore
  const setTagStatus = async (personId, tag, status, monat = currentMonth, jahr = currentYear) => {
    const personIdStr = String(personId);
    const docId = `${personIdStr}-${jahr}-${monat}-${tag}`;
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

  return {
    isLoadingData,
    setTagStatus
  };
};