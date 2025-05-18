import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalendar } from '../../hooks/useCalendar';
import ErrorMessage from '../common/ErrorMessage';

const YearlyOverview = () => { // navigateToView prop removed
  const navigate = useNavigate();
  const {
    loginError,
    currentYear,
    setCurrentYear,
    personen,
    getPersonJahresUrlaub,
    getPersonJahresDurchfuehrung,
    getPersonJahresFortbildung,
    getPersonJahresInterneTeamtage,
    getPersonJahresFeiertage,
    getPersonResturlaub,
    setAusgewaehltePersonId,
    setAnsichtModus,
    getCurrentYearUrlaubsanspruch,
    getConfiguredYears // Get the list of configured years
  } = useCalendar();

  const configuredYears = getConfiguredYears();

  const handleYearChange = (direction) => {
    const newYear = direction === 'next' ? currentYear + 1 : currentYear - 1;
    if (configuredYears.length === 0 || configuredYears.includes(newYear)) {
      setCurrentYear(newYear);
    } else {
      console.warn(`Cannot navigate to year ${newYear} as it is not configured.`);
      // Optionally, provide user feedback here
    }
  };

  const canGoToPreviousYear = () => {
    if (configuredYears.length === 0) return true; // Allow if no years are configured yet
    const prevYear = currentYear - 1;
    return configuredYears.includes(prevYear);
  };

  const canGoToNextYear = () => {
    if (configuredYears.length === 0) return true; // Allow if no years are configured yet
    const nextYear = currentYear + 1;
    return configuredYears.includes(nextYear);
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      
      <main className="container px-4 py-8 mx-auto">
        {loginError && <ErrorMessage message={loginError} />}
        
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => handleYearChange('previous')}
              disabled={!canGoToPreviousYear()}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &larr;
            </button>
            
            <h2 className="text-xl font-bold">
              Übersicht {configuredYears.length > 0 && !configuredYears.includes(currentYear) ? `(Jahr ${currentYear} nicht konfiguriert)` : currentYear}
            </h2>
            
            <button
              onClick={() => handleYearChange('next')}
              disabled={!canGoToNextYear()}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &rarr;
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
                  <th className="p-3 text-center border">Fortbildungstage {currentYear}</th>
                  <th className="p-3 text-center border">Teamtage {currentYear}</th>
                  <th className="p-3 text-center border">Feiertage {currentYear}</th>
                  <th className="p-3 text-center border">Details</th>
                </tr>
              </thead>
              <tbody>
                {personen.map((person) => {
                  const urlaubstageDiesesJahr = getPersonJahresUrlaub(person.id, currentYear);
                  const jahresDurchfuehrung = getPersonJahresDurchfuehrung(person.id, currentYear);
                  const jahresFortbildung = getPersonJahresFortbildung(person.id, currentYear);
                  const jahresTeamtage = getPersonJahresInterneTeamtage(person.id, currentYear);
                  const jahresFeiertage = getPersonJahresFeiertage(person.id, currentYear);
                  const personResturlaub = getPersonResturlaub(person.id);
                  const urlaubsanspruchAktuell = getCurrentYearUrlaubsanspruch(currentYear);
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
                      <td className="p-3 text-center border">{jahresFortbildung}</td>
                      <td className="p-3 text-center border">{jahresTeamtage}</td>
                      <td className="p-3 text-center border">{jahresFeiertage}</td>
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