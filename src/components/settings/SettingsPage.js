import React, { useState } from 'react';
import { useCalendar } from '../../hooks/useCalendar';
import { useFirestore } from '../../hooks/useFirestore'; // To get CRUD functions

const SettingsPage = () => {
  const { personen, currentYear, resturlaub, employmentData } = useCalendar();
  const { addPerson, updatePersonName, deletePersonFirebase, saveResturlaub, saveEmploymentData } = useFirestore();

  // State for new person input
  const [newPersonName, setNewPersonName] = useState('');

  // State for editing persons
  const [editingPersons, setEditingPersons] = useState({}); // { personId: { name, resturlaub, employmentPercentage, employmentType } }

  const handleEditChange = (personId, field, value) => {
    setEditingPersons(prev => ({
      ...prev,
      [personId]: {
        ...prev[personId],
        name: personen.find(p => p.id === personId)?.name || '', // Keep original name if not changed
        resturlaub: (resturlaub && resturlaub[personId] !== undefined) ? resturlaub[personId] : 0,
        employmentPercentage: (employmentData && employmentData[personId]?.percentage !== undefined) ? employmentData[personId].percentage : 100,
        employmentType: (employmentData && employmentData[personId]?.type !== undefined) ? employmentData[personId].type : 'full-time',
        ...prev[personId], // Apply existing edits for this person
        [field]: value,
      }
    }));
  };

  const handleSavePerson = async (personId) => {
    const editData = editingPersons[personId];
    if (!editData) return;

    // Save name
    if (editData.name && editData.name !== personen.find(p => p.id === personId)?.name) {
      await updatePersonName(personId, editData.name);
    }
    // Save Resturlaub
    await saveResturlaub(personId, currentYear, parseInt(editData.resturlaub, 10) || 0);
    
    // Save Employment Data
    await saveEmploymentData(personId, { 
      percentage: parseInt(editData.employmentPercentage, 10) || 100, 
      type: editData.employmentType || 'full-time'
    });

    setEditingPersons(prev => {
      const newState = {...prev};
      delete newState[personId]; // Clear editing state for this person after save
      return newState;
    });
    // Data will refresh via context/useFirestore effect
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

  return (
    <main className="container px-4 py-8 mx-auto">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">Einstellungen</h1>

      {/* Personen verwalten */}
      <section className="p-6 mb-8 bg-white rounded-lg shadow-md">
        <h2 className="mb-4 text-2xl font-semibold text-gray-700">Personen verwalten</h2>
        <div className="mb-4">
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
            <div key={person.id} className="flex items-center justify-between p-3 border rounded-md">
              <input 
                type="text"
                value={editingPersons[person.id]?.name ?? person.name}
                onChange={(e) => handleEditChange(person.id, 'name', e.target.value)}
                className="px-2 py-1 border rounded-md"
              />
              {/* More fields will go here: Resturlaub, Arbeitszeit */}
              <div>
                <button onClick={() => handleSavePerson(person.id)} className="mr-2 px-3 py-1 text-sm text-white bg-green-500 rounded hover:bg-green-600">Speichern</button>
                <button onClick={() => handleDeletePerson(person.id)} className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600">Löschen</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* Weitere Sektionen für Resturlaub und Arbeitszeiten folgen hier */}
    </main>
  );
};

export default SettingsPage;