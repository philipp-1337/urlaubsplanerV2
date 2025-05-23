import { useNavigate } from 'react-router-dom';
import { useCalendar } from '../../hooks/useCalendar';
import { getMonatsName, getWochentagName } from '../../services/dateUtils';
import ErrorMessage from '../common/ErrorMessage';
import { 
  ArrowLeftIcon, 
  CornerDownRightIcon, 
  SigmaIcon, 
  DownloadIcon,
  SheetIcon
 } from 'lucide-react';
import { exportToCsv } from '../../services/exportUtils';
import { useState, useRef, useEffect } from 'react';
import InfoOverlayButton from '../common/InfoOverlayButton';
import KebabMenu from '../common/KebabMenu';
import { triggerHorizontalScrollHint } from '../../services/scrollUtils';
import ToggleSwitch from '../common/ToggleSwitch';
import { isScrollHintEnabled, setScrollHintEnabled } from '../../services/scrollEffectToggle';

const MonthlyView = () => {
  const navigate = useNavigate();
  const {
    loginError,
    currentMonth,
    currentYear,
    tagDaten, // Destructure tagDaten for checking person-specific entries
    handleMonatWechsel,
    getTageImMonat, // Keep getTageImMonat
    personen,
    getTagStatus,
    setTagStatus,
    getPersonGesamtUrlaub,
    getPersonGesamtDurchfuehrung,
    getPersonGesamtFortbildung,
    getPersonGesamtInterneTeamtage,
    getPersonGesamtFeiertage,
    getTagesGesamtStatus,
    getGesamtUrlaub,
    getGesamtDurchfuehrung,
    getGesamtFortbildung,
    getGesamtInterneTeamtage,
    getGesamtFeiertage,
    setAusgewaehltePersonId,
    setAnsichtModus
  } = useCalendar();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollHintEnabled, setScrollHintEnabledState] = useState(isScrollHintEnabled());
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

  // Simulate horizontal scroll to hint scrollability on small screens
  useEffect(() => {
    if (scrollHintEnabled) {
      triggerHorizontalScrollHint({
        selector: '#monthly-table-scroll',
        breakpoint: 9999,
        scrollDistance: 90,
        duration: 500,
        returnDuration: 400
      });
    }
  }, [scrollHintEnabled]);

  // Helper function for handling clicks on day cells
  // This function determines the *next* status based on the *currently displayed* status
  const handleDayCellClick = (personId, tagObject) => {
    const personIdStr = String(personId);
    if (!tagObject.istWochenende) {
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

  const statusToLetter = (status) => {
    if (status === "urlaub") return "U";
    if (status === "durchfuehrung") return "D";
    if (status === "fortbildung") return "F";
    if (status === "interne teamtage") return "T";
    if (status === "feiertag") return "X";
    return "";
  };

  const handleExportCsv = () => {
    const tageDesMonats = getTageImMonat();
    const headers = [
      "Person",
      ...tageDesMonats.map(tag => {
        const day = String(tag.tag).padStart(2, '0');
        const month = String(currentMonth + 1).padStart(2, '0'); // currentMonth is 0-indexed
        return `${day}.${month}.${currentYear}`;
      }),
      "Gesamt Urlaub",
      "Gesamt Durchführung",
      "Gesamt Fortbildung",
      "Gesamt Teamtage",
      "Gesamt Feiertage"
    ];

    const dataRows = personen.map(person => {
      const dailyStatuses = tageDesMonats.map(tag => {
        const status = getTagStatus(String(person.id), tag.tag);
        return statusToLetter(status);
      });
      return [
        person.name,
        ...dailyStatuses,
        getPersonGesamtUrlaub(String(person.id)),
        getPersonGesamtDurchfuehrung(String(person.id)),
        getPersonGesamtFortbildung(String(person.id)),
        getPersonGesamtInterneTeamtage(String(person.id)),
        getPersonGesamtFeiertage(String(person.id))
      ];
    });

    // Add overall total row (footer)
    const dailyPlaceholders = tageDesMonats.map(() => ""); // Empty cells for daily totals in CSV
    dataRows.push([
      "Gesamt",
      ...dailyPlaceholders,
      getGesamtUrlaub(),
      getGesamtDurchfuehrung(),
      getGesamtFortbildung(),
      getGesamtInterneTeamtage(),
      getGesamtFeiertage()
    ]);

    exportToCsv(`Monatsansicht_${getMonatsName(currentMonth)}_${currentYear}.csv`, headers, dataRows);
  };

  return (
    <div className=""> {/* Removed min-h-screen bg-gray-100, parent main tag in App.js handles this */}
      <main className="container px-4 py-8 mx-auto">
        <ErrorMessage message={loginError} />
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="relative mb-6 flex flex-row items-center justify-between">
            <div className="flex items-center">
              <InfoOverlayButton
                text={"In dieser Monatsübersicht sehen Sie für jede Person den Status jedes Tages: Urlaub (U), Durchführung (D), Fortbildung (F), Teamtag (T) oder Feiertag. Klicken Sie auf einen Tag, um den Status für die jeweilige Person zu ändern. Globale Einträge sind mit einem Punkt markiert und können überschrieben, aber nicht gelöscht werden. Die Summenspalten zeigen die Gesamtanzahl der jeweiligen Status pro Person im Monat."}
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
                {getMonatsName(currentMonth)} {currentYear}
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
                items={[{
                  label: 'CSV Export',
                  icon: <DownloadIcon size={16} className="ml-2" />, // importiert oben
                  onClick: handleExportCsv
                },
                {
                  label: 'Scroll-Effekt',
                  icon: <ToggleSwitch checked={scrollHintEnabled} onChange={() => {
                    setScrollHintEnabledState((prev) => {
                      setScrollHintEnabled(!prev);
                      return !prev;
                    });
                  }} label="" id="scroll-toggle" />,
                  keepOpenOnClick: true, // Menü bleibt offen
                  onClick: () => {
                    setScrollHintEnabledState((prev) => {
                      setScrollHintEnabled(!prev);
                      return !prev;
                    });
                  }
                }
                ]}
              />
            </div>
          </div>

          <div className="mb-6">
            <div className="flex flex-wrap mb-2 gap-2 items-center">
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
            </div>
          </div>

          <div className="overflow-x-auto" id="monthly-table-scroll">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-100">
                  <th className="sticky left-0 z-10 p-2 text-left bg-gray-100 border-l border-t border-r min-w-[100px]">
                    Person
                  </th>
                  {getTageImMonat().map((tag) => (
                    <th
                      key={`header-${tag.tag}`}
                      className={`p-1 text-center border-t border-r min-w-[50px] ${
                        tag.istWochenende ? "bg-gray-medium" : "bg-gray-100" // Consistent background for header
                      }`}
                    >
                      <div>{tag.tag}</div>
                      <div className="text-xs font-normal">
                        {getWochentagName(tag.wochentag)}
                      </div>
                    </th>
                  ))}
                  <th className="p-2 text-center border-t border-r min-w-[100px]">
                    Gesamt Urlaub
                  </th>
                  <th className="p-2 text-center border-t border-r min-w-[100px]">
                    Gesamt Durchf.
                  </th>
                  <th className="p-2 text-center border-t border-r min-w-[100px]">
                    Gesamt Fortb.
                  </th>
                  <th className="p-2 text-center border-t border-r min-w-[100px]">
                    Gesamt Teamt.
                  </th>
                  <th className="p-2 text-center border-t border-r min-w-[100px]">
                    Gesamt Feiert.
                  </th>
                  <th className="p-2 text-center border-t border-r min-w-[100px]">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody>
                {personen.map((person) => (
                  <tr key={person.id}>
                    <td className="sticky left-0 z-10 p-2 text-left bg-white border-l border-t border-r min-w-[100px]">
                      {person.name}
                    </td>
                    {getTageImMonat().map((tag) => {
                      const status = getTagStatus(String(person.id), tag.tag);
                      // Add relative positioning for the marker
                      let cellClass = "relative p-2 text-center border-t border-r min-w-[50px]";
                      let cellContent = "";

                      const personIdStr = String(person.id);
                      const personSpecificKey = `${personIdStr}-${currentYear}-${currentMonth}-${tag.tag}`;
                      const hasPersonSpecificEntry = tagDaten.hasOwnProperty(personSpecificKey);
                      const isGlobal = status !== null && !hasPersonSpecificEntry;

                      if (tag.istWochenende) {
                        cellClass += " bg-gray-medium";
                      } else {
                        cellClass += " cursor-pointer";
                        if (status === "urlaub") {
                          cellClass += " bg-bold-blue text-white hover:bg-pastel-blue hover:text-bold-blue";
                          cellContent = "U";
                        } else if (status === "durchfuehrung") {
                          cellClass += " bg-bold-mint text-white hover:bg-pastel-mint hover:text-bold-mint";
                          cellContent = "D";
                        } else if (status === "fortbildung") {
                          cellClass += " bg-bold-apricot text-white hover:bg-pastel-apricot hover:text-bold-apricot";
                          cellContent = "F";
                        } else if (status === "interne teamtage") {
                          cellClass += " bg-bold-lavender text-white hover:bg-pastel-lavender hover:text-bold-lavender";
                          cellContent = "T";
                        } else if (status === "feiertag") {
                          cellClass += " bg-gray-dark text-white hover:bg-gray-medium hover:text-gray-dark";
                          // cellContent = "X";
                        } else {
                          cellClass += " hover:bg-gray-light";
                        }
                      }
                      return (
                        <td
                          key={`${person.id}-${tag.tag}`}
                          className={cellClass}
                          onClick={() => handleDayCellClick(person.id, tag)}
                        >
                          {cellContent}
                          {isGlobal && (
                            <span
                              title="Globaler Status"
                              className="absolute bottom-1 left-1 w-2 h-2 bg-gray-medium hover:bg-gray-dark rounded-full"
                            ></span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center border-t border-r min-w-[100px]">
                      {getPersonGesamtUrlaub(String(person.id))}
                    </td>
                    <td className="p-2 text-center border-t border-r min-w-[100px]">
                      {getPersonGesamtDurchfuehrung(String(person.id))}
                    </td>
                    <td className="p-2 text-center border-t border-r min-w-[100px]">
                      {getPersonGesamtFortbildung(String(person.id))}
                    </td>
                    <td className="p-2 text-center border-t border-r min-w-[100px]">
                      {getPersonGesamtInterneTeamtage(String(person.id))}
                    </td>
                    <td className="p-2 text-center border-t border-r min-w-[100px]">
                      {getPersonGesamtFeiertage(String(person.id))}
                    </td>
                    <td className="p-2 text-center border-t border-r min-w-[100px]">
                      <button
                        onClick={() => {
                          setAusgewaehltePersonId(person.id);
                          setAnsichtModus("kalender");
                          navigate(`/calendar/${person.id}`);
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
                <tr className="font-bold">
                  <td className="sticky left-0 z-10 p-2 bg-gray-100 border">
                    <SigmaIcon size={20} />
                  </td>
                  {getTageImMonat().map((tag) => {
                    const dailyTotals = getTagesGesamtStatus(tag.tag);
                    return (
                      <td
                        key={`footer-total-${tag.tag}`}
                        className={`p-1 text-xs text-center border-t border-r border-b min-w-[50px] ${
                          tag.istWochenende ? "bg-gray-medium" : "bg-white"
                        }`}
                      >
                        {dailyTotals.urlaubCount > 0 && (
                          <div className="text-bold-blue">
                            U:{dailyTotals.urlaubCount}
                          </div>
                        )}
                        {dailyTotals.durchfuehrungCount > 0 && (
                          <div className="text-bold-mint">
                            D:{dailyTotals.durchfuehrungCount}
                          </div>
                        )}
                        {dailyTotals.fortbildungCount > 0 && (
                          <div className="text-bold-apricot">
                            F:{dailyTotals.fortbildungCount}
                          </div>
                        )}
                        {dailyTotals.interneTeamtageCount > 0 && (
                          <div className="text-bold-lavender">
                            T:{dailyTotals.interneTeamtageCount}
                          </div>
                        )}
                        {/* {dailyTotals.feiertagCount > 0 && (
                          <div className="text-primary">
                            X:{dailyTotals.feiertagCount}
                          </div>
                        )} */}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center border-t border-r border-b">
                    {getGesamtUrlaub()}
                  </td>
                  <td className="p-2 text-center border-t border-r border-b">
                    {getGesamtDurchfuehrung()}
                  </td>
                  <td className="p-2 text-center border-t border-r border-b">
                    {getGesamtFortbildung()}
                  </td>
                  <td className="p-2 text-center border-t border-r border-b">
                    {getGesamtInterneTeamtage()}
                  </td>
                  <td className="p-2 text-center border-t border-r border-b">
                    {getGesamtFeiertage()}
                  </td>
                  <td className="p-2 border-t border-r border-b"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          {/* Navigation Buttons */}
          <div className="mt-8 flex flex-row justify-between items-center gap-4">
            <button
              onClick={() => {
                navigate('/yearly-overview'); // Navigate to the route that renders MonthlyView.js
              }}
              className="p-2 rounded-full text-gray-700 rounded-md hover:bg-gray-100 transition-colors border border-gray-medium flex items-center gap-1"
            >
              <SheetIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MonthlyView;