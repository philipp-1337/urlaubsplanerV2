import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useCalendar } from '../../hooks/useCalendar';
import { getMonatsName, getWochentagName } from '../../services/dateUtils';
import DayCell from './DayCell';
import ErrorMessage from '../common/ErrorMessage';
import { 
  ArrowLeftIcon, 
  PenOffIcon,
  TableIcon,
  Table2Icon
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import InfoOverlayButton from '../common/InfoOverlayButton';
import KebabMenu from '../common/KebabMenu';

const CalendarView = ({ navigateToView }) => {
  const navigate = useNavigate();
  const {
    loginError,
    currentMonth,
    currentYear,
    handleMonatWechsel,
    tagDaten, // Ensure tagDaten is destructured to check for person-specific entries
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
    setAusgewaehltePersonId, // Need setter to sync context state
  } = useCalendar(); // Destructure directly from the hook's return value

  const { personId: personIdFromUrl } = useParams(); // Get personId from URL
  
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen]);

  // Find the person based on the ID from the URL
  const ausgewaehltePerson = personen.find(p => p.id === personIdFromUrl);

  // Sync the context state with the URL parameter when the component mounts or URL changes
  useEffect(() => {
    if (personIdFromUrl) {
      setAusgewaehltePersonId(personIdFromUrl);
    }
  }, [personIdFromUrl, setAusgewaehltePersonId]);

  const tageImMonat = getTageImMonat(); // This uses currentMonth/Year from context

  // to person-specific data. The handleDayCellClick below uses getTagStatus for its logic.
  // const tagDaten = rawTagDaten || {}; // This line is fine, but not directly used by the corrected click handler
  
  const handleDayCellClick = (tagObject) => {
    if (!tagObject.istWochenende) {
      const personIdStr = String(ausgewaehltePersonId);
      const currentStatus = getTagStatus(personIdStr, tagObject.tag, currentMonth, currentYear);

      // Check if there's an explicit person-specific entry for this day
      const personSpecificKey = `${personIdStr}-${currentYear}-${currentMonth}-${tagObject.tag}`;
      const hasPersonSpecificEntry = tagDaten.hasOwnProperty(personSpecificKey);

      let neuerStatus = null;

      if (currentStatus === null) {
        neuerStatus = 'urlaub';
      } else if (currentStatus === 'urlaub') {
        neuerStatus = 'durchfuehrung';
      } else if (currentStatus === 'durchfuehrung') {
        neuerStatus = 'fortbildung';
      } else if (currentStatus === 'fortbildung') {
        // If it was a global 'fortbildung' (unlikely, but for completeness) or no specific entry, override with 'interne teamtage'
        // If it was person-specific 'fortbildung', cycle to 'interne teamtage'
        neuerStatus = 'interne teamtage'; 
      } else if (currentStatus === 'interne teamtage') {
        // If it was a person-specific 'interne teamtage', next is 'feiertag' (person-specific)
        // If it was a global 'interne teamtage', next should be 'urlaub' (person-specific override)
        if (hasPersonSpecificEntry && tagDaten[personSpecificKey] === 'interne teamtage') {
          neuerStatus = 'feiertag'; // Cycle to person-specific feiertag
        } else { // Global 'interne teamtage' or no specific entry, start override with 'urlaub'
          neuerStatus = 'urlaub';
        }
      } else if (currentStatus === 'feiertag') {
        // If it was a person-specific 'feiertag', next is to clear it (null)
        // If it was a global 'feiertag', next should be 'urlaub' (person-specific override)
        if (hasPersonSpecificEntry && tagDaten[personSpecificKey] === 'feiertag') {
          neuerStatus = null; // Clear person-specific feiertag
        } else { // Global 'feiertag' or no specific entry, start override with 'urlaub'
          neuerStatus = 'urlaub';
        }
      }
      setTagStatus(personIdStr, tagObject.tag, neuerStatus, currentMonth, currentYear);
    } 
  };

  if (!ausgewaehltePerson) {
    return <Navigate to="/" replace />; // Redirect if person not found
  };
  
  if (!ausgewaehltePerson) return null;

  return (
    <div className=""> {/* Removed min-h-screen bg-gray-100, parent main tag in App.js handles this */}
      
      <main className="container px-4 py-8 mx-auto">
        <ErrorMessage message={loginError} />
        
        <div className="p-6 mb-6 bg-white rounded-lg shadow-md">
          <div className="relative mb-6 flex flex-row items-center justify-between">
            <div className="flex items-center">
              <InfoOverlayButton
                text={"Klicken Sie auf einen Tag, um zwischen den Status-Typen zu wechseln. Global gesetzte Tage, sind mit einem kleinen Punkt gekennzeichnet. Diese können überschrieben, jedoch nicht gelöscht werden."}
                className=""
              />
            </div>
            <div className="flex items-center flex-1 justify-center space-x-2">
              <button
                onClick={() => handleMonatWechsel('zurueck')}
                className="p-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Vorheriger Monat"
              >
                <ArrowLeftIcon className="w-4 h-4" />
              </button>
              <h2 className="text-base font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px] sm:max-w-none sm:text-lg">
                {ausgewaehltePerson.name} - {getMonatsName(currentMonth)} {currentYear}
              </h2>
              <button
                onClick={() => handleMonatWechsel('vor')}
                className="p-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Nächster Monat"
              >
                <ArrowLeftIcon className="w-4 h-4 transform rotate-180" />
              </button>
            </div>
             <div className="relative">
            <KebabMenu
              disabled={true}
              items={[{
                label: 'N/A',
                icon: <PenOffIcon size={16} className="ml-2" />, // importiert oben
              }]}
            />
          </div>
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
              const status = getTagStatus(String(ausgewaehltePerson.id), tag.tag); // Use person.id from found person
              
              // Determine if the status is global for the selected person
              const personIdStr = String(ausgewaehltePersonId);
              const personSpecificKey = `${personIdStr}-${currentYear}-${currentMonth}-${tag.tag}`;
              const hasPersonSpecificEntry = tagDaten.hasOwnProperty(personSpecificKey);
              const isGlobal = status !== null && !hasPersonSpecificEntry;

              return (
                <DayCell 
                  key={tag.tag}
                  day={tag}
                  status={status}
                  isWeekend={tag.istWochenende}
                  onClick={() => handleDayCellClick(tag)}
                  view="calendar" // Pass view prop
                  isGlobal={isGlobal} // Pass the new prop
                />
              );
            })}
          </div>
          
          <div className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-3">
            <div className="text-lg">
              <strong>Urlaubstage:</strong> {getPersonGesamtUrlaub(String(ausgewaehltePerson.id))}
            </div>
            <div className="text-lg">
              <strong>Durchführungstage:</strong> {getPersonGesamtDurchfuehrung(String(ausgewaehltePerson.id))}
            </div>
            <div className="text-lg">
              <strong>Fortbildungstage:</strong> {getPersonGesamtFortbildung(String(ausgewaehltePerson.id))}
            </div>
            <div className="text-lg">
              <strong>Teamtage:</strong> {getPersonGesamtInterneTeamtage(String(ausgewaehltePerson.id))}
            </div>
            <div className="text-lg">
              <strong>Feiertage:</strong> {getPersonGesamtFeiertage(String(ausgewaehltePerson.id))}
            </div>
          </div>
          
          {/* Navigation Buttons */}
          <div className="mt-8 flex flex-row justify-between items-center gap-4">
            <button
              onClick={() => {
                setAnsichtModus('liste'); // Set mode for MonthlyView (all users table)
                navigate('/'); // Navigate to the route that renders MonthlyView.js
              }}
              className="p-2 rounded-full text-gray-700 rounded-md hover:bg-gray-100 transition-colors border border-gray-medium flex items-center gap-1"
            >
              <Table2Icon className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setAnsichtModus('jahresdetail'); // This is the mode for MonthlyDetail view
                navigate(`/monthly-detail/${ausgewaehltePerson.id}`); // Use person.id from found person
              }}
              className="p-2 rounded-full text-gray-700 rounded-md hover:bg-gray-100 transition-colors border border-gray-medium flex items-center gap-1"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

        </div>
      </main>
    </div>
  );
};

export default CalendarView;