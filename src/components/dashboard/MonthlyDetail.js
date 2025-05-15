import React from 'react';
// import { useNavigate } from 'react-router-dom'; // Entfernt, da nicht verwendet
import LoadingIndicator from '../common/LoadingIndicator';
import ErrorMessage from '../common/ErrorMessage';
import { useCalendar } from '../../hooks/useCalendar';

const MonthlyDetail = () => {
  // const navigate = useNavigate(); // Entfernt, da nicht verwendet
  const { 
    currentYear, 
    setCurrentMonth, 
    setAnsichtModus,
    ausgewaehltePersonId,
    personen,
    isLoadingData,
    loginError,
    getMonatsName,
    getPersonGesamtUrlaub,
    getPersonGesamtDurchfuehrung,
    getPersonJahresUrlaub,
    getPersonJahresDurchfuehrung,
    getPersonResturlaub
  } = useCalendar();

  const ausgewaehltePerson = personen.find(p => p.id === ausgewaehltePersonId);
  
  if (!ausgewaehltePerson) {
    return <div>Person nicht gefunden</div>;
  }

  return (
    <main className="container px-4 py-8 mx-auto">
      {isLoadingData && <LoadingIndicator message="Lade Monatsdetails..." />}
      {loginError && <ErrorMessage message={loginError} />}
      
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setAnsichtModus('jahresuebersicht')}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            &larr; Zurück zur Jahresübersicht
          </button>
          
          <h2 className="text-xl font-bold">
            {ausgewaehltePerson.name} - Monatsdetails {currentYear}
          </h2>
          
          <div className="w-36"></div> {/* Spacer für gleichmäßiges Layout */}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left border">Monat</th>
                <th className="p-3 text-center border">Urlaubstage</th>
                <th className="p-3 text-center border">Durchführungstage</th>
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
                    <button
                      onClick={() => {
                        setCurrentMonth(monat);
                        setAnsichtModus('kalender');
                      }}
                      className="px-4 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                    >
                      Bearbeiten
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
                <td className="p-3 text-center border"></td>
              </tr>
              <tr className="bg-gray-200 font-bold">
                <td className="p-3 border">Mit Resturlaub</td>
                <td className="p-3 text-center border">
                  {getPersonJahresUrlaub(ausgewaehltePersonId, currentYear) + getPersonResturlaub(ausgewaehltePersonId)}
                </td>
                <td className="p-3 text-center border">-</td>
                <td className="p-3 text-center border"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </main>
  );
};

export default MonthlyDetail;