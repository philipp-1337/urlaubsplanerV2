import { createContext, useState, useContext } from 'react';

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

  // Globale Tageseinstellungen (z.B. Feiertage, Teamtage für alle)
  // Format: { 'jahr-monat-tag': 'status' }
  const [globalTagDaten, setGlobalTagDaten] = useState({});

  // Beschäftigungsdaten
  // Format: { personId: { type: 'full-time' | 'part-time', percentage: 100, id: 'personId' } }
  const [employmentData, setEmploymentData] = useState({});

  // Jahreskonfigurationen
  // Format: [{ id: 'docId', year: 2024, urlaubsanspruch: 30, userId: 'uid' }, ...]
  const [yearConfigurations, setYearConfigurations] = useState([]);

  // Monat wechseln
  const handleMonatWechsel = (richtung) => {
    let neuerMonat = currentMonth;
    let neuesJahr = currentYear;
    const configuredYears = yearConfigurations.map(yc => yc.year).sort((a, b) => a - b);
    
    if (richtung === 'vor') {
      if (currentMonth === 11) {
        const naechstesJahr = currentYear + 1;
        if (configuredYears.length === 0 || configuredYears.includes(naechstesJahr)) {
          neuerMonat = 0;
          neuesJahr = naechstesJahr;
        } else {
          // Optional: Feedback to user or simply do nothing
          console.warn(`Year ${naechstesJahr} is not configured. Staying in ${currentYear}.`);
          return; // Prevent change
        }
      } else {
        neuerMonat = currentMonth + 1;
      }
    } else if (richtung === 'zurueck') {
      if (currentMonth === 0) {
        const vorherigesJahr = currentYear - 1;
        if (configuredYears.length === 0 || configuredYears.includes(vorherigesJahr)) {
          neuerMonat = 11;
          neuesJahr = vorherigesJahr;
        } else {
          // Optional: Feedback to user or simply do nothing
          console.warn(`Year ${vorherigesJahr} is not configured. Staying in ${currentYear}.`);
          return; // Prevent change
        }
      } else {
        neuerMonat = currentMonth - 1;
      }
    } else if (richtung === 'aktuell') {
      const aktuellesDatum = new Date();
      // Ensure the actual current year is configured, or default to a configured one if not.
      // For simplicity, 'aktuell' will just set month/year. If that year isn't configured, other views might show "no data".
      // A more robust approach might be to jump to the closest configured year to new Date().getFullYear().
      // For now, this is fine as SettingsPage allows adding the current year.
      neuerMonat = aktuellesDatum.getMonth();
      neuesJahr = aktuellesDatum.getFullYear(); // This might be an unconfigured year.
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
    globalTagDaten,
    setGlobalTagDaten,
    resturlaub,
    setResturlaub,
    employmentData, // Beschäftigungsdaten bereitstellen
    setEmploymentData, // Setter für Beschäftigungsdaten
    yearConfigurations,
    setYearConfigurations,
    // Helper functions that depend on state will be in the useCalendar hook
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