import React, { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react'; // Removed Save icon

const YearConfigurationSection = ({
  yearConfigs,
  isLoadingYearConfigs,
  onAddYearConfig,
  onDeleteYearConfig,
  // onUpdateYearConfiguration // For future enhancement
}) => {
  const [newYearData, setNewYearData] = useState({ year: new Date().getFullYear() + 1, urlaubsanspruch: 30 });
  const [deletingYearConfigId, setDeletingYearConfigId] = useState(null); // Tracks which config is being deleted

  const handleAdd = async () => {
    if (!newYearData.year || newYearData.urlaubsanspruch < 0) {
      alert("Bitte geben Sie ein gültiges Jahr und einen Urlaubsanspruch an.");
      return;
    }
    await onAddYearConfig(newYearData.year, newYearData.urlaubsanspruch);
    setNewYearData({ year: new Date().getFullYear() + 1, urlaubsanspruch: 30 }); // Reset form
  };

  const handleDelete = async (configId) => {
    setDeletingYearConfigId(configId);
    try {
      await onDeleteYearConfig(configId);
    } catch (error) {
      console.error("Error deleting year configuration:", error);
      // Optionally show an error message to the user
    } finally {
      setDeletingYearConfigId(null);
    }
  };

  return (
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
            placeholder="z.b. 30"
            value={newYearData.urlaubsanspruch}
            onChange={(e) => setNewYearData(prev => ({ ...prev, urlaubsanspruch: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md md:w-auto focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleAdd}
            className="w-full px-3 py-2 text-white bg-primary rounded-md md:w-auto hover:bg-accent hover:text-primary flex items-center justify-center"
            aria-label="Jahr hinzufügen"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
      {isLoadingYearConfigs && <p>Lade Jahreskonfigurationen...</p>}
      <ul className="mt-4 space-y-2">
        {yearConfigs.map(yc => {
          const isDeleting = deletingYearConfigId === yc.id;
          return (
            <li key={yc.id} className="flex items-center justify-between p-2 border rounded">
              <span className="self-center">Jahr: {yc.year}, Urlaub: {yc.urlaubsanspruch} Tage</span>
              <div>
                {/* TODO: Add Edit button here, calling onUpdateYearConfiguration */}
                <button
                  onClick={() => handleDelete(yc.id)}
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
        })}
      </ul>
      {yearConfigs.length === 0 && !isLoadingYearConfigs && <p>Noch keine Jahre konfiguriert. Fügen Sie ein Jahr hinzu, um zu starten.</p>}
    </section>
  );
};

export default YearConfigurationSection;