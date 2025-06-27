# Technisches Konzept: Umbau zur mandantenfähigen Anwendung

**Datum:** 25. Mai 2024 (aktualisiert 26. Juni 2025)
**Autor:** Philipp

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
      |-- user_tenant_role: { tenantId: "...", personId: "...", role: "admin" | "member" }
```

**Wichtige Änderungen:**

1. **`tenants`:** Die neue Top-Level-Kollektion. Jedes Dokument ist ein Mandant.
2. **`persons`:** Wird zur zentralen Quelle für alle Individuen. Die Unterscheidung zwischen "Benutzer" und "Person" wird hier durch die optionalen Felder `userId` und `role` abgebildet. Eine Person ohne `userId` ist ein reiner Planeintrag, eine Person mit `userId` ist ein aktiver Benutzer.
3. **`users`:** Dient nur noch zur Speicherung privater Benutzerinformationen, insbesondere der Zuordnung zu einem Mandanten (`tenantId`) und einer Person (`personId`) innerhalb dieses Mandanten.

### 3.2. Zugriffskontrolle

Die Berechtigungslogik wird vollständig über die Firestore-Sicherheitsregeln und die im Frontend gespeicherten Benutzerinformationen abgebildet. Die Zuordnung von `tenantId`, `personId` und `role` erfolgt clientseitig nach dem Login durch das Auslesen der privaten Userdaten (`/users/{userId}/privateInfo/user_tenant_role`).

- Nach dem Login liest der Client die Zuordnung (`tenantId`, `personId`, `role`) aus den privaten Userdaten.
- Diese Informationen werden im Auth-Kontext global verfügbar gemacht und für alle Datenbankzugriffe verwendet.
- Die Firestore-Regeln prüfen die Berechtigung anhand der Datenstruktur und der UID des eingeloggten Users.
- Die Rollenlogik (z.B. welche Felder ein Mitglied ändern darf) wird im Frontend und in den Firestore-Regeln abgebildet.

**Hinweis:**

- Die Sicherheit basiert darauf, dass die UID des eingeloggten Users mit dem Feld `userId` im jeweiligen `person`-Dokument übereinstimmt.
- Die Verwaltung der Rollen und Zuordnungen erfolgt durch die Team-Leitung direkt in Firestore (z.B. durch Anlegen/Bearbeiten von `person`-Dokumenten).

### 3.3. Angepasste Firestore-Sicherheitsregeln

Die Regeln werden so gestaltet, dass sie ohne Custom Claims auskommen und stattdessen direkt auf die Datenstruktur und die UID des eingeloggten Users prüfen.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --- Regeln für private Benutzerdaten ---
    match /users/{userId}/{documents=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // --- Regeln für geteilte Tenant-Daten ---
    match /tenants/{tenantId}/{documents=**} {
      // Genereller Lesezugriff für alle, die im Mandanten als Person mit userId eingetragen sind
      allow read: if isMemberOf(tenantId);
      allow write: if isAdminOf(tenantId);
    }

    function isMemberOf(tenantId) {
      return exists(/databases/$(database)/documents/tenants/$(tenantId)/persons/$(request.auth.uid)) ||
             exists(/databases/$(database)/documents/tenants/$(tenantId)/persons/$(getPersonIdByUserId(request.auth.uid)));
    }

    function isAdminOf(tenantId) {
      // Prüft, ob die Rolle im persons-Dokument "admin" ist
      return get(/databases/$(database)/documents/tenants/$(tenantId)/persons/$(getPersonIdByUserId(request.auth.uid))).data.role == 'admin';
    }

    // --- Feingranulare Regeln für Subkollektionen ---
    match /tenants/{tenantId}/persons/{personId} {
      allow create, delete: if isAdminOf(tenantId);
      allow update: if isAdminOf(tenantId) ||
                     (isMemberOf(tenantId) && resource.data.userId == request.auth.uid &&
                      request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name']));
    }

    match /tenants/{tenantId}/dayStatusEntries/{entryId} {
      allow write: if isAdminOf(tenantId) ||
                    (isMemberOf(tenantId) && request.resource.data.personId == getPersonIdByUserId(request.auth.uid));
    }

    match /tenants/{tenantId}/yearConfigurations/{yearId} { allow write: if isAdminOf(tenantId); }
    match /tenants/{tenantId}/resturlaubData/{resturlaubId} { allow write: if isAdminOf(tenantId); }
    match /tenants/{tenantId}/employmentData/{employmentId} { allow write: if isAdminOf(tenantId); }
  }
}
```

