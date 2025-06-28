import React, { useState, useEffect } from 'react';
import { useCalendar } from '../../hooks/useCalendar';
import { useFirestore } from '../../hooks/useFirestore';
import { db, doc, getDoc } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import YearConfigurationSection from './YearConfigurationSection'; // Import YearConfigurationSection
import PersonManagementSection from './PersonManagementSection'; // Import PersonManagementSection
import YearlyPersonDataSection from './YearlyPersonDataSection'; // Import YearlyPersonDataSection
import UserDataManagementSection from './UserDataManagementSection'; // Import der neuen Komponente
import DeveloperSettingsSection from './DeveloperSettingsSection'; // Import DeveloperSettingsSection
import { toast } from 'sonner'; // Importiere toast

const SettingsPage = () => {
  const {
    personen,
    currentYear: globalCurrentYear,
    getMonatsName,
    globalTagDaten // globalTagDaten für Prüfung, ob schon gesetzt
  } = useCalendar(); // Renamed to avoid conflict, consolidated useCalendar call
  const { currentUser, userTenantRole, loadingUserTenantRole } = useAuth(); // NEU: tenantId aus Context
  const userRole = userTenantRole?.role;
  const {
    addPerson, updatePersonName, deletePersonFirebase, savePersonOrder,
    saveResturlaub, saveEmploymentData,
    fetchYearConfigurations, addYearConfiguration, deleteYearConfiguration,
    updateYearConfigurationImportStatus, // Für Feiertagsimport-Status
    setGlobalDaySetting, // Fehlende Destrukturierung hinzugefügt
    batchSetGlobalDaySettings, // Importierte Funktion für Batch-Setzen
    deleteGlobalDaySetting, // Neue Funktion
    updateYearConfiguration, // For future enhancement - now used
  } = useFirestore(); 

  // --- State for Tab Navigation ---
  const [activeTab, setActiveTab] = useState('yearConfig'); // 'yearConfig', 'personManagement', 'yearlyPersonData', 'userData'

  // State for year configurations
  const [yearConfigs, setYearConfigs] = useState([]); // [{ id: 'docId', year: 2024, urlaubsanspruch: 30 }, ...]
  const [isLoadingYearConfigs, setIsLoadingYearConfigs] = useState(false);
  const [selectedConfigYear, setSelectedConfigYear] = useState(globalCurrentYear);

  // States for prefilling global days are now in GlobalDaySettingsSection

  // Fetch year configurations on mount and when tenantId is available
  useEffect(() => {
    if (loadingUserTenantRole || !userTenantRole || !userTenantRole.tenantId) return;
    const loadYearConfigs = async () => {
      setIsLoadingYearConfigs(true);
      const yearConfigsCollection = getTenantPath('yearConfigurations');
      const configs = await fetchYearConfigurations(yearConfigsCollection); // Hook ggf. anpassen
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
  }, [fetchYearConfigurations, globalCurrentYear, userTenantRole, loadingUserTenantRole, selectedConfigYear]);

  // States for person management are now mostly in PersonManagementSection
  const [yearlyDataSavingStates, setYearlyDataSavingStates] = useState({}); // Tracks saving state for yearly data { [personId]: boolean }

  const [isLoadingYearlyPersonData, setIsLoadingYearlyPersonData] = useState(false); // New state for loading yearly person data

  const [initialYearlyPersonData, setInitialYearlyPersonData] = useState({}); // Stores the initial yearly data for comparison
  // State for yearly person data
  const [yearlyPersonData, setYearlyPersonData] = useState({}); // { personId: { resturlaub, employmentPercentage, employmentType, daysPerWeek } }

  // Hilfsfunktion für Tenant-Pfade
  const getTenantPath = (...segments) => {
    if (!userTenantRole || !userTenantRole.tenantId) throw new Error('Kein tenantId verfügbar!');
    return ['tenants', userTenantRole.tenantId, ...segments];
  };

  // Effect to load person-specific data (Resturlaub, Employment) for the selectedConfigYear
  useEffect(() => {
    if (loadingUserTenantRole || !userTenantRole || !userTenantRole.tenantId || personen.length === 0 || !selectedConfigYear) {
      setIsLoadingYearlyPersonData(false);
      setYearlyPersonData({});
      setInitialYearlyPersonData({});
      return;
    }
    const fetchPromises = personen.map(async (p) => {
      setIsLoadingYearlyPersonData(true);
      if (!p?.id || typeof selectedConfigYear === 'undefined' || selectedConfigYear === null) {
        throw new Error(`Missing critical data for person ${p?.id} in year ${selectedConfigYear}`);
      }
      // Neue Struktur: tenants/{tenantId}/resturlaubData/{personId}_{year}
      const resturlaubDocId = `${p.id}_${selectedConfigYear}`;
      const employmentDocId = `${p.id}_${selectedConfigYear}`;
      let pResturlaub = 0;
      let pEmpData = { percentage: 100, type: 'full-time', daysPerWeek: null };
      try {
        const resturlaubRef = doc(db, ...getTenantPath('resturlaubData', resturlaubDocId));
        const resturlaubSnap = await getDoc(resturlaubRef);
        if (resturlaubSnap.exists()) {
          pResturlaub = resturlaubSnap.data().tage;
        }
        const employmentRef = doc(db, ...getTenantPath('employmentData', employmentDocId));
        const employmentSnap = await getDoc(employmentRef);
        if (employmentSnap.exists()) {
          pEmpData = { ...pEmpData, ...employmentSnap.data() };
        }
      } catch (err) {
        // Fehlerbehandlung wie bisher
      }
      return { personId: p.id, resturlaub: pResturlaub, ...pEmpData };
    });
    Promise.all(fetchPromises).then((results) => {
      const data = {};
      results.forEach(r => { if (r) data[r.personId] = r; });
      setYearlyPersonData(data);
      setInitialYearlyPersonData(data);
      setIsLoadingYearlyPersonData(false);
    });
  }, [personen, selectedConfigYear, userTenantRole, loadingUserTenantRole]);

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
          toast.error("Für Teilzeitbeschäftigung muss 'Tage pro Woche' eine Zahl zwischen 1 und 5 sein.");
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
      toast.error("Fehler beim Speichern der jährlichen Daten.");
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
    const personToDelete = personen.find(p => p.id === personId);
    if (!personToDelete) return;

    const performDelete = () => {
      const promise = () => new Promise(async (resolve, reject) => {
        try {
          const result = await deletePersonFirebase(personId);
          if (result.success) {
            // UI updates are handled by context/useEffect or here if necessary
            setYearlyPersonData(prev => { const newState = {...prev}; delete newState[personId]; return newState; });
            setInitialYearlyPersonData(prev => { const newState = {...prev}; delete newState[personId]; return newState; });
            resolve(`Person "${personToDelete.name}" wurde gelöscht.`);
          } else {
            reject(new Error(result.error?.message || result.error || "Unbekannter Fehler beim Löschen."));
          }
        } catch (error) {
          reject(error);
        }
      });

      toast.promise(promise, {
        loading: `Person "${personToDelete.name}" wird gelöscht...`,
        success: (message) => message,
        error: (err) => `Fehler beim Löschen von "${personToDelete.name}": ${err.message}`,
      });
    };

    toast.custom((t) => (
      <div className="bg-white p-4 rounded shadow-lg border flex flex-col items-start max-w-md">
        <p className="mb-3 text-sm text-gray-700">
          Sind Sie sicher, dass Sie <strong>{personToDelete.name}</strong> löschen möchten? Alle zugehörigen Daten (inkl. vergangener Jahre) gehen verloren.
        </p>
        <div className="flex space-x-2 mt-2 self-end w-full">
          <button className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 w-1/2" onClick={() => toast.dismiss(t)}>Abbrechen</button>
          <button className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 w-1/2" onClick={() => { toast.dismiss(t); performDelete(); }}>Löschen</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  // Handler for adding a year configuration, called by YearConfigurationSection
  const handleAddYearConfigProp = async (year, urlaubsanspruch) => {
    // Validation is handled within YearConfigurationSection
    const result = await addYearConfiguration(year, urlaubsanspruch);
    if (result.success) { // Error alert is handled in useFirestore
      const configs = await fetchYearConfigurations(); // Refresh list
      setYearConfigs(configs);
      setSelectedConfigYear(year); // Automatically select the newly added year
      // Erfolgsmeldung könnte hier hinzugefügt werden, wenn gewünscht, z.B. toast.success(`Jahreskonfiguration für ${year} hinzugefügt.`);
    } else { // Fehlerbehandlung bereits in useFirestore oder YearConfigurationSection, hier ggf. spezifischer
      toast.error("Fehler beim Hinzufügen der Jahreskonfiguration.");
    }
  };

  // Handler for deleting a year configuration, called by YearConfigurationSection
  const handleDeleteYearConfigProp = async (configId) => {
    const yearToDelete = parseInt(configId, 10);
    if (isNaN(yearToDelete)) {
        toast.error("Ungültige Jahres-ID zum Löschen.");
        return;
    }

    const performDelete = () => {
      const promise = () => new Promise(async (resolve, reject) => {
        try {
          await deleteYearConfiguration(configId);
          const configs = await fetchYearConfigurations();
          setYearConfigs(configs);
          if (selectedConfigYear === yearToDelete) {
            if (configs.length > 0) {
              setSelectedConfigYear(configs[0].year);
            }
          }
          resolve(`Jahreskonfiguration für ${yearToDelete} gelöscht.`);
        } catch (error) {
          console.error("Error deleting year configuration:", error);
          reject(error);
        }
      });

      toast.promise(promise, {
        loading: `Jahreskonfiguration für ${yearToDelete} wird gelöscht...`,
        success: (message) => message,
        error: (err) => `Fehler beim Löschen der Jahreskonfiguration für ${yearToDelete}: ${err.message || 'Unbekannter Fehler'}`,
      });
    };

    toast.custom((t) => (
      <div className="bg-white p-4 rounded shadow-lg border flex flex-col items-start max-w-md">
        <p className="mb-3 text-sm text-gray-700">
          Sind Sie sicher, dass Sie die Jahreskonfiguration für <strong>{yearToDelete}</strong> und alle damit verbundenen Daten (Resturlaub, Anstellungsart, globale Tage, Tageseinträge) löschen möchten?
        </p>
        <div className="flex space-x-2 mt-2 self-end w-full">
          <button className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 w-1/2" onClick={() => toast.dismiss(t)}>Abbrechen</button>
          <button className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 w-1/2" onClick={() => { toast.dismiss(t); performDelete(); }}>Löschen</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  // Handler for updating a year configuration, called by YearConfigurationSection
  const handleUpdateYearConfigProp = async (yearStringId, dataToUpdate) => {
    // yearStringId is the year (e.g., "2025"), dataToUpdate is { urlaubsanspruch: number }
    const result = await updateYearConfiguration(yearStringId, dataToUpdate);
    if (result.success) {
      const configs = await fetchYearConfigurations(); // Refresh list
      setYearConfigs(configs);
      toast.success(`Jahreskonfiguration für ${yearStringId} aktualisiert.`);
    } else {
      toast.error("Fehler beim Aktualisieren der Jahreskonfiguration.");
    }
  };

  // Handler for applying global prefill, called by GlobalDaySettingsSection, receives date data
  const handleApplyPrefillProp = async (statusToSet, prefillDateForAction) => {
    if (!selectedConfigYear || !prefillDateForAction.day || !prefillDateForAction.month) {
      toast.error("Bitte wählen Sie ein Jahr und geben Sie Tag und Monat für die Vorbelegung ein.");
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
      toast.error("Ungültiger Tag oder Monat.");
      return false;
    }

    // Validieren, ob der Tag im Monat für das ausgewählte Jahr existiert
    // new Date(year, monthIndex + 1, 0) gibt den letzten Tag des Monats monthIndex zurück
    const daysInSelectedMonth = new Date(selectedConfigYear, month + 1, 0).getDate();
    if (day > daysInSelectedMonth) {      
      toast.error(`Der Monat ${getMonatsName(month)} im Jahr ${selectedConfigYear} hat nur ${daysInSelectedMonth} Tage.`);
      return false;
    }

    // Prüfen, ob der ausgewählte Tag ein Wochenende ist
    const dateToCheck = new Date(selectedConfigYear, month, day);
    if (dateToCheck.getDay() === 0 || dateToCheck.getDay() === 6) { // 0 = Sonntag, 6 = Samstag
      toast.error("Globale Tage können nicht auf ein Wochenende gelegt werden.");
      return false;
    }

    let confirmDialogMessage = '';
    let actionFn; // This will be the function that returns a promise

    if (currentGlobalStatus === statusToSet) {
      confirmDialogMessage = `Der ${prefillDateForAction.day}.${prefillDateForAction.month}.${selectedConfigYear} ist bereits als ${statusToSet === 'interne teamtage' ? 'Teamtag' : 'Feiertag'} global gesetzt. Möchten Sie diese globale Einstellung entfernen?`;
      actionFn = () => deleteGlobalDaySetting(day, month, selectedConfigYear)
                          .then(() => `Die globale Einstellung für den ${prefillDateForAction.day}.${prefillDateForAction.month}.${selectedConfigYear} wurde entfernt.`);
    } else {
      confirmDialogMessage = `Möchten Sie den ${prefillDateForAction.day}.${prefillDateForAction.month}.${selectedConfigYear} für alle Personen als ${statusToSet === 'interne teamtage' ? 'Teamtag' : 'Feiertag'} setzen? Eine eventuell vorhandene andere globale Einstellung für diesen Tag wird überschrieben. Personenspezifische Einträge bleiben davon unberührt.`;
      actionFn = () => setGlobalDaySetting(day, month, selectedConfigYear, statusToSet)
                          .then(() => `${statusToSet === 'interne teamtage' ? 'Teamtage' : 'Feiertage'} für den ${prefillDateForAction.day}.${prefillDateForAction.month}.${selectedConfigYear} wurden global gesetzt.`);
    }

    const performAction = () => {
      const promise = () => new Promise(async (resolve, reject) => {
        try {
          const successMessage = await actionFn();
          resolve(successMessage);
        } catch (error) {
          console.error("Error in handleApplyPrefillProp action:", error);
          reject(error);
        }
      });

      toast.promise(promise, {
        loading: 'Aktion wird ausgeführt...',
        success: (message) => message,
        error: (err) => `Fehler bei der Aktion: ${err.message || 'Unbekannter Fehler'}`,
      });
    };

    return new Promise((resolveOuter) => {
      toast.custom((t) => (
        <div className="bg-white p-4 rounded shadow-lg border flex flex-col items-start max-w-md">
          <p className="mb-3 text-sm text-gray-700 whitespace-pre-line">{confirmDialogMessage}</p>
          <div className="flex space-x-2 mt-2 self-end w-full">
            <button className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 w-1/2" onClick={() => { toast.dismiss(t); resolveOuter(false); }}>Abbrechen</button>
            <button className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-accent hover:text-primary w-1/2" onClick={() => { toast.dismiss(t); performAction(); resolveOuter(true); }}>Bestätigen</button>
          </div>
        </div>
      ), { duration: Infinity });
    });
  };

  // Handler for importing holidays, now receives the list of holidays from GlobalDaySettingsSection
  const handleImportGermanHolidaysProp = async (holidaysToSet) => { // Removed skippedWeekendHolidays from signature
    if (!selectedConfigYear) {
      toast.error("Bitte wählen Sie zuerst ein Jahr aus, für das die Feiertage importiert werden sollen.");
      return false; // Early exit
    }

    const confirmDialogMessage = `Möchten Sie die ausgewählten Feiertage für ${selectedConfigYear} importieren? Bestehende globale Einstellungen für diese Tage werden als 'Feiertag' überschrieben.`;

    const performImport = () => {
      const promise = () => new Promise(async (resolve, reject) => {
        try {
          if (holidaysToSet.length > 0) {
            await batchSetGlobalDaySettings(selectedConfigYear, holidaysToSet, 'feiertag');
          }
          resolve("Feiertagsimport-Aktion abgeschlossen. Details in der Erfolgsmeldung."); // Generic, specific success in GlobalDaySettingsSection
        } catch (error) {
          reject(error);
        }
      });
      toast.promise(promise, {
        loading: 'Feiertage werden importiert...',
        success: (message) => message, // This toast is for the batch operation itself
        error: (err) => `Fehler beim Batch-Import der Feiertage: ${err.message || 'Unbekannter Fehler'}`,
      });
    };

    return new Promise((resolveOuter) => {
      toast.custom((t) => (
        <div className="bg-white p-4 rounded shadow-lg border flex flex-col items-start max-w-md">
          <p className="mb-3 text-sm text-gray-700 whitespace-pre-line">{confirmDialogMessage}</p>
          <div className="flex space-x-2 mt-2 self-end w-full">
            <button className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 w-1/2" onClick={() => { toast.dismiss(t); resolveOuter(false); }}>Abbrechen</button>
            <button className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-accent hover:text-primary w-1/2" onClick={() => { toast.dismiss(t); performImport(); resolveOuter(true); }}>Importieren</button>
          </div>
        </div>
      ), { duration: Infinity });
    });
  };

  // Handler for setting the holiday import status for a year
  const handleSetHolidaysImportedStatusProp = async (year, status) => {
    if (!year) return;
    const result = await updateYearConfigurationImportStatus(String(year), status);
    if (result.success) {
      // Die yearConfigs im Context werden durch updateYearConfigurationImportStatus aktualisiert,
      // was zu einem Re-Render und Aktualisierung der Props für GlobalDaySettingsSection führt.
    } else {
      toast.error("Fehler beim Speichern des Feiertagsimport-Status.");
    }
  };


  // Developer Mode State
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);

  useEffect(() => {
    // Check LocalStorage for DeveloperMode
    if (localStorage.getItem('DeveloperMode') === 'true') {
      setIsDeveloperMode(true);
    }
    // Listen for changes from other tabs/windows
    const onStorage = (e) => {
      if (e.key === 'DeveloperMode') {
        setIsDeveloperMode(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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
    ...(isDeveloperMode ? [{ id: 'developer', label: 'Developer' }] : [])
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
            onUpdateYearConfiguration={handleUpdateYearConfigProp}
            userRole={userRole}
          />
        );
      case 'personManagement':
        return (
          <PersonManagementSection
            personen={personen}
            onAddPerson={handleAddPersonProp}
            onUpdatePersonName={updatePersonName}
            onDeletePerson={handleDeletePerson}
            onSavePersonOrder={savePersonOrder}
            userRole={userRole}
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
            isLoadingYearConfigs={isLoadingYearConfigs}
            globalTagDaten={globalTagDaten}
            onApplyPrefill={handleApplyPrefillProp}
            onImportHolidays={handleImportGermanHolidaysProp}
            onSetHolidaysImportedStatus={handleSetHolidaysImportedStatusProp}
            getMonatsName={getMonatsName}
            userRole={userRole}
          />
        );
      case 'userData':
        return (
          <UserDataManagementSection />
        );
      case 'developer':
        return <DeveloperSettingsSection />;
      default:
        return null;
    }
  };

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Einstellungen</h1>
        {/* {currentUser && currentUser.email && (
          <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-lg shadow-sm" title="Eingeloggt als">
            Eingeloggt als: {currentUser.email}
          </span>
        )} */}
      </div>

      {/* Tab Navigation */}
      <div className="flex mb-6 border-b border-gray-200 overflow-x-auto overflow-y-hidden">
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
      
    </div>
  );
};

export default SettingsPage;