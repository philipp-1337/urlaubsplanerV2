import { createContext, useState, useContext } from 'react';
import { getTageImMonat } from '../services/dateUtils';

// Statischer Urlaubsanspruch pro Jahr
export const URLAUBSANSPRUCH_PRO_JAHR = 30;

// Erstellen des Kontexts
const CalendarContext = createContext();

// Provider-Komponente für den Calendar-Kontext
export function CalendarProvider({ children }) {
  // Ansicht und Navigation 
  const [ansichtModus, setAnsichtModus] = useState('liste'); // 'liste', 'kalender', 'jahresuebersicht' oder 'jahresdetail'
  const [ausgewaehltePersonId, setAusgewaehltePersonId] = useState(null);
  
  // Aktuelles Datum und Navigation
  const [currentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  
  // Daten
  // const [isLoadingData, setIsLoadingData] = useState(false); // Wird von useFirestore gehandhabt
  const [loginError, setLoginError] = useState('');
  const [personen] = useState([
    { id: 1, name: 'Max Mustermann' },
    { id: 2, name: 'Anna Schmidt' },
    { id: 3, name: 'Erika Meyer' },
    { id: 4, name: 'Thomas Müller' },
    { id: 5, name: 'Lisa Weber' },
    { id: 6, name: 'Michael Becker' },
  ]);
  
  // Resturlaub vom Vorjahr
  const [resturlaub, setResturlaub] = useState({});

  // Urlaubs- und Durchführungsdaten
  // Format: { 'personId-jahr-monat-tag': 'urlaub'|'durchfuehrung'|null }
  const [tagDaten, setTagDaten] = useState({});

  // Monat wechseln
  const handleMonatWechsel = (richtung) => {
    let neuerMonat = currentMonth;
    let neuesJahr = currentYear;
    
    if (richtung === 'vor') {
      if (currentMonth === 11) {
        neuerMonat = 0;
        neuesJahr = currentYear + 1;
      } else {
        neuerMonat = currentMonth + 1;
      }
    } else if (richtung === 'zurueck') {
      if (currentMonth === 0) {
        neuerMonat = 11;
        neuesJahr = currentYear - 1;
      } else {
        neuerMonat = currentMonth - 1;
      }
    } else if (richtung === 'aktuell') {
      const aktuellesDatum = new Date();
      neuerMonat = aktuellesDatum.getMonth();
      neuesJahr = aktuellesDatum.getFullYear();
    }
    
    setCurrentMonth(neuerMonat);
    setCurrentYear(neuesJahr);
  };

  // Prüft den Status eines bestimmten Tages für eine Person
  const getTagStatus = (personId, tag, monat = currentMonth, jahr = currentYear) => {
    const key = `${personId}-${jahr}-${monat}-${tag}`;
    return tagDaten[key] || null;
  };

  // Berechnet Anzahl der Urlaubstage pro Person im Monat
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

  // Berechnet Anzahl der Durchführungstage pro Person im Monat
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

  // Berechnet Gesamtzahl aller Urlaubstage im aktuellen Monat
  const getGesamtUrlaub = (monat = currentMonth, jahr = currentYear) => {
    let summe = 0;
    personen.forEach(person => {
      summe += getPersonGesamtUrlaub(person.id, monat, jahr);
    });
    return summe;
  };

  // Berechnet Gesamtzahl aller Durchführungstage im aktuellen Monat
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

  // Context value to be provided
  const value = {
    ansichtModus,
    setAnsichtModus,
    ausgewaehltePersonId,
    setAusgewaehltePersonId,
    currentMonth,
    currentYear,
    handleMonatWechsel,
    personen,
    // isLoadingData, // Wird von useFirestore gehandhabt
    loginError,
    setLoginError,
    tagDaten,
    setTagDaten,
    resturlaub,
    setResturlaub, // Hier hinzufügen!
    getTagStatus,
    getPersonGesamtUrlaub,
    getPersonGesamtDurchfuehrung,
    getGesamtUrlaub,
    getGesamtDurchfuehrung,
    getPersonJahresUrlaub,
    getPersonJahresDurchfuehrung,
    getPersonResturlaub,
    getTagesGesamtStatus,
    URLAUBSANSPRUCH_PRO_JAHR
  };

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

// Custom Hook für den Zugriff auf den Calendar-Kontext
export function useCalendar() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}

export default CalendarContext;