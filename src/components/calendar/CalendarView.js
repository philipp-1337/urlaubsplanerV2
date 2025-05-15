import React from 'react';
import { useCalendar } from '../../hooks/useCalendar';
import { getMonatsName, getWochentagName } from '../../services/dateUtils';
import DayCell from './DayCell';
import LoadingIndicator from '../common/LoadingIndicator';
import ErrorMessage from '../common/ErrorMessage';

const CalendarView = ({ navigateToView }) => {
  const {
    isLoadingData,
    loginError,
    currentMonth,
    currentYear,
    handleMonatWechsel,
    getTageImMonat,
    personen,
    ausgewaehltePersonId,
    getTagStatus,
    setTagStatus,
    getPersonGesamtUrlaub,
    getPersonGesamtDurchfuehrung,
    setAnsichtModus
  } = useCalendar(); // Destructure directly from the hook's return value

  const ausgewaehltePerson = personen.find(p => p.id === ausgewaehltePersonId);
  const tageImMonat = getTageImMonat();
  
  const handleDayCellClick = (tagObject) => {
    if (!tagObject.istWochenende) {
      const status = getTagStatus(String(ausgewaehltePersonId), tagObject.tag);
      let neuerStatus = null;
      if (status === null) neuerStatus = 'urlaub';
      else if (status === 'urlaub') neuerStatus = 'durchfuehrung';
      setTagStatus(String(ausgewaehltePersonId), tagObject.tag, neuerStatus);
    }
  };
  
  if (!ausgewaehltePerson) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      
      <main className="container px-4 py-8 mx-auto">
        {isLoadingData && <LoadingIndicator message="Lade Kalender..." />}
        <ErrorMessage message={loginError} />
        
        <div className="p-6 mb-6 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => handleMonatWechsel('zurueck')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              &larr; Vorheriger Monat
            </button>
            
            <h2 className="text-xl font-bold">
              {ausgewaehltePerson.name} - {getMonatsName(currentMonth)} {currentYear}
            </h2>
            
            <button
              onClick={() => handleMonatWechsel('vor')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              Nächster Monat &rarr;
            </button>
          </div>
          
          <div className="mb-6">
            <div className="flex mb-2 space-x-2">
              <div className="flex items-center">
                <div className="w-4 h-4 mr-1 bg-blue-500 rounded"></div>
                <span>Urlaub</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 mr-1 bg-green-500 rounded"></div>
                <span>Durchführung</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 mr-1 bg-gray-300 rounded"></div>
                <span>Wochenende</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">Klicken Sie auf einen Tag, um zwischen Urlaub, Durchführung und keinem Status zu wechseln.</p>
          </div>
          
          <div className="grid grid-cols-7 gap-2 text-center">
            {/* Wochentags-Header */}
            {[0, 1, 2, 3, 4, 5, 6].map((wochentag) => (
              <div key={wochentag} className="p-2 font-bold bg-gray-100">
                {getWochentagName(wochentag)}
              </div>
            ))}
            
            {/* Leere Felder für Tage vor dem 1. des Monats */}
            {Array.from({ length: tageImMonat[0].wochentag }).map((_, index) => (
              <div key={`leer-${index}`} className="p-2"></div>
            ))}
            
            {/* Tage des Monats */}
            {tageImMonat.map((tag) => {
              const status = getTagStatus(String(ausgewaehltePersonId), tag.tag);
              return (
                <DayCell 
                  key={tag.tag}
                  day={tag}
                  status={status}
                  isWeekend={tag.istWochenende}
                  onClick={() => handleDayCellClick(tag)}
                  view="calendar"
                />
              );
            })}
          </div>
          
          <div className="flex justify-between mt-6">
            <div className="text-lg">
              <strong>Urlaubstage:</strong> {getPersonGesamtUrlaub(String(ausgewaehltePersonId))}
            </div>
            <div className="text-lg">
              <strong>Durchführungstage:</strong> {getPersonGesamtDurchfuehrung(String(ausgewaehltePersonId))}
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setAnsichtModus('liste');
                navigateToView('liste');
              }}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Zurück zur Übersicht
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CalendarView;