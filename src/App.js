import { useState, useEffect } from 'react';
import { db } from './firebase'; // Import Firestore instance
import { collection, doc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';

// Hauptanwendung
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [ansichtModus, setAnsichtModus] = useState('liste'); // 'liste', 'kalender' oder 'jahresuebersicht'
  const [ausgewaehltePersonId, setAusgewaehltePersonId] = useState(null);
  
  const [isLoadingData, setIsLoadingData] = useState(false);
  // Mock Benutzer für die Anmeldung
  const validUser = { username: 'admin', password: '12345' };
  
  // Personen-Daten
  const [personen] = useState([
    { id: 1, name: 'Max Mustermann' },
    { id: 2, name: 'Anna Schmidt' },
    { id: 3, name: 'Erika Meyer' },
    { id: 4, name: 'Thomas Müller' },
    { id: 5, name: 'Lisa Weber' },
    { id: 6, name: 'Michael Becker' },
  ]);
  
  // Aktueller Monat und Jahr
  const [currentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  
  // Statischer Urlaubsanspruch pro Jahr
  const URLAUBSANSPRUCH_PRO_JAHR = 30;

  // Resturlaub vom Vorjahr
  const [resturlaub, setResturlaub] = useState({
    // Example: 1: 5 (personId: resturlaubstage) - will be loaded from Firestore
  });

  // Urlaubs- und Durchführungsdaten
  // Format: { 'personId-jahr-monat-tag': 'urlaub'|'durchfuehrung'|null }
  const [tagDaten, setTagDaten] = useState({});
  
  // Fetch data from Firestore
  useEffect(() => {
    if (!isLoggedIn) {
      setTagDaten({});
      setResturlaub({});
      return;
    }

    const fetchData = async () => {
      setIsLoadingData(true);
      setLoginError(''); // Clear previous errors
      try {
        // Fetch Resturlaub for the currentYear
        const resturlaubQuery = query(collection(db, 'resturlaubData'), 
                                  where('forYear', '==', currentYear));
        const resturlaubSnapshot = await getDocs(resturlaubQuery);
        const newResturlaub = {};
        personen.forEach(p => newResturlaub[String(p.id)] = 0); // Initialize with 0 for all persons
        resturlaubSnapshot.forEach((doc) => {
          const data = doc.data();
          newResturlaub[data.personId] = data.tage;
        });
        setResturlaub(newResturlaub);

        // Fetch TagDaten based on ansichtModus and current view context
        let dayStatusQuery;
        if (ansichtModus === 'liste' || (ansichtModus === 'kalender' && ausgewaehltePersonId)) {
          // For list view or specific person's calendar: fetch data for the currentMonth of currentYear
          dayStatusQuery = query(collection(db, 'dayStatusEntries'), 
                             where('year', '==', currentYear), 
                             where('month', '==', currentMonth));
        } else if (ansichtModus === 'jahresuebersicht' || (ansichtModus === 'jahresdetail' && ausgewaehltePersonId)) {
          // For yearly overview or specific person's year detail: fetch all data for the currentYear
          dayStatusQuery = query(collection(db, 'dayStatusEntries'), 
                             where('year', '==', currentYear));
        } else {
          // Fallback or initial state before any specific view is fully determined
          setTagDaten({});
          setIsLoadingData(false);
          return;
        }
        
        const dayStatusSnapshot = await getDocs(dayStatusQuery);
        const newTagDaten = {};
        dayStatusSnapshot.forEach((doc) => {
          const data = doc.data();
          const key = `${data.personId}-${data.year}-${data.month}-${data.day}`;
          newTagDaten[key] = data.status;
        });
        setTagDaten(newTagDaten);
      } catch (error) {
        console.error("Error fetching data from Firestore: ", error);
        setLoginError("Fehler beim Laden der Daten von Firestore.");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [isLoggedIn, currentMonth, currentYear, ansichtModus, ausgewaehltePersonId, personen]); // personen added for completeness

  // Generiert alle Tage für den aktuellen Monat
  const getTageImMonat = (monat = currentMonth, jahr = currentYear) => {
    // const ersterTag = new Date(jahr, monat, 1); // Not used
    const letzterTag = new Date(jahr, monat + 1, 0);
    
    const tage = [];
    for (let i = 1; i <= letzterTag.getDate(); i++) {
      const tag = new Date(jahr, monat, i);
      tage.push({
        datum: tag,
        tag: i,
        wochentag: tag.getDay(),
        istWochenende: tag.getDay() === 0 || tag.getDay() === 6, // 0 = Sonntag, 6 = Samstag
      });
    }
    return tage;
  };
  
  // Prüft den Status eines bestimmten Tages für eine Person
  const getTagStatus = (personId, tag, monat = currentMonth, jahr = currentYear) => {
    const key = `${personId}-${jahr}-${monat}-${tag}`;
    return tagDaten[key] || null;
  };
  
  // Ändert den Status eines bestimmten Tages für eine Person
  const setTagStatus = async (personId, tag, status, monat = currentMonth, jahr = currentYear) => {
    const personIdStr = String(personId);
    const docId = `${personIdStr}-${jahr}-${monat}-${tag}`;
    const entryRef = doc(db, 'dayStatusEntries', docId);

    const localKey = `${personIdStr}-${jahr}-${monat}-${tag}`;
    const currentLocalStatus = tagDaten[localKey] || null;

    // Optimistic update of local state
    const neueTagDatenState = { ...tagDaten };
    if (status === null) {
      delete neueTagDatenState[localKey];
    } else {
      neueTagDatenState[localKey] = status;
    }
    setTagDaten(neueTagDatenState);
    setLoginError(''); // Clear previous errors

    // Firestore update
    try {
      if (status === null) {
        await deleteDoc(entryRef);
      } else {
        await setDoc(entryRef, { 
          personId: personIdStr,
          year: jahr,
          month: monat,
          day: tag,
          status: status 
        });
      }
    } catch (error) {
      console.error("Error updating tag status in Firestore: ", error);
      // Rollback optimistic update
      const revertedTagDaten = { ...tagDaten };
      if (currentLocalStatus === null) {
        delete revertedTagDaten[localKey];
      } else {
        revertedTagDaten[localKey] = currentLocalStatus;
      }
      setTagDaten(revertedTagDaten);
      setLoginError(`Fehler beim Speichern: ${error.message}. Bitte erneut versuchen.`);
    }
  };
  
  // Berechnet Anzahl der Urlaubstage pro Person im aktuellen Monat
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
  
  // Berechnet Anzahl der Durchführungstage pro Person im aktuellen Monat
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
  
  // Berechnet die Gesamtzahl aller Urlaubstage im aktuellen Monat
  const getGesamtUrlaub = (monat = currentMonth, jahr = currentYear) => {
    let summe = 0;
    personen.forEach(person => {
      summe += getPersonGesamtUrlaub(person.id, monat, jahr);
    });
    return summe;
  };
  
  // Berechnet die Gesamtzahl aller Durchführungstage im aktuellen Monat
  const getGesamtDurchfuehrung = (monat = currentMonth, jahr = currentYear) => { // TODO: Check if this is used or can be removed if totals are from footer
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
  
  // Setzt den Resturlaub für eine Person
  // Kann für zukünftige Admin-Funktionen oder Datenimport nützlich sein
  // This function is not currently wired to any UI input for setting resturlaub directly.
  // It's kept for potential future use or if manual adjustment is needed via console/dev tools. 
  // const setPersonResturlaub = async (personIdInput, tage, forYearToSet = currentYear) => {
  //   const personIdStr = String(personIdInput);
  //   const parsedTage = parseInt(tage) || 0;
  //   const currentResturlaubStateForPerson = resturlaub[personIdStr] || 0;

  //   // Optimistic update
  //   setResturlaub(prev => ({ ...prev, [personIdStr]: parsedTage }));
  //   setLoginError(''); // Clear previous errors

  //   try {
  //     const docId = `${personIdStr}-${forYearToSet}`;
  //     const resturlaubDocRef = doc(db, 'resturlaubData', docId);
  //     await setDoc(resturlaubDocRef, {
  //       personId: personIdStr,
  //       forYear: forYearToSet,
  //       tage: parsedTage
  //     });
  //   } catch (error) {
  //     console.error("Error updating resturlaub in Firestore: ", error);
  //     // Rollback
  //     setResturlaub(prev => ({ ...prev, [personIdStr]: currentResturlaubStateForPerson }));
  //     setLoginError(`Fehler beim Speichern des Resturlaubs: ${error.message}.`);
  //   }
  // };
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


  // Login Handler
  const handleLogin = () => {
    if (username === validUser.username && password === validUser.password) {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Falscher Benutzername oder Passwort');
    }
  };
  
  // Submit mit Enter-Taste
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };
  
  // Logout Handler
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
  };
  
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
  
  // Monatsnamen berechnen
  const getMonatsName = (monat) => {
    const monate = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return monate[monat];
  };
  
  // Wochentagsnamen berechnen
  const getWochentagName = (wochentag) => {
    const wochentage = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return wochentage[wochentag];
  };
  
  // Header-Leiste für alle Ansichten
  const Header = () => (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="container flex items-center justify-between px-4 py-4 mx-auto">
        <h1 className="text-2xl font-bold">Urlaubsplaner</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              setAnsichtModus('liste');
              handleMonatWechsel('aktuell');
            }}
            className="px-4 py-2 text-blue-600 bg-white rounded-md hover:bg-gray-100"
          >
            Aktueller Monat
          </button>
          <button
            onClick={() => {
              setAnsichtModus('jahresuebersicht');
              setAusgewaehltePersonId(null);
            }}
            className="px-4 py-2 text-blue-600 bg-white rounded-md hover:bg-gray-100"
          >
            Jahresübersicht
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-blue-600 bg-white rounded-md hover:bg-gray-100"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>
  );
  
  // Login-Formular
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
          <h1 className="mb-6 text-2xl font-bold text-center text-blue-600">Urlaubsplaner Login</h1>
          
          {loginError && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {loginError}
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <label htmlFor="username" className="block mb-2 text-sm font-medium text-gray-700">
                Benutzername
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700">
                Passwort
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={handleLogin}
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Anmelden
            </button>
            
            <div className="mt-4 text-sm text-center text-gray-600">
              <p>Demo Zugangsdaten:</p>
              <p>Benutzername: admin</p>
              <p>Passwort: 12345</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Jahresübersicht
  if (ansichtModus === 'jahresuebersicht') {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        
        <main className="container px-4 py-8 mx-auto">
          {isLoadingData && <div className="p-4 text-center text-blue-600">Lade Jahresübersicht...</div>}
          {loginError && ( /* Display general errors here too */
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {loginError}
            </div>
          )}
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
  }
  
  // Jahresdetails für eine Person
  if (ansichtModus === 'jahresdetail' && ausgewaehltePersonId) {
    const ausgewaehltePerson = personen.find(p => p.id === ausgewaehltePersonId);
    
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        
        <main className="container px-4 py-8 mx-auto">
          {isLoadingData && <div className="p-4 text-center text-blue-600">Lade Monatsdetails...</div>}
          {loginError && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {loginError}
            </div>
          )}
          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setAnsichtModus('jahresuebersicht')}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                &larr; Zurück zur Jahresübersicht
              </button>
              
              <h2 className="text-xl font-bold">
                {ausgewaehltePerson.name} - Monatsdetails {currentYear}
              </h2>
              
              <div className="w-36"></div> {/* Spacer für gleichmäßiges Layout */}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-3 text-left border">Monat</th>
                    <th className="p-3 text-center border">Urlaubstage</th>
                    <th className="p-3 text-center border">Durchführungstage</th>
                    <th className="p-3 text-center border">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 12 }, (_, i) => i).map((monat) => (
                    <tr key={monat}>
                      <td className="p-3 border">{getMonatsName(monat)}</td>
                      <td className="p-3 text-center border">
                        {getPersonGesamtUrlaub(ausgewaehltePersonId, monat, currentYear)}
                      </td>
                      <td className="p-3 text-center border">
                        {getPersonGesamtDurchfuehrung(ausgewaehltePersonId, monat, currentYear)}
                      </td>
                      <td className="p-3 text-center border">
                        <button
                          onClick={() => {
                            setCurrentMonth(monat);
                            setAnsichtModus('kalender');
                          }}
                          className="px-4 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                        >
                          Bearbeiten
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td className="p-3 border">Gesamt</td>
                    <td className="p-3 text-center border">
                      {getPersonJahresUrlaub(ausgewaehltePersonId, currentYear)}
                    </td>
                    <td className="p-3 text-center border">
                      {getPersonJahresDurchfuehrung(ausgewaehltePersonId, currentYear)}
                    </td>
                    <td className="p-3 text-center border"></td>
                  </tr>
                  <tr className="bg-gray-200 font-bold">
                    <td className="p-3 border">Mit Resturlaub</td>
                    <td className="p-3 text-center border">
                      {getPersonJahresUrlaub(ausgewaehltePersonId, currentYear) + getPersonResturlaub(ausgewaehltePersonId)}
                    </td>
                    <td className="p-3 text-center border">-</td>
                    <td className="p-3 text-center border"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Kalender-Ansicht für eine einzelne Person
  if (ansichtModus === 'kalender' && ausgewaehltePersonId) {
    const ausgewaehltePerson = personen.find(p => p.id === ausgewaehltePersonId);
    const tageImMonat = getTageImMonat();
    
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        
        <main className="container px-4 py-8 mx-auto">
          {isLoadingData && <div className="p-4 text-center text-blue-600">Lade Kalender...</div>}
          {loginError && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {loginError}
            </div>
          )}
          <div className="p-6 mb-6 bg-white rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => handleMonatWechsel('zurueck')}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                &larr; Vorheriger Monat
              </button>
              
              <h2 className="text-xl font-bold">
                {ausgewaehltePerson.name} - {getMonatsName(currentMonth)} {currentYear}
              </h2>
              
              <button
                onClick={() => handleMonatWechsel('vor')}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Nächster Monat &rarr;
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex mb-2 space-x-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-1 bg-blue-500 rounded"></div>
                  <span>Urlaub</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-1 bg-green-500 rounded"></div>
                  <span>Durchführung</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-1 bg-gray-300 rounded"></div>
                  <span>Wochenende</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">Klicken Sie auf einen Tag, um zwischen Urlaub, Durchführung und keinem Status zu wechseln.</p>
            </div>
            
            <div className="grid grid-cols-7 gap-2 text-center">
              {/* Wochentags-Header */}
              {[0, 1, 2, 3, 4, 5, 6].map((wochentag) => (
                <div key={wochentag} className="p-2 font-bold bg-gray-100">
                  {getWochentagName(wochentag)}
                </div>
              ))}
              
              {/* Leere Felder für Tage vor dem 1. des Monats */}
              {Array.from({ length: tageImMonat[0].wochentag }).map((_, index) => (
                <div key={`leer-${index}`} className="p-2"></div>
              ))}
              
              {/* Tage des Monats */}
              {tageImMonat.map((tag) => {
                const status = getTagStatus(String(ausgewaehltePersonId), tag.tag);
                let tagClass = "p-2 rounded cursor-pointer";
                
                if (tag.istWochenende) {
                  tagClass += " bg-gray-300";
                } else if (status === 'urlaub') {
                  tagClass += " bg-blue-500 text-white";
                } else if (status === 'durchfuehrung') {
                  tagClass += " bg-green-500 text-white";
                } else {
                  tagClass += " bg-white border border-gray-300 hover:bg-gray-100";
                }
                
                return (
                  <div 
                    key={tag.tag} 
                    className={tagClass}
                    onClick={() => {
                      if (!tag.istWochenende) {
                        // Zyklus: null -> urlaub -> durchfuehrung -> null
                        let neuerStatus = null;
                        if (status === null) neuerStatus = 'urlaub';
                        else if (status === 'urlaub') neuerStatus = 'durchfuehrung';
                        setTagStatus(String(ausgewaehltePersonId), tag.tag, neuerStatus);
                      }
                    }}
                  >
                    {tag.tag}
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-between mt-6">
              <div className="text-lg">
                <strong>Urlaubstage:</strong> {getPersonGesamtUrlaub(String(ausgewaehltePersonId))}
              </div>
              <div className="text-lg">
                <strong>Durchführungstage:</strong> {getPersonGesamtDurchfuehrung(String(ausgewaehltePersonId))}
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  if (ansichtModus === 'kalender') {
                    setAnsichtModus('liste');
                    setAusgewaehltePersonId(null);
                  }
                }}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Zurück zur Übersicht
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // Helper function for handling clicks on day cells in the main list view
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
  // Hauptansicht (nach Login) - Listenansicht
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <main className="container px-4 py-8 mx-auto">
        {isLoadingData && <div className="p-4 text-center text-blue-600">Lade Monatsübersicht...</div>}
        {loginError && ( /* Display general errors here too */
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {loginError}
            </div>
          )}
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => handleMonatWechsel('zurueck')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              &larr; Vorheriger Monat
            </button>
            
            <h2 className="text-xl font-bold">
              {getMonatsName(currentMonth)} {currentYear}
            </h2>
            
            <button
              onClick={() => handleMonatWechsel('vor')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              Nächster Monat &rarr;
            </button>
          </div>
          
          <div className="mb-6">
            <div className="flex flex-wrap mb-2 space-x-2">
              <div className="flex items-center">
                <div className="w-4 h-4 mr-1 bg-blue-500 rounded"></div>
                <span>Urlaub (U)</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 mr-1 bg-green-500 rounded"></div>
                <span>Durchführung (D)</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 mr-1 bg-gray-200 border border-gray-300 rounded"></div>
                <span>Wochenende</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">Klicken Sie auf einen Tag (außer Wochenende) in der Tabelle, um zwischen Urlaub, Durchführung und keinem Status zu wechseln.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="sticky left-0 z-10 p-2 text-left bg-gray-100 border min-w-[150px]">Person</th>
                  {getTageImMonat().map(tag => (
                    <th key={`header-${tag.tag}`} className={`p-1 text-center border min-w-[50px] ${tag.istWochenende ? 'bg-gray-200' : 'bg-gray-100'}`}>
                      <div>{tag.tag}</div>
                      <div className="text-xs font-normal">{getWochentagName(tag.wochentag)}</div>
                    </th>
                  ))}
                  <th className="p-2 text-center border min-w-[100px]">Gesamt Urlaub</th>
                  <th className="p-2 text-center border min-w-[100px]">Gesamt Durchf.</th>
                  <th className="p-2 text-center border min-w-[150px]">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {personen.map((person) => {
                  return (
                    <tr key={person.id}>
                      <td className="sticky left-0 z-0 p-2 text-left bg-white border min-w-[150px]">{person.name}</td>
                      {getTageImMonat().map(tag => {
                        const status = getTagStatus(String(person.id), tag.tag);
                        let cellClass = "p-2 text-center border min-w-[50px]";
                        let cellContent = "";

                        if (tag.istWochenende) {
                          cellClass += " bg-gray-200";
                        } else {
                          cellClass += " cursor-pointer hover:bg-black-50";
                          if (status === 'urlaub') {
                            cellClass += " bg-blue-500 text-white hover:bg-blue-600";
                            cellContent = "U";
                          } else if (status === 'durchfuehrung') {
                            cellClass += " bg-green-500 text-white hover:bg-green-600";
                            cellContent = "D";
                          }
                        }
                        return (
                          <td key={`${person.id}-${tag.tag}`} className={cellClass} onClick={() => handleDayCellClick(person.id, tag)}>
                            {cellContent}
                          </td>
                        );
                      })}
                      <td className="p-2 text-center border min-w-[100px]">{getPersonGesamtUrlaub(String(person.id))}</td>
                      <td className="p-2 text-center border min-w-[100px]">{getPersonGesamtDurchfuehrung(String(person.id))}</td>
                      <td className="p-2 text-center border min-w-[150px]">
                        <button
                          onClick={() => {
                            setAusgewaehltePersonId(person.id);
                            setAnsichtModus('kalender');
                          }}
                          className="px-3 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
                        >
                          Kalender
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td className="sticky left-0 z-10 p-2 bg-gray-100 border">Gesamtsumme</td>
                  {getTageImMonat().map(tag => {
                    const dailyTotals = getTagesGesamtStatus(tag.tag);
                    return (
                      <td key={`footer-total-${tag.tag}`} className={`p-1 text-xs text-center border min-w-[50px] ${tag.istWochenende ? 'bg-gray-200' : 'bg-gray-100'}`}>
                        {dailyTotals.urlaubCount > 0 && <span className="text-blue-600">U:{dailyTotals.urlaubCount}</span>}
                        {dailyTotals.urlaubCount > 0 && dailyTotals.durchfuehrungCount > 0 && <br/>}
                        {dailyTotals.durchfuehrungCount > 0 && <span className="text-green-600">D:{dailyTotals.durchfuehrungCount}</span>}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center border">{getGesamtUrlaub()}</td>
                  <td className="p-2 text-center border">{getGesamtDurchfuehrung()}</td>
                  <td className="p-2 border"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}