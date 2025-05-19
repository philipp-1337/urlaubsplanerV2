import { useNavigate } from 'react-router-dom';
import { useCalendar } from '../../hooks/useCalendar';
import { getMonatsName, getWochentagName } from '../../services/dateUtils';
import DayCell from './DayCell';
import ErrorMessage from '../common/ErrorMessage';
import { ArrowLeftIcon } from 'lucide-react';

const CalendarView = ({ navigateToView }) => {
  const navigate = useNavigate();
  const {
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
    getPersonGesamtFortbildung,
    getPersonGesamtInterneTeamtage,
    getPersonGesamtFeiertage,
    setAnsichtModus, // Added for navigation
  } = useCalendar(); // Destructure directly from the hook's return value

  const ausgewaehltePerson = personen.find(p => p.id === ausgewaehltePersonId);
  const tageImMonat = getTageImMonat();
  
  // to person-specific data. The handleDayCellClick below uses getTagStatus for its logic.
  // const tagDaten = rawTagDaten || {}; // This line is fine, but not directly used by the corrected click handler
  
  const handleDayCellClick = (tagObject) => {
    if (!tagObject.istWochenende) {
      const personIdStr = String(ausgewaehltePersonId);
      const currentStatus = getTagStatus(personIdStr, tagObject.tag);
      let neuerStatus = null;
      if (currentStatus === null) {
        neuerStatus = 'urlaub';
      } else if (currentStatus === 'urlaub') {
        neuerStatus = 'durchfuehrung';
      } else if (currentStatus === 'durchfuehrung') {
        neuerStatus = 'fortbildung';
      } else if (currentStatus === 'fortbildung') {
        neuerStatus = 'interne teamtage';
      } else if (currentStatus === 'interne teamtage') {
        neuerStatus = 'feiertag';
      } // if currentStatus is 'feiertag', neuerStatus bleibt null (löschen)
      setTagStatus(personIdStr, tagObject.tag, neuerStatus, currentMonth, currentYear);
    }
  };
  
  if (!ausgewaehltePerson) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      
      <main className="container px-4 py-8 mx-auto">
        <ErrorMessage message={loginError} />
        
        <div className="p-6 mb-6 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => handleMonatWechsel('zurueck')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
            </button>
            
            <h2 className="text-xl font-bold">
              {ausgewaehltePerson.name} - {getMonatsName(currentMonth)} {currentYear}
            </h2>
            
            <button
              onClick={() => handleMonatWechsel('vor')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1 transform rotate-180" />
            </button>
          </div>
          
          <div className="mb-6">
            <div className="flex flex-wrap mb-2 gap-2">
              <div className="flex items-center">
                <div className="w-4 h-4 mr-1 bg-bold-blue rounded"></div>
                <span>Urlaub</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 mr-1 bg-bold-mint rounded"></div>
                <span>Durchführung</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 mr-1 bg-bold-apricot rounded"></div>
                <span>Fortbildung</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 mr-1 bg-bold-lavender rounded"></div>
                <span>Teamtag</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 mr-1 bg-gray-dark rounded"></div>
                <span>Feiertag</span>
              </div>
              {/* <div className="flex items-center">
                <div className="w-4 h-4 mr-1 bg-gray-300 rounded"></div>
                <span>Wochenende</span>
              </div> */}
            </div>
            <p className="text-sm text-gray-600">Klicken Sie auf einen Tag, um zwischen den Status-Typen zu wechseln.</p>
          </div>
          
          <div className="grid grid-cols-7 gap-2 text-center">
            {/* Wochentags-Header */}
            {/* Reihenfolge geändert: Mo, Di, Mi, Do, Fr, Sa, So */}
            {[1, 2, 3, 4, 5, 6, 0].map((wochentag) => (
              <div key={wochentag} className="p-2 font-bold bg-gray-100">
                {getWochentagName(wochentag)}
              </div>
            ))}
            
            {/* Leere Felder für Tage vor dem 1. des Monats */}
            {/* Anpassung für Wochenstart am Montag: (wochentag + 6) % 7 */}
            {/* tageImMonat[0].wochentag: 0=So, 1=Mo, ..., 6=Sa */}
            {/* Wenn Mo (1): (1+6)%7 = 0 leere Zellen. Wenn So (0): (0+6)%7 = 6 leere Zellen. */}
            {Array.from({ length: (tageImMonat[0].wochentag + 6) % 7 }).map((_, index) => (
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
          
          <div className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-3">
            <div className="text-lg">
              <strong>Urlaubstage:</strong> {getPersonGesamtUrlaub(String(ausgewaehltePersonId))}
            </div>
            <div className="text-lg">
              <strong>Durchführungstage:</strong> {getPersonGesamtDurchfuehrung(String(ausgewaehltePersonId))}
            </div>
            <div className="text-lg">
              <strong>Fortbildungstage:</strong> {getPersonGesamtFortbildung(String(ausgewaehltePersonId))}
            </div>
            <div className="text-lg">
              <strong>Teamtage:</strong> {getPersonGesamtInterneTeamtage(String(ausgewaehltePersonId))}
            </div>
            <div className="text-lg">
              <strong>Feiertage:</strong> {getPersonGesamtFeiertage(String(ausgewaehltePersonId))}
            </div>
          </div>
          
          {/* Navigation Buttons */}
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={() => {
                setAnsichtModus('jahresdetail'); // This is the mode for MonthlyDetail view
                navigate(`/monthly-detail/${ausgewaehltePersonId}`);
              }}
              className="w-full px-4 py-2 text-white bg-primary rounded-md sm:w-auto hover:bg-accent hover:text-primary"
            >
              {ausgewaehltePerson.name} - {currentYear}
            </button>
            <button
              onClick={() => {
                setAnsichtModus('liste'); // Set mode for MonthlyView (all users table)
                navigate('/'); // Navigate to the route that renders MonthlyView.js
              }}
              className="w-full px-4 py-2 text-white bg-primary rounded-md sm:w-auto hover:bg-accent hover:text-primary"
            >
              {getMonatsName(currentMonth)} - {currentYear}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
};

export default CalendarView;