import React, { useState, useEffect } from 'react';
import { useCalendar } from '../../hooks/useCalendar';
import { useFirestore } from '../../hooks/useFirestore';
import { db, doc, getDoc } from '../../firebase'; // For direct doc fetching
import { useAuth } from '../../context/AuthContext'; // To get currentUser for doc IDs
import { Plus, Save, Trash2, Loader2 } from 'lucide-react'; // Import Lucide icons, added Loader2
import LoadingIndicator from '../common/LoadingIndicator'; // Import LoadingIndicator

const SettingsPage = () => {
  const { personen, currentYear: globalCurrentYear } = useCalendar(); // Renamed to avoid conflict
  const { currentUser } = useAuth();
  const { 
    addPerson, updatePersonName, deletePersonFirebase, 
    saveResturlaub, saveEmploymentData,
    fetchYearConfigurations, addYearConfiguration, deleteYearConfiguration,
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
  
  const [personSavingStates, setPersonSavingStates] = useState({}); // Tracks saving state for person names { [personId]: boolean }
  const [yearlyDataSavingStates, setYearlyDataSavingStates] = useState({}); // Tracks saving state for yearly data { [personId]: boolean }

  const [isLoadingYearlyPersonData, setIsLoadingYearlyPersonData] = useState(false); // New state for loading yearly person data

  const [initialYearlyPersonData, setInitialYearlyPersonData] = useState({}); // Stores the initial yearly data for comparison
  // State for yearly person data
  const [yearlyPersonData, setYearlyPersonData] = useState({}); // { personId: { resturlaub, employmentPercentage, employmentType } }

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

      const resturlaubDocId = `${currentUser.uid}_${p.id}_${selectedConfigYear}`;
      const employmentDocId = `${currentUser.uid}_${p.id}_${selectedConfigYear}`;

      let pResturlaub = 0;
      let pEmpData = { percentage: 100, type: 'full-time' }; // Standardwerte

      try {
        console.log(`SettingsPage - Attempting to fetch resturlaubData with ID: ${resturlaubDocId}`);
        const resturlaubRef = doc(db, 'resturlaubData', resturlaubDocId);
        const resturlaubSnap = await getDoc(resturlaubRef);
        if (resturlaubSnap.exists()) {
          pResturlaub = resturlaubSnap.data().tage;
          console.log(`SettingsPage - Resturlaub for ${p.id} (${selectedConfigYear}) found: ${pResturlaub}`);
        } else {
          console.log(`SettingsPage - No resturlaubData found for ${resturlaubDocId}`);
        }
      } catch (error) {
        console.error(`SettingsPage - Error fetching resturlaubData for ID ${resturlaubDocId}:`, error);
        // Fehler weiterwerfen, um ihn im Promise.all().catch() zu behandeln
        throw error; 
      }

      try {
        console.log(`SettingsPage - Attempting to fetch employmentData with ID: ${employmentDocId}`);
        const employmentRef = doc(db, 'employmentData', employmentDocId);
        const employmentSnap = await getDoc(employmentRef);
        if (employmentSnap.exists()) {
          pEmpData = employmentSnap.data();
          console.log(`SettingsPage - EmploymentData for ${p.id} (${selectedConfigYear}) found:`, pEmpData);
        } else {
          console.log(`SettingsPage - No employmentData found for ${employmentDocId}`);
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
    setYearlyPersonData(prev => ({
      ...prev,
      [personId]: {
        ...prev[personId], // Apply existing edits for this person's yearly data
        [field]: value,
      }
    }));
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
      const employmentResult = await saveEmploymentData(personId, { 
        percentage: parseInt(yearlyData.employmentPercentage, 10) || 100, 
        type: yearlyData.employmentType || 'full-time' // Default type if not set
      }, selectedConfigYear);
      if (employmentResult.success) employmentSaved = true;

      if (resturlaubSaved || employmentSaved) { // If at least one was successful
        // Success feedback is now handled by button animation
        // Update initial data to reflect the saved state, so the button becomes disabled again
        setInitialYearlyPersonData(prev => ({
          ...prev,
          [personId]: {
            resturlaub: parseInt(yearlyData.resturlaub, 10) || 0,
            employmentPercentage: parseInt(yearlyData.employmentPercentage, 10) || 100,
            employmentType: yearlyData.employmentType || 'full-time',
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

  return (
    <main className="container px-4 py-8 mx-auto">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">Einstellungen</h1>

      {/* Jahreskonfiguration verwalten */}
      <section className="p-6 mb-8 bg-white rounded-lg shadow-md">
        <h2 className="mb-4 text-2xl font-semibold text-gray-700">Jahreskonfiguration verwalten</h2>
        <div className="mb-4 space-y-3 md:space-y-0 md:flex md:space-x-2">
          <input
            type="number"
            placeholder="Jahr"
            value={newYearData.year}
            onChange={(e) => setNewYearData(prev => ({ ...prev, year: parseInt(e.target.value) || '' }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md md:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Urlaubsanspruch (Tage)"
            value={newYearData.urlaubsanspruch}
            onChange={(e) => setNewYearData(prev => ({ ...prev, urlaubsanspruch: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md md:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={handleAddYearConfig} 
            className="w-full px-3 py-2 text-white bg-blue-600 rounded-md md:w-auto hover:bg-blue-700 flex items-center justify-center"
            aria-label="Jahr hinzufügen"
          >
            <Plus size={20} />
          </button>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md md:w-auto max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={handleAddPerson} 
            className="w-full px-3 py-2 text-white bg-blue-600 rounded-md md:w-auto hover:bg-blue-700 flex items-center justify-center"
            aria-label="Person hinzufügen"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="space-y-4">
          {personen.map(person => (
            (() => { // IIFE to use const for isSavingName
              const originalPerson = personen.find(p => p.id === person.id);
              const nameHasChanged = editingPersons[person.id]?.name !== originalPerson?.name;
              const isSavingName = personSavingStates[person.id];
              return (
                <div key={person.id} className="flex flex-col p-3 border rounded-md md:flex-row md:items-center md:justify-between">
                  <div className="flex-grow mb-2 md:mb-0">
                    <input 
                      type="text"
                      value={editingPersons[person.id]?.name ?? person.name}
                      onChange={(e) => handleEditPersonChange(person.id, e.target.value)}
                      className="w-full px-2 py-1 border rounded-md md:w-auto"
                      placeholder="Name"
                      disabled={isSavingName}
                    />
                  </div>
                  <div className="flex-shrink-0 md:ml-4 flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2">
                    <button 
                      onClick={() => handleSavePerson(person.id)} 
                      disabled={isSavingName || !nameHasChanged}
                      className={`w-full p-2 text-sm text-white rounded md:w-auto flex items-center justify-center
                                  ${isSavingName ? 'bg-yellow-500 hover:bg-yellow-600 cursor-not-allowed' : (nameHasChanged ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed')}`}
                      aria-label={isSavingName ? "Namen speichern..." : (nameHasChanged ? "Namen speichern" : "Keine Änderungen am Namen")}
                    >
                      {/* Die Erfolgsmeldung wird hier angezeigt, wenn personSaveSuccess die ID der aktuellen Person ist UND nicht gerade gespeichert wird */}
                      {isSavingName ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    </button>
                    <button 
                      onClick={() => handleDeletePerson(person.id)} 
                      className="w-full p-2 text-sm text-white bg-red-500 rounded md:w-auto hover:bg-red-600 flex items-center justify-center"
                      aria-label="Person löschen"
                      disabled={isSavingName}
                    ><Trash2 size={16} />
                    </button>                    
                  </div>
                </div>
              );
            })()
          ))}
          {personen.length === 0 && <p>Noch keine Personen angelegt. Fügen Sie eine Person hinzu, um zu starten.</p>}
        </div>
      </section>

      {/* Jahresspezifische Personendaten verwalten */}
      <section className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="mb-4 text-2xl font-semibold text-gray-700">Jahresspezifische Personendaten verwalten</h2>

        {/* Tabs für Jahresauswahl */}
        <div className="flex mb-6 border-b border-gray-200">
          {yearConfigs.length > 0 ? (
            yearConfigs.map(yc => (
              <button
                key={yc.year}
                onClick={() => setSelectedConfigYear(yc.year)}
                className={`px-3 py-2 -mb-px text-sm font-medium leading-5 focus:outline-none transition-colors duration-150 ease-in-out ${
                  selectedConfigYear === yc.year
                    ? 'border-b-2 border-blue-500 text-blue-600'
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
              const initialDataForPerson = initialYearlyPersonData[person.id];
              const currentDataForPerson = yearlyPersonData[person.id];
              let hasYearlyDataChanged = false;

              if (initialDataForPerson && currentDataForPerson) {
                const currentResturlaubStr = String(currentDataForPerson.resturlaub ?? '');
                const initialResturlaubStr = String(initialDataForPerson.resturlaub ?? '');
                const currentEmploymentPercentageStr = String(currentDataForPerson.employmentPercentage ?? '');
                const initialEmploymentPercentageStr = String(initialDataForPerson.employmentPercentage ?? '');

                if (currentResturlaubStr !== initialResturlaubStr) hasYearlyDataChanged = true;
                if (!hasYearlyDataChanged && currentEmploymentPercentageStr !== initialEmploymentPercentageStr) hasYearlyDataChanged = true;
              } else if (currentDataForPerson) { // If user typed into a form that had no initial data (e.g. new person, year not yet saved)
                if (String(currentDataForPerson.resturlaub ?? '') !== '' || String(currentDataForPerson.employmentPercentage ?? '') !== (initialDataForPerson?.employmentPercentage ?? '100')) hasYearlyDataChanged = true;
              }
              const isSavingYearly = yearlyDataSavingStates[person.id];
              return (
                <div key={person.id} className="flex flex-col p-3 border rounded-md md:flex-row md:items-center md:justify-between">
                  <div className="flex-grow mb-2 md:mb-0">
                    <p className="font-medium text-gray-700">{person.name}</p>
                    <div className="mt-2 md:flex md:space-x-4"> {/* Increased space for better layout with labels */}
                      <div className="flex flex-col mb-2 md:mb-0">
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
                      <div className="flex flex-col">
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
                          disabled={isSavingYearly}
                        />
                      </div>
                      {/* Consider adding employmentType dropdown as well */}
                    </div>
                  </div>
                  <div className="flex-shrink-0 md:ml-4">
                    <button 
                      onClick={() => handleSaveYearlyData(person.id)} 
                      disabled={isSavingYearly || !hasYearlyDataChanged || !initialDataForPerson}
                      className={`w-full p-2 text-sm text-white rounded md:w-auto flex items-center justify-center
                                  ${isSavingYearly ? 'bg-yellow-500 hover:bg-yellow-600 cursor-not-allowed' : (hasYearlyDataChanged && initialDataForPerson ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed')}`}
                      aria-label={isSavingYearly ? "Jährliche Daten speichern..." : (hasYearlyDataChanged && initialDataForPerson ? "Jährliche Daten speichern" : "Keine Änderungen an jährlichen Daten")}
                    >
                      {isSavingYearly ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
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
      </section>
    </main>
  );
};

export default SettingsPage;