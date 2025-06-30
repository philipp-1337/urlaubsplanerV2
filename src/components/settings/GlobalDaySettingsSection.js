import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, ChevronDownIcon } from 'lucide-react'; // CheckCircle2 Icon hinzugefügt, ChevronDownIcon
import { getHolidays } from 'feiertagejs'; // Importiere feiertagejs
import { toast } from 'sonner';

const GlobalDaySettingsSection = ({
  selectedConfigYear,
  yearConfigs, // Needed to check if year is configured
  personen, // Needed to check if persons exist
  globalTagDaten, // Needed to check existing global status
  onApplyPrefill, // Function from SettingsPage
  onImportHolidays, // Function from SettingsPage
  onSetHolidaysImportedStatus, // Neuer Prop von SettingsPage
  getMonatsName, // Helper function
  userRole, // NEU: Rollen-Prop
}) => {
  const [prefillDate, setPrefillDate] = useState({ day: '', month: '' });
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isImportingHolidays, setIsImportingHolidays] = useState(false); // State für Feiertagsimport
  const [messageTimeoutId, setMessageTimeoutId] = useState(null); // State for timeout ID
  // const [importMessage, setImportMessage] = useState(''); // State für Erfolgsmeldungen (entfernt)
  // const [importError, setImportError] = useState(''); // State für Fehlermeldungen (entfernt)
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
      toast.error("Bitte geben Sie Tag und Monat für die Vorbelegung ein.");
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
      toast.error("Bitte wählen Sie zuerst ein Jahr aus, für das die Feiertage importiert werden sollen.");
      return;
    }
    setIsImportingHolidays(true);
    try {
      // setImportMessage(''); // entfernt
      if (messageTimeoutId) { // Clear any existing timeout
        clearTimeout(messageTimeoutId);
      }
      // setImportError(''); // entfernt
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
      const userConfirmedAndActionStarted = await onImportHolidays(holidaysToSet);
      if (userConfirmedAndActionStarted) {
        await onSetHolidaysImportedStatus(selectedConfigYear, true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('holidays-imported'));
        }
        let successMsg = `Feiertage für ${selectedConfigYear} (${selectedStateCode}) erfolgreich importiert.`;
        if (skippedWeekendHolidays > 0) {
          successMsg += ` (${skippedWeekendHolidays} Feiertag(e) wurde(n) übersprungen, da sie auf ein Wochenende fielen.)`;
        }
        toast.success(successMsg);
        // holidaysAlreadyImported-Status im lokalen State sofort aktualisieren
        currentYearConfig.holidaysImported = true;
        // Dummy timeout, falls Logik benötigt
        const timeoutId = setTimeout(() => {}, 5000);
        setMessageTimeoutId(timeoutId);
      } else {
        // Benutzer hat den Import in SettingsPage abgebrochen oder es gab einen Fehler,
        // der bereits in SettingsPage via toast.promise oder Validierung behandelt wurde.
        // Hier keine zusätzliche Fehlermeldung anzeigen, wenn userConfirmedAndActionStarted false ist.
      }
    } catch (error) {
      console.error("Error importing German holidays in GlobalDaySettingsSection:", error);
      toast.error(`Fehler beim Importieren der Feiertage: ${error.message}`);
    } finally {
      setIsImportingHolidays(false);
    }
  };

  const isYearConfigured = yearConfigs.some(yc => yc.year === selectedConfigYear); // Keep this check
  const canManageGlobalDays = isYearConfigured && selectedConfigYear && personen.length > 0;
  const isAdmin = userRole === 'admin';

  return (
    // Die Section wird jetzt von YearlyPersonDataSection bereitgestellt, hier nur der Inhalt
    <div className="mt-8 pt-6 border-t border-gray-200"> {/* Visuelle Trennung */}
      <h3 className="mb-6 text-xl font-semibold text-gray-700">
        Globale Tage vorbefüllen {(selectedConfigYear && isYearConfigured) ? `(für Jahr ${selectedConfigYear})` : ''}
      </h3>
      {!isAdmin && (
        <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
          Sie haben keine Berechtigung, globale Tage zu verwalten. Nur Administratoren können Änderungen vornehmen.
        </div>
      )}
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
                  disabled={isImportingHolidays || isPrefilling || !isAdmin}
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
                disabled={isImportingHolidays || isPrefilling || !selectedConfigYear || personen.length === 0 || !isAdmin}
                className="w-full px-4 py-2 mt-2 text-white bg-primary rounded-md md:w-auto md:mt-0 hover:bg-accent hover:text-primary disabled:bg-gray-400 disabled:hover:text-white flex items-center justify-center"
                title={!isAdmin ? "Nur Administratoren können Feiertage importieren." : (!selectedConfigYear ? "Bitte zuerst ein Jahr auswählen" : (personen.length === 0 ? "Bitte zuerst Personen anlegen" : "Feiertage importieren"))}
              > 
                {isImportingHolidays ? (
                  <Loader2 size={20} className="animate-spin mr-2" />
                ) : holidaysAlreadyImported ? (
                  <CheckCircle2 size={20} className="mr-2 text-green-300" />
                ) : null}
                {holidaysAlreadyImported ? 'Erneut importieren' : 'Importieren'}
              </button>
            </div>
          </div>
          {/* Abschnitt: Benutzerdefinierte Tage / Teamtage setzen */}
          <div>
            <h4 className="mb-3 text-lg font-medium text-gray-700">Benutzerdefinierte Tage</h4>
            <p className="mb-4 text-sm text-gray-600">
            Setzen Sie hier einen einzelnen Tag für alle Personen im ausgewählten Jahr ({selectedConfigYear}) als Teamtag oder Feiertag.
            Eine bestehende globale Einstellung für diesen Tag wird überschrieben. Personenspezifische Einträge haben Vorrang.
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
                disabled={isPrefilling || isImportingHolidays || !isAdmin}
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
                disabled={isPrefilling || isImportingHolidays || !isAdmin}
              />
            </div>
            <button
              onClick={() => handleApplyPrefillClick('interne teamtage')}
              disabled={isPrefilling || isImportingHolidays || !prefillDate.day || !prefillDate.month || !selectedConfigYear || !isAdmin}
              className="w-full px-4 py-2 text-white bg-bold-lavender rounded-md md:w-auto hover:bg-pastel-lavender hover:text-bold-lavender disabled:bg-gray-400 disabled:hover:text-white flex items-center justify-center"
              title={!isAdmin ? "Nur Administratoren können Teamtage setzen." : undefined}
            >
              {isPrefilling ? <Loader2 size={20} className="animate-spin mr-2" /> : null} Als Teamtag
            </button>
            <button
              onClick={() => handleApplyPrefillClick('feiertag')}
              disabled={isPrefilling || isImportingHolidays || !prefillDate.day || !prefillDate.month || !selectedConfigYear || !isAdmin}
              className="w-full px-4 py-2 text-white bg-gray-dark rounded-md md:w-auto hover:bg-gray-medium hover:text-gray-dark disabled:bg-gray-400 disabled:hover:text-white flex items-center justify-center"
              title={!isAdmin ? "Nur Administratoren können Feiertage setzen." : undefined}
            >
              {isPrefilling ? <Loader2 size={20} className="animate-spin mr-2" /> : null} Als Feiertag
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