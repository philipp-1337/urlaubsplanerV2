import { useNavigate } from 'react-router-dom';
import ErrorMessage from '../common/ErrorMessage';
import { useCalendar } from '../../hooks/useCalendar';
import { CalendarDaysIcon, DownloadIcon } from 'lucide-react';
import { exportToCsv } from '../../services/exportUtils';

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
        <div className="flex flex-wrap items-center justify-between mb-6 gap-2"> {/* Adjusted for export button */}
          
          <h2 className="text-xl font-bold">
            {ausgewaehltePerson.name} - {currentYear}
          </h2>
          
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center"
          >
            <DownloadIcon size={16} className="mr-2" /> CSV Export
          </button>
          {/* Spacer might be needed if title should be centered and button on the right, or adjust flex properties */}
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