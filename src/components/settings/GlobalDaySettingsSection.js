import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, ChevronDownIcon } from 'lucide-react'; // CheckCircle2 Icon hinzugefügt, ChevronDownIcon
import { getHolidays } from 'feiertagejs'; // Importiere feiertagejs

const GlobalDaySettingsSection = ({
  selectedConfigYear,
  yearConfigs, // Needed to check if year is configured
  personen, // Needed to check if persons exist
  globalTagDaten, // Needed to check existing global status
  onApplyPrefill, // Function from SettingsPage
  onImportHolidays, // Function from SettingsPage
  onSetHolidaysImportedStatus, // Neuer Prop von SettingsPage
  getMonatsName, // Helper function
}) => {
  const [prefillDate, setPrefillDate] = useState({ day: '', month: '' });
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isImportingHolidays, setIsImportingHolidays] = useState(false); // State für Feiertagsimport
  const [messageTimeoutId, setMessageTimeoutId] = useState(null); // State for timeout ID
  const [importMessage, setImportMessage] = useState(''); // State für Erfolgsmeldungen
  const [importError, setImportError] = useState(''); // State für Fehlermeldungen
  // const [holidaysAlreadyImported, setHolidaysAlreadyImported] = useState(false); // Wird jetzt aus Props abgeleitet
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

  // Cleanup timeout on unmount or when message changes
  useEffect(() => {
    return () => {
      if (messageTimeoutId) clearTimeout(messageTimeoutId);
    };
  }, [messageTimeoutId]);

  // Importstatus aus den yearConfigs Prop ableiten
  const currentYearConfig = yearConfigs.find(yc => yc.year === selectedConfigYear);
  const holidaysAlreadyImported = currentYearConfig ? currentYearConfig.holidaysImported : false;
  

  const handleApplyPrefillClick = async (statusToSet) => {
    // Grundlegende Prüfung, ob Felder ausgefüllt sind, bevor die Prop aufgerufen wird
    if (!prefillDate.day || !prefillDate.month) {
      alert("Bitte geben Sie Tag und Monat für die Vorbelegung ein.");
      return;
    }
    setIsPrefilling(true);
    try {
      // prefillDate als zweites Argument an onApplyPrefill übergeben
      const actionWasConfirmedAndExecuted = await onApplyPrefill(statusToSet, prefillDate);
      if (actionWasConfirmedAndExecuted) {
        // Formularfelder zurücksetzen, wenn die Aktion in der Elternkomponente erfolgreich war
        setPrefillDate({ day: '', month: '' });
      }
      // Erfolgs-/Fehlermeldungen und Bestätigungen werden in SettingsPage.js gehandhabt
    } catch (error) {
      console.error("Fehler beim Aufruf von onApplyPrefill aus GlobalDaySettingsSection:", error);
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
      setImportMessage(''); // Clear previous messages
      if (messageTimeoutId) { // Clear any existing timeout
        clearTimeout(messageTimeoutId);
      }
      setImportError('');
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

      // Nur die Liste der Feiertage an die Elternkomponente übergeben
      const importSuccessful = await onImportHolidays(holidaysToSet);
      if (importSuccessful) {
        // Speichere den Status in Firestore über die Prop-Funktion (diese aktualisiert den Context)
        await onSetHolidaysImportedStatus(selectedConfigYear, true);
        let successMsg = `Feiertage für ${selectedConfigYear} (${selectedStateCode}) erfolgreich importiert.`;
        if (skippedWeekendHolidays > 0) {
          // Füge die Info über übersprungene Tage zur Erfolgsmeldung hinzu
          successMsg += ` (${skippedWeekendHolidays} Feiertag(e) wurde(n) übersprungen, da sie auf ein Wochenende fielen.)`;
        }
        setImportMessage(successMsg);
        const timeoutId = setTimeout(() => setImportMessage(''), 5000); // Clear message after 5 seconds
        setMessageTimeoutId(timeoutId);
      } else {
        // onImportHolidays in SettingsPage.js zeigt bei Fehler einen Alert,
        // aber wir setzen hier auch einen lokalen Fehlerstate für Konsistenz.
        // Dies könnte redundant sein, je nachdem wie SettingsPage Fehler behandelt.
        setImportError("Fehler beim Importieren der Feiertage.");
      }
    } catch (error) {
      console.error("Error importing German holidays in GlobalDaySettingsSection:", error);
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
              <div className="relative"> {/* Wrapper für Select und Icon */}
                <label htmlFor="holidayState" className="block text-sm font-medium text-gray-700">Bundesland</label>
                <select
                  id="holidayState"
                  value={selectedStateCode}
                  onChange={(e) => setSelectedStateCode(e.target.value)}
                  className="w-full px-3 pr-8 py-2 mt-1 bg-white border border-gray-300 rounded-md md:w-auto focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                  disabled={isImportingHolidays || isPrefilling}
                >
                  {germanStates.map(state => (
                    <option key={state.code} value={state.code}>{state.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-700"> {/* Positioniert das Icon; top-6 wegen Label */}
                  <ChevronDownIcon className="w-5 h-5" />
                </div>
              </div>
              <button
                onClick={handleImportGermanHolidaysClick} // Ruft die lokale Funktion ohne Argument auf
                disabled={isImportingHolidays || isPrefilling || !selectedConfigYear || personen.length === 0}
                className="w-full px-4 py-2 mt-2 text-white bg-primary rounded-md md:w-auto md:mt-0 hover:bg-accent hover:text-primary disabled:bg-gray-400 disabled:hover:text-white flex items-center justify-center"
                title={!selectedConfigYear ? "Bitte zuerst ein Jahr auswählen" : (personen.length === 0 ? "Bitte zuerst Personen anlegen" : "Feiertage importieren")}
              > 
                {isImportingHolidays ? (
                  <Loader2 size={20} className="animate-spin mr-2" />
                ) : holidaysAlreadyImported ? (
                  <CheckCircle2 size={20} className="mr-2 text-green-300" />
                ) : null}
                {holidaysAlreadyImported ? 'Erneut importieren' : 'Importieren'}
              </button>
            </div>
            {/* Meldungen anzeigen */}
            {importMessage && <p className="mt-2 text-sm text-green-600">{importMessage}</p>}
            {importError && <p className="mt-2 text-sm text-red-600">{importError}</p>}
            {/* Zeige den "bereits importiert" Text nur, wenn keine temporäre Meldung aktiv ist */}
            {!importMessage && !importError && holidaysAlreadyImported && !isImportingHolidays && <p className="mt-2 text-xs text-green-600">Feiertage für {selectedConfigYear} ({selectedStateCode}) wurden bereits importiert.</p>}
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
        </> // Ende des canManageGlobalDays Fragments
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