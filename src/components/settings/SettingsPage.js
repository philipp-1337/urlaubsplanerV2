import React, { useState, useEffect } from 'react';
import { useCalendar } from '../../hooks/useCalendar';
import { useFirestore } from '../../hooks/useFirestore';
import { db, doc, getDoc } from '../../firebase'; // For direct doc fetching
import { useAuth } from '../../context/AuthContext';
import { Plus, Save, Trash2, Loader2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react'; // Added RotateCcw
import LoadingIndicator from '../common/LoadingIndicator'; // Import LoadingIndicator
import { getHolidays } from 'feiertagejs'; // Importiere feiertagejs
import ToggleSwitch from '../common/ToggleSwitch'; // Importiere den neuen ToggleSwitch

const SettingsPage = () => {
  const {
    personen,
    currentYear: globalCurrentYear,
    getMonatsName,
    globalTagDaten // globalTagDaten für Prüfung, ob schon gesetzt
  } = useCalendar(); // Renamed to avoid conflict, consolidated useCalendar call
  const { currentUser } = useAuth();
  const {
    addPerson, updatePersonName, deletePersonFirebase, savePersonOrder,
    saveResturlaub, saveEmploymentData,
    fetchYearConfigurations, addYearConfiguration, deleteYearConfiguration,
    setGlobalDaySetting,    // Neue Funktion
    batchSetGlobalDaySettings, // Importierte Funktion für Batch-Setzen
    deleteGlobalDaySetting, // Neue Funktion
    // updateYearConfiguration, // For future enhancement
  } = useFirestore();
  // State for new person input
  const [newPersonName, setNewPersonName] = useState('');

  // State for year configurations
  const [yearConfigs, setYearConfigs] = useState([]); // [{ id: 'docId', year: 2024, urlaubsanspruch: 30 }, ...]
  const [isLoadingYearConfigs, setIsLoadingYearConfigs] = useState(false);
  const [selectedConfigYear, setSelectedConfigYear] = useState(globalCurrentYear);
  const [newYearData, setNewYearData] = useState({ year: new Date().getFullYear() + 1, urlaubsanspruch: 30 });
  const [deletingYearConfigId, setDeletingYearConfigId] = useState(null); // Tracks which config is being deleted

  // State for prefilling global days
  const [prefillDate, setPrefillDate] = useState({ day: '', month: '' });
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isImportingHolidays, setIsImportingHolidays] = useState(false); // State für Feiertagsimport

  // Fetch year configurations on mount and when currentUser is available
  useEffect(() => {
    if (currentUser) {
      const loadYearConfigs = async () => {
        setIsLoadingYearConfigs(true);
        const configs = await fetchYearConfigurations();
        setYearConfigs(configs);
        if (configs.length > 0 && !configs.find(c => c.year === selectedConfigYear)) {
          // If current selectedConfigYear is not in fetched configs, default to the first available or globalCurrentYear
          setSelectedConfigYear(configs.find(c => c.year === globalCurrentYear)?.year || configs[0]?.year || globalCurrentYear);
        } else if (configs.length === 0) {
          // If no configs, default to global current year, allowing user to add it.
          setSelectedConfigYear(globalCurrentYear);
        }
        setIsLoadingYearConfigs(false);
      };
      loadYearConfigs();
    }
  }, [fetchYearConfigurations, globalCurrentYear, currentUser, selectedConfigYear]); // Added selectedConfigYear to re-evaluate if it's valid

  // State for editing persons
  const [editingPersons, setEditingPersons] = useState({}); // { personId: { name } }
  
  // State for person order
  const [orderedPersons, setOrderedPersons] = useState([]);
  const [isOrderChanged, setIsOrderChanged] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const [personSavingStates, setPersonSavingStates] = useState({}); // Tracks saving state for person names { [personId]: boolean }
  const [yearlyDataSavingStates, setYearlyDataSavingStates] = useState({}); // Tracks saving state for yearly data { [personId]: boolean }

  const [isLoadingYearlyPersonData, setIsLoadingYearlyPersonData] = useState(false); // New state for loading yearly person data

  const [initialYearlyPersonData, setInitialYearlyPersonData] = useState({}); // Stores the initial yearly data for comparison
  // State for yearly person data
  const [yearlyPersonData, setYearlyPersonData] = useState({}); // { personId: { resturlaub, employmentPercentage, employmentType, daysPerWeek } }

  // Effect to load person-specific data (Resturlaub, Employment) for the selectedConfigYear
  useEffect(() => {
    if (!currentUser || personen.length === 0 || !selectedConfigYear) {
      setIsLoadingYearlyPersonData(false); // Ensure loading is false if conditions aren't met
      setYearlyPersonData({});
      setInitialYearlyPersonData({});
      return;
    }

    const fetchPromises = personen.map(async (p) => {
      // Detailliertes Logging vor der ID-Erstellung
      console.log('SettingsPage - Preparing to fetch for person:', p?.id, 'User UID:', currentUser?.uid, 'Selected Year:', selectedConfigYear);
      setIsLoadingYearlyPersonData(true); // Start loading

      if (!currentUser?.uid || !p?.id || typeof selectedConfigYear === 'undefined' || selectedConfigYear === null) {
        console.error("SettingsPage - CRITICAL: Missing data for doc ID construction!", 
          { uid: currentUser?.uid, personId: p?.id, year: selectedConfigYear });
        // Wirf einen Fehler, damit Promise.all dies als Fehlschlag erkennt
        throw new Error(`Missing critical data for person ${p?.id} in year ${selectedConfigYear}`);
      }

      // Verwende die neue ID-Struktur innerhalb der User-Subkollektion
      const resturlaubDocId = `${p.id}_${selectedConfigYear}`;
      const employmentDocId = `${p.id}_${selectedConfigYear}`;

      let pResturlaub = 0;
      let pEmpData = { percentage: 100, type: 'full-time', daysPerWeek: null }; // Standardwerte, inkl. daysPerWeek

      try {
        // Pfad an die neue Struktur anpassen: users/{userId}/resturlaubData/{docId}
        console.log(`SettingsPage - Attempting to fetch resturlaubData from users/${currentUser.uid}/resturlaubData/${resturlaubDocId}`);
        const resturlaubRef = doc(db, 'users', currentUser.uid, 'resturlaubData', resturlaubDocId);
        const resturlaubSnap = await getDoc(resturlaubRef);
        if (resturlaubSnap.exists()) {
          pResturlaub = resturlaubSnap.data().tage;
          console.log(`SettingsPage - Resturlaub for ${p.id} (${selectedConfigYear}) found: ${pResturlaub}`);
        } else {
          // Kein Dokument vorhanden, kein Fehler, einfach 0 lassen
          console.log(`SettingsPage - No resturlaubData found for ${resturlaubDocId}`);
        }
      } catch (error) {
        if (error.code === 'permission-denied') {
          // Nur echte Berechtigungsfehler loggen/melden
          console.error(`SettingsPage - Permission denied fetching resturlaubData for ID ${resturlaubDocId}:`, error);
          throw error;
        } else {
          // Andere Fehler ggf. anders behandeln oder ignorieren
          console.error(`SettingsPage - Error fetching resturlaubData for ID ${resturlaubDocId}:`, error);
        }
      }

      try {
        // Pfad an die neue Struktur anpassen: users/{userId}/employmentData/{docId}
        console.log(`SettingsPage - Attempting to fetch employmentData from users/${currentUser.uid}/employmentData/${employmentDocId}`);
        const employmentRef = doc(db, 'users', currentUser.uid, 'employmentData', employmentDocId);
        const employmentSnap = await getDoc(employmentRef);
        if (employmentSnap.exists()) {
          pEmpData = employmentSnap.data();
          // Ensure daysPerWeek has a sensible default if missing from older DB entries
          if (pEmpData.daysPerWeek === undefined) {
            pEmpData.daysPerWeek = pEmpData.type === 'part-time' ? '' : null;
          }
          console.log(`SettingsPage - EmploymentData for ${p.id} (${selectedConfigYear}) found:`, pEmpData);
        } else {
          console.log(`SettingsPage - No employmentData found for ${employmentDocId}`);
          // pEmpData is already { percentage: 100, type: 'full-time', daysPerWeek: null }
        }
      } catch (error) {
        console.error(`SettingsPage - Error fetching employmentData for ID ${employmentDocId}:`, error);
        throw error;
      }
      
      return { // Daten für diese Person zurückgeben
        personId: p.id,
        resturlaub: pResturlaub,
        employmentPercentage: pEmpData.percentage,
        employmentType: pEmpData.type,
        daysPerWeek: pEmpData.daysPerWeek,
      };
    });

    Promise.all(fetchPromises)
      .then((results) => {
        const newYearlyData = {};
        results.forEach(personData => {
          newYearlyData[personData.personId] = {
            resturlaub: personData.resturlaub,
            employmentPercentage: personData.employmentPercentage,
            employmentType: personData.employmentType,
            daysPerWeek: personData.daysPerWeek,
          };
        });
        setYearlyPersonData(newYearlyData);
        setInitialYearlyPersonData(newYearlyData); // Store initial data for comparison
        console.log("SettingsPage - Successfully fetched and set all person-specific yearly data.");
        setIsLoadingYearlyPersonData(false); // End loading on success
      })
      .catch(error => {
        console.error("SettingsPage - Error in Promise.all when fetching person-specific yearly data:", error);
        // Hier könntest du eine Fehlermeldung im UI anzeigen
        setInitialYearlyPersonData({}); // Clear initial data on error
        setIsLoadingYearlyPersonData(false); // End loading on error
      });

  }, [selectedConfigYear, personen, currentUser]);

  // Initialize editing state for persons
  useEffect(() => {
    if (personen.length > 0) {
      const newEditingState = {};
      personen.forEach(person => {
        newEditingState[person.id] = { name: person.name };
      });
      setEditingPersons(newEditingState);
    }
  }, [personen]);

  // Initialize orderedPersons when personen from context changes
  useEffect(() => {
    setOrderedPersons([...personen]); // Create a mutable copy
    setIsOrderChanged(false); // Reset change flag when context updates
  }, [personen]);

  const handleEditPersonChange = (personId, value) => {
    setEditingPersons(prev => ({
      ...prev,
      [personId]: {
        ...prev[personId],
        name: value,
      }
    }));
  };

  const handleEditYearlyDataChange = (personId, field, value) => {
    setYearlyPersonData(prev => {
      const newPersonDataForId = { ...(prev[personId] || {}) }; // Start with existing or empty object

      if (field === 'employmentType') {
        newPersonDataForId.employmentType = value;
        if (value === 'full-time') {
          newPersonDataForId.employmentPercentage = 100;
        }
        // When switching to full-time, daysPerWeek becomes irrelevant.
        // It will be handled/nulled out during save or comparison.
        // If switching to part-time, daysPerWeek might be '' initially.
        // If switching to part-time, percentage is not changed here.
        // It will be validated/capped if the percentage input is then edited.
      } else if (field === 'employmentPercentage') {
        // This field is only visible/editable if employmentType is 'part-time'.
        const parsedValue = parseInt(value, 10);
        if (value === '') { // Allow clearing the field
          newPersonDataForId.employmentPercentage = '';
        } else if (!isNaN(parsedValue)) {
          if (parsedValue > 100) {
            newPersonDataForId.employmentPercentage = 100; // Cap at 100
          } else if (parsedValue < 0) {
            newPersonDataForId.employmentPercentage = 0;   // Cap at 0
          } else {
            newPersonDataForId.employmentPercentage = parsedValue;
          }
        }
        // If value is not empty and not a valid number (e.g. "abc"),
        // parsedValue is NaN. We don't update, input effectively rejects it.
        // The input type="number" should mostly prevent this.
      } else if (field === 'daysPerWeek') {
        // This field is only visible/editable if employmentType is 'part-time'.
        const parsedValue = parseInt(value, 10);
        if (value === '') { // Allow clearing the field
          newPersonDataForId.daysPerWeek = '';
        } else if (!isNaN(parsedValue)) {
          if (parsedValue > 5) {
            newPersonDataForId.daysPerWeek = 5; // Cap at 5
          } else if (parsedValue < 1) {
            newPersonDataForId.daysPerWeek = 1;   // Cap at 1
          } else {
            newPersonDataForId.daysPerWeek = parsedValue;
          }
        }
      } else {
        // For other fields like 'resturlaub'
        newPersonDataForId[field] = value;
      }

      return { ...prev, [personId]: newPersonDataForId };
    });
  };

  const handleSavePerson = async (personId) => {
    const editData = editingPersons[personId];
    if (!editData) {
      return;
    }

    setPersonSavingStates(prev => ({ ...prev, [personId]: true }));
    let nameUpdated = false;

    try {
      // Save name
      if (editData.name && editData.name !== personen.find(p => p.id === personId)?.name) {
        const result = await updatePersonName(personId, editData.name);
        if (result.success) {
          nameUpdated = true;
        }
      }

      if (nameUpdated) {
        // Success feedback is now handled by button animation
      }
    } catch (error) {
      console.error("Error saving person name:", error);
      // Hier könntest du eine Fehlermeldung für den Benutzer anzeigen
    } finally {
      setPersonSavingStates(prev => ({ ...prev, [personId]: false }));
    }
  };

  const handleSaveYearlyData = async (personId) => {
    const yearlyData = yearlyPersonData[personId];
    if (!yearlyData || !selectedConfigYear) {
      return;
    }

    setYearlyDataSavingStates(prev => ({ ...prev, [personId]: true }));
    let resturlaubSaved = false;
    let employmentSaved = false;

    try {
      // Save Resturlaub
      const resturlaubResult = await saveResturlaub(personId, selectedConfigYear, parseInt(yearlyData.resturlaub, 10) || 0);
      if (resturlaubResult.success) resturlaubSaved = true;

      // Save Employment Data
      const employmentPercentageToSave = yearlyData.employmentType === 'part-time'
        ? (parseInt(yearlyData.employmentPercentage, 10) || 0) // Default to 0 for part-time if empty/invalid
        : 100; // Always 100 for full-time

      let daysPerWeekToSave;
      if (yearlyData.employmentType === 'part-time') {
        const parsedDays = parseInt(yearlyData.daysPerWeek, 10);
        if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 5) {
          alert("Für Teilzeitbeschäftigung muss 'Tage pro Woche' eine Zahl zwischen 1 und 5 sein.");
          setYearlyDataSavingStates(prev => ({ ...prev, [personId]: false })); // Reset saving state
          return; // Prevent saving
        }
        daysPerWeekToSave = parsedDays;
      } else {
        daysPerWeekToSave = null; // Not applicable for full-time
      }

      const employmentResult = await saveEmploymentData(personId, { 
        percentage: employmentPercentageToSave,
        type: yearlyData.employmentType || 'full-time',
        daysPerWeek: daysPerWeekToSave
      }, selectedConfigYear);
      if (employmentResult.success) employmentSaved = true;

      if (resturlaubSaved || employmentSaved) { // If at least one was successful
        // Success feedback is now handled by button animation
        // Update initial data to reflect the saved state, so the button becomes disabled again
        setInitialYearlyPersonData(prev => ({
          ...prev,
          [personId]: {
            resturlaub: parseInt(yearlyData.resturlaub, 10) || 0,
            employmentPercentage: employmentPercentageToSave,
            employmentType: yearlyData.employmentType || 'full-time',
            daysPerWeek: daysPerWeekToSave,
          }
        }));
      }
    } catch (error) {
      console.error("Error saving yearly data:", error);
      // Hier könntest du eine Fehlermeldung für den Benutzer anzeigen
    } finally {
      setYearlyDataSavingStates(prev => ({ ...prev, [personId]: false }));
    }
  };

  const handleAddPerson = async () => {
    if (newPersonName.trim() === '') return;
    const result = await addPerson(newPersonName.trim());
    if (result.success) {
      setNewPersonName(''); // Clear input
    }
  };

  // Handlers for moving persons
  const handleMovePerson = (personId, direction) => {
    const currentIndex = orderedPersons.findIndex(p => p.id === personId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= orderedPersons.length) return;

    const newOrderedPersons = [...orderedPersons];
    const [movedPerson] = newOrderedPersons.splice(currentIndex, 1);
    newOrderedPersons.splice(newIndex, 0, movedPerson);

    setOrderedPersons(newOrderedPersons);
    setIsOrderChanged(true);
  };

  const handleSavePersonOrder = async () => {
    setIsSavingOrder(true);
    // Pass the full person objects, as savePersonOrder in useFirestore expects it
    // to update context with full objects.
    const result = await savePersonOrder(orderedPersons.map((p, index) => ({ ...p, orderIndex: index })));
    if (result.success) {
      setIsOrderChanged(false);
      // Success feedback is handled by button state change
    } else {
      // Error feedback can be added here if needed
      // If save fails, orderedPersons state is still the attempted new order.
      // It will reset if `personen` context changes or user tries again.
      alert("Fehler beim Speichern der Reihenfolge. Bitte versuchen Sie es erneut.");
    }
    setIsSavingOrder(false);
  };
  
  const handleDeletePerson = async (personId) => {
    if (window.confirm("Sind Sie sicher, dass Sie diese Person löschen möchten? Alle zugehörigen Daten gehen verloren.")) {
      await deletePersonFirebase(personId);
    }
  };

  // Placeholder handlers for Year Configuration
  const handleAddYearConfig = async () => {
    if (!newYearData.year || newYearData.urlaubsanspruch < 0) {
      alert("Bitte geben Sie ein gültiges Jahr und einen Urlaubsanspruch an.");
      return;
    }
    await addYearConfiguration(newYearData.year, newYearData.urlaubsanspruch);
    setNewYearData({ year: new Date().getFullYear() + 1, urlaubsanspruch: 30 }); // Reset form
    const configs = await fetchYearConfigurations(); // Refresh list
    setYearConfigs(configs);
  };

  const handleDeleteYearConfig = async (configId) => {
    if (window.confirm("Sind Sie sicher, dass Sie diese Jahreskonfiguration löschen möchten?")) {
      setDeletingYearConfigId(configId);
      try {
        await deleteYearConfiguration(configId);
        // Refresh list after deletion
        const configs = await fetchYearConfigurations();
        setYearConfigs(configs);
      } catch (error) {
        console.error("Error deleting year configuration:", error);
        // Optionally show an error message to the user
      } finally {
        setDeletingYearConfigId(null);
      }
    }
  };

  const handlePrefillDateChange = (field, value) => {
    setPrefillDate(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyPrefill = async (statusToSet) => {
    if (!selectedConfigYear || !prefillDate.day || !prefillDate.month) {
      alert("Bitte wählen Sie ein Jahr und geben Sie Tag und Monat für die Vorbelegung ein.");
      return;
    }
    // Monat ist 0-indiziert für Date-Objekte und unsere interne Logik
    const day = parseInt(prefillDate.day, 10);
    const month = parseInt(prefillDate.month, 10) - 1; // Konvertiere 1-12 zu 0-11

    // Zusätzliche Sicherung und detailliertes Logging
    const safeGlobalTagDaten = globalTagDaten || {};
    // Prüfen, ob dieser Tag bereits global mit diesem Status gesetzt ist
    const globalKey = `${selectedConfigYear}-${month}-${day}`;
    console.log('SettingsPage - handleApplyPrefill - globalTagDaten (von useCalendar):', globalTagDaten, 'safeGlobalTagDaten (lokal gesichert):', safeGlobalTagDaten, 'globalKey:', globalKey);
    const currentGlobalStatus = safeGlobalTagDaten[globalKey];
    // Basisvalidierung
    if (isNaN(day) || day < 1 || day > 31 || isNaN(month) || month < 0 || month > 11) {
      alert("Ungültiger Tag oder Monat.");
      return;
    }

    // Validieren, ob der Tag im Monat für das ausgewählte Jahr existiert
    // new Date(year, monthIndex + 1, 0) gibt den letzten Tag des Monats monthIndex zurück
    const daysInSelectedMonth = new Date(selectedConfigYear, month + 1, 0).getDate();
    if (day > daysInSelectedMonth) {
      alert(`Der Monat ${getMonatsName(month)} im Jahr ${selectedConfigYear} hat nur ${daysInSelectedMonth} Tage.`);
      return;
    }

    // Prüfen, ob der ausgewählte Tag ein Wochenende ist
    const dateToCheck = new Date(selectedConfigYear, month, day);
    if (dateToCheck.getDay() === 0 || dateToCheck.getDay() === 6) { // 0 = Sonntag, 6 = Samstag
      alert("Globale Tage können nicht auf ein Wochenende gelegt werden.");
      setIsPrefilling(false); // Wichtig, um den Button wieder freizugeben
      return;
    }

    setIsPrefilling(true);
    let actionConfirmedAndExecuted = false;
    try {
      if (currentGlobalStatus === statusToSet) {
        // Wenn der Tag bereits mit diesem Status global gesetzt ist, entfernen wir ihn
        const confirmMessage = `Der ${prefillDate.day}.${prefillDate.month}.${selectedConfigYear} ist bereits als ${statusToSet === 'interne teamtage' ? 'Teamtag' : 'Feiertag'} global gesetzt. Möchten Sie diese globale Einstellung entfernen?`;
        if (window.confirm(confirmMessage)) {
          await deleteGlobalDaySetting(day, month, selectedConfigYear);
          alert(`Die globale Einstellung für den ${prefillDate.day}.${prefillDate.month}.${selectedConfigYear} wurde entfernt.`);
          actionConfirmedAndExecuted = true;
        }
      } else {
        // Andernfalls setzen wir den neuen globalen Status (oder überschreiben einen anderen globalen Status)
        const confirmMessage = `Möchten Sie den ${prefillDate.day}.${prefillDate.month}.${selectedConfigYear} für alle Personen als ${statusToSet === 'interne teamtage' ? 'Teamtag' : 'Feiertag'} setzen? Eine eventuell vorhandene andere globale Einstellung für diesen Tag wird überschrieben. Personenspezifische Einträge bleiben davon unberührt.`;
        if (window.confirm(confirmMessage)) {
          await setGlobalDaySetting(day, month, selectedConfigYear, statusToSet);
          alert(`${statusToSet === 'interne teamtage' ? 'Teamtage' : 'Feiertage'} für den ${prefillDate.day}.${prefillDate.month}.${selectedConfigYear} wurden global gesetzt.`);
          actionConfirmedAndExecuted = true;
        }
      }
      // Formular nur zurücksetzen, wenn eine Aktion durchgeführt wurde (nicht bei Abbruch durch User)
      // Da window.confirm den Fluss unterbricht, wenn false, ist ein explizites Zurücksetzen hier ok.
      // Bei komplexeren Flows würde man das anders handhaben.
      if (actionConfirmedAndExecuted) { 
         setPrefillDate({ day: '', month: '' });
      }
    } catch (error) {
      console.error("Error prefilling global day status:", error);
      alert(`Fehler beim Vorbelegen: ${error.message}`);
    } finally {
      setIsPrefilling(false);
    }
  };

  const handleImportGermanHolidays = async () => {
    if (!selectedConfigYear) {
      alert("Bitte wählen Sie zuerst ein Jahr aus, für das die Feiertage importiert werden sollen.");
      return;
    }

    if (!window.confirm(`Möchten Sie die bundesweiten deutschen Feiertage für ${selectedConfigYear} importieren? Bestehende globale Einstellungen für diese Tage werden als 'Feiertag' überschrieben.`)) {
      return;
    }

    setIsImportingHolidays(true);
    try {
      // 'BUND' für bundesweite Feiertage. Man könnte hier auch ein Bundesland-Kürzel verwenden.
      const holidaysFromLib = getHolidays(selectedConfigYear, 'BUND'); 

      const holidaysToSet = [];
      let skippedWeekendHolidays = 0;

      holidaysFromLib.forEach(h => {
        const dayOfWeek = h.date.getDay(); // 0 = Sonntag, 6 = Samstag
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          holidaysToSet.push({
            day: h.date.getDate(),
            month: h.date.getMonth(), // getMonth() ist 0-indiziert
          });
        } else {
          skippedWeekendHolidays++;
        }
      });

      if (holidaysToSet.length > 0) {
        await batchSetGlobalDaySettings(selectedConfigYear, holidaysToSet, 'feiertag');
        alert(`Bundesweite Feiertage für ${selectedConfigYear} wurden erfolgreich importiert und als 'Feiertag' gesetzt.`);
      } else {
        alert(`Keine bundesweiten Feiertage für ${selectedConfigYear} gefunden oder die Bibliothek konnte sie nicht bereitstellen.`);
      }
      if (skippedWeekendHolidays > 0) {
        alert(`${skippedWeekendHolidays} Feiertag(e) wurde(n) übersprungen, da sie auf ein Wochenende gefallen wären.`);
      }
    } catch (error) {
      console.error("Error importing German holidays:", error);
      alert(`Fehler beim Importieren der Feiertage: ${error.message}`);
    } finally {
      setIsImportingHolidays(false);
    }
  };



  // Helper to get the definitive initial data for a person for the selected year
  // (either from loaded/saved data or application defaults if no data exists)
  const getInitialDataForPerson = (personId) => {
    const initialDbState = initialYearlyPersonData[personId]; // Data from DB or last save
    if (initialDbState) {
      // These values are typically numbers/strings as saved or loaded
      return {
        resturlaub: initialDbState.resturlaub, 
        employmentType: initialDbState.employmentType,
        employmentPercentage: initialDbState.employmentPercentage,
        daysPerWeek: initialDbState.daysPerWeek ?? (initialDbState.employmentType === 'part-time' ? '' : null),
      };
    }
    // Defaults for a person/year with no existing data in initialYearlyPersonData
    // (e.g., new person, or data fetch failed/didn't cover this person)
    return {
      resturlaub: '', // Represents an empty input field
      employmentType: 'full-time',
      employmentPercentage: 100, // Corresponds to full-time type
      daysPerWeek: null, // Not applicable for full-time default
    };
  };

  const handleResetYearlyData = (personId) => {
    const dataToResetTo = getInitialDataForPerson(personId);

    setYearlyPersonData(prev => {
      const updatedPersonData = {
        ...(prev[personId] || {}), // Preserve any other fields if they exist
        resturlaub: dataToResetTo.resturlaub,
        employmentType: dataToResetTo.employmentType,
        employmentPercentage: dataToResetTo.employmentPercentage,
        daysPerWeek: dataToResetTo.daysPerWeek,
      };
      return {
        ...prev,
        [personId]: updatedPersonData,
      };
    });
    // After resetting, hasYearlyDataChanged should become false,
    // which will disable the save/reset buttons.
  };

  return (
    <main className="container px-4 py-8 mx-auto">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">Einstellungen</h1>

      {/* Jahreskonfiguration verwalten */}
      <section className="p-6 mb-8 bg-white rounded-lg shadow-md">
        <h2 className="mb-4 text-2xl font-semibold text-gray-700">Jahreskonfiguration verwalten</h2>
        <div className="mb-4 space-y-3 md:space-y-0 md:flex md:space-x-2 md:items-end">
          <div>
            <label htmlFor="newYearConfigYear" className="block text-sm font-medium text-gray-700">Jahr</label>
            <input
              type="number"
              id="newYearConfigYear"
              placeholder="JJJJ"
              value={newYearData.year}
              onChange={(e) => setNewYearData(prev => ({ ...prev, year: parseInt(e.target.value) || '' }))}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md md:w-auto focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="newYearConfigUrlaubsanspruch" className="block text-sm font-medium text-gray-700">Urlaubsanspruch (Tage)</label>
            <input
              type="number"
              id="newYearConfigUrlaubsanspruch"
              placeholder="z.B. 30"
              value={newYearData.urlaubsanspruch}
              onChange={(e) => setNewYearData(prev => ({ ...prev, urlaubsanspruch: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md md:w-auto focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div> {/* Zusätzlicher Div, um den Button korrekt auszurichten, wenn Labels vorhanden sind */}
            <button 
              onClick={handleAddYearConfig} 
              className="w-full px-3 py-2 text-white bg-primary rounded-md md:w-auto hover:bg-accent hover:text-primary flex items-center justify-center"
              aria-label="Jahr hinzufügen"
              // Optional: Füge mt-1 hinzu, wenn der Button nicht perfekt mit den Inputs ausgerichtet ist, oder passe md:items-end an
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
        {isLoadingYearConfigs && <p>Lade Jahreskonfigurationen...</p>}
        <ul className="mt-4 space-y-2">
          {yearConfigs.map(yc => (
            (() => { // IIFE to use const for isDeleting
              const isDeleting = deletingYearConfigId === yc.id;
              return (
                <li key={yc.id} className="flex items-center justify-between p-2 border rounded">
                  <span className="self-center">Jahr: {yc.year}, Urlaub: {yc.urlaubsanspruch} Tage</span>
                  <div>
                    {/* TODO: Add Edit button here, calling updateYearConfiguration */}
                    <button 
                      onClick={() => handleDeleteYearConfig(yc.id)} 
                      disabled={isDeleting}
                      className={`p-2 ml-2 text-white rounded flex items-center justify-center
                                  ${isDeleting ? 'bg-yellow-500 hover:bg-yellow-600 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`}
                      aria-label={isDeleting ? "Jahreskonfiguration wird gelöscht..." : "Jahreskonfiguration löschen"}
                    >
                      {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </li>
              );
            })()
          ))}
        </ul>
        {yearConfigs.length === 0 && !isLoadingYearConfigs && <p>Noch keine Jahre konfiguriert. Fügen Sie ein Jahr hinzu, um zu starten.</p>}
      </section>

      {/* Personen verwalten - unabhängig vom Jahr */}
      <section className="p-6 mb-8 bg-white rounded-lg shadow-md">
        <h2 className="mb-4 text-2xl font-semibold text-gray-700">Personen verwalten</h2>
        <div className="mb-6 space-y-3 md:space-y-0 md:flex md:items-center md:space-x-2">
          <input
            type="text"
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            placeholder="Name der neuen Person"
            className="w-full px-3 py-2 border border-gray-300 rounded-md md:w-auto max-w-xs focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button 
            onClick={handleAddPerson} 
            className="w-full px-3 py-2 text-white bg-primary rounded-md md:w-auto hover:bg-accent hover:text-primary flex items-center justify-center"
            aria-label="Person hinzufügen"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="space-y-4">
          {orderedPersons.map((person, index) => ( // Use orderedPersons here
            (() => { // IIFE to use const for isSavingName
              const originalPersonData = personen.find(p => p.id === person.id); // For name comparison
              const nameHasChanged = editingPersons[person.id]?.name !== originalPersonData?.name;
              const isSavingName = personSavingStates[person.id];
              return (
                <div key={person.id} className="flex flex-col p-3 border rounded-md md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center flex-grow mb-2 md:mb-0"> {/* Container for buttons and name */}
                    <div className="flex flex-col mr-3">
                      <button
                        onClick={() => handleMovePerson(person.id, 'up')}
                        disabled={index === 0 || isSavingOrder || isSavingName}
                        className="p-1 text-gray-600 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Nach oben verschieben"
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button
                        onClick={() => handleMovePerson(person.id, 'down')}
                        disabled={index === orderedPersons.length - 1 || isSavingOrder || isSavingName}
                        className="p-1 text-gray-600 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Nach unten verschieben"
                      >
                        <ArrowDown size={18} />
                      </button>
                    </div>
                    <div className="flex-grow">
                      <input 
                        type="text"
                        value={editingPersons[person.id]?.name ?? person.name}
                        onChange={(e) => handleEditPersonChange(person.id, e.target.value)}
                        className="w-full px-2 py-1 border rounded-md md:max-w-md"
                        placeholder="Name"
                        disabled={isSavingName || isSavingOrder}
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 md:ml-4 flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2">
                    <button 
                      onClick={() => handleSavePerson(person.id)} 
                      disabled={isSavingName || !nameHasChanged || isSavingOrder}
                      className={`w-full p-2 text-sm text-white rounded md:w-auto flex items-center justify-center
                                  ${isSavingOrder ? 'bg-gray-400 cursor-not-allowed' : (isSavingName ? 'bg-yellow-500 hover:bg-yellow-600 cursor-not-allowed' : (nameHasChanged ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'))}`}
                      aria-label={isSavingName ? "Namen speichern..." : (nameHasChanged ? "Namen speichern" : "Keine Änderungen am Namen")}
                    >
                      {/* Die Erfolgsmeldung wird hier angezeigt, wenn personSaveSuccess die ID der aktuellen Person ist UND nicht gerade gespeichert wird */}
                      {isSavingName ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    </button>
                    <button 
                      onClick={() => handleDeletePerson(person.id)} 
                      className="w-full p-2 text-sm text-white bg-red-500 rounded md:w-auto hover:bg-red-600 flex items-center justify-center"
                      aria-label="Person löschen"
                      disabled={isSavingName || isSavingOrder}
                    ><Trash2 size={16} />
                    </button>                    
                  </div>
                </div>
              );
            })()
          ))}
          {orderedPersons.length === 0 && <p>Noch keine Personen angelegt. Fügen Sie eine Person hinzu, um zu starten.</p>}
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSavePersonOrder}
            disabled={!isOrderChanged || isSavingOrder || isSavingOrder}
            className={`px-4 py-2 text-sm text-white rounded-md flex items-center justify-center
                        ${isSavingOrder ? 'bg-yellow-500 hover:bg-yellow-600 cursor-not-allowed' :
                          (isOrderChanged ? 'bg-primary hover:bg-accent hover:text-primary' : 'bg-gray-400 cursor-not-allowed')}`}
            aria-label={isSavingOrder ? "Reihenfolge wird gespeichert..." : (isOrderChanged ? "Reihenfolge speichern" : "Keine Änderungen an der Reihenfolge")}
          >
            {isSavingOrder ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            Reihenfolge speichern
          </button>
        </div>
      </section>

      {/* Jahresspezifische Daten verwalten */}
      <section className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="mb-4 text-2xl font-semibold text-gray-700">Jahresspezifische Daten verwalten</h2>

        {/* Tabs für Jahresauswahl */}
        <div className="flex mb-6 border-b border-gray-200">
          {yearConfigs.length > 0 ? (
            yearConfigs.map(yc => (
              <button
                key={yc.year}
                onClick={() => setSelectedConfigYear(yc.year)}
                className={`px-3 py-2 -mb-px text-sm font-medium leading-5 focus:outline-none transition-colors duration-150 ease-in-out ${
                  selectedConfigYear === yc.year
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                {yc.year}
              </button>
            ))
          ) : (
            !isLoadingYearConfigs && <p className="py-2 text-gray-500">Bitte zuerst ein Jahr unter "Jahreskonfiguration verwalten" hinzufügen, um Personendaten zu bearbeiten.</p>
          )}
        </div>

        {/* Conditional rendering of yearly person data management UI */}
        {isLoadingYearlyPersonData ? (
          <LoadingIndicator message={`Lade Daten für Jahr ${selectedConfigYear}...`} />
        ) : yearConfigs.length > 0 && selectedConfigYear && personen.length > 0 ? (
          <div className="space-y-4">
            {personen.map(person => {
              const initialComparableData = getInitialDataForPerson(person.id);
              const currentDataFromState = yearlyPersonData[person.id] || {}; // Ensure object

              // Construct a comparable representation of the current data in the form
              const currentComparableData = {
                  resturlaub: currentDataFromState.resturlaub ?? '', 
                  employmentType: currentDataFromState.employmentType ?? 'full-time',
                  employmentPercentage: currentDataFromState.employmentPercentage,
                  daysPerWeek: currentDataFromState.daysPerWeek ?? (currentDataFromState.employmentType === 'part-time' ? '' : null)
              };

              if (currentComparableData.employmentType === 'full-time') {
                  currentComparableData.employmentPercentage = 100;
                  currentComparableData.daysPerWeek = null; 
              } else { // part-time
                  // If type is part-time, and percentage is undefined, treat as empty string for comparison
                  if (currentComparableData.employmentPercentage === undefined) {
                    currentComparableData.employmentPercentage = '';
                  }
                  // daysPerWeek is already handled by the ?? in its construction for currentComparableData
              }

              let hasYearlyDataChanged = false;
              // Compare resturlaub
              if (String(currentComparableData.resturlaub) !== String(initialComparableData.resturlaub)) {
                hasYearlyDataChanged = true;
              }
              // Compare employmentType
              if (!hasYearlyDataChanged && currentComparableData.employmentType !== initialComparableData.employmentType) {
                hasYearlyDataChanged = true;
              }
              if (!hasYearlyDataChanged && String(currentComparableData.employmentPercentage) !== String(initialComparableData.employmentPercentage)) {
                hasYearlyDataChanged = true;
              }
              // Compare daysPerWeek
              if (!hasYearlyDataChanged) {
                const initialDays = initialComparableData.daysPerWeek;
                const currentDays = currentComparableData.daysPerWeek;
                // String comparison handles numbers, empty strings, and null consistently for this check
                if (String(currentDays) !== String(initialDays)) {
                    hasYearlyDataChanged = true;
                }
              }

              const isSavingYearly = yearlyDataSavingStates[person.id];

              return (
                <div key={person.id} className="flex flex-col p-3 border rounded-md md:flex-row md:items-center md:justify-between">
                  {/* Linke Seite: Name, Checkbox, Resturlaub, Prozentsatz */}
                  <div className="flex-grow mb-2 md:mb-0">
                    {/* Reihe 1: Name und Teilzeit Checkbox */}
                    <div className="flex items-center mb-3 space-x-4">
                      <p className="text-lg font-medium text-gray-700">{person.name}</p>
                      <div className="flex items-center"> {/* Teilzeit Toggle Container */}
                        <ToggleSwitch
                          id={`teilzeit-${person.id}-${selectedConfigYear}`}
                          label={"Teilzeit"}
                          checked={yearlyPersonData[person.id]?.employmentType === 'part-time'}
                          onChange={(e) => {
                            handleEditYearlyDataChange(
                              person.id,
                              'employmentType',
                              e.target.checked ? 'part-time' : 'full-time'
                            );
                          }}
                          disabled={isSavingYearly}
                        />
                      </div>
                    </div>

                    {/* Reihe 2: Resturlaub und Arbeitszeit % und Tage/Woche */}
                    <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-4 md:items-end">
                      <div className="flex flex-col"> {/* Resturlaub Input */}
                        <label
                          htmlFor={`resturlaub-${person.id}-${selectedConfigYear}`}
                          className="mb-1 text-sm font-medium text-gray-600"
                        >
                          Resturlaub {selectedConfigYear} (Tage)
                        </label>
                        <input
                          id={`resturlaub-${person.id}-${selectedConfigYear}`}
                          type="number"
                          value={yearlyPersonData[person.id]?.resturlaub ?? ''}
                          onChange={(e) => handleEditYearlyDataChange(person.id, 'resturlaub', e.target.value)}
                          className="w-full px-2 py-1 border rounded-md md:w-auto"
                          disabled={isSavingYearly}
                        />
                      </div>

                      {/* Conditional inputs for part-time */}
                      {yearlyPersonData[person.id]?.employmentType === 'part-time' && (
                        <>
                          <div className="flex flex-col"> {/* Arbeitszeit % Input */}
                            <label
                              htmlFor={`employmentPercentage-${person.id}-${selectedConfigYear}`}
                              className="mb-1 text-sm font-medium text-gray-600"
                            >
                              Arbeitszeit % {selectedConfigYear}
                            </label>
                            <input
                              id={`employmentPercentage-${person.id}-${selectedConfigYear}`}
                              type="number"
                              value={yearlyPersonData[person.id]?.employmentPercentage ?? ''}
                              onChange={(e) => handleEditYearlyDataChange(person.id, 'employmentPercentage', e.target.value)}
                              className="w-full px-2 py-1 border rounded-md md:w-auto"
                              max="100"
                              min="0"
                              disabled={isSavingYearly}
                            />
                          </div>
                          <div className="flex flex-col"> {/* Tage pro Woche Input */}
                            <label
                              htmlFor={`daysPerWeek-${person.id}-${selectedConfigYear}`}
                              className="mb-1 text-sm font-medium text-gray-600"
                            >
                              Tage/Woche {selectedConfigYear}
                            </label>
                            <input
                              id={`daysPerWeek-${person.id}-${selectedConfigYear}`}
                              type="number"
                              value={yearlyPersonData[person.id]?.daysPerWeek ?? ''}
                              onChange={(e) => handleEditYearlyDataChange(person.id, 'daysPerWeek', e.target.value)}
                              className="w-full px-2 py-1 border rounded-md md:w-auto"
                              max="5"
                              min="1"
                              placeholder="1-5"
                              disabled={isSavingYearly}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Rechte Seite: Speicher- und Reset-Button */}
                  <div className="flex items-center flex-shrink-0 mt-3 md:mt-0 md:ml-4">
                    <button 
                      onClick={() => handleSaveYearlyData(person.id)} 
                      disabled={isSavingYearly || !hasYearlyDataChanged}
                      className={`w-full p-2 text-sm text-white rounded md:w-auto flex items-center justify-center
                                  ${isSavingYearly ? 'bg-yellow-500 hover:bg-yellow-600 cursor-not-allowed' : (hasYearlyDataChanged ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed')}`}
                      aria-label={isSavingYearly ? "Jährliche Daten speichern..." : (hasYearlyDataChanged ? "Jährliche Daten speichern" : "Keine Änderungen an jährlichen Daten")}
                    >
                      {isSavingYearly ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    </button>
                    <button
                      onClick={() => handleResetYearlyData(person.id)}
                      disabled={isSavingYearly || !hasYearlyDataChanged}
                      className={`p-2 text-sm rounded flex items-center justify-center ml-2
                                  ${isSavingYearly || !hasYearlyDataChanged 
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                    : 'bg-primary text-white hover:bg-primary'}`}
                      aria-label="Änderungen zurücksetzen"
                      title="Änderungen zurücksetzen"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          personen.length === 0 && 
          <p>Keine Personen vorhanden. Bitte fügen Sie zuerst Personen im Abschnitt "Personen verwalten" hinzu.</p>
        )}

        {/* Globale Tage vorbefüllen */}

        <h2 className="mb-4 mt-8 text-2xl font-semibold text-gray-700">
          Globale Tage vorbefüllen {(selectedConfigYear && yearConfigs.length > 0) ? `(für Jahr ${selectedConfigYear})` : ''}
        </h2>
        {yearConfigs.length > 0 && selectedConfigYear && personen.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-gray-600">
              Setzen Sie hier einen Tag für alle Personen im ausgewählten Jahr ({selectedConfigYear}) als Teamtag oder Feiertag.
              Eine bestehende globale Einstellung für diesen Tag wird überschrieben. Erneutes Klicken mit gleichem Status entfernt die globale Einstellung. Personenspezifische Einträge haben Vorrang.
            </p>
            <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-2 md:items-end">
              <div>
                <label htmlFor="prefillDay" className="block text-sm font-medium text-gray-700">Tag (1-31)</label>
                <input
                  type="number"
                  id="prefillDay"
                  value={prefillDate.day}
                  onChange={(e) => handlePrefillDateChange('day', e.target.value)}
                  placeholder="TT"
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md md:w-20 focus:outline-none focus:ring-2 focus:ring-primary"
                  min="1"
                  max="31"
                />
              </div>
              <div>
                <label htmlFor="prefillMonth" className="block text-sm font-medium text-gray-700">Monat (1-12)</label>
                <input
                  type="number"
                  id="prefillMonth"
                  value={prefillDate.month}
                  onChange={(e) => handlePrefillDateChange('month', e.target.value)}
                  placeholder="MM"
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md md:w-20 focus:outline-none focus:ring-2 focus:ring-primary"
                  min="1"
                  max="12"
                />
              </div>
              <button
                onClick={() => handleApplyPrefill('interne teamtage')}
                disabled={isPrefilling || !prefillDate.day || !prefillDate.month || !selectedConfigYear}
                className="w-full px-4 py-2 text-white bg-bold-lavender rounded-md md:w-auto hover:bg-pastel-lavender hover:text-bold-lavender disabled:bg-gray-400 disabled:hover:text-white flex items-center justify-center"
              >
                {isPrefilling ? <Loader2 size={20} className="animate-spin mr-2" /> : null} Alle als Teamtag
              </button>
              <button
                onClick={() => handleApplyPrefill('feiertag')}
                disabled={isPrefilling || !prefillDate.day || !prefillDate.month || !selectedConfigYear}
                className="w-full px-4 py-2 text-white bg-gray-dark rounded-md md:w-auto hover:bg-gray-medium hover:text-gray-dark disabled:bg-gray-400 disabled:hover:text-white flex items-center justify-center"
              >
                {isPrefilling ? <Loader2 size={20} className="animate-spin mr-2" /> : null} Alle als Feiertag
              </button>
              <button
                onClick={handleImportGermanHolidays}
                disabled={isImportingHolidays || !selectedConfigYear || personen.length === 0 || isPrefilling}
                className="w-full px-4 py-2 text-white bg-blue-500 rounded-md md:w-auto hover:bg-blue-600 disabled:bg-gray-400 disabled:hover:text-white flex items-center justify-center"
                title={!selectedConfigYear ? "Bitte zuerst ein Jahr auswählen" : (personen.length === 0 ? "Bitte zuerst Personen anlegen" : "Bundesweite Feiertage importieren")}
              >
                {isImportingHolidays ? <Loader2 size={20} className="animate-spin mr-2" /> : null}
                Feiertage importieren
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-500">
            {yearConfigs.length === 0 ? "Bitte zuerst ein Jahr unter \"Jahreskonfiguration verwalten\" hinzufügen." :
             !selectedConfigYear ? "Bitte oben ein Jahr auswählen, um dessen Personendaten zu bearbeiten oder globale Tage vorzubefüllen." :
             "Bitte zuerst Personen im Abschnitt \"Personen verwalten\" hinzufügen."}
          </p>
        )}
      </section>
    </main>
  );
};

export default SettingsPage;