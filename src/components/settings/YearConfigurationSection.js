import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Loader2, Save, Edit, XCircle } from 'lucide-react'; // Added Edit, Save, XCircle

const YearConfigurationSection = ({
  yearConfigs,
  isLoadingYearConfigs,
  onAddYearConfig,
  onDeleteYearConfig,
  onUpdateYearConfiguration, // This prop will now be used
}) => {
  // Wrap initialNewYearData with useMemo to prevent re-creation on every render
  const initialNewYearData = useMemo(() => ({
    year: new Date().getFullYear() + 1, urlaubsanspruch: 30
  }), []); // Empty dependency array means it's created once
  const [newYearData, setNewYearData] = useState(initialNewYearData);
  const [deletingYearConfigId, setDeletingYearConfigId] = useState(null); // Tracks which config is being deleted
  const [editingConfigId, setEditingConfigId] = useState(null); // ID of the config being edited
  const [isSaving, setIsSaving] = useState(false); // General saving state for add/update

  // Effect to reset form when editingConfigId changes (e.g., when edit is cancelled or completed)
  // or when a new config is added.
  useEffect(() => {
    if (!editingConfigId) {
      setNewYearData(initialNewYearData);
    }
  }, [editingConfigId, yearConfigs, initialNewYearData]); // yearConfigs dependency to reset after add

  const handleInputChange = (field, value) => {
    const parsedValue = parseInt(value);
    if (field === 'year') {
      setNewYearData(prev => ({ ...prev, year: isNaN(parsedValue) ? '' : parsedValue }));
    } else if (field === 'urlaubsanspruch') {
      setNewYearData(prev => ({ ...prev, urlaubsanspruch: isNaN(parsedValue) ? 0 : parsedValue }));
    }
  };

  const handleSubmit = async () => {
    if (!newYearData.year || newYearData.urlaubsanspruch < 0) {
      alert("Bitte geben Sie ein gültiges Jahr und einen Urlaubsanspruch (>= 0) an.");
      return;
    }
    setIsSaving(true);
    try {
      if (editingConfigId) {
        // Update existing configuration
        // The year (ID) itself is not changed here, only the urlaubsanspruch
        await onUpdateYearConfiguration(editingConfigId, { urlaubsanspruch: newYearData.urlaubsanspruch });
        setEditingConfigId(null); // Exit edit mode
      } else {
        // Add new configuration
        await onAddYearConfig(newYearData.year, newYearData.urlaubsanspruch);
        // setNewYearData is handled by useEffect due to yearConfigs change
      }
    } catch (error) {
      console.error("Error saving year configuration:", error);
      alert("Fehler beim Speichern der Jahreskonfiguration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (configId) => {
    // If trying to delete the config currently being edited, cancel edit first
    if (editingConfigId === configId) {
        setEditingConfigId(null);
    }
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

  const handleEdit = (config) => {
    setEditingConfigId(config.id); // config.id is the year as string
    setNewYearData({ year: config.year, urlaubsanspruch: config.urlaubsanspruch });
  };

  const handleCancelEdit = () => {
    setEditingConfigId(null);
    // setNewYearData is handled by useEffect
  };

  const yearInputDisabled = !!editingConfigId; // Disable year input when editing

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
            onChange={(e) => handleInputChange('year', e.target.value)}
            className={`w-full px-3 py-2 mt-1 border border-gray-300 rounded-md md:w-auto focus:outline-none focus:ring-2 focus:ring-primary ${yearInputDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            disabled={yearInputDisabled || isSaving} // Disable if saving
          />
        </div>
        <div>
          <label htmlFor="newYearConfigUrlaubsanspruch" className="block text-sm font-medium text-gray-700">Urlaubsanspruch (Tage)</label>
          <input
            type="number"
            id="newYearConfigUrlaubsanspruch"
            placeholder="z.b. 30"
            value={newYearData.urlaubsanspruch}
            onChange={(e) => handleInputChange('urlaubsanspruch', e.target.value)}
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md md:w-auto focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSaving} // Disable if saving
          />
        </div>
        <div className="flex items-end space-x-2"> {/* Container for submit and cancel buttons */}
          <button
            onClick={handleSubmit}
            disabled={isSaving || (editingConfigId === null && yearConfigs.some(yc => yc.year === newYearData.year))} // Disable add if year exists
            className={`w-full px-3 py-2 text-white rounded-md md:w-auto flex items-center justify-center
                        ${isSaving ? 'bg-yellow-500 cursor-wait' : (editingConfigId ? 'bg-green-500 hover:bg-green-600' : 'bg-primary hover:bg-accent hover:text-primary')}
                        ${(editingConfigId === null && yearConfigs.some(yc => yc.year === newYearData.year)) ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' : ''}`}
            aria-label={editingConfigId ? "Änderungen speichern" : "Jahr hinzufügen"}
            title={(editingConfigId === null && yearConfigs.some(yc => yc.year === newYearData.year)) ? "Dieses Jahr ist bereits konfiguriert." : (editingConfigId ? "Änderungen speichern" : "Jahr hinzufügen")}
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : (editingConfigId ? <Save size={20} /> : <Plus size={20} />)}
          </button>
          {editingConfigId && (
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="w-full px-3 py-2 text-gray-700 bg-gray-200 rounded-md md:w-auto hover:bg-gray-300 flex items-center justify-center"
              aria-label="Bearbeitung abbrechen"
            >
              <XCircle size={20} />
            </button>
          )}
        </div>
      </div>
      {isLoadingYearConfigs && <p>Lade Jahreskonfigurationen...</p>}
      <ul className="mt-4 space-y-2">
        {yearConfigs.map(yc => {
          const isDeleting = deletingYearConfigId === yc.id;
          const isCurrentlyEditing = editingConfigId === yc.id;
          return (
            <li key={yc.id} className={`flex items-center justify-between p-3 border rounded-md ${isCurrentlyEditing ? 'bg-blue-50 border-primary shadow-lg' : 'bg-white'}`}>
              <span className="self-center">Jahr: {yc.year}, Urlaub: {yc.urlaubsanspruch} Tage</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(yc)}
                  disabled={isDeleting || isSaving || !!editingConfigId} // Disable if another is being edited or general save op
                  className={`p-2 text-white rounded flex items-center justify-center
                                ${isDeleting || isSaving || (editingConfigId && !isCurrentlyEditing) ? 'bg-gray-400 cursor-not-allowed' : (isCurrentlyEditing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-500 hover:bg-blue-600')}`}
                  aria-label={isCurrentlyEditing ? "Wird bearbeitet..." : "Jahreskonfiguration bearbeiten"}
                >
                  {isCurrentlyEditing ? <Loader2 size={16} className="animate-spin" /> : <Edit size={16} />}
                </button>
                <button
                  onClick={() => handleDelete(yc.id)}
                  disabled={isDeleting || isSaving || isCurrentlyEditing} // Disable if this one is being edited or general save op
                  className={`p-2 ml-2 text-white rounded flex items-center justify-center
                                ${isDeleting ? 'bg-yellow-500 hover:bg-yellow-600 cursor-not-allowed' : (isSaving || isCurrentlyEditing ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600')}`}
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