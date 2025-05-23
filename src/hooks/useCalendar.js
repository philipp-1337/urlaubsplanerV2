import { useContext } from 'react';
import CalendarContext from '../context/CalendarContext';
import { useFirestore } from './useFirestore';
import { getMonatsName as getMonatsNameUtil, getWochentagName as getWochentagNameUtil, getTageImMonat as getDaysInMonthUtil } from '../services/dateUtils';

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  const {
    personen,
    currentMonth,
    currentYear,
    setCurrentMonth,
    setCurrentYear,
    ansichtModus,
    setAnsichtModus,
    handleMonatWechsel, // Destructure from context
    ausgewaehltePersonId,
    setAusgewaehltePersonId,
    tagDaten,
    globalTagDaten: contextGlobalTagDaten, // Get global tag data from context, alias to avoid conflict
    yearConfigurations, // Get from context
    employmentData, // Get employmentData from context
    resturlaub,
    loginError
  } = context;
  
  const { isLoadingData, setTagStatus } = useFirestore();
  
  // Use utils for date names and days in month, but keep them as part of the hook's API
  const getMonatsName = (monat) => {
    return getMonatsNameUtil(monat);
  };
  
  const getWochentagName = (wochentag) => {
    return getWochentagNameUtil(wochentag);
  };
  
  const getTageImMonat = (monat = currentMonth, jahr = currentYear) => {
    // Ensure default values are handled if the util doesn't assume them
    // The getDaysInMonthUtil from dateUtils.js takes (monat, jahr)
    return getDaysInMonthUtil(monat, jahr);
  };

  // Ensure globalTagDaten is always an object to prevent errors when accessing its properties
  const globalTagDaten = contextGlobalTagDaten || {};
  
  // Prüft den Status eines bestimmten Tages für eine Person
  const getTagStatus = (personId, tag, monat = currentMonth, jahr = currentYear) => {
    // 1. Prüfe personenspezifischen Eintrag
    const personSpecificKey = `${personId}-${jahr}-${monat}-${tag}`;
    if (tagDaten[personSpecificKey] !== undefined) { // Auch 'null' als expliziter Status ist gültig
      return tagDaten[personSpecificKey];
    }
    // 2. Wenn kein personenspezifischer Eintrag, prüfe globalen Eintrag für diesen Tag
    const globalKey = `${jahr}-${monat}-${tag}`;
    if (globalTagDaten[globalKey] !== undefined) {
      return globalTagDaten[globalKey];
    }
    return null; // Kein spezifischer oder globaler Status gefunden
  };
  
  // Berechnet Anzahl der Urlaubstage pro Person im angegebenen Monat
  const getPersonGesamtUrlaub = (personIdInput, monat = currentMonth, jahr = currentYear) => {
    let count = 0;
    const tage = getTageImMonat(monat, jahr);
    
    tage.forEach(tag => {
      if (getTagStatus(personIdInput, tag.tag, monat, jahr) === 'urlaub') {
        count++;
      }
    });
    
    return count;
  };
  
  // Berechnet Anzahl der Durchführungstage pro Person im angegebenen Monat
  const getPersonGesamtDurchfuehrung = (personIdInput, monat = currentMonth, jahr = currentYear) => {
    let count = 0;
    const tage = getTageImMonat(monat, jahr);
    
    tage.forEach(tag => {
      if (getTagStatus(personIdInput, tag.tag, monat, jahr) === 'durchfuehrung') {
        count++;
      }
    });
    
    return count;
  };
  
  // Berechnet Anzahl der Fortbildungstage pro Person im angegebenen Monat
  const getPersonGesamtFortbildung = (personIdInput, monat = currentMonth, jahr = currentYear) => {
    let count = 0;
    const tage = getTageImMonat(monat, jahr);
    tage.forEach(tag => {
      if (getTagStatus(personIdInput, tag.tag, monat, jahr) === 'fortbildung') {
        count++;
      }
    });
    return count;
  };

  // Berechnet Anzahl der Internen Teamtage pro Person im angegebenen Monat
  const getPersonGesamtInterneTeamtage = (personIdInput, monat = currentMonth, jahr = currentYear) => {
    let count = 0;
    const tage = getTageImMonat(monat, jahr);
    tage.forEach(tag => {
      if (getTagStatus(personIdInput, tag.tag, monat, jahr) === 'interne teamtage') {
        count++;
      }
    });
    return count;
  };

  // Feiertage werden hier als personenspezifischer Status behandelt,
  // ähnlich wie Urlaub. Wenn sie global wären, bräuchte es einen anderen Ansatz.
  const getPersonGesamtFeiertage = (personIdInput, monat = currentMonth, jahr = currentYear) => {
    let count = 0;
    const tage = getTageImMonat(monat, jahr);
    tage.forEach(tag => {
      if (getTagStatus(personIdInput, tag.tag, monat, jahr) === 'feiertag') {
        count++;
      }
    });
    return count;
  };

  // Berechnet die Gesamtzahl aller Urlaubstage im angegebenen Monat
  const getGesamtUrlaub = (monat = currentMonth, jahr = currentYear) => {
    let summe = 0;
    personen.forEach(person => {
      summe += getPersonGesamtUrlaub(person.id, monat, jahr);
    });
    return summe;
  };
  
  // Berechnet die Gesamtzahl aller Durchführungstage im angegebenen Monat
  const getGesamtDurchfuehrung = (monat = currentMonth, jahr = currentYear) => {
    let summe = 0;
    personen.forEach(person => {
      summe += getPersonGesamtDurchfuehrung(person.id, monat, jahr);
    });
    return summe;
  };
  
  // Berechnet die Gesamtzahl aller Fortbildungstage im angegebenen Monat
  const getGesamtFortbildung = (monat = currentMonth, jahr = currentYear) => {
    let summe = 0;
    personen.forEach(person => {
      summe += getPersonGesamtFortbildung(person.id, monat, jahr);
    });
    return summe;
  };

  // Berechnet die Gesamtzahl aller Internen Teamtage im angegebenen Monat
  const getGesamtInterneTeamtage = (monat = currentMonth, jahr = currentYear) => {
    let summe = 0;
    personen.forEach(person => {
      summe += getPersonGesamtInterneTeamtage(person.id, monat, jahr);
    });
    return summe;
  };

  const getGesamtFeiertage = (monat = currentMonth, jahr = currentYear) => {
    let summe = 0;
    personen.forEach(person => {
      summe += getPersonGesamtFeiertage(person.id, monat, jahr);
    });
    return summe;
  };

  // Berechnet Urlaubstage pro Person im gesamten Jahr
  const getPersonJahresUrlaub = (personIdInput, jahr = currentYear) => {
    let summe = 0;
    for (let monat = 0; monat < 12; monat++) {
      summe += getPersonGesamtUrlaub(personIdInput, monat, jahr);
    }
    return summe;
  };
  
  // Berechnet Durchführungstage pro Person im gesamten Jahr
  const getPersonJahresDurchfuehrung = (personIdInput, jahr = currentYear) => {
    let summe = 0;
    for (let monat = 0; monat < 12; monat++) {
      summe += getPersonGesamtDurchfuehrung(personIdInput, monat, jahr);
    }
    return summe;
  };
  
  // Berechnet Fortbildungstage pro Person im gesamten Jahr
  const getPersonJahresFortbildung = (personIdInput, jahr = currentYear) => {
    let summe = 0;
    for (let monat = 0; monat < 12; monat++) {
      summe += getPersonGesamtFortbildung(personIdInput, monat, jahr);
    }
    return summe;
  };

  // Berechnet Interne Teamtage pro Person im gesamten Jahr
  const getPersonJahresInterneTeamtage = (personIdInput, jahr = currentYear) => {
    let summe = 0;
    for (let monat = 0; monat < 12; monat++) {
      summe += getPersonGesamtInterneTeamtage(personIdInput, monat, jahr);
    }
    return summe;
  };

  const getPersonJahresFeiertage = (personIdInput, jahr = currentYear) => {
    let summe = 0;
    for (let monat = 0; monat < 12; monat++) {
      summe += getPersonGesamtFeiertage(personIdInput, monat, jahr);
    }
    return summe;
  };

  // Holt den Resturlaub für eine Person
  const getPersonResturlaub = (personIdInput) => {
    return resturlaub[String(personIdInput)] || 0;
  };
  
  // Berechnet die Gesamtzahl der Urlaubs- und Durchführungstage für einen bestimmten Tag im Monat
  const getTagesGesamtStatus = (tagNumber, monat = currentMonth, jahr = currentYear) => {
    let urlaubCount = 0;
    let durchfuehrungCount = 0;
    let fortbildungCount = 0;
    let interneTeamtageCount = 0;
    let feiertagCount = 0;
    personen.forEach(person => {
      const status = getTagStatus(person.id, tagNumber, monat, jahr);
      if (status === 'urlaub') urlaubCount++;
      if (status === 'durchfuehrung') durchfuehrungCount++;
      if (status === 'fortbildung') fortbildungCount++;
      if (status === 'interne teamtage') interneTeamtageCount++;
      if (status === 'feiertag') feiertagCount++;
    });
    return { urlaubCount, durchfuehrungCount, fortbildungCount, interneTeamtageCount, feiertagCount };
  };
  
  // Get Urlaubsanspruch for the current (or specified) year from configurations
  // Updated to accept personId to calculate part-time adjustments
  const getCurrentYearUrlaubsanspruch = (personId, jahr = currentYear) => {
    const config = yearConfigurations.find(yc => yc.year === jahr);
    // Define a default entitlement if no specific config is found for the year.
    const DEFAULT_URLAUBSANSPRUCH = 30; // Standard-Urlaubsanspruch

    const baseUrlaubsanspruch = config ? config.urlaubsanspruch : DEFAULT_URLAUBSANSPRUCH; // Verwende Default, wenn keine Konfig

    if (!personId) {
      return baseUrlaubsanspruch;
    }

    const personEmpRecord = employmentData[personId]; // employmentData from context is for the 'jahr'

    if (personEmpRecord &&
        personEmpRecord.type === 'part-time' &&
        typeof personEmpRecord.daysPerWeek === 'number' &&
        personEmpRecord.daysPerWeek >= 1 &&
        personEmpRecord.daysPerWeek <= 5) {
      
      const adjustedUrlaubsanspruch = (personEmpRecord.daysPerWeek / 5) * baseUrlaubsanspruch;
      return Math.round(adjustedUrlaubsanspruch); // Round to the nearest whole number
    } else {
      // Full-time, or part-time with missing/invalid daysPerWeek (should be caught by settings save)
      return baseUrlaubsanspruch;
    }
  };

  // Get a sorted list of configured year numbers
  const getConfiguredYears = () => {
    return yearConfigurations.map(yc => yc.year).sort((a, b) => a - b);
  };

  // TODO: Consider how to handle default Urlaubsanspruch if a year is not configured.
  // For now, getCurrentYearUrlaubsanspruch returns 0.

  // handleMonatWechsel is now taken from context

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
      
      setTagStatus(String(personId), tagObject.tag, neuerStatus);
    }
  };

  return {
    personen,
    currentMonth,
    currentYear,
    setCurrentMonth,
    setCurrentYear,
    ansichtModus,
    setAnsichtModus,
    ausgewaehltePersonId,
    setAusgewaehltePersonId,
    isLoadingData,
    loginError,
    getMonatsName,
    getWochentagName,
    getTageImMonat,
    getTagStatus,
    setTagStatus,
    getPersonGesamtUrlaub,
    getPersonGesamtDurchfuehrung,
    getPersonGesamtFortbildung,
    getPersonGesamtInterneTeamtage,
    getPersonGesamtFeiertage,
    getGesamtUrlaub,
    getGesamtDurchfuehrung,
    getGesamtFortbildung,
    getGesamtInterneTeamtage,
    getGesamtFeiertage,
    getPersonJahresUrlaub,
    getPersonJahresDurchfuehrung,
    getPersonJahresFortbildung,
    getPersonJahresInterneTeamtage,
    getPersonJahresFeiertage,
    getPersonResturlaub,
    getTagesGesamtStatus,
    handleMonatWechsel,
    handleDayCellClick,
    // New functions based on yearConfigurations
    getCurrentYearUrlaubsanspruch,
    getConfiguredYears,
    employmentData, // Make sure to return employmentData
    tagDaten, // tagDaten explizit zurückgeben
  };
};