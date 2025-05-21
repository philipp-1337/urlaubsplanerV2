import { useNavigate } from 'react-router-dom';
import ErrorMessage from '../common/ErrorMessage';
import { useCalendar } from '../../hooks/useCalendar';
import { CalendarDaysIcon, DownloadIcon, EllipsisVerticalIcon } from 'lucide-react';
import { exportToCsv } from '../../services/exportUtils';
import { useRef, useEffect, useState } from 'react';

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
    // getPersonJahresFeiertage
  } = useCalendar();

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

  const ausgewaehltePerson = personen.find(p => p.id === ausgewaehltePersonId);
  
  if (!ausgewaehltePerson) {
    return <div>Person nicht gefunden</div>;
  }
  
  const handleExportCsv = () => {
    const headers = ["Monat", "Urlaub", "Durchführung", "Fortbildung", "Teamtage"];
    const dataRows = [];

    Array.from({ length: 12 }, (_, i) => i).forEach((monat) => {
      dataRows.push([
        getMonatsName(monat),
        getPersonGesamtUrlaub(ausgewaehltePersonId, monat, currentYear),
        getPersonGesamtDurchfuehrung(ausgewaehltePersonId, monat, currentYear),
        getPersonGesamtFortbildung(ausgewaehltePersonId, monat, currentYear),
        getPersonGesamtInterneTeamtage(ausgewaehltePersonId, monat, currentYear),
      ]);
    });

    // Add total row
    dataRows.push([
      "Gesamt",
      getPersonJahresUrlaub(ausgewaehltePersonId, currentYear),
      getPersonJahresDurchfuehrung(ausgewaehltePersonId, currentYear),
      getPersonJahresFortbildung(ausgewaehltePersonId, currentYear),
      getPersonJahresInterneTeamtage(ausgewaehltePersonId, currentYear),
    ]);

    exportToCsv(`Jahresdetail_${ausgewaehltePerson.name}_${currentYear}.csv`, headers, dataRows);
  };

  return (
    <main className="container px-4 py-8 mx-auto">
      {loginError && <ErrorMessage message={loginError} />}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="relative mb-6 flex flex-row items-center justify-between">
          <div className="flex items-center flex-1 justify-center space-x-2">
            <h2 className="text-base font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px] sm:max-w-none sm:text-lg">
              {ausgewaehltePerson.name} - {currentYear}
            </h2>
          </div>
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
              title="Weitere Aktionen"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              <EllipsisVerticalIcon className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div
                ref={menuRef}
                className="absolute right-0 z-10 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg origin-top-right transition-all"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="options-menu"
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleExportCsv();
                  }}
                  className="flex items-center justify-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  role="menuitem"
                >
                  CSV Export
                  <DownloadIcon size={16} className="ml-2" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
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
                    {getPersonGesamtUrlaub(ausgewaehltePersonId, monat, currentYear)}
                  </td>
                  <td className="p-3 text-center border-t border-r">
                    {getPersonGesamtDurchfuehrung(ausgewaehltePersonId, monat, currentYear)}
                  </td>
                  <td className="p-3 text-center border-t border-r">
                    {getPersonGesamtFortbildung(ausgewaehltePersonId, monat, currentYear)}
                  </td>
                  <td className="p-3 text-center border-t border-r">
                    {getPersonGesamtInterneTeamtage(ausgewaehltePersonId, monat, currentYear)}
                  </td>
                  {/* <td className="p-3 text-center border">
                    {getPersonGesamtFeiertage(ausgewaehltePersonId, monat, currentYear)}
                  </td> */}
                  <td className="p-3 text-center border-t border-r">
                    <button
                      onClick={() => {
                        setCurrentMonth(monat);
                        setAnsichtModus('kalender');
                        navigate(`/calendar/${ausgewaehltePersonId}`);
                      }}
                      className="px-4 py-1 text-white bg-primary rounded hover:bg-accent hover:text-primary"
                    >
                      <CalendarDaysIcon size={16} />
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
                  {getPersonJahresUrlaub(ausgewaehltePersonId, currentYear)}
                </td>
                <td className="p-3 text-center border-t border-r border-b">
                  {getPersonJahresDurchfuehrung(ausgewaehltePersonId, currentYear)}
                </td>
                <td className="p-3 text-center border-t border-r border-b">
                  {getPersonJahresFortbildung(ausgewaehltePersonId, currentYear)}
                </td>
                <td className="p-3 text-center border-t border-r border-b">
                  {getPersonJahresInterneTeamtage(ausgewaehltePersonId, currentYear)}
                </td>
                {/* <td className="p-3 text-center border">
                  {getPersonJahresFeiertage(ausgewaehltePersonId, currentYear)}
                </td> */}
                <td className="p-3 text-center border-t border-r border-b"></td>
              </tr>
            </tfoot>
          </table>
        </div>
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setAnsichtModus('jahresuebersicht');
                navigate('/yearly-overview');
              }}
              className="px-4 py-2 text-white bg-primary rounded-md hover:bg-accent hover:text-primary"
            >
              Jahresübersicht
            </button>
          </div>
      </div>
    </main>
  );
};

export default MonthlyDetail;