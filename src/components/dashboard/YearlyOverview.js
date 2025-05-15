import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalendar } from '../../hooks/useCalendar';
import LoadingIndicator from '../common/LoadingIndicator';
import ErrorMessage from '../common/ErrorMessage';

const YearlyOverview = () => { // navigateToView prop removed
  const navigate = useNavigate();
  const {
    isLoadingData,
    loginError,
    currentYear,
    setCurrentYear,
    personen,
    getPersonJahresUrlaub,
    getPersonJahresDurchfuehrung,
    getPersonResturlaub,
    setAusgewaehltePersonId,
    setAnsichtModus,
    URLAUBSANSPRUCH_PRO_JAHR
  } = useCalendar();
  
  return (
    <div className="min-h-screen bg-gray-100">
      
      <main className="container px-4 py-8 mx-auto">
        {isLoadingData && <LoadingIndicator message="Lade Jahresübersicht..." />}
        <ErrorMessage message={loginError} />
        
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentYear(currentYear - 1)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              &larr; Vorheriges Jahr
            </button>
            
            <h2 className="text-xl font-bold">
              Jahresübersicht {currentYear}
            </h2>
            
            <button
              onClick={() => setCurrentYear(currentYear + 1)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              Nächstes Jahr &rarr;
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left border">Person</th>
                  <th className="p-3 text-center border">Resturlaub<br />(aus {currentYear - 1})</th>
                  <th className="p-3 text-center border">Urlaubsanspruch<br />{currentYear}</th>
                  <th className="p-3 text-center border">Gesamt verfügbarer<br />Urlaub</th>
                  <th className="p-3 text-center border">Urlaubstage {currentYear}</th>
                  <th className="p-3 text-center border">Verbleibender<br />Urlaub</th>
                  <th className="p-3 text-center border">Durchführungstage {currentYear}</th>
                  <th className="p-3 text-center border">Details</th>
                </tr>
              </thead>
              <tbody>
                {personen.map((person) => {
                  const urlaubstageDiesesJahr = getPersonJahresUrlaub(person.id, currentYear);
                  const jahresDurchfuehrung = getPersonJahresDurchfuehrung(person.id, currentYear);
                  const personResturlaub = getPersonResturlaub(person.id);
                  const urlaubsanspruchAktuell = URLAUBSANSPRUCH_PRO_JAHR;
                  const gesamtVerfuegbarerUrlaub = urlaubsanspruchAktuell + personResturlaub;
                  const verbleibenderUrlaub = gesamtVerfuegbarerUrlaub - urlaubstageDiesesJahr;
                  
                  return (
                    <tr key={person.id}>
                      <td className="p-3 border">{person.name}</td>
                      <td className="p-3 text-center border">
                        {personResturlaub}
                      </td>
                      <td className="p-3 text-center border">{urlaubsanspruchAktuell}</td>
                      <td className="p-3 text-center border">{gesamtVerfuegbarerUrlaub}</td>
                      <td className="p-3 text-center border">{urlaubstageDiesesJahr}</td>
                      <td className="p-3 text-center border">{verbleibenderUrlaub}</td>
                      <td className="p-3 text-center border">{jahresDurchfuehrung}</td>
                      <td className="p-3 text-center border">
                        <button
                          onClick={() => {
                            setAusgewaehltePersonId(person.id);
                            setAnsichtModus('jahresdetail');
                            navigate(`/monthly-detail/${person.id}`);
                          }}
                          className="px-4 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                        >
                          Monatsdetails
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default YearlyOverview;