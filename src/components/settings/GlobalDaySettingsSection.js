import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getHolidays } from 'feiertagejs'; // Importiere feiertagejs

const GlobalDaySettingsSection = ({
  selectedConfigYear,
  yearConfigs, // Needed to check if year is configured
  personen, // Needed to check if persons exist
  globalTagDaten, // Needed to check existing global status
  onApplyPrefill, // Function from SettingsPage
  onImportHolidays, // Function from SettingsPage
  getMonatsName, // Helper function
}) => {
  const [prefillDate, setPrefillDate] = useState({ day: '', month: '' });
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isImportingHolidays, setIsImportingHolidays] = useState(false); // State für Feiertagsimport
  const [selectedStateCode, setSelectedStateCode] = useState('BE'); // Default Berlin

  const handlePrefillDateChange = (field, value) => {
    setPrefillDate(prev => ({ ...prev, [field]: value }));
  };

  const germanStates = [
    { code: 'BUND', name: 'Bundesweit' },
    { code: 'BW', name: 'Baden-Württemberg' },
    { code: 'BY', name: 'Bayern' },
    { code: 'BE', name: 'Berlin' },
    { code: 'BB', name: 'Brandenburg' },
    { code: 'HB', name: 'Bremen' },
    { code: 'HH', name: 'Hamburg' },
    { code: 'HE', name: 'Hessen' },
    { code: 'MV', name: 'Mecklenburg-Vorpommern' },
    { code: 'NI', name: 'Niedersachsen' },
    { code: 'NW', name: 'Nordrhein-Westfalen' },
    { code: 'RP', name: 'Rheinland-Pfalz' },
    { code: 'SL', name: 'Saarland' },
    { code: 'SN', name: 'Sachsen' },
    { code: 'ST', name: 'Sachsen-Anhalt' },
    { code: 'SH', name: 'Schleswig-Holstein' },
    { code: 'TH', name: 'Thüringen' },
  ];

  const handleApplyPrefillClick = async (statusToSet) => {
    // Validation is now done inside onApplyPrefill in SettingsPage
    setIsPrefilling(true);
    try {
      await onApplyPrefill(statusToSet);
      // Reset form is handled in SettingsPage if action was confirmed/executed
    } catch (error) {
      // Error message is shown in SettingsPage
    } finally {
      setIsPrefilling(false);
    }
  };

  // Handler for importing holidays, now includes the feiertagejs logic
  const handleImportGermanHolidaysClick = async () => { // stateCode wird vom State genommen
    if (!selectedConfigYear) {
      alert("Bitte wählen Sie zuerst ein Jahr aus, für das die Feiertage importiert werden sollen.");
      return;
    }
    setIsImportingHolidays(true);
    try {
      // Verwende den ausgewählten Bundesland-Code aus dem State
      const holidaysFromLib = getHolidays(selectedConfigYear, selectedStateCode);
      
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

      // Pass the list of holidays and skipped count back to the parent handler
      const importSuccessful = await onImportHolidays(holidaysToSet, skippedWeekendHolidays);
      if (importSuccessful && skippedWeekendHolidays > 0) {
        alert(`${skippedWeekendHolidays} Feiertag(e) wurde(n) übersprungen, da sie auf ein Wochenende gefallen wären.`);
      }

    } catch (error) {
      console.error("Error importing German holidays:", error);
      alert(`Fehler beim Importieren der Feiertage: ${error.message}`);
    } finally {
      setIsImportingHolidays(false);
    }
  };

  const isYearConfigured = yearConfigs.some(yc => yc.year === selectedConfigYear); // Keep this check
  const canManageGlobalDays = isYearConfigured && selectedConfigYear && personen.length > 0;

  return (
    // Die Section wird jetzt von YearlyPersonDataSection bereitgestellt, hier nur der Inhalt
    <div className="mt-8 pt-6 border-t border-gray-200"> {/* Visuelle Trennung */}
      <h3 className="mb-6 text-xl font-semibold text-gray-700">
        Globale Tage vorbefüllen {(selectedConfigYear && isYearConfigured) ? `(für Jahr ${selectedConfigYear})` : ''}
      </h3>
      {canManageGlobalDays ? (
        <>
          {/* Abschnitt: Feiertage importieren */}
          <div className="mb-8">
            <h4 className="mb-3 text-lg font-medium text-gray-700">Feiertage importieren</h4>
            <div className="flex flex-col md:flex-row md:items-end md:space-x-2">
              <div>
                <label htmlFor="holidayState" className="block text-sm font-medium text-gray-700">Bundesland</label>
                <select
                  id="holidayState"
                  value={selectedStateCode}
                  onChange={(e) => setSelectedStateCode(e.target.value)}
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md md:w-auto focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isImportingHolidays || isPrefilling}
                >
                  {germanStates.map(state => (
                    <option key={state.code} value={state.code}>{state.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleImportGermanHolidaysClick} // Ruft die lokale Funktion ohne Argument auf
                disabled={isImportingHolidays || isPrefilling || !selectedConfigYear || personen.length === 0}
                className="w-full px-4 py-2 mt-2 text-white bg-blue-500 rounded-md md:w-auto md:mt-0 hover:bg-blue-600 disabled:bg-gray-400 disabled:hover:text-white flex items-center justify-center"
                title={!selectedConfigYear ? "Bitte zuerst ein Jahr auswählen" : (personen.length === 0 ? "Bitte zuerst Personen anlegen" : "Feiertage importieren")}
              >
                {isImportingHolidays ? <Loader2 size={20} className="animate-spin mr-2" /> : null}
                Importieren
              </button>
            </div>
          </div>

          {/* Abschnitt: Benutzerdefinierte Tage / Teamtage setzen */}
          <div>
            <h4 className="mb-3 text-lg font-medium text-gray-700">Benutzerdefinierte Tage / Teamtage setzen</h4>
            <p className="mb-4 text-sm text-gray-600">
            Setzen Sie hier einen einzelnen Tag für alle Personen im ausgewählten Jahr ({selectedConfigYear}) als Teamtag oder Feiertag.
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
                disabled={isPrefilling || isImportingHolidays}
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
                disabled={isPrefilling || isImportingHolidays}
              />
            </div>
            <button
              onClick={() => handleApplyPrefillClick('interne teamtage')}
              disabled={isPrefilling || isImportingHolidays || !prefillDate.day || !prefillDate.month || !selectedConfigYear}
              className="w-full px-4 py-2 text-white bg-bold-lavender rounded-md md:w-auto hover:bg-pastel-lavender hover:text-bold-lavender disabled:bg-gray-400 disabled:hover:text-white flex items-center justify-center"
            >
              {isPrefilling ? <Loader2 size={20} className="animate-spin mr-2" /> : null} Alle als Teamtag
            </button>
            <button
              onClick={() => handleApplyPrefillClick('feiertag')}
              disabled={isPrefilling || isImportingHolidays || !prefillDate.day || !prefillDate.month || !selectedConfigYear}
              className="w-full px-4 py-2 text-white bg-gray-dark rounded-md md:w-auto hover:bg-gray-medium hover:text-gray-dark disabled:bg-gray-400 disabled:hover:text-white flex items-center justify-center"
            >
              {isPrefilling ? <Loader2 size={20} className="animate-spin mr-2" /> : null} Alle als Feiertag
            </button>
          </div>
          </div>
        </>
      ) : (
        <p className="text-gray-500">
          {yearConfigs.length === 0 ? "Bitte zuerst ein Jahr unter \"Jahreskonfiguration verwalten\" hinzufügen." :
           !selectedConfigYear ? "Bitte oben ein Jahr auswählen, um globale Tage vorzubefüllen." :
           "Bitte zuerst Personen im Abschnitt \"Personen verwalten\" hinzufügen."}
        </p>
      )}
    </div>
  );
};

export default GlobalDaySettingsSection;