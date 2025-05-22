import React, { useState, useEffect } from 'react';
import { useCalendar } from '../../hooks/useCalendar';
import { useFirestore } from '../../hooks/useFirestore';
import { db, doc, getDoc } from '../../firebase'; // For direct doc fetching
import { useAuth } from '../../context/AuthContext';
// Removed unused imports (Icons, LoadingIndicator, ToggleSwitch)
import YearConfigurationSection from './YearConfigurationSection'; // Import YearConfigurationSection
import PersonManagementSection from './PersonManagementSection'; // Import PersonManagementSection
import YearlyPersonDataSection from './YearlyPersonDataSection'; // Import YearlyPersonDataSection
import UserDataManagementSection from './UserDataManagementSection'; // Import der neuen Komponente
// GlobalDaySettingsSection wird jetzt innerhalb von YearlyPersonDataSection gerendert

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
    updateYearConfigurationImportStatus, // Für Feiertagsimport-Status
    setGlobalDaySetting, // Fehlende Destrukturierung hinzugefügt
    batchSetGlobalDaySettings, // Importierte Funktion für Batch-Setzen
    deleteGlobalDaySetting, // Neue Funktion
    // updateYearConfiguration, // For future enhancement
  } = useFirestore(); 

  // --- State for Tab Navigation ---
  const [activeTab, setActiveTab] = useState('yearConfig'); // 'yearConfig', 'personManagement', 'yearlyPersonData', 'userData'

  // State for year configurations
  const [yearConfigs, setYearConfigs] = useState([]); // [{ id: 'docId', year: 2024, urlaubsanspruch: 30 }, ...]
  const [isLoadingYearConfigs, setIsLoadingYearConfigs] = useState(false);
  const [selectedConfigYear, setSelectedConfigYear] = useState(globalCurrentYear);

  // States for prefilling global days are now in GlobalDaySettingsSection

  // Fetch year configurations on mount and when currentUser is available
  useEffect(() => {
    if (currentUser) {
      const loadYearConfigs = async () => {
        setIsLoadingYearConfigs(true);
        const configs = await fetchYearConfigurations();
        setYearConfigs(configs);

        // Logic to set/update selectedConfigYear after configs are loaded
        if (configs.length > 0) {
          const isCurrentSelectedYearValid = configs.some(c => c.year === selectedConfigYear);
          if (!isCurrentSelectedYearValid) {
            // If the current selectedConfigYear is not in the new list of configs
            // (e.g., it was deleted, or on initial load selectedConfigYear was default but not configured)
            // then select the globalCurrentYear if available, otherwise the first in the list.
            const configForGlobalCurrentYear = configs.find(c => c.year === globalCurrentYear);
            if (configForGlobalCurrentYear) {
              setSelectedConfigYear(globalCurrentYear);
            } else {
              setSelectedConfigYear(configs[0].year); // Default to the first available configured year
            }
          }
          // If isCurrentSelectedYearValid is true, we keep the user's selection or the valid initial state.
        } else {
          // No configs available, default to globalCurrentYear.
          // The user can then add this year via the UI.
          setSelectedConfigYear(globalCurrentYear);
        }
        setIsLoadingYearConfigs(false);
      };
      loadYearConfigs();
    }
  }, [fetchYearConfigurations, globalCurrentYear, currentUser, selectedConfigYear]); // Added selectedConfigYear to dependencies

  // States for person management are now mostly in PersonManagementSection
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
      setInitialYearlyPersonData({}); // Also clear initial data
      return;
    }

    const fetchPromises = personen.map(async (p) => {
      // Detailliertes Logging vor der ID-Erstellung
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
        const resturlaubRef = doc(db, 'users', currentUser.uid, 'resturlaubData', resturlaubDocId); // Use doc directly
        const resturlaubSnap = await getDoc(resturlaubRef);
        if (resturlaubSnap.exists()) {
          pResturlaub = resturlaubSnap.data().tage;
          console.log(`SettingsPage - Resturlaub for ${p.id} (${selectedConfigYear}) found: ${pResturlaub}`);
        } else {
          // Kein Dokument vorhanden, kein Fehler, einfach 0 lassen
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
        const employmentRef = doc(db, 'users', currentUser.uid, 'employmentData', employmentDocId); // Use doc directly
        const employmentSnap = await getDoc(employmentRef);
        if (employmentSnap.exists()) {
          pEmpData = employmentSnap.data();
          // Ensure daysPerWeek has a sensible default if missing from older DB entries
          if (pEmpData.daysPerWeek === undefined) {
            pEmpData.daysPerWeek = pEmpData.type === 'part-time' ? '' : null; // Use '' for part-time default to match input state
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
          setYearlyPersonData({}); // Clear current data on error
        setInitialYearlyPersonData({}); // Clear initial data on error
        setIsLoadingYearlyPersonData(false); // End loading on error
      });

  }, [selectedConfigYear, personen, currentUser]);

  const handleEditYearlyDataChange = (personId, field, value) => {
    setYearlyPersonData(prev => {
      const newPersonDataForId = { ...(prev[personId] || {}) }; // Start with existing or empty object

      if (field === 'employmentType') {
        newPersonDataForId.employmentType = value;
        if (value === 'full-time') {
          newPersonDataForId.employmentPercentage = 100;
          newPersonDataForId.daysPerWeek = null; // Full-time has no daysPerWeek
        }
        // When switching to full-time, daysPerWeek becomes irrelevant.
        // It will be handled/nulled out during save or comparison.
        // If switching to part-time, daysPerWeek might be '' initially.
        // If switching to part-time, percentage is not changed here.
        // It will be validated/capped if the percentage input is then edited.
      } else if (field === 'employmentPercentage') {
        // This field is only visible/editable if employmentType is 'part-time'.
        const parsedValue = parseInt(value, 10);
        if (value === '') { // Allow clearing the field, store as empty string
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
        if (value === '') { // Allow clearing the field, store as empty string
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
      alert("Fehler beim Speichern der jährlichen Daten.");
    } finally {
      setYearlyDataSavingStates(prev => ({ ...prev, [personId]: false }));
    }
  };

  // Handler for adding a person, called by PersonManagementSection
  const handleAddPersonProp = async (name) => {
    const result = await addPerson(name); // addPerson from useFirestore
    if (result.success) {
      // Input clearing is handled within PersonManagementSection
    } // Error alert is handled in useFirestore
    return result; // Return result so PersonManagementSection can react
  };

  const handleDeletePerson = async (personId) => {
    if (window.confirm("Sind Sie sicher, dass Sie diese Person löschen möchten? Alle zugehörigen Daten gehen verloren.")) {
      await deletePersonFirebase(personId);
      // Also clear related data from local yearlyPersonData state
      setYearlyPersonData(prev => { const newState = {...prev}; delete newState[personId]; return newState; });
      setInitialYearlyPersonData(prev => { const newState = {...prev}; delete newState[personId]; return newState; });
    }
  };

  // Handler for adding a year configuration, called by YearConfigurationSection
  const handleAddYearConfigProp = async (year, urlaubsanspruch) => {
    // Validation is handled within YearConfigurationSection
    const result = await addYearConfiguration(year, urlaubsanspruch);
    if (result.success) { // Error alert is handled in useFirestore
      const configs = await fetchYearConfigurations(); // Refresh list
      setYearConfigs(configs);
      setSelectedConfigYear(year); // Automatically select the newly added year
    } else {
      alert("Fehler beim Hinzufügen der Jahreskonfiguration.");
    }
  };

  // Handler for deleting a year configuration, called by YearConfigurationSection
  const handleDeleteYearConfigProp = async (configId) => {
    // YearConfigurationSection manages its own deletingYearConfigId for spinner
    if (window.confirm("Sind Sie sicher, dass Sie diese Jahreskonfiguration löschen möchten?")) {
      try {
        await deleteYearConfiguration(configId);
        // Refresh list after deletion
        const configs = await fetchYearConfigurations();
        setYearConfigs(configs);
        // If the deleted year was the selected one, try to select another year
        if (selectedConfigYear === parseInt(configId, 10)) {
            if (configs.length > 0) {
                setSelectedConfigYear(configs[0].year); // Select the first available year
            } // If no configs left, selectedConfigYear will remain the deleted year until the effect runs or user adds a new one. Could default to globalCurrentYear here.
        }
      } catch (error) {
        console.error("Error deleting year configuration:", error);
        alert("Fehler beim Löschen der Jahreskonfiguration.");
      }
    }
  };

  // Handler for applying global prefill, called by GlobalDaySettingsSection, receives date data
  const handleApplyPrefillProp = async (statusToSet, prefillDateForAction) => {
    if (!selectedConfigYear || !prefillDateForAction.day || !prefillDateForAction.month) {
      alert("Bitte wählen Sie ein Jahr und geben Sie Tag und Monat für die Vorbelegung ein.");
      return false;
    }
    // Monat ist 0-indiziert für Date-Objekte und unsere interne Logik
    const day = parseInt(prefillDateForAction.day, 10);
    const month = parseInt(prefillDateForAction.month, 10) - 1; // Konvertiere 1-12 zu 0-11

    const globalKey = `${selectedConfigYear}-${month}-${day}`; // Define globalKey here

    // Zusätzliche Sicherung und detailliertes Logging
    const safeGlobalTagDaten = globalTagDaten || {};
    // Prüfen, ob dieser Tag bereits global mit diesem Status gesetzt ist
    const currentGlobalStatus = safeGlobalTagDaten[globalKey];
    // Basisvalidierung
    if (isNaN(day) || day < 1 || day > 31 || isNaN(month) || month < 0 || month > 11) {
      alert("Ungültiger Tag oder Monat.");
      return false;
    }

    // Validieren, ob der Tag im Monat für das ausgewählte Jahr existiert
    // new Date(year, monthIndex + 1, 0) gibt den letzten Tag des Monats monthIndex zurück
    const daysInSelectedMonth = new Date(selectedConfigYear, month + 1, 0).getDate();
    if (day > daysInSelectedMonth) {
      alert(`Der Monat ${getMonatsName(month)} im Jahr ${selectedConfigYear} hat nur ${daysInSelectedMonth} Tage.`);
      return false;
    }

    // Prüfen, ob der ausgewählte Tag ein Wochenende ist
    const dateToCheck = new Date(selectedConfigYear, month, day);
    if (dateToCheck.getDay() === 0 || dateToCheck.getDay() === 6) { // 0 = Sonntag, 6 = Samstag
      alert("Globale Tage können nicht auf ein Wochenende gelegt werden.");
      return false;
    }

    let actionConfirmedAndExecuted = false;
    try {
      if (currentGlobalStatus === statusToSet) {
        // Wenn der Tag bereits mit diesem Status global gesetzt ist, entfernen wir ihn
        const confirmMessage = `Der ${prefillDateForAction.day}.${prefillDateForAction.month}.${selectedConfigYear} ist bereits als ${statusToSet === 'interne teamtage' ? 'Teamtag' : 'Feiertag'} global gesetzt. Möchten Sie diese globale Einstellung entfernen?`;
        if (window.confirm(confirmMessage)) {
          await deleteGlobalDaySetting(day, month, selectedConfigYear);
          alert(`Die globale Einstellung für den ${prefillDateForAction.day}.${prefillDateForAction.month}.${selectedConfigYear} wurde entfernt.`);
          actionConfirmedAndExecuted = true;
        }
      } else {
        // Andernfalls setzen wir den neuen globalen Status (oder überschreiben einen anderen globalen Status)
        const confirmMessage = `Möchten Sie den ${prefillDateForAction.day}.${prefillDateForAction.month}.${selectedConfigYear} für alle Personen als ${statusToSet === 'interne teamtage' ? 'Teamtag' : 'Feiertag'} setzen? Eine eventuell vorhandene andere globale Einstellung für diesen Tag wird überschrieben. Personenspezifische Einträge bleiben davon unberührt.`;
        if (window.confirm(confirmMessage)) { // Confirmation needed before setting
          await setGlobalDaySetting(day, month, selectedConfigYear, statusToSet);
          alert(`${statusToSet === 'interne teamtage' ? 'Teamtage' : 'Feiertage'} für den ${prefillDateForAction.day}.${prefillDateForAction.month}.${selectedConfigYear} wurden global gesetzt.`);
          actionConfirmedAndExecuted = true;
        }
      }
      return actionConfirmedAndExecuted; // Return success status
    } catch (error) {
      console.error("Error prefilling global day status:", error);
      alert(`Fehler beim Vorbelegen: ${error.message}`);
      return false; // Return failure status
    }
  };

  // Handler for importing holidays, now receives the list of holidays from GlobalDaySettingsSection
  const handleImportGermanHolidaysProp = async (holidaysToSet) => { // Removed skippedWeekendHolidays from signature
    if (!selectedConfigYear) {
      alert("Bitte wählen Sie zuerst ein Jahr aus, für das die Feiertage importiert werden sollen.");
      return false;
    }

    if (!window.confirm(`Möchten Sie die bundesweiten deutschen Feiertage für ${selectedConfigYear} importieren? Bestehende globale Einstellungen für diese Tage werden als 'Feiertag' überschrieben.`)) {
      return false;
    }    
    
    try {
      if (holidaysToSet.length > 0) {
        await batchSetGlobalDaySettings(selectedConfigYear, holidaysToSet, 'feiertag');
      } // Success/Error messages and skipped weekend holidays message are now handled in GlobalDaySettingsSection
      return true; // Return success status
    } catch (error) {
      console.error("Error importing German holidays:", error);
      alert(`Fehler beim Importieren der Feiertage: ${error.message}`);
      return false; // Return failure status
    }
  };

  // Handler for setting the holiday import status for a year
  const handleSetHolidaysImportedStatusProp = async (year, status) => {
    if (!year) return;
    const result = await updateYearConfigurationImportStatus(String(year), status);
    if (result.success) {
      // Die yearConfigs im Context werden durch updateYearConfigurationImportStatus aktualisiert,
      // was zu einem Re-Render und Aktualisierung der Props für GlobalDaySettingsSection führt.
    } else {
      alert("Fehler beim Speichern des Feiertagsimport-Status.");
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
        employmentPercentage: initialDbState.employmentPercentage ?? '', // Treat undefined/null as empty string for comparison
        daysPerWeek: initialDbState.daysPerWeek ?? (initialDbState.employmentType === 'part-time' ? '' : null),
      };
    }
    // Defaults for a person/year with no existing data in initialYearlyPersonData
    // (e.g., new person, or data fetch failed/didn't cover this person)
    return {
      resturlaub: '', // Represents an empty input field
      employmentType: 'full-time',
      employmentPercentage: 100, // Default for full-time
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

  // Define tabs
  const tabs = [
    { id: 'yearConfig', label: 'Jahreskonfiguration' },
    { id: 'personManagement', label: 'Personen verwalten' },
    { id: 'yearlyPersonData', label: 'Jahresspezifische Daten' },
    { id: 'userData', label: 'Benutzerdaten' },
  ];

  // Conditional rendering based on activeTab
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'yearConfig':
        return (
          <YearConfigurationSection
            yearConfigs={yearConfigs}
            isLoadingYearConfigs={isLoadingYearConfigs}
            onAddYearConfig={handleAddYearConfigProp}
            onDeleteYearConfig={handleDeleteYearConfigProp}
            // onUpdateYearConfiguration will be passed if implemented
          />
        );
      case 'personManagement':
        return (
          <PersonManagementSection
            personen={personen} // Pass the current list of persons from useCalendar
            onAddPerson={handleAddPersonProp} // Pass the local handler
            onUpdatePersonName={updatePersonName} // Pass the Firestore hook function
            onDeletePerson={handleDeletePerson} // Pass the local handler
            onSavePersonOrder={savePersonOrder} // Pass the Firestore hook function
          />
        );
      case 'yearlyPersonData':
        return (
          <YearlyPersonDataSection
            personen={personen}
            yearConfigs={yearConfigs}
            selectedConfigYear={selectedConfigYear}
            setSelectedConfigYear={setSelectedConfigYear}
            yearlyPersonData={yearlyPersonData}
            initialYearlyPersonData={initialYearlyPersonData}
            onYearlyDataChange={handleEditYearlyDataChange}
            onSaveYearlyData={handleSaveYearlyData}
            onResetYearlyData={handleResetYearlyData}
            yearlyDataSavingStates={yearlyDataSavingStates}
            isLoadingYearlyPersonData={isLoadingYearlyPersonData}
            getInitialDataForPerson={getInitialDataForPerson}
            isLoadingYearConfigs={isLoadingYearConfigs} // Pass loading state for year configs
            // Pass props needed by GlobalDaySettingsSection
            globalTagDaten={globalTagDaten}
            onApplyPrefill={handleApplyPrefillProp} // Pass the handler
            onImportHolidays={handleImportGermanHolidaysProp} // Pass the handler
            onSetHolidaysImportedStatus={handleSetHolidaysImportedStatusProp} // Neuer Handler
            getMonatsName={getMonatsName} // Pass getMonatsName
          />
        );
      case 'userData':
        return (
          <UserDataManagementSection />
          // currentUser wird via useAuth() direkt in der Komponente geholt
        );
      default:
        return null;
    }
  };

  return (
    <main className="container px-4 py-8 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Einstellungen</h1>
        {/* {currentUser && currentUser.email && (
          <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-lg shadow-sm" title="Eingeloggt als">
            Eingeloggt als: {currentUser.email}
          </span>
        )} */}
      </div>

      {/* Tab Navigation */}
      <div className="flex mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 -mb-px text-sm font-medium leading-5 focus:outline-none transition-colors duration-150 ease-in-out ${
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {renderActiveTabContent()}
      </div>

    </main>
  );
};

export default SettingsPage;