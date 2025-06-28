import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

const PersonManagementSection = ({
  personen, // The current list of persons from context
  onAddPerson, // Function from useFirestore
  onUpdatePersonName, // Function from useFirestore
  onDeletePerson, // Function from SettingsPage (calls useFirestore)
  onSavePersonOrder, // Function from useFirestore
  userRole, // New prop for user role
}) => {
  // State for new person input
  const [newPersonName, setNewPersonName] = useState('');

  // State for editing persons (local to this section)
  const [editingPersons, setEditingPersons] = useState({}); // { personId: { name } }

  // State for person order (local to this section)
  const [orderedPersons, setOrderedPersons] = useState([]);
  const [isOrderChanged, setIsOrderChanged] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // State for tracking saving state per person name (local to this section)
  const [personSavingStates, setPersonSavingStates] = useState({}); // { [personId]: boolean }

  // Check if the user is an admin
  const isAdmin = userRole === 'admin';

  // Initialize editing state when persons from context changes
  useEffect(() => {
    if (personen.length > 0) {
      const newEditingState = {};
      personen.forEach(person => {
        newEditingState[person.id] = { name: person.name };
      });
      setEditingPersons(newEditingState);
    } else {
      setEditingPersons({}); // Clear if no persons
    }
  }, [personen]);

  // Initialize orderedPersons when persons from context changes
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

  const handleSavePerson = async (personId) => {
    const editData = editingPersons[personId];
    const originalPersonData = personen.find(p => p.id === personId);

    if (!editData || !originalPersonData || editData.name.trim() === originalPersonData.name.trim()) {
      // No changes or empty name
      return;
    }

    setPersonSavingStates(prev => ({ ...prev, [personId]: true }));

    try {
      const result = await onUpdatePersonName(personId, editData.name.trim());
      if (result.success) {
        // Success feedback handled by button animation/state
      } else {
         toast.error("Fehler beim Speichern des Namens."); // Show error on failure
      }
    } catch (error) {
      console.error("Error saving person name:", error);
      toast.error("Fehler beim Speichern des Namens."); // Show error on exception
    } finally {
      setPersonSavingStates(prev => ({ ...prev, [personId]: false }));
    }
  };

  const handleAddPerson = async () => {
    if (newPersonName.trim() === '') return;
    const result = await onAddPerson(newPersonName.trim());
    if (result.success) {
      setNewPersonName(''); // Clear input
    } else {
       toast.error("Fehler beim Hinzufügen der Person."); // Show error on failure
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
    const result = await onSavePersonOrder(orderedPersons.map((p, index) => ({ ...p, orderIndex: index })));
    if (result.success) {
      setIsOrderChanged(false);
      // Success feedback is handled by button state change
    } else {
      toast.error("Fehler beim Speichern der Reihenfolge. Bitte versuchen Sie es erneut.");
    }
    setIsSavingOrder(false);
  };

  return (
    <section className="p-6 mb-8 bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-2xl font-semibold text-gray-700">Personen verwalten</h2>
      {!isAdmin && (
        <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
          Sie haben keine Berechtigung, Personen zu verwalten. Nur Administratoren können Änderungen vornehmen.
        </div>
      )}
      <div className="mb-6 space-y-3 md:space-y-0 md:flex md:items-center md:space-x-2">
        <input
          type="text"
          value={newPersonName}
          onChange={(e) => setNewPersonName(e.target.value)}
          placeholder="Name der neuen Person"
          className="w-full px-3 py-2 border border-gray-300 rounded-md md:w-auto max-w-xs focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={!isAdmin}
        />
        <button
          onClick={handleAddPerson}
          className="w-full px-3 py-2 text-white bg-primary rounded-md md:w-auto hover:bg-accent hover:text-primary flex items-center justify-center"
          aria-label="Person hinzufügen"
          disabled={!isAdmin}
        >
          <Plus size={20} />
        </button>
      </div>
      <div className="space-y-4">
        {orderedPersons.map((person, index) => {
            const originalPersonData = personen.find(p => p.id === person.id);
            const nameHasChanged = editingPersons[person.id]?.name?.trim() !== originalPersonData?.name?.trim();
            const isSavingName = personSavingStates[person.id];
            return (
              <div key={person.id} className="flex flex-col p-3 border rounded-md md:flex-row md:items-center md:justify-between">
                <div className="flex items-center flex-grow mb-2 md:mb-0">
                  <div className="flex flex-col mr-3">
                    <button
                      onClick={() => handleMovePerson(person.id, 'up')}
                      disabled={!isAdmin || index === 0 || isSavingOrder || isSavingName}
                      className="p-1 text-gray-600 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Nach oben verschieben"
                    >
                      <ArrowUp size={18} />
                    </button>
                    <button
                      onClick={() => handleMovePerson(person.id, 'down')}
                      disabled={!isAdmin || index === orderedPersons.length - 1 || isSavingOrder || isSavingName}
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
                      disabled={!isAdmin || isSavingName || isSavingOrder}
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 md:ml-4 flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2">
                  <button
                    onClick={() => handleSavePerson(person.id)}
                    disabled={!isAdmin || isSavingName || !nameHasChanged || isSavingOrder}
                    className={`w-full p-2 text-sm text-white rounded md:w-auto flex items-center justify-center
                                ${!isAdmin || isSavingOrder ? 'bg-gray-400 cursor-not-allowed' : (isSavingName ? 'bg-yellow-500 hover:bg-yellow-600 cursor-not-allowed' : (nameHasChanged ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'))}`}
                    aria-label={isSavingName ? "Namen speichern..." : (nameHasChanged ? "Namen speichern" : "Keine Änderungen am Namen")}
                    title={!isAdmin ? "Nur Administratoren können Namen ändern." : undefined}
                  >
                    {isSavingName ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  </button>
                  <button
                    onClick={() => onDeletePerson(person.id)}
                    className="w-full p-2 text-sm text-white bg-red-500 rounded md:w-auto hover:bg-red-600 flex items-center justify-center"
                    aria-label="Person löschen"
                    disabled={!isAdmin || isSavingName || isSavingOrder}
                    title={!isAdmin ? "Nur Administratoren können löschen." : undefined}
                  ><Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        {personen.length === 0 && <p>Noch keine Personen angelegt. Fügen Sie eine Person hinzu, um zu starten.</p>}
      </div>
      <div className="flex justify-end mt-4">
        <button
          onClick={handleSavePersonOrder}
          disabled={!isAdmin || !isOrderChanged || isSavingOrder}
          className={`px-4 py-2 text-sm text-white rounded-md flex items-center justify-center
                      ${!isAdmin || isSavingOrder ? 'bg-gray-400 cursor-not-allowed' :
                        (isOrderChanged ? 'bg-primary hover:bg-accent hover:text-primary' : 'bg-gray-400 cursor-not-allowed')}`}
          aria-label={isSavingOrder ? "Reihenfolge wird gespeichert..." : (isOrderChanged ? "Reihenfolge speichern" : "Keine Änderungen an der Reihenfolge")}
          title={!isAdmin ? "Nur Administratoren können die Reihenfolge ändern." : undefined}
        >
          {isSavingOrder ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
          Reihenfolge speichern
        </button>
      </div>
    </section>
  );
};

export default PersonManagementSection;