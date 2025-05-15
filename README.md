# Urlaubsplaner

Ein webbasierter Urlaubsplaner zur Verwaltung von Abwesenheiten (Urlaub, Durchführung) für ein Team von Mitarbeitern. Die Anwendung ermöglicht eine übersichtliche Darstellung und einfache Bearbeitung von Einträgen.

## Inhaltsverzeichnis

- [Funktionen](#funktionen)
- [Technologie-Stack](#technologie-stack)
- [Projektstruktur (src-Verzeichnis)](#projektstruktur-src-verzeichnis)
- [Setup und Start](#setup-und-start)
- [Datenmodell (Firestore)](#datenmodell-firestore)
- [Screenshots (Optional)](#screenshots-optional)
- [Zukünftige Erweiterungen](#zukünftige-erweiterungen)

## Funktionen

- **Benutzerauthentifizierung**: Einfaches Login-System (aktuell mit festen Demo-Zugangsdaten).
- **Monatsübersicht (Listenansicht)**:
  - Anzeige aller Mitarbeiter und ihrer markierten Tage (Urlaub/Durchführung) für den ausgewählten Monat.
  - Direktes Ändern des Status (Urlaub/Durchführung/Frei) per Klick.
  - Navigation zwischen Monaten und Jahren.
  - Summenanzeige pro Mitarbeiter und pro Tag.
- **Jahresübersicht**:
  - Tabellarische Übersicht aller Mitarbeiter für das ausgewählte Jahr.
  - Anzeige von Resturlaub (Vorjahr), Urlaubsanspruch, genommenen Urlaubstagen, verbleibenden Urlaubstagen und Durchführungstagen.
  - Navigation zu Jahresdetails pro Mitarbeiter.
- **Jahresdetailansicht**:
  - Monatliche Aufschlüsselung der Urlaubs- und Durchführungstage für eine ausgewählte Person.
  - Navigation zum persönlichen Kalender für einen Monat.
- **Persönliche Kalenderansicht**:
  - Detaillierte Monatsansicht für eine ausgewählte Person.
  - Markieren von Tagen als Urlaub oder Durchführung.
  - Navigation zwischen Monaten.
- **Datenpersistenz**: Urlaubs-, Durchführungs- und Resturlaubsdaten werden in Firebase Firestore gespeichert.
- **Optimistische Updates**: Für eine flüssige Benutzererfahrung beim Ändern von Tagesstatus.
- **Responsive Design-Ansätze**: Durch Tailwind CSS für verschiedene Bildschirmgrößen geeignet.

## Technologie-Stack

- **Frontend**:
  - [React](https://reactjs.org/) (JavaScript-Bibliothek zur Erstellung von Benutzeroberflächen)
  - [Tailwind CSS](https://tailwindcss.com/) (Utility-First CSS Framework)
- **Backend/Datenbank**:
  - [Firebase Firestore](https://firebase.google.com/docs/firestore) (NoSQL Cloud-Datenbank)
- **Entwicklungsumgebung**:
  - Node.js
  - npm/yarn
  - Erstellt mit [Create React App](https://create-react-app.dev/)

## Projektstruktur (src-Verzeichnis)

Das `src`-Verzeichnis enthält den gesamten Quellcode der React-Anwendung:

- **/Users/philippkanter/Developer/urlaubsplaner/src/App.js**: Die Hauptkomponente der Anwendung. Sie enthält die gesamte Logik für die Zustandsverwaltung, Datenabrufe, Authentifizierung und das Rendering der verschiedenen Ansichten.
- **/Users/philippkanter/Developer/urlaubsplaner/src/firebase.js**: Konfiguration und Initialisierung der Firebase-Verbindung (insbesondere Firestore).
- **/Users/philippkanter/Developer/urlaubsplaner/src/index.js**: Der Einstiegspunkt der React-Anwendung, der die `App`-Komponente in das DOM rendert.
- **/Users/philippkanter/Developer/urlaubsplaner/src/index.css**: Globale Stile und Einbindung von Tailwind CSS.
- **/Users/philippkanter/Developer/urlaubsplaner/src/App.css**: (Möglicherweise) zusätzliche, spezifischere CSS-Regeln für die `App`-Komponente oder globale Stile, die nicht von Tailwind abgedeckt werden.
- **/Users/philippkanter/Developer/urlaubsplaner/src/logo.svg**: Das React-Logo (Standard von Create React App).
- **/Users/philippkanter/Developer/urlaubsplaner/src/reportWebVitals.js**: Funktion zum Messen der Performance (Standard von Create React App).
- **/Users/philippkanter/Developer/urlaubsplaner/src/setupTests.js**: Konfigurationsdatei für Jest-Tests (Standard von Create React App).

## Setup und Start

1. **Voraussetzungen**:
    - Node.js und npm (oder yarn) müssen installiert sein.
    - Ein Firebase-Projekt muss eingerichtet sein.

2. **Firebase Konfiguration**:
    - Erstelle ein Firebase-Projekt in der Firebase Console.
    - Aktiviere Firestore als Datenbank.
    - Füge eine Web-App zu deinem Firebase-Projekt hinzu.
    - Kopiere die Firebase-Konfigurationsdaten (`firebaseConfig`) in die Datei `/Users/philippkanter/Developer/urlaubsplaner/src/firebase.js`.

        ```javascript
        // /Users/philippkanter/Developer/urlaubsplaner/src/firebase.js
        const firebaseConfig = {
          apiKey: "DEIN_API_KEY",
          authDomain: "DEIN_AUTH_DOMAIN",
          projectId: "DEIN_PROJECT_ID",
          storageBucket: "DEIN_STORAGE_BUCKET",
          messagingSenderId: "DEIN_MESSAGING_SENDER_ID",
          appId: "DEIN_APP_ID"
        };
        ```

    - **Sicherheitsregeln für Firestore**: Stelle sicher, dass deine Firestore-Sicherheitsregeln so konfiguriert sind, dass authentifizierte Benutzer Lese- und Schreibzugriff auf die benötigten Collections haben.

3. **Abhängigkeiten installieren**:
    Navigiere in das Projektverzeichnis (`/Users/philippkanter/Developer/urlaubsplaner/`) und führe aus:

    ```bash
    npm install
    # oder
    yarn install
    ```

4. **Anwendung starten**:

    ```bash
    npm start
    # oder
    yarn start
    ```

    Die Anwendung sollte unter `http://localhost:3000` im Browser verfügbar sein.

5. **Demo-Login**:
    - Benutzername: `admin`
    - Passwort: `12345`

## Datenmodell (Firestore)

Die Anwendung verwendet zwei Haupt-Collections in Firestore:

- **`dayStatusEntries`**: Speichert den Status (Urlaub/Durchführung) für jeden Tag, jede Person, Monat und Jahr.
  - Dokument-ID-Format: `${personId}-${year}-${month}-${day}`
  - Felder:
    - `personId`: (String) ID der Person
    - `year`: (Number) Jahr
    - `month`: (Number) Monat (0-basiert, d.h. Januar = 0)
    - `day`: (Number) Tag des Monats
    - `status`: (String) 'urlaub' oder 'durchfuehrung'

- **`resturlaubData`**: Speichert den Resturlaub vom Vorjahr für jede Person.
  - Dokument-ID-Format: `${personId}-${forYear}`
  - Felder:
    - `personId`: (String) ID der Person
    - `forYear`: (Number) Das Jahr, für das dieser Resturlaub gilt
    - `tage`: (Number) Anzahl der Resturlaubstage

## Screenshots (Optional)

Hier könnten Screenshots der verschiedenen Ansichten der Anwendung eingefügt werden, um einen visuellen Eindruck zu vermitteln.

- Login-Seite
- Monatsübersicht (Listenansicht)
- Jahresübersicht
- Persönliche Kalenderansicht

## Zukünftige Erweiterungen

- Implementierung einer robusten Benutzerauthentifizierung (z.B. mit Firebase Authentication).
- Rollenbasiertes System (z.B. Admin, Mitarbeiter).
- Admin-Funktionen zum Verwalten von Benutzern und globalen Einstellungen (z.B. Feiertage, Urlaubsanspruch).
- Exportfunktionen (z.B. als PDF oder CSV).
- Benachrichtigungen.
- Verbesserte UI/UX und mehr Anpassungsmöglichkeiten.
- Umfassendere Testabdeckung.

---

Diese `README.md` ist ein guter Startpunkt. Du kannst sie natürlich nach Bedarf anpassen und erweitern!
