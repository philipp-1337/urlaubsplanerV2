import { useNavigate } from 'react-router-dom';
import { useCalendar } from '../../hooks/useCalendar';
import { getMonatsName, getWochentagName } from '../../services/dateUtils';
import ErrorMessage from '../common/ErrorMessage';
import { ArrowLeftIcon, CalendarDaysIcon, SigmaIcon } from 'lucide-react';

const MonthlyView = () => {
  const navigate = useNavigate();
  const {
    loginError,
    currentMonth,
    currentYear,
    handleMonatWechsel,
    getTageImMonat,
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

  // Helper function for handling clicks on day cells
  const handleDayCellClick = (personId, tagObject) => {
    if (!tagObject.istWochenende) {
      const currentStatus = getTagStatus(String(personId), tagObject.tag);
      let neuerStatus = null;
      if (currentStatus === null) {
        neuerStatus = 'urlaub';
      } else if (currentStatus === 'urlaub') {
        neuerStatus = 'durchfuehrung';
      } else if (currentStatus === 'durchfuehrung') {
        neuerStatus = 'fortbildung';
      } else if (currentStatus === 'fortbildung') {
        neuerStatus = 'interne teamtage';
      } else if (currentStatus === 'interne teamtage') {
        neuerStatus = 'feiertag';
      } // if currentStatus is 'feiertag', neuerStatus remains null, deleting the entry.
      setTagStatus(String(personId), tagObject.tag, neuerStatus, currentMonth, currentYear);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="container px-4 py-8 mx-auto">
        <ErrorMessage message={loginError} />
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => handleMonatWechsel("zurueck")}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
            </button>
            <h2 className="text-xl font-bold">
              {getMonatsName(currentMonth)} {currentYear}
            </h2>
            <button
              onClick={() => handleMonatWechsel("vor")}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1 transform rotate-180" />
            </button>
          </div>

          <div className="mb-6">
            <div className="flex flex-wrap mb-2 space-x-2">
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
            <p className="text-sm text-gray-600">
              Klicken Sie auf einen Tag (außer Wochenende) in der Tabelle, um
              zwischen den Status-Typen zu wechseln.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-light">
                  <th className="sticky left-0 z-10 p-2 text-left bg-white border min-w-[100px]">
                    Person
                  </th>
                  {getTageImMonat().map((tag) => (
                    <th
                      key={`header-${tag.tag}`}
                      className={`p-1 text-center border min-w-[50px] ${
                        tag.istWochenende ? "bg-gray-medium" : "bg-gray-light"
                      }`}
                    >
                      <div>{tag.tag}</div>
                      <div className="text-xs font-normal">
                        {getWochentagName(tag.wochentag)}
                      </div>
                    </th>
                  ))}
                  <th className="p-2 text-center border min-w-[100px]">
                    Gesamt Urlaub
                  </th>
                  <th className="p-2 text-center border min-w-[100px]">
                    Gesamt Durchf.
                  </th>
                  <th className="p-2 text-center border min-w-[100px]">
                    Gesamt Fortb.
                  </th>
                  <th className="p-2 text-center border min-w-[100px]">
                    Gesamt Teamt.
                  </th>
                  <th className="p-2 text-center border min-w-[100px]">
                    Gesamt Feiert.
                  </th>
                  <th className="p-2 text-center border min-w-[100px]">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody>
                {personen.map((person) => (
                  <tr key={person.id}>
                    <td className="sticky left-0 z-10 p-2 text-left bg-white border min-w-[100px]">
                      {person.name}
                    </td>
                    {getTageImMonat().map((tag) => {
                      const status = getTagStatus(String(person.id), tag.tag);
                      let cellClass = "p-2 text-center border min-w-[50px]";
                      let cellContent = "";

                      if (tag.istWochenende) {
                        cellClass += " bg-gray-light";
                      } else {
                        cellClass += " cursor-pointer";
                        if (status === "urlaub") {
                          cellClass += " bg-bold-blue text-white hover:bg-pastel-blue hover:text-bold-blue";
                          cellContent = "U";
                        } else if (status === "durchfuehrung") {
                          cellClass += " bg-bold-mint text-white hover:bg-pastel-mint hover:text-bold-mint";
                          cellContent = "D";
                        } else if (status === "fortbildung") {
                          cellClass += " bg-bold-apricot text-white hover:bg-pastel-apricot hover:text-bold-lavender";
                          cellContent = "F";
                        } else if (status === "interne teamtage") {
                          cellClass += " bg-bold-lavender text-white hover:bg-pastel-lavender hover:text-bold-apricot";
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
                        </td>
                      );
                    })}
                    <td className="p-2 text-center border min-w-[100px]">
                      {getPersonGesamtUrlaub(String(person.id))}
                    </td>
                    <td className="p-2 text-center border min-w-[100px]">
                      {getPersonGesamtDurchfuehrung(String(person.id))}
                    </td>
                    <td className="p-2 text-center border min-w-[100px]">
                      {getPersonGesamtFortbildung(String(person.id))}
                    </td>
                    <td className="p-2 text-center border min-w-[100px]">
                      {getPersonGesamtInterneTeamtage(String(person.id))}
                    </td>
                    <td className="p-2 text-center border min-w-[100px]">
                      {getPersonGesamtFeiertage(String(person.id))}
                    </td>
                    <td className="p-2 text-center border min-w-[100px]">
                      <button
                        onClick={() => {
                          setAusgewaehltePersonId(person.id);
                          setAnsichtModus("kalender");
                          navigate(`/calendar/${person.id}`);
                        }}
                        className="px-3 py-1 text-sm text-white bg-bold-blue rounded hover:bg-pastel-blue hover:text-bold-blue"
                      >
                        <CalendarDaysIcon size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-light font-bold">
                  <td className="sticky left-0 z-10 p-2 bg-white border">
                    <SigmaIcon size={20} />
                  </td>
                  {getTageImMonat().map((tag) => {
                    const dailyTotals = getTagesGesamtStatus(tag.tag);
                    return (
                      <td
                        key={`footer-total-${tag.tag}`}
                        className={`p-1 text-xs text-center border min-w-[50px] ${
                          tag.istWochenende ? "bg-gray-medium" : "bg-gray-light"
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
                          <div className="text-bold-lavender">
                            F:{dailyTotals.fortbildungCount}
                          </div>
                        )}
                        {dailyTotals.interneTeamtageCount > 0 && (
                          <div className="text-bold-apricot">
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
                  <td className="p-2 text-center border">
                    {getGesamtUrlaub()}
                  </td>
                  <td className="p-2 text-center border">
                    {getGesamtDurchfuehrung()}
                  </td>
                  <td className="p-2 text-center border">
                    {getGesamtFortbildung()}
                  </td>
                  <td className="p-2 text-center border">
                    {getGesamtInterneTeamtage()}
                  </td>
                  <td className="p-2 text-center border">
                    {getGesamtFeiertage()}
                  </td>
                  <td className="p-2 border"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MonthlyView;