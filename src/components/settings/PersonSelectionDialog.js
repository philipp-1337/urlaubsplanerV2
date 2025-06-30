import React, { useState } from 'react';

/**
 * Dialog zur Auswahl der eigenen Person für die Migration.
 * Props:
 * - persons: Array aller Personen aus der alten Struktur
 * - onSelect: Callback mit der ausgewählten Person
 */
const PersonSelectionDialog = ({ persons, onSelect }) => {
  const [selectedPersonId, setSelectedPersonId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const person = persons.find(p => p.id === selectedPersonId);
    if (person) {
      onSelect(person);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-96">
        <h2 className="text-lg font-bold mb-4">Welche Person bist du?</h2>
        <select
          className="w-full border rounded p-2 mb-4"
          value={selectedPersonId}
          onChange={e => setSelectedPersonId(e.target.value)}
          required
        >
          <option value="" disabled>Bitte auswählen ...</option>
          {persons.map(person => (
            <option key={person.id} value={person.id}>
              {person.displayName || person.name || person.id}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          disabled={!selectedPersonId}
        >
          Auswahl bestätigen
        </button>
      </form>
    </div>
  );
};

export default PersonSelectionDialog;
