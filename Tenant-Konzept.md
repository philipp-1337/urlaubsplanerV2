# Technisches Konzept: Umbau zur mandantenfähigen Anwendung

**Datum:** 25. Mai 2024
**Autor:** Gemini Code Assist

## 1. Zielsetzung und Motivation

Ziel dieses Refactorings ist der Umbau der Urlaubsplaner-Anwendung von einem Einzelbenutzer-Modell zu einer mandantenfähigen (Multi-Tenant) Kollaborationsplattform.

**Motivation:**

- Mehrere Benutzer (z.B. ein Team) sollen gemeinsam auf einen zentralen Datenbestand (einen "Mandanten") zugreifen können.
- Es sollen unterschiedliche Berechtigungsstufen eingeführt werden, um die Verwaltung und Bearbeitung von Daten zu steuern.
- Die Anwendung soll als vollwertiges Team-Tool skalierbar werden.

---

## 2. Rollen und Berechtigungen

Es werden zwei zentrale Benutzerrollen definiert:

### 2.1. Team-Leitung (`admin`)

Diese Rolle entspricht funktional dem bisherigen alleinigen Benutzer. Sie hat die volle Kontrolle über alle Daten innerhalb ihres Mandanten.

**Berechtigungen:**

- **Vollzugriff:** Vollständiger Lese- und Schreibzugriff auf alle Daten des Mandanten (`/tenants/{tenantId}/*`).
- **Personenverwaltung:** Kann neue Team-Mitglieder (Personen) anlegen, deren Daten (Name, Anstellung etc.) bearbeiten und sie löschen.
- **Konfigurationshoheit:** Kann Jahreskonfigurationen (Urlaubsanspruch), Resturlaub und Anstellungsdaten für alle Personen verwalten.
- **Globale Tage:** Kann globale Einträge wie Feiertage oder Teamtage für alle definieren.
- **Benutzerverwaltung:** Kann andere Benutzer zum Mandanten einladen und deren Rollen verwalten (z.B. ein anderes Mitglied zur Team-Leitung befördern).
- **Freigabeprozesse (Zukunft):** Wird die Rolle sein, die Urlaubsanträge oder andere Anfragen genehmigt.

### 2.2. Team-Mitglied (`member`)

Diese Rolle ist für reguläre Team-Mitglieder gedacht, die ihre eigenen Abwesenheiten planen und die Pläne des Teams einsehen können.

**Berechtigungen:**

- **Eingeschränkter Schreibzugriff:** Kann ausschließlich die eigenen Tageseinträge (`dayStatusEntries`) erstellen, bearbeiten und löschen.
- **Lesezugriff:** Kann die Abwesenheiten und deren Art von allen anderen Team-Mitgliedern einsehen.
- **Profilbearbeitung:** Kann eigene, nicht-kritische Daten wie den eigenen Namen bearbeiten, aber nicht die eigene Rolle oder den Urlaubsanspruch ändern.

---

## 3. Technisches Konzept

### 3.1. Neues Datenmodell in Firestore

Die bisherige, benutzerzentrierte Struktur wird durch eine mandantenzentrierte Struktur ersetzt. Die Top-Level-Kollektion wird `tenants`.

**Bisherige Struktur:**
`/users/{userId}/[daten...]`

**Neue, mandantenfähige Struktur:**

```bash
/tenants/{tenantId}/
  |
  |-- persons/{personId}/  // ID kann automatisch generiert werden
  |   |
  |   |-- name: "Max Mustermann"
  |   |-- orderIndex: 0
  |   |-- userId: "firebase_auth_uid_von_max"  // (Optional) Verknüpft mit einem Firebase Auth Benutzer
  |   `-- role: "admin" | "member"             // (Optional) Definiert die Rolle, wenn es ein Benutzer ist
  |
  |-- yearConfigurations/{year}
  |   |-- (Struktur wie bisher)
  |
  |-- resturlaubData/{personId}_{year}
  |   |-- (Struktur wie bisher)
  |
  |-- employmentData/{personId}_{year}
  |   |-- (Struktur wie bisher)
  |
  `-- dayStatusEntries/{entryId}
      |-- (Struktur wie bisher)

/users/{userId}/
  |
  `-- privateInfo/
      |-- {docId}: { tenantId: "tenantId_des_benutzers", personId: "personId_im_tenant" }
