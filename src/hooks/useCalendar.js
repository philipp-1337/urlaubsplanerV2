import { useContext } from 'react';
import CalendarContext from '../context/CalendarContext';
import { useFirestore } from './useFirestore';
import { getMonatsName as getMonatsNameUtil, getWochentagName as getWochentagNameUtil, getTageImMonat as getDaysInMonthUtil } from '../services/dateUtils';

export const useCalendar = () => {
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
    resturlaub,
    loginError
  } = useContext(CalendarContext);
  
  const { isLoadingData, setTagStatus } = useFirestore();
  
  // Konstanten
  const URLAUBSANSPRUCH_PRO_JAHR = 30;
  
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
  
  // Prüft den Status eines bestimmten Tages für eine Person
  const getTagStatus = (personId, tag, monat = currentMonth, jahr = currentYear) => {
    const key = `${personId}-${jahr}-${monat}-${tag}`;
    return tagDaten[key] || null;
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
  
  // Holt den Resturlaub für eine Person
  const getPersonResturlaub = (personIdInput) => {
    return resturlaub[String(personIdInput)] || 0;
  };
  
  // Berechnet die Gesamtzahl der Urlaubs- und Durchführungstage für einen bestimmten Tag im Monat
  const getTagesGesamtStatus = (tagNumber, monat = currentMonth, jahr = currentYear) => {
    let urlaubCount = 0;
    let durchfuehrungCount = 0;
    personen.forEach(person => {
      const status = getTagStatus(person.id, tagNumber, monat, jahr);
      if (status === 'urlaub') urlaubCount++;
      if (status === 'durchfuehrung') durchfuehrungCount++;
    });
    return { urlaubCount, durchfuehrungCount };
  };
  
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
      } // if currentStatus is 'durchfuehrung', neuerStatus remains null, deleting the entry.
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
    URLAUBSANSPRUCH_PRO_JAHR,
    getMonatsName,
    getWochentagName,
    getTageImMonat,
    getTagStatus,
    setTagStatus,
    getPersonGesamtUrlaub,
    getPersonGesamtDurchfuehrung,
    getGesamtUrlaub,
    getGesamtDurchfuehrung,
    getPersonJahresUrlaub,
    getPersonJahresDurchfuehrung,
    getPersonResturlaub,
    getTagesGesamtStatus,
    handleMonatWechsel,
    handleDayCellClick
  };
};