import React from 'react';
import LoadingIndicator from '../common/LoadingIndicator';
import ToggleSwitch from '../common/ToggleSwitch';
import { Save, RotateCcw, Loader2 } from 'lucide-react';
import GlobalDaySettingsSection from './GlobalDaySettingsSection'; // Import GlobalDaySettingsSection

const YearlyPersonDataSection = ({
  personen,
  yearConfigs,
  selectedConfigYear,
  setSelectedConfigYear,
  yearlyPersonData,
  initialYearlyPersonData,
  onYearlyDataChange,
  onSaveYearlyData,
  onResetYearlyData,
  yearlyDataSavingStates,
  isLoadingYearlyPersonData,
  getInitialDataForPerson, // Helper function from parent
  isLoadingYearConfigs, // Added this prop
  // Props for GlobalDaySettingsSection
  globalTagDaten,
  onApplyPrefill,
  onImportHolidays,
  onSetHolidaysImportedStatus, // Neuer Prop
  getMonatsName,
}) => {

  return (
    <section className="p-6 mb-8 bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-2xl font-semibold text-gray-700">Jahresspezifische Daten verwalten</h2>

      {/* Tabs für Jahresauswahl */}
      <div className="flex mb-6 border-b border-gray-200 overflow-x-auto overflow-y-hidden"> {/* Added overflow-x-auto */}
        {yearConfigs.length > 0 ? (
          yearConfigs.map(yc => (
            <button
              key={yc.year}
              onClick={() => setSelectedConfigYear(yc.year)}
              className={`flex-shrink-0 px-3 py-2 -mb-px text-sm font-medium leading-5 focus:outline-none transition-colors duration-150 ease-in-out ${
                selectedConfigYear === yc.year
                  ? 'border-b-2 border-primary text-primary'
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
            const initialComparableData = getInitialDataForPerson(person.id);
            const currentDataFromState = yearlyPersonData[person.id] || {}; // Ensure object

            // Construct a comparable representation of the current data in the form
            const currentComparableData = {
                resturlaub: currentDataFromState.resturlaub ?? '',
                employmentType: currentDataFromState.employmentType ?? 'full-time',
                employmentPercentage: currentDataFromState.employmentPercentage,
                daysPerWeek: currentDataFromState.daysPerWeek ?? (currentDataFromState.employmentType === 'part-time' ? '' : null)
            };

            if (currentComparableData.employmentType === 'full-time') {
                currentComparableData.employmentPercentage = 100;
                currentComparableData.daysPerWeek = null;
            } else { // part-time
                // If type is part-time, and percentage is undefined, treat as empty string for comparison
                if (currentComparableData.employmentPercentage === undefined) {
                  currentComparableData.employmentPercentage = '';
                }
                // daysPerWeek is already handled by the ?? in its construction for currentComparableData
            }

            let hasYearlyDataChanged = false;
            // Compare resturlaub
            if (String(currentComparableData.resturlaub) !== String(initialComparableData.resturlaub)) {
              hasYearlyDataChanged = true;
            }
            // Compare employmentType
            if (!hasYearlyDataChanged && currentComparableData.employmentType !== initialComparableData.employmentType) {
              hasYearlyDataChanged = true;
            }
            if (!hasYearlyDataChanged && String(currentComparableData.employmentPercentage) !== String(initialComparableData.employmentPercentage)) {
              hasYearlyDataChanged = true;
            }
            // Compare daysPerWeek
            if (!hasYearlyDataChanged) {
              const initialDays = initialComparableData.daysPerWeek;
              const currentDays = currentComparableData.daysPerWeek;
              // String comparison handles numbers, empty strings, and null consistently for this check
              if (String(currentDays) !== String(initialDays)) {
                  hasYearlyDataChanged = true;
              }
            }

            const isSavingYearly = yearlyDataSavingStates[person.id];

            return (
              <div key={person.id} className="flex flex-col p-3 border rounded-md md:flex-row md:items-center md:justify-between">
                {/* Linke Seite: Name, Checkbox, Resturlaub, Prozentsatz */}
                <div className="flex-grow mb-2 md:mb-0">
                  {/* Reihe 1: Name und Teilzeit Checkbox */}
                  <div className="flex items-center mb-3 space-x-4">
                    <p className="text-lg font-medium text-gray-700">{person.name}</p>
                    <div className="flex items-center"> {/* Teilzeit Toggle Container */}
                      <ToggleSwitch
                        id={`teilzeit-${person.id}-${selectedConfigYear}`}
                        label={"Teilzeit"}
                        checked={yearlyPersonData[person.id]?.employmentType === 'part-time'}
                        onChange={(e) => {
                          onYearlyDataChange(
                            person.id,
                            'employmentType',
                            e.target.checked ? 'part-time' : 'full-time'
                          );
                        }}
                        disabled={isSavingYearly}
                      />
                    </div>
                  </div>

                  {/* Reihe 2: Resturlaub und Arbeitszeit % und Tage/Woche */}
                  <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-4 md:items-end">
                    <div className="flex flex-col"> {/* Resturlaub Input */}
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
                        onChange={(e) => onYearlyDataChange(person.id, 'resturlaub', e.target.value)}
                        className="w-full px-2 py-1 border rounded-md md:w-auto"
                        disabled={isSavingYearly}
                      />
                    </div>

                    {/* Conditional inputs for part-time */}
                    {yearlyPersonData[person.id]?.employmentType === 'part-time' && (
                      <>
                        <div className="flex flex-col"> {/* Arbeitszeit % Input */}
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
                            onChange={(e) => onYearlyDataChange(person.id, 'employmentPercentage', e.target.value)}
                            className="w-full px-2 py-1 border rounded-md md:w-auto"
                            max="100"
                            min="0"
                            disabled={isSavingYearly}
                          />
                        </div>
                        <div className="flex flex-col"> {/* Tage pro Woche Input */}
                          <label
                            htmlFor={`daysPerWeek-${person.id}-${selectedConfigYear}`}
                            className="mb-1 text-sm font-medium text-gray-600"
                          >
                            Tage/Woche {selectedConfigYear}
                          </label>
                          <input
                            id={`daysPerWeek-${person.id}-${selectedConfigYear}`}
                            type="number"
                            value={yearlyPersonData[person.id]?.daysPerWeek ?? ''}
                            onChange={(e) => onYearlyDataChange(person.id, 'daysPerWeek', e.target.value)}
                            className="w-full px-2 py-1 border rounded-md md:w-auto"
                            max="5"
                            min="1"
                            placeholder="1-5"
                            disabled={isSavingYearly}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {/* Rechte Seite: Speicher- und Reset-Button */}
                <div className="flex items-center flex-shrink-0 mt-3 md:mt-0 md:ml-4">
                  <button
                    onClick={() => onSaveYearlyData(person.id)}
                    disabled={isSavingYearly || !hasYearlyDataChanged}
                    className={`w-full p-2 text-sm text-white rounded md:w-auto flex items-center justify-center
                                ${isSavingYearly ? 'bg-yellow-500 hover:bg-yellow-600 cursor-not-allowed' : (hasYearlyDataChanged ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed')}`}
                    aria-label={isSavingYearly ? "Jährliche Daten speichern..." : (hasYearlyDataChanged ? "Jährliche Daten speichern" : "Keine Änderungen an jährlichen Daten")}
                  >
                    {isSavingYearly ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  </button>
                  <button
                    onClick={() => onResetYearlyData(person.id)}
                    disabled={isSavingYearly || !hasYearlyDataChanged}
                    className={`p-2 text-sm rounded flex items-center justify-center ml-2
                                ${isSavingYearly || !hasYearlyDataChanged
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-primary text-white hover:bg-primary'}`}
                    aria-label="Änderungen zurücksetzen"
                    title="Änderungen zurücksetzen"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        personen.length === 0 ?
        <p>Keine Personen vorhanden. Bitte fügen Sie zuerst Personen im Abschnitt "Personen verwalten" hinzu.</p>
        : yearConfigs.length === 0 ?
        <p className="py-2 text-gray-500">Bitte zuerst ein Jahr unter "Jahreskonfiguration verwalten" hinzufügen, um Personendaten zu bearbeiten.</p>
        : !selectedConfigYear ?
        <p className="py-2 text-gray-500">Bitte oben ein Jahr auswählen, um dessen Personendaten zu bearbeiten.</p>
        : null // Should not happen if yearConfigs > 0 and selectedConfigYear is set
      )}

      {/* Globale Tage vorbefüllen - wird nur angezeigt, wenn ein Jahr ausgewählt ist und Personen existieren */}
      {yearConfigs.length > 0 && selectedConfigYear && personen.length > 0 && !isLoadingYearlyPersonData && (
        <GlobalDaySettingsSection
          selectedConfigYear={selectedConfigYear}
          yearConfigs={yearConfigs}
          personen={personen}
          globalTagDaten={globalTagDaten}
          onApplyPrefill={onApplyPrefill}
          onImportHolidays={onImportHolidays}
          onSetHolidaysImportedStatus={onSetHolidaysImportedStatus} // Weiterleiten
          getMonatsName={getMonatsName}
          // isPrefilling and isImportingHolidays state are managed internally by GlobalDaySettingsSection
        />
      )}
    </section>
  );
};

export default YearlyPersonDataSection;