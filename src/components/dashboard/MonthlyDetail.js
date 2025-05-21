import { useNavigate, useParams, Navigate } from 'react-router-dom';
import ErrorMessage from '../common/ErrorMessage';
import { useCalendar } from '../../hooks/useCalendar';
import { 
  CornerDownRightIcon, 
  DownloadIcon, 
  SheetIcon 
} from 'lucide-react';
import { exportToCsv } from '../../services/exportUtils';
import { useRef, useEffect, useState } from 'react';
import KebabMenu from '../common/KebabMenu';
import InfoOverlayButton from '../common/InfoOverlayButton';
import { triggerHorizontalScrollHint } from '../../services/scrollUtils';

const MonthlyDetail = () => {
  const navigate = useNavigate();
  const {
    currentYear, 
    setCurrentMonth, 
    setAnsichtModus,
    ausgewaehltePersonId,
    personen,
    loginError,
    getMonatsName,
    getPersonGesamtUrlaub,
    getPersonGesamtDurchfuehrung,
    getPersonGesamtFortbildung,
    getPersonGesamtInterneTeamtage,
    // getPersonGesamtFeiertage,
    getPersonJahresUrlaub,
    getPersonJahresDurchfuehrung,
    getPersonJahresFortbildung,
    getPersonJahresInterneTeamtage,
    setAusgewaehltePersonId, // Need setter to sync context state
    // getPersonJahresFeiertage
  } = useCalendar();

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

  useEffect(() => {
    triggerHorizontalScrollHint({
      selector: '#monthly-detail-table-scroll',
      breakpoint: 768,
      scrollDistance: 90,
      duration: 500,
      returnDuration: 400
    });
  }, []);

  if (!ausgewaehltePerson) {
    return <Navigate to="/" replace />; // Redirect if person not found
  }

  const handleExportCsv = () => {
    const headers = ["Monat", "Urlaub", "Durchführung", "Fortbildung", "Teamtage"];
    const dataRows = [];

    Array.from({ length: 12 }, (_, i) => i).forEach((monat) => {
      dataRows.push([
        getMonatsName(monat),
        getPersonGesamtUrlaub(ausgewaehltePerson.id, monat, currentYear), // Use person.id
        getPersonGesamtDurchfuehrung(ausgewaehltePerson.id, monat, currentYear), // Use person.id
        getPersonGesamtFortbildung(ausgewaehltePerson.id, monat, currentYear), // Use person.id
        getPersonGesamtInterneTeamtage(ausgewaehltePerson.id, monat, currentYear), // Use person.id
      ]);
    });

    // Add total row
    dataRows.push([
      "Gesamt",
      getPersonJahresUrlaub(ausgewaehltePersonId, currentYear),
      getPersonJahresDurchfuehrung(ausgewaehltePerson.id, currentYear), // Use person.id
      getPersonJahresFortbildung(ausgewaehltePerson.id, currentYear), // Use person.id
      getPersonJahresInterneTeamtage(ausgewaehltePerson.id, currentYear), // Use person.id
    ]);

    exportToCsv(`Jahresdetail_${ausgewaehltePerson.name}_${currentYear}.csv`, headers, dataRows);
  };

  return (
    <main className="container px-4 py-8 mx-auto">
      {loginError && <ErrorMessage message={loginError} />}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="relative mb-6 flex flex-row items-center justify-between">
          <div className="flex items-center">
              <InfoOverlayButton
                text={"Das Jahresdetail zeigt die Urlaubstage, Durchführungstage, Fortbildungstage und Teamtage für jeden Monat an. Die Gesamtwerte werden am Ende der Tabelle angezeigt."}
                className=""
              />
            </div>
          <div className="flex items-center flex-1 justify-center space-x-2">
            <h2 className="text-base font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px] sm:max-w-none sm:text-lg">
              {ausgewaehltePerson.name} - {currentYear} {/* Use person.name */}
            </h2>
          </div>
          <div className="relative">
            <KebabMenu
              items={[{
                label: 'CSV Export',
                icon: <DownloadIcon size={16} className="ml-2" />, // importiert oben
                onClick: handleExportCsv
              }]}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto" id="monthly-detail-table-scroll">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-100">
                <th className="sticky left-0 z-10 p-3 text-left bg-gray-100 border-l border-t border-r">
                  Monat
                </th>
                <th className="p-3 text-center border-t border-r">Urlaub</th>
                <th className="p-3 text-center border-t border-r">Durchführung</th>
                <th className="p-3 text-center border-t border-r">Fortbildung</th>
                <th className="p-3 text-center border-t border-r">Teamtage</th>
                {/* <th className="p-3 text-center border">Feiertage</th> */}
                <th className="p-3 text-center border-t border-r">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }, (_, i) => i).map((monat) => (
                <tr key={monat}>
                  <td className="sticky left-0 z-0 p-3 bg-white border-l border-t border-r"> {/* z-0 ist hier ok, da kein Header drüber scrollt */}
                    {getMonatsName(monat)}
                  </td>
                  <td className="p-3 text-center border-t border-r">
                    {getPersonGesamtUrlaub(ausgewaehltePerson.id, monat, currentYear)} {/* Use person.id */}
                  </td>
                  <td className="p-3 text-center border-t border-r">
                    {getPersonGesamtDurchfuehrung(ausgewaehltePerson.id, monat, currentYear)} {/* Use person.id */}
                  </td>
                  <td className="p-3 text-center border-t border-r">
                    {getPersonGesamtFortbildung(ausgewaehltePerson.id, monat, currentYear)} {/* Use person.id */}
                  </td>
                  <td className="p-3 text-center border-t border-r">
                    {getPersonGesamtInterneTeamtage(ausgewaehltePerson.id, monat, currentYear)} {/* Use person.id */}
                  </td>
                  {/* <td className="p-3 text-center border">
                    {getPersonGesamtFeiertage(ausgewaehltePersonId, monat, currentYear)}
                  </td> */}
                  <td className="p-3 text-center border-t border-r">
                    <button
                      onClick={() => {
                        setCurrentMonth(monat);
                        setAnsichtModus('kalender'); // Set mode for CalendarView
                        navigate(`/calendar/${ausgewaehltePersonId}`);
                      }}
                      className="rounded-full rounded-md text-primary bg-accent hover:bg-gray-100 transition-colors p-2"
                    >
                      <CornerDownRightIcon size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td className="sticky left-0 z-10 p-3 bg-gray-100 border"> {/* z-10 wie Header für Konsistenz */}
                  Gesamt
                </td>
                <td className="p-3 text-center border-t border-r border-b">
                  {getPersonJahresUrlaub(ausgewaehltePerson.id, currentYear)} {/* Use person.id */}
                </td>
                <td className="p-3 text-center border-t border-r border-b">
                  {getPersonJahresDurchfuehrung(ausgewaehltePerson.id, currentYear)} {/* Use person.id */}
                </td>
                <td className="p-3 text-center border-t border-r border-b">
                  {getPersonJahresFortbildung(ausgewaehltePerson.id, currentYear)} {/* Use person.id */}
                </td>
                <td className="p-3 text-center border-t border-r border-b">
                  {getPersonJahresInterneTeamtage(ausgewaehltePerson.id, currentYear)} {/* Use person.id */}
                </td>
                {/* <td className="p-3 text-center border">
                  {getPersonJahresFeiertage(ausgewaehltePersonId, currentYear)}
                </td> */}
                <td className="p-3 text-center border-t border-r border-b"></td>
              </tr>
            </tfoot>
          </table>
        </div>
          <div className="mt-8 flex flex-row justify-between items-center gap-4">
            <button
              onClick={() => {
                setAnsichtModus('jahresuebersicht');
                navigate('/yearly-overview');
              }}
              className="p-2 rounded-full text-gray-700 rounded-md hover:bg-gray-100 transition-colors border border-gray-medium flex items-center gap-1"
            >
              <SheetIcon className="w-4 h-4" />
            </button>
          </div>
      </div>
    </main>
  );
};

export default MonthlyDetail;