---

## 4. Umsetzungsplan / Refactoring-Schritte

1. **Frontend-Anpassungen:**
    - **`AuthContext`:**
        - Nach dem Login das Mapping (`tenantId`, `personId`, `role`) aus `/users/{userId}/privateInfo/user_tenant_role` laden.
        - Diese Informationen im Auth-Kontext global verfügbar machen.
    - **`useFirestore` Hook:**
        - Alle Datenbankpfade von `/users/{currentUser.uid}/...` auf `/tenants/{tenantId}/...` umstellen. Die `tenantId` wird aus dem `AuthContext` bezogen.
        - Sicherstellen, dass der Hook erst Daten lädt, wenn die `tenantId` verfügbar ist.
    - **Rollenbasierte UI:**
        - Komponenten wie `SettingsPage` müssen die Rolle des Benutzers aus dem `AuthContext` prüfen. Verwaltungs-Buttons und -Sektionen werden nur für `admin` gerendert.
        - Die `onClick`-Handler in den Kalenderansichten (`MonthlyView`, `CalendarView`) müssen prüfen, ob der Benutzer die Berechtigung zum Bearbeiten hat (`isAdmin` oder `personId` des Eintrags stimmt mit der eigenen `personId` überein).
    - **Onboarding-Prozess:**
        - **Registrierung:** Ein neuer Benutzer erstellt einen neuen Mandanten. Für ihn wird automatisch ein `person`-Dokument mit `role: 'admin'` und seiner `userId` angelegt. Die Zuordnung wird in den privaten Userdaten gespeichert.
        - **Einladung (optional):** Ein Admin kann neue Personen anlegen. Wird eine E-Mail-Adresse angegeben, kann ein Einladungs-Flow implementiert werden, der den neuen Benutzer nach der Registrierung dem korrekten Mandanten und `person`-Dokument zuordnet.

---

## 5. Migration bestehender Daten

Die Migration der bestehenden Benutzerdaten in die neue mandantenfähige Struktur erfolgt clientseitig durch einen eingeloggten Benutzer (meist der bisherige Einzelbenutzer/Admin). Es wird ein Migrations-Button oder ein automatischer Migrationsprozess im Frontend bereitgestellt.

**Ablauf:**

1. **Migration starten:**
   - Der eingeloggte Benutzer (bisheriger Einzelbenutzer) startet die Migration im Frontend.

2. **Neuen Mandanten anlegen:**
   - Es wird ein neues Dokument in `/tenants/{tenantId}` erstellt. Die `tenantId` kann generiert werden (z.B. UUID).

3. **Personen übernehmen:**
   - Alle Einträge aus `/users/{userId}/persons` werden nach `/tenants/{tenantId}/persons` kopiert.
   - Für die Person, die dem aktuellen User entspricht, wird das Feld `userId` gesetzt und die Rolle auf `admin` gesetzt.

4. **Weitere Daten übernehmen:**
   - Alle Einträge aus `/users/{userId}/resturlaubData`, `/employmentData`, `/yearConfigurations`, `/dayStatusEntries` werden in die entsprechenden Subkollektionen unter `/tenants/{tenantId}/` kopiert.

5. **Private Userdaten aktualisieren:**
   - Im Dokument `/users/{userId}/privateInfo/user_tenant_role` wird `{ tenantId, personId, role: 'admin' }` gespeichert.

6. **Abschluss:**
   - Nach erfolgreicher Migration arbeitet der User nur noch mit den neuen Tenant-Daten. Die alten Daten können optional gelöscht werden.

**Hinweise:**

- Die Migration kann beliebig oft getestet werden, solange die neuen Daten nicht produktiv genutzt werden.
- Die Migration sollte atomar ablaufen, um Inkonsistenzen zu vermeiden.
- Nach der Migration muss die Anwendung ausschließlich mit der neuen Struktur arbeiten.

---
<!-- markdownlint-disable-next-line MD036 -->
**Ende des Konzepts**
