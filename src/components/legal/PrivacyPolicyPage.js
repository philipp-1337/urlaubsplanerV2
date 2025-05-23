import React from 'react';

const PrivacyPolicyPage = () => {
  return (
    <div className="container mx-auto px-4 py-8 text-gray-700">
      <h1 className="text-2xl font-bold mb-6">Datenschutzerklärung</h1>

      <p className="mb-4">
        Wir legen größten Wert auf den Schutz Ihrer Daten und die Wahrung Ihrer Privatsphäre.
        Nachfolgend informieren wir Sie deshalb über die Erhebung und Verwendung persönlicher Daten bei Nutzung unserer Webseite/Anwendung "Urlaubsplaner".
      </p>

      {/* <h2 className="text-xl font-semibold mt-6 mb-3">Verantwortliche Stelle</h2>
      <p className="mb-1">
        [Ihr Name/Firmenname]<br />
        [Ihre Adresse]<br />
        [PLZ Ort]<br />
        E-Mail: [Ihre E-Mail-Adresse]
      </p>
      <p className="mb-4 text-sm text-gray-500">
        (Bitte ergänzen Sie hier Ihre vollständigen Kontaktdaten als verantwortliche Stelle.)
      </p> */}

      <h2 className="text-xl font-semibold mt-6 mb-3">Datenerfassung auf unserer Webseite/Anwendung</h2>

      <h3 className="text-lg font-medium mt-4 mb-2">Hosting und Content Delivery Networks (CDN)</h3>
      <p className="mb-4">
        Unsere Anwendung wird bei Firebase Hosting (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland) gehostet.
        Firebase Hosting dient der Bereitstellung unserer Webanwendung. Wenn Sie unsere Anwendung nutzen, werden Ihre IP-Adresse sowie Informationen über Ihren Browser und Ihr Betriebssystem
        an Firebase-Server übertragen. Diese Daten sind technisch notwendig, um Ihnen die Anwendung korrekt anzuzeigen und die Stabilität und Sicherheit zu gewährleisten.
        Die Server für Firebase Hosting befinden sich innerhalb der Europäischen Union (EU).
        Die Nutzung von Firebase Hosting erfolgt im Interesse einer sicheren, schnellen und effizienten Bereitstellung unseres Online-Angebots durch einen professionellen Anbieter (Art. 6 Abs. 1 lit. f DSGVO).
      </p>

      <h3 className="text-lg font-medium mt-4 mb-2">Firebase Authentication</h3>
      <p className="mb-4">
        Zur Authentifizierung und Verwaltung von Benutzerkonten nutzen wir Firebase Authentication (Google Ireland Limited).
        Wenn Sie sich registrieren oder anmelden, werden die von Ihnen eingegebenen Daten (z.B. E-Mail-Adresse, Passwort) an Firebase übertragen und dort gespeichert, um Ihren Zugang zu ermöglichen und zu sichern.
        Die Datenverarbeitung dient der Durchführung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).
        Die Server für Firebase Authentication befinden sich innerhalb der Europäischen Union (EU).
      </p>

      <h3 className="text-lg font-medium mt-4 mb-2">Firebase Firestore (Datenbank)</h3>
      <p className="mb-4">
        Zur Speicherung der Anwendungsdaten (z.B. Urlaubsplanungen, Personendaten, Konfigurationen) nutzen wir Firebase Firestore (Google Ireland Limited), eine NoSQL-Cloud-Datenbank.
        Die von Ihnen in der Anwendung eingegebenen und generierten Daten werden in Firestore gespeichert.
        Dies ist notwendig für die Kernfunktionalität der Anwendung.
        Die Datenverarbeitung dient der Durchführung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).
        Die Server für Firebase Firestore befinden sich innerhalb der Europäischen Union (EU).
      </p>
      
      <h3 className="text-lg font-medium mt-4 mb-2">Datenverwendung durch Firebase/Google</h3>
      <p className="mb-4">
        Wir haben die Einstellungen für die Firebase-Dienste so konfiguriert, dass Google keine Erlaubnis hat, die über unsere Anwendung verarbeiteten Daten für Produktverbesserungen oder andere eigene Zwecke von Google zu nutzen.
        Die Datenverarbeitung durch Firebase erfolgt ausschließlich im Rahmen der Bereitstellung der genannten Dienste für uns als Auftragsverarbeiter.
      </p>

      <h3 className="text-lg font-medium mt-4 mb-2">Cookies</h3>
      <p className="mb-4">
        Unsere Anwendung verwendet ausschließlich technisch notwendige Cookies. Firebase Authentication kann Cookies verwenden, um Sitzungen zu verwalten und die Sicherheit der Authentifizierung zu gewährleisten.
        Diese Cookies dienen nicht dem Tracking Ihres Surfverhaltens oder für Werbezwecke.
        Die Rechtsgrundlage für die Verwendung technisch notwendiger Cookies ist Art. 6 Abs. 1 lit. f DSGVO, unser berechtigtes Interesse an einer nutzerfreundlichen und funktionsfähigen Bereitstellung unserer Dienste.
      </p>
      
      <h3 className="text-lg font-medium mt-4 mb-2">Kein Tracking oder Analyse durch Drittanbieter</h3>
      <p className="mb-4">
        Wir setzen keine externen Tracking- oder Analyse-Tools (wie z.B. Google Analytics, Matomo, etc.) ein, die Ihr Nutzungsverhalten über unsere Anwendung hinaus verfolgen.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-3">Ihre Rechte als Betroffener</h2>
      <p className="mb-2">Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten.</p>
      <p className="mb-4">Hierzu sowie zu weiteren Fragen zum Thema personenbezogene Daten können Sie sich jederzeit unter der im Impressum angegebenen Adresse an uns wenden.</p>

      <h2 className="text-xl font-semibold mt-6 mb-3">Änderung unserer Datenschutzbestimmungen</h2>
      <p className="mb-4">
        Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der Datenschutzerklärung umzusetzen, z.B. bei der Einführung neuer Services. Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.
      </p>
      <p className="mb-4">Stand: Mai 2025</p>
    </div>
  );
};

export default PrivacyPolicyPage;