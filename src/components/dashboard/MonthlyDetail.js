import React from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorMessage from '../common/ErrorMessage';
import { useCalendar } from '../../hooks/useCalendar';
import { CalendarDaysIcon } from 'lucide-react';

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

  return (
    <main className="container px-4 py-8 mx-auto">
      {loginError && <ErrorMessage message={loginError} />}
      
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="relative flex items-center justify-center mb-6"> {/* Geändert: justify-between zu justify-center, relative hinzugefügt */}
          
          <h2 className="text-xl font-bold"> {/* Wird nun zentriert */}
            {ausgewaehltePerson.name} - {currentYear}
          </h2>
          
          {/* Spacer entfernt, da der Titel durch justify-center auf dem Elternelement zentriert wird */}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="sticky left-0 z-10 p-3 text-left bg-gray-100 border">
                  Monat
                </th>
                <th className="p-3 text-center border">Urlaubstage</th>
                <th className="p-3 text-center border">Durchführungstage</th>
                <th className="p-3 text-center border">Fortbildungstage</th>
                <th className="p-3 text-center border">Teamtage</th>
                {/* <th className="p-3 text-center border">Feiertage</th> */}
                <th className="p-3 text-center border">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }, (_, i) => i).map((monat) => (
                <tr key={monat}>
                  <td className="sticky left-0 z-0 p-3 bg-white border"> {/* z-0 ist hier ok, da kein Header drüber scrollt */}
                    {getMonatsName(monat)}
                  </td>
                  <td className="p-3 text-center border">
                    {getPersonGesamtUrlaub(ausgewaehltePersonId, monat, currentYear)}
                  </td>
                  <td className="p-3 text-center border">
                    {getPersonGesamtDurchfuehrung(ausgewaehltePersonId, monat, currentYear)}
                  </td>
                  <td className="p-3 text-center border">
                    {getPersonGesamtFortbildung(ausgewaehltePersonId, monat, currentYear)}
                  </td>
                  <td className="p-3 text-center border">
                    {getPersonGesamtInterneTeamtage(ausgewaehltePersonId, monat, currentYear)}
                  </td>
                  {/* <td className="p-3 text-center border">
                    {getPersonGesamtFeiertage(ausgewaehltePersonId, monat, currentYear)}
                  </td> */}
                  <td className="p-3 text-center border">
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
                <td className="p-3 text-center border">
                  {getPersonJahresUrlaub(ausgewaehltePersonId, currentYear)}
                </td>
                <td className="p-3 text-center border">
                  {getPersonJahresDurchfuehrung(ausgewaehltePersonId, currentYear)}
                </td>
                <td className="p-3 text-center border">
                  {getPersonJahresFortbildung(ausgewaehltePersonId, currentYear)}
                </td>
                <td className="p-3 text-center border">
                  {getPersonJahresInterneTeamtage(ausgewaehltePersonId, currentYear)}
                </td>
                {/* <td className="p-3 text-center border">
                  {getPersonJahresFeiertage(ausgewaehltePersonId, currentYear)}
                </td> */}
                <td className="p-3 text-center border"></td>
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