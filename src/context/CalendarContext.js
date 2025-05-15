import { createContext, useState, useContext } from 'react';

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
  const [loginError, setLoginError] = useState(''); // Error messages, potentially from Firestore
  const [personen, setPersonen] = useState([]); // Wird dynamisch aus Firestore geladen
  
  // Resturlaub vom Vorjahr
  const [resturlaub, setResturlaub] = useState({});

  // Urlaubs- und Durchführungsdaten
  // This state is managed and updated by useFirestore, but held here.
  // Format: { 'personId-jahr-monat-tag': 'urlaub'|'durchfuehrung'|null }
  const [tagDaten, setTagDaten] = useState({});

  // Beschäftigungsdaten
  // Format: { personId: { type: 'full-time' | 'part-time', percentage: 100, id: 'personId' } }
  const [employmentData, setEmploymentData] = useState({});

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

  // Context value to be provided
  const value = {
    ansichtModus,
    setAnsichtModus,
    ausgewaehltePersonId,
    setAusgewaehltePersonId,
    // State setters for month/year are provided here
    currentMonth,
    currentYear,
    setCurrentMonth,
    setCurrentYear,
    handleMonatWechsel,
    personen,
    setPersonen, // Setter für Personen bereitstellen
    // isLoadingData, // Wird von useFirestore gehandhabt
    loginError,
    setLoginError,
    tagDaten,
    setTagDaten,
    resturlaub,
    setResturlaub,
    employmentData, // Beschäftigungsdaten bereitstellen
    setEmploymentData, // Setter für Beschäftigungsdaten
    // Helper functions that depend on state will be in the hook
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