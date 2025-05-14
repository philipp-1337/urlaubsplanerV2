import { useState, useEffect } from 'react';

// Hauptanwendung
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [ansichtModus, setAnsichtModus] = useState('liste'); // 'liste', 'kalender' oder 'jahresuebersicht'
  const [ausgewaehltePersonId, setAusgewaehltePersonId] = useState(null);
  
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
  
  // Resturlaub vom Vorjahr
  const [resturlaub, setResturlaub] = useState({});
  
  // Urlaubs- und Durchführungsdaten
  // Format: { 'personId-jahr-monat-tag': 'urlaub'|'durchfuehrung'|null }
  const [tagDaten, setTagDaten] = useState({});
  
  // Generiert alle Tage für den aktuellen Monat
  const getTageImMonat = (monat = currentMonth, jahr = currentYear) => {
    const ersterTag = new Date(jahr, monat, 1);
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
  const setTagStatus = (personId, tag, status, monat = currentMonth, jahr = currentYear) => {
    const key = `${personId}-${jahr}-${monat}-${tag}`;
    const neueTagDaten = { ...tagDaten };
    
    if (status === null || status === getTagStatus(personId, tag, monat, jahr)) {
      // Wenn derselbe Status erneut geklickt wird oder null, dann Status entfernen
      delete neueTagDaten[key];
    } else {
      // Ansonsten Status setzen
      neueTagDaten[key] = status;
    }
    
    setTagDaten(neueTagDaten);
  };
  
  // Berechnet Anzahl der Urlaubstage pro Person im aktuellen Monat
  const getPersonGesamtUrlaub = (personId, monat = currentMonth, jahr = currentYear) => {
    let count = 0;
    const tage = getTageImMonat(monat, jahr);
    
    tage.forEach(tag => {
      if (getTagStatus(personId, tag.tag, monat, jahr) === 'urlaub') {
        count++;
      }
    });
    
    return count;
  };
  
  // Berechnet Anzahl der Durchführungstage pro Person im aktuellen Monat
  const getPersonGesamtDurchfuehrung = (personId, monat = currentMonth, jahr = currentYear) => {
    let count = 0;
    const tage = getTageImMonat(monat, jahr);
    
    tage.forEach(tag => {
      if (getTagStatus(personId, tag.tag, monat, jahr) === 'durchfuehrung') {
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
  const getGesamtDurchfuehrung = (monat = currentMonth, jahr = currentYear) => {
    let summe = 0;
    personen.forEach(person => {
      summe += getPersonGesamtDurchfuehrung(person.id, monat, jahr);
    });
    return summe;
  };
  
  // Berechnet Urlaubstage pro Person im gesamten Jahr
  const getPersonJahresUrlaub = (personId, jahr = currentYear) => {
    let summe = 0;
    for (let monat = 0; monat < 12; monat++) {
      summe += getPersonGesamtUrlaub(personId, monat, jahr);
    }
    return summe;
  };
  
  // Berechnet Durchführungstage pro Person im gesamten Jahr
  const getPersonJahresDurchfuehrung = (personId, jahr = currentYear) => {
    let summe = 0;
    for (let monat = 0; monat < 12; monat++) {
      summe += getPersonGesamtDurchfuehrung(personId, monat, jahr);
    }
    return summe;
  };
  
  // Holt den Resturlaub für eine Person
  const getPersonResturlaub = (personId) => {
    return resturlaub[personId] || 0;
  };
  
  // Setzt den Resturlaub für eine Person
  const setPersonResturlaub = (personId, tage) => {
    setResturlaub({
      ...resturlaub,
      [personId]: parseInt(tage) || 0
    });
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
                    <th className="p-3 text-center border">Urlaubstage {currentYear}</th>
                    <th className="p-3 text-center border">Gesamt verfügbarer<br />Urlaub</th>
                    <th className="p-3 text-center border">Durchführungstage {currentYear}</th>
                    <th className="p-3 text-center border">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {personen.map((person) => {
                    const jahresUrlaub = getPersonJahresUrlaub(person.id);
                    const jahresDurchfuehrung = getPersonJahresDurchfuehrung(person.id);
                    const personResturlaub = getPersonResturlaub(person.id);
                    
                    return (
                      <tr key={person.id}>
                        <td className="p-3 border">{person.name}</td>
                        <td className="p-3 border">
                          <input
                            type="number"
                            min="0"
                            value={personResturlaub}
                            onChange={(e) => setPersonResturlaub(person.id, e.target.value)}
                            className="w-full px-2 py-1 text-center border border-gray-300 rounded"
                          />
                        </td>
                        <td className="p-3 text-center border">{jahresUrlaub}</td>
                        <td className="p-3 text-center border">{personResturlaub + jahresUrlaub}</td>
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
                      {getPersonJahresUrlaub(ausgewaehltePersonId)}
                    </td>
                    <td className="p-3 text-center border">
                      {getPersonJahresDurchfuehrung(ausgewaehltePersonId)}
                    </td>
                    <td className="p-3 text-center border"></td>
                  </tr>
                  <tr className="bg-gray-200 font-bold">
                    <td className="p-3 border">Mit Resturlaub</td>
                    <td className="p-3 text-center border">
                      {getPersonJahresUrlaub(ausgewaehltePersonId) + getPersonResturlaub(ausgewaehltePersonId)}
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
                const status = getTagStatus(ausgewaehltePersonId, tag.tag);
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
                        setTagStatus(ausgewaehltePersonId, tag.tag, neuerStatus);
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
                <strong>Urlaubstage:</strong> {getPersonGesamtUrlaub(ausgewaehltePersonId)}
              </div>
              <div className="text-lg">
                <strong>Durchführungstage:</strong> {getPersonGesamtDurchfuehrung(ausgewaehltePersonId)}
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
  
  // Hauptansicht (nach Login) - Listenansicht
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <main className="container px-4 py-8 mx-auto">
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
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left border">Person</th>
                  <th className="p-3 text-center border">Urlaubstage</th>
                  <th className="p-3 text-center border">Durchführungstage</th>
                  <th className="p-3 text-center border">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {personen.map((person) => (
                  <tr key={person.id}>
                    <td className="p-3 border">{person.name}</td>
                    <td className="p-3 text-center border">{getPersonGesamtUrlaub(person.id)}</td>
                    <td className="p-3 text-center border">{getPersonGesamtDurchfuehrung(person.id)}</td>
                    <td className="p-3 text-center border">
                      <button
                        onClick={() => {
                          setAusgewaehltePersonId(person.id);
                          setAnsichtModus('kalender');
                        }}
                        className="px-4 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                      >
                        Kalender anzeigen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td className="p-3 border">Gesamtsumme</td>
                  <td className="p-3 text-center border">{getGesamtUrlaub()}</td>
                  <td className="p-3 text-center border">{getGesamtDurchfuehrung()}</td>
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