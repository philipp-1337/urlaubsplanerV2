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
    getPersonGesamtFeiertage,
    getPersonJahresUrlaub,
    getPersonJahresDurchfuehrung,
    getPersonJahresFortbildung,
    getPersonJahresInterneTeamtage,
    getPersonJahresFeiertage,
    getPersonResturlaub
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
                <th className="p-3 text-left border">Monat</th>
                <th className="p-3 text-center border">Urlaubstage</th>
                <th className="p-3 text-center border">Durchführungstage</th>
                <th className="p-3 text-center border">Fortbildungstage</th>
                <th className="p-3 text-center border">Teamtage</th>
                <th className="p-3 text-center border">Feiertage</th>
                <th className="p-3 text-center border">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }, (_, i) => i).map((monat) => (
                <tr key={monat}>
                  <td className="p-3 border">{getMonatsName(monat)}</td>
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
                  <td className="p-3 text-center border">
                    {getPersonGesamtFeiertage(ausgewaehltePersonId, monat, currentYear)}
                  </td>
                  <td className="p-3 text-center border">
                    <button
                      onClick={() => {
                        setCurrentMonth(monat);
                        setAnsichtModus('kalender');
                        navigate(`/calendar/${ausgewaehltePersonId}`);
                      }}
                      className="px-4 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                    >
                      <CalendarDaysIcon size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td className="p-3 border">Gesamt</td>
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
                <td className="p-3 text-center border">
                  {getPersonJahresFeiertage(ausgewaehltePersonId, currentYear)}
                </td>
                <td className="p-3 text-center border"></td>
              </tr>
              <tr className="bg-gray-200 font-bold">
                <td className="p-3 border">Mit Resturlaub</td>
                <td className="p-3 text-center border">
                  {getPersonJahresUrlaub(ausgewaehltePersonId, currentYear) + getPersonResturlaub(ausgewaehltePersonId)}
                </td>
                <td className="p-3 text-center border">-</td>
                <td className="p-3 text-center border">-</td>
                <td className="p-3 text-center border">-</td>
                <td className="p-3 text-center border">-</td>
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
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Jahresübersicht
            </button>
          </div>
      </div>
    </main>
  );
};

export default MonthlyDetail;