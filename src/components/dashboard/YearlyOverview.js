import { useNavigate } from 'react-router-dom';
import { useCalendar } from '../../hooks/useCalendar';
import ErrorMessage from '../common/ErrorMessage';
import { GanttChartIcon, DownloadIcon, EllipsisVerticalIcon } from 'lucide-react';
import { exportToCsv } from '../../services/exportUtils';
import { useRef, useEffect, useState } from 'react';

const YearlyOverview = () => {
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
    // getPersonJahresFeiertage,
    getPersonResturlaub,
    setAusgewaehltePersonId,
    setAnsichtModus,
    getCurrentYearUrlaubsanspruch,
    getConfiguredYears, // Get the list of configured years
    employmentData // Get employment data for badges
  } = useCalendar();

  const configuredYears = getConfiguredYears();
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

  const handleExportCsv = () => {
    const headers = [
      "Person", 
      "Resturlaub Vorjahr", 
      "Urlaubsanspruch Aktuell", 
      "Gesamt Verfügbar", 
      "Urlaubstage Verplant", 
      "Urlaubstage Verbleibend", 
      "Durchführungstage", 
      "Fortbildungstage", 
      "Teamtage"
    ];

    const dataRows = personen.map(person => {
      const urlaubstageDiesesJahr = getPersonJahresUrlaub(person.id, currentYear);
      const jahresDurchfuehrung = getPersonJahresDurchfuehrung(person.id, currentYear);
      const jahresFortbildung = getPersonJahresFortbildung(person.id, currentYear);
      const jahresTeamtage = getPersonJahresInterneTeamtage(person.id, currentYear);
      const personResturlaub = getPersonResturlaub(person.id);
      const urlaubsanspruchAktuell = getCurrentYearUrlaubsanspruch(person.id, currentYear);
      const gesamtVerfuegbarerUrlaub = urlaubsanspruchAktuell + personResturlaub;
      const verbleibenderUrlaub = gesamtVerfuegbarerUrlaub - urlaubstageDiesesJahr;

      return [
        person.name, personResturlaub, urlaubsanspruchAktuell, gesamtVerfuegbarerUrlaub, 
        urlaubstageDiesesJahr, verbleibenderUrlaub, jahresDurchfuehrung, jahresFortbildung, jahresTeamtage
      ];
    });
    exportToCsv(`Jahresuebersicht_${currentYear}.csv`, headers, dataRows);
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <main className="container px-4 py-8 mx-auto">
        {loginError && <ErrorMessage message={loginError} />}
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="relative mb-6 flex flex-row items-center justify-between">
            <div className="flex items-center flex-1 justify-center space-x-2">
              <button
                onClick={() => handleYearChange('previous')}
                disabled={!canGoToPreviousYear()}
                className="p-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Vorheriges Jahr"
              >
                &larr;
              </button>
              <h2 className="text-base font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px] sm:max-w-none sm:text-lg">
                Übersicht {configuredYears.length > 0 && !configuredYears.includes(currentYear) ? `(Jahr ${currentYear} nicht konfiguriert)` : currentYear}
              </h2>
              <button
                onClick={() => handleYearChange('next')}
                disabled={!canGoToNextYear()}
                className="p-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Nächstes Jahr"
              >
                &rarr;
              </button>
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
                    className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    role="menuitem"
                  >
                    <DownloadIcon size={16} className="mr-2" />
                    CSV Export
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="sticky left-0 z-10 p-3 text-left bg-gray-100 border">
                    Person
                  </th>
                  <th className="p-3 text-center border">Resturlaub</th>
                  <th className="p-3 text-center border">Urlaub</th>
                  <th className="p-3 text-center border">Gesamt</th>
                  <th className="p-3 text-center border">Verplant</th>
                  <th className="p-3 text-center border">Verbleibend</th>
                  <th className="p-3 text-center border">Durchführung</th>
                  <th className="p-3 text-center border">Fortbildung</th>
                  <th className="p-3 text-center border">Teamtage</th>
                  {/* <th className="p-3 text-center border">Feiertage</th> */}
                  <th className="p-3 text-center border">Details</th>
                </tr>
              </thead>
              <tbody>
                {personen.map((person) => {
                  const urlaubstageDiesesJahr = getPersonJahresUrlaub(person.id, currentYear);
                  const jahresDurchfuehrung = getPersonJahresDurchfuehrung(person.id, currentYear);
                  const jahresFortbildung = getPersonJahresFortbildung(person.id, currentYear);
                  const jahresTeamtage = getPersonJahresInterneTeamtage(person.id, currentYear);
                  // const jahresFeiertage = getPersonJahresFeiertage(person.id, currentYear);
                  const personResturlaub = getPersonResturlaub(person.id); // Resturlaub is year-agnostic for now in getPersonResturlaub
                  const urlaubsanspruchAktuell = getCurrentYearUrlaubsanspruch(person.id, currentYear); // Pass person.id
                  const gesamtVerfuegbarerUrlaub = urlaubsanspruchAktuell + personResturlaub;
                  const verbleibenderUrlaub = gesamtVerfuegbarerUrlaub - urlaubstageDiesesJahr;
                  
                  // Check if person is part-time for the current year
                  const personEmpRecord = employmentData[person.id];
                  const isPartTime = personEmpRecord && personEmpRecord.type === 'part-time';

                  return (
                    <tr key={person.id}>
                      <td className="sticky left-0 z-10 p-3 bg-white border">
                        {person.name}
                        {isPartTime && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-sky-700 bg-sky-100 rounded-full">TZ</span>
                        )}
                      </td>
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
                      {/* <td className="p-3 text-center border">{jahresFeiertage}</td> */}
                      <td className="p-3 text-center border">
                        <button
                          onClick={() => {
                            setAusgewaehltePersonId(person.id);
                            setAnsichtModus('jahresdetail');
                            navigate(`/monthly-detail/${person.id}`);
                          }}
                          className="px-4 py-1 text-white bg-primary rounded hover:bg-accent hover:text-primary"
                        >
                          <GanttChartIcon size={16} />
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