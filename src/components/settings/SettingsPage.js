import React, { useState, useEffect } from 'react';
import { useCalendar } from '../../hooks/useCalendar';
import { useFirestore } from '../../hooks/useFirestore';
import { db, doc, getDoc } from '../../firebase'; // For direct doc fetching
import { useAuth } from '../../context/AuthContext'; // To get currentUser for doc IDs
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
  
  // State for save success feedback
  const [personSaveSuccess, setPersonSaveSuccess] = useState(null); // Stores personId on success
  const [yearlyDataSaveSuccess, setYearlyDataSaveSuccess] = useState(null); // Stores personId on success
  const [isLoadingYearlyPersonData, setIsLoadingYearlyPersonData] = useState(false); // New state for loading yearly person data

  // State for yearly person data
  const [yearlyPersonData, setYearlyPersonData] = useState({}); // { personId: { resturlaub, employmentPercentage, employmentType } }

  // Effect to load person-specific data (Resturlaub, Employment) for the selectedConfigYear
  useEffect(() => {
    if (!currentUser || personen.length === 0 || !selectedConfigYear) {
      setIsLoadingYearlyPersonData(false); // Ensure loading is false if conditions aren't met
      setYearlyPersonData({});
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
        console.log("SettingsPage - Successfully fetched and set all person-specific yearly data.");
        setIsLoadingYearlyPersonData(false); // End loading on success
      })
      .catch(error => {
        console.error("SettingsPage - Error in Promise.all when fetching person-specific yearly data:", error);
        // Hier könntest du eine Fehlermeldung im UI anzeigen
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
    if (!editData) return;

    // Save name
    let nameUpdated = false;
    if (editData.name && editData.name !== personen.find(p => p.id === personId)?.name) {
      const result = await updatePersonName(personId, editData.name);
      if (result.success) {
        nameUpdated = true;
      }
    }

    if (nameUpdated) {
      setPersonSaveSuccess(personId);
      setTimeout(() => setPersonSaveSuccess(null), 2000); // Hide after 2 seconds
    }
  };

  const handleSaveYearlyData = async (personId) => {
    const yearlyData = yearlyPersonData[personId];
    if (!yearlyData || !selectedConfigYear) return;
    let resturlaubSaved = false;
    let employmentSaved = false;

    // Save Resturlaub
    const resturlaubResult = await saveResturlaub(personId, selectedConfigYear, parseInt(yearlyData.resturlaub, 10) || 0);
    if (resturlaubResult.success) resturlaubSaved = true;

    // Save Employment Data
    const employmentResult = await saveEmploymentData(personId, { 
      percentage: parseInt(yearlyData.employmentPercentage, 10) || 100, 
      type: yearlyData.employmentType || 'full-time'
    }, selectedConfigYear);
    if (employmentResult.success) employmentSaved = true;

    if (resturlaubSaved || employmentSaved) { // If at least one was successful
      setYearlyDataSaveSuccess(personId);
      setTimeout(() => setYearlyDataSaveSuccess(null), 2000); // Hide after 2 seconds
    }
  };

  const handleAddPerson = async () => {
    if (newPersonName.trim() === '') return;
    await addPerson(newPersonName.trim());
    setNewPersonName(''); // Clear input
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
      await deleteYearConfiguration(configId);
      // Refresh list after deletion
      const configs = await fetchYearConfigurations();
      setYearConfigs(configs);
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
          <button onClick={handleAddYearConfig} className="w-full px-4 py-2 text-white bg-blue-600 rounded-md md:w-auto hover:bg-blue-700">
            Jahr hinzufügen
          </button>
        </div>
        {isLoadingYearConfigs && <p>Lade Jahreskonfigurationen...</p>}
        <ul className="mt-4 space-y-2">
          {yearConfigs.map(yc => (
            <li key={yc.id} className="flex justify-between p-2 border rounded">
              <span className="self-center">Jahr: {yc.year}, Urlaubsanspruch: {yc.urlaubsanspruch} Tage</span>
              <div>
                {/* TODO: Add Edit button here, calling updateYearConfiguration */}
                <button 
                  onClick={() => handleDeleteYearConfig(yc.id)} 
                  className="px-3 py-1 ml-2 text-sm text-white bg-red-500 rounded hover:bg-red-600"
                >
                  Löschen
                </button>
              </div>
            </li>
          ))}
        </ul>
        {yearConfigs.length === 0 && !isLoadingYearConfigs && <p>Noch keine Jahre konfiguriert. Fügen Sie ein Jahr hinzu, um zu starten.</p>}
      </section>

      {/* Personen verwalten - unabhängig vom Jahr */}
      <section className="p-6 mb-8 bg-white rounded-lg shadow-md">
        <h2 className="mb-4 text-2xl font-semibold text-gray-700">Personen verwalten</h2>
        <div className="mb-6">
          <input
            type="text"
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            placeholder="Name der neuen Person"
            className="w-full max-w-xs px-3 py-2 mr-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleAddPerson} className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Person hinzufügen
          </button>
        </div>
        <div className="space-y-4">
          {personen.map(person => (
            <div key={person.id} className="flex flex-col p-3 border rounded-md md:flex-row md:items-center md:justify-between">
              <div className="flex-grow mb-2 md:mb-0">
                <input 
                  type="text"
                  value={editingPersons[person.id]?.name ?? person.name}
                  onChange={(e) => handleEditPersonChange(person.id, e.target.value)}
                  className="w-full px-2 py-1 border rounded-md md:w-auto"
                  placeholder="Name"
                />
              </div>
              <div className="flex-shrink-0 md:ml-4">
                <button onClick={() => handleSavePerson(person.id)} className="w-full mb-2 text-sm text-white bg-green-500 rounded md:w-auto md:mb-0 md:mr-2 px-3 py-1 hover:bg-green-600">Speichern</button>
                {personSaveSuccess === person.id && <span className="ml-2 text-sm text-green-600">Gespeichert!</span>}
                <button 
                  onClick={() => handleDeletePerson(person.id)} 
                  className="w-full mt-2 text-sm text-white bg-red-500 rounded md:w-auto md:mt-0 md:ml-2 px-3 py-1 hover:bg-red-600"
                >Löschen
                </button>
              </div>
            </div>
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
            {personen.map(person => (
              <div key={person.id} className="flex flex-col p-3 border rounded-md md:flex-row md:items-center md:justify-between">
                <div className="flex-grow mb-2 md:mb-0">
                  <p className="font-medium text-gray-700">{person.name}</p>
                  <div className="mt-2 md:flex md:space-x-2">
                    <input
                      type="number"
                      placeholder={`Resturlaub ${selectedConfigYear}`}
                      value={yearlyPersonData[person.id]?.resturlaub ?? ''} 
                      onChange={(e) => handleEditYearlyDataChange(person.id, 'resturlaub', e.target.value)}
                      className="w-full px-2 py-1 mb-2 border rounded-md md:w-auto md:mb-0"
                    />
                    <input
                      type="number"
                      placeholder={`Arbeitszeit % ${selectedConfigYear}`}
                      value={yearlyPersonData[person.id]?.employmentPercentage ?? ''} 
                      onChange={(e) => handleEditYearlyDataChange(person.id, 'employmentPercentage', e.target.value)}
                      className="w-full px-2 py-1 border rounded-md md:w-auto"
                    />
                    {/* Consider adding employmentType dropdown as well */}
                  </div>
                </div>
                <div className="flex-shrink-0 md:ml-4">
                  <button 
                    onClick={() => handleSaveYearlyData(person.id)} 
                    className="w-full text-sm text-white bg-green-500 rounded md:w-auto px-3 py-1 hover:bg-green-600"
                  >Speichern
                  </button>
                  {yearlyDataSaveSuccess === person.id && <span className="ml-2 text-sm text-green-600">Gespeichert!</span>}
                </div>
              </div>
            ))}
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