```

**Wichtige Änderungen:**

1. **`tenants`:** Die neue Top-Level-Kollektion. Jedes Dokument ist ein Mandant.
2. **`persons`:** Wird zur zentralen Quelle für alle Individuen. Die Unterscheidung zwischen "Benutzer" und "Person" wird hier durch die optionalen Felder `userId` und `role` abgebildet. Eine Person ohne `userId` ist ein reiner Planeintrag, eine Person mit `userId` ist ein aktiver Benutzer.
3. **`users`:** Dient nur noch zur Speicherung privater Benutzerinformationen, insbesondere der Zuordnung zu einem Mandanten (`tenantId`) und einer Person (`personId`) innerhalb dieses Mandanten.

### 3.2. Zugriffskontrolle mit Firebase Auth Custom Claims

Für eine performante und sichere Prüfung der Berechtigungen werden **Firebase Auth Custom Claims** verwendet. Dies vermeidet zusätzliche Datenbankabfragen in den Sicherheitsregeln.

- **Claims:** An das Auth-Token eines jeden angemeldeten Benutzers werden folgende Claims gehängt:
  - `tenantId`: ID des Mandanten, zu dem der Benutzer gehört.
  - `personId`: Die Dokument-ID des Benutzers in der `persons`-Subkollektion.
  - `role`: Die Rolle des Benutzers (`admin` oder `member`).

- **Cloud Function:** Eine Cloud Function wird benötigt, die auf Schreibvorgänge in `/tenants/{tenantId}/persons/{personId}` reagiert. Wenn ein `person`-Dokument mit einer `userId` und `role` erstellt oder geändert wird, aktualisiert die Funktion die Custom Claims für den entsprechenden Firebase-Benutzer.

### 3.3. Angepasste Firestore-Sicherheitsregeln

Die Regeln werden komplett überarbeitet, um auf die Custom Claims zu reagieren.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --- Hilfsfunktionen basierend auf Custom Claims ---
    function isMemberOf(tenantId) {
      return request.auth != null && request.auth.token.tenantId == tenantId;
    }

    function isAdminOf(tenantId) {
      return isMemberOf(tenantId) && request.auth.token.role == 'admin';
    }

    // --- Regeln für private Benutzerdaten ---
    match /users/{userId}/{documents=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // --- Regeln für geteilte Tenant-Daten ---
    match /tenants/{tenantId}/{documents=**} {
      // Genereller Lesezugriff für alle Mitglieder des Mandanten
      allow read: if isMemberOf(tenantId);

      // Schreibzugriff wird pro Subkollektion feingranular gesteuert
      allow write: if isAdminOf(tenantId); // Admins dürfen standardmäßig alles schreiben
    }

    match /tenants/{tenantId} {
      // Personenverwaltung: Nur Admins dürfen anlegen/löschen.
      // Mitglieder dürfen nur eigene, ungefährliche Felder ändern.
      match /persons/{personId} {
        allow create, delete: if isAdminOf(tenantId);
        allow update: if isAdminOf(tenantId) ||
                       (isMemberOf(tenantId) && request.auth.token.personId == personId &&
                        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name']));
      }

      // Tageseinträge: Admins dürfen alles, Mitglieder nur eigene.
      match /dayStatusEntries/{entryId} {
        allow write: if isAdminOf(tenantId) ||
                      (isMemberOf(tenantId) && request.resource.data.personId == request.auth.token.personId);
      }

      // Konfigurationen: Nur Admins dürfen schreiben.
      match /yearConfigurations/{yearId} { allow write: if isAdminOf(tenantId); }
      match /resturlaubData/{resturlaubId} { allow write: if isAdminOf(tenantId); }
      match /employmentData/{employmentId} { allow write: if isAdminOf(tenantId); }
    }
  }
}
```

---

## 4. Umsetzungsplan / Refactoring-Schritte

1. **Backend (Cloud Function):**
    - Erstellen einer Cloud Function mit einem `onWrite`-Trigger für `tenants/{tenantId}/persons/{personId}`.
    - Diese Funktion liest `userId` und `role` aus dem geschriebenen Dokument und verwendet das Firebase Admin SDK, um `setCustomUserClaims` für den entsprechenden Benutzer aufzurufen.

2. **Frontend-Anpassungen:**
    - **`AuthContext`:**
        - Nach dem Login das ID-Token des Benutzers abrufen und die Claims (`tenantId`, `personId`, `role`) parsen.
        - Diese Informationen im Auth-Kontext global verfügbar machen.
    - **`useFirestore` Hook:**
        - Alle Datenbankpfade von `/users/{currentUser.uid}/...` auf `/tenants/{tenantId}/...` umstellen. Die `tenantId` wird aus dem `AuthContext` bezogen.
        - Sicherstellen, dass der Hook erst Daten lädt, wenn die `tenantId` verfügbar ist.
    - **Rollenbasierte UI:**
        - Komponenten wie `SettingsPage` müssen die Rolle des Benutzers aus dem `AuthContext` prüfen. Verwaltungs-Buttons und -Sektionen werden nur für `admin` gerendert.
        - Die `onClick`-Handler in den Kalenderansichten (`MonthlyView`, `CalendarView`) müssen prüfen, ob der Benutzer die Berechtigung zum Bearbeiten hat (`isAdmin` oder `personId` des Eintrags stimmt mit der eigenen `personId` überein).
    - **Onboarding-Prozess:**
        - **Registrierung:** Ein neuer Benutzer erstellt einen neuen Mandanten. Für ihn wird automatisch ein `person`-Dokument mit `role: 'admin'` und seiner `userId` angelegt. Die Cloud Function setzt daraufhin die Claims.
        - **Einladung (optional):** Ein Admin kann neue Personen anlegen. Wird eine E-Mail-Adresse angegeben, kann ein Einladungs-Flow implementiert werden, der den neuen Benutzer nach der Registrierung dem korrekten Mandanten und `person`-Dokument zuordnet.
