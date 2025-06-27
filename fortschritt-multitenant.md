# Fortschritt Multi-Tenant-Refactoring

Stand: 27.06.2025

## Fortschrittstabelle

| Schritt | Beschreibung | Status | Letztes Update |
|---------|--------------|--------|---------------|
| 1       | Analyse & Vorbereitung | ✅ Abgeschlossen | 27.06.2025 |
| 2       | Erweiterung AuthContext | ✅ Abgeschlossen | - |
| 3       | Refactoring Firestore-Zugriffe | 🟡 In Bearbeitung | - |
| 4       | Rollenbasierte UI | 🟡 In Bearbeitung | - |
| 5       | Onboarding/Einladung | 🟡 In Bearbeitung | - |
| 6       | Migration bestehender Daten | 🟡 In Bearbeitung | - |
| 7       | Firestore-Regeln anpassen | 🟡 In Bearbeitung | - |
| 8       | Testen & Validieren | 🟡 In Bearbeitung | - |

---

## Schritt 1: Analyse & Vorbereitung (✅ Abgeschlossen)

- Überblick über die aktuelle Codebasis und Datenstruktur verschafft
- Relevante Stellen für Firestore-Zugriffe identifiziert
- Anforderungen für Mapping (`tenantId`, `personId`, `role`) notiert
- Vorbereitung für Umstellung auf `/tenants/{tenantId}/...` getroffen

---

## Schritt 2: Erweiterung AuthContext (✅ Abgeschlossen)

**Ziel:**

- Nach dem Login die Zuordnung (`tenantId`, `personId`, `role`) aus `/users/{userId}/privateInfo/user_tenant_role` laden.
- Diese Informationen im AuthContext global verfügbar machen.
- Sicherstellen, dass alle Komponenten/Hooks auf diese Informationen zugreifen können.

**Umsetzung:**

- Im `AuthContext` wird nach Login die User-Tenant-Rolle aus Firestore geladen und im Context bereitgestellt.
- Die Werte `userTenantRole`, `loadingUserTenantRole` und `userTenantRoleError` stehen global zur Verfügung.
- Eine JSDoc-Typdefinition für `UserTenantRole` wurde angelegt.

**Nächster Schritt:**

- Firestore-Zugriffe und Komponenten auf die neue Tenant-Struktur umstellen (Schritt 3).

---

## Schritt 3: Refactoring Firestore-Zugriffe (🟡 In Bearbeitung)

**Ziel:**

- Alle Firestore-Zugriffe von `/users/{userId}/...` auf `/tenants/{tenantId}/...` umstellen.
- Die `tenantId` wird aus dem AuthContext bezogen.
- Sicherstellen, dass Hooks und Komponenten erst Daten laden, wenn die `tenantId` verfügbar ist.

**ToDos:**

- [ ] Alle Firestore-Querys und -Writes in Hooks (z.B. `useFirestore`) und Services anpassen
- [ ] Komponenten auf neue Datenstruktur umstellen (Props, States, useEffect-Dependencies prüfen)
- [ ] Sicherstellen, dass überall die `tenantId` aus dem AuthContext verwendet wird
- [ ] Fallback/Loading-Handling, falls `tenantId` noch nicht geladen ist
- [ ] Tests/Validierung der neuen Datenpfade

**Theoretische Umsetzungsschritte:**

1. **Zentrale Hooks/Services anpassen:**
   - In `useFirestore.js` und ggf. weiteren Service-Dateien alle Firestore-Pfade refaktorisieren.
   - Statt `currentUser.uid` wird `tenantId` aus dem AuthContext verwendet.
2. **Komponenten anpassen:**
   - Alle Komponenten, die Firestore-Daten laden oder schreiben, auf die neue Struktur umstellen.
   - Props und States ggf. anpassen, damit sie mit der neuen Datenstruktur kompatibel sind.
3. **Abhängigkeiten prüfen:**
   - useEffect- und Query-Dependencies auf `tenantId` umstellen, damit Daten erst geladen werden, wenn die Zuordnung bekannt ist.
4. **Fallback/Loading:**
   - Komponenten/Hooks dürfen erst Daten laden, wenn `tenantId` verfügbar ist (Loading-States einbauen).
5. **Test/Validierung:**
   - Sicherstellen, dass alle Datenzugriffe korrekt funktionieren und keine alten User-Pfade mehr verwendet werden.

**Hinweise:**

- Die Umstellung ist Voraussetzung für die Migration und die rollenbasierte UI.
- Die neue Struktur ist mandantenfähig und trennt die Daten logisch nach Teams.

---

## Schritt 4: Rollenbasierte UI (🟡 In Bearbeitung)

**Ziel:**

- Die UI soll sich dynamisch an die Rolle des Benutzers (`admin` oder `member`) anpassen.
- Nur berechtigte Benutzer sehen und nutzen Verwaltungsfunktionen.

**ToDos:**

- [ ] Komponenten wie `SettingsPage`, `PersonManagementSection`, etc. auf Rollenlogik umstellen
- [ ] Sichtbarkeit von Buttons/Sektionen abhängig von `role` aus dem AuthContext machen
- [ ] Schreibrechte in Kalenderansichten (`MonthlyView`, `CalendarView`) rollenbasiert prüfen
- [ ] Eigene Profilbearbeitung für Mitglieder ermöglichen, aber keine kritischen Felder
- [ ] UI-Feedback für fehlende Berechtigungen einbauen
- [ ] Tests/Validierung der Rollenlogik in der UI

**Theoretische Umsetzungsschritte:**

1. **Rollenlogik in Komponenten:**
   - In allen relevanten Komponenten die Rolle (`role`) aus dem AuthContext beziehen.
   - Mit einfachen Checks (`role === 'admin'`) steuern, ob Verwaltungsfunktionen angezeigt werden.
2. **Berechtigungsprüfung für Aktionen:**
   - Bei allen mutierenden Aktionen (z.B. Person anlegen/löschen, Konfiguration ändern) vor Ausführung die Rolle prüfen.
   - Für Mitglieder: Nur eigene Daten/Einträge dürfen bearbeitet werden.
3. **UI-Feedback:**
   - Für nicht erlaubte Aktionen Hinweise/Disabled-States anzeigen.
   - Optional: Tooltips oder Overlays für Erklärungen.
4. **Tests:**
   - Manuell und ggf. automatisiert prüfen, dass die UI für beide Rollen korrekt funktioniert.

**Hinweise:**

- Die rollenbasierte UI ist essenziell für die Sicherheit und Nutzerführung.
- Die Logik kann später für weitere Rollen/Feingranularität erweitert werden.

---

## Schritt 5: Onboarding/Einladung (🟡 In Bearbeitung)

**Ziel:**

- Neue Benutzer können einen Mandanten (Team) anlegen oder zu einem bestehenden eingeladen werden.
- Die Zuordnung zu `tenantId`, `personId` und `role` erfolgt automatisch und sicher.

**ToDos:**

- [ ] Registrierung: Beim ersten Login neuen Mandanten und eigenes `person`-Dokument mit `role: 'admin'` anlegen
- [ ] Einladung: Admin kann neue Personen anlegen und optional per E-Mail einladen
- [ ] Nach Registrierung/Einladung wird die Zuordnung (`tenantId`, `personId`, `role`) in den privaten Userdaten gespeichert
- [ ] UI für Einladungs- und Onboarding-Flow gestalten
- [ ] Validierung und Fehlerbehandlung für doppelte Einladungen, ungültige E-Mails etc.
- [ ] Tests/Validierung des gesamten Flows

**Theoretische Umsetzungsschritte:**

1. **Registrierung:**
   - Nach erfolgreichem Signup prüft das Frontend, ob der User bereits einer Tenant-Zuordnung hat.
   - Falls nicht: Neuen Tenant anlegen, eigenes `person`-Dokument mit `userId` und `role: 'admin'` erstellen, Zuordnung in `/users/{userId}/privateInfo/user_tenant_role` speichern.
2. **Einladung:**
   - Admin kann im UI eine neue Person anlegen (mit oder ohne E-Mail).
   - Optional: Einladung per E-Mail mit Link, der nach Registrierung die Zuordnung herstellt.
   - Nach erfolgreicher Registrierung wird das `person`-Dokument mit `userId` und `role: 'member'` aktualisiert und die Zuordnung in den privaten Userdaten gespeichert.
3. **UI/UX:**
   - Onboarding-Dialoge und Einladungs-UI gestalten.
   - Feedback für erfolgreiche/fehlgeschlagene Einladungen.
4. **Validierung:**
   - Prüfen, ob E-Mail bereits vergeben ist, ob Person schon existiert etc.
5. **Test:**
   - Den Flow für Admin und Member durchspielen und auf Konsistenz prüfen.

**Hinweise:**

- Die Zuordnung zu Tenant und Person ist die Basis für alle weiteren Berechtigungen.
- Einladungs-Flow kann später erweitert werden (z.B. Rollenwahl, Self-Service etc.).

---

## Schritt 6: Migration bestehender Daten (🟡 In Bearbeitung)

**Ziel:**

- Bestehende Benutzerdaten aus der alten Struktur `/users/{userId}/...` in die neue mandantenfähige Struktur `/tenants/{tenantId}/...` überführen.
- Nach der Migration arbeitet der User ausschließlich mit den neuen Tenant-Daten.

**ToDos:**

- [ ] Migrations-Button oder automatischen Prozess im Frontend bereitstellen
- [ ] Neuen Tenant anlegen und `tenantId` generieren
- [ ] Alle relevanten Daten (`persons`, `resturlaubData`, `employmentData`, `yearConfigurations`, `dayStatusEntries`) in die neue Struktur kopieren
- [ ] Für den aktuellen User das eigene `person`-Dokument mit `userId` und `role: 'admin'` versehen
- [ ] Private Userdaten aktualisieren: `/users/{userId}/privateInfo/user_tenant_role` setzen
- [ ] Optional: Alte Daten nach erfolgreicher Migration löschen
- [ ] Validierung und Fehlerbehandlung für den Migrationsprozess
- [ ] Tests/Validierung der Datenkonsistenz nach Migration

**Theoretische Umsetzungsschritte:**

1. **Migration starten:**
   - Im UI einen Button oder automatischen Trigger für die Migration bereitstellen.
2. **Neuen Tenant anlegen:**
   - Ein neues Dokument in `/tenants/{tenantId}` wird erstellt (UUID oder vergleichbar).
3. **Daten übernehmen:**
   - Alle Einträge aus `/users/{userId}/persons` nach `/tenants/{tenantId}/persons` kopieren.
   - Für die Person, die dem aktuellen User entspricht, `userId` setzen und Rolle auf `admin`.
   - Weitere Daten (`resturlaubData`, `employmentData`, `yearConfigurations`, `dayStatusEntries`) in die entsprechenden Subkollektionen unter `/tenants/{tenantId}/` kopieren.
4. **Private Userdaten aktualisieren:**
   - Im Dokument `/users/{userId}/privateInfo/user_tenant_role` die neue Zuordnung speichern.
5. **Abschluss:**
   - Nach erfolgreicher Migration arbeitet der User nur noch mit den neuen Tenant-Daten.
   - Optional: Die alten Daten können gelöscht werden.
6. **Validierung:**
   - Nach der Migration prüfen, ob alle Daten korrekt übernommen wurden und die App wie erwartet funktioniert.

**Hinweise:**

- Die Migration sollte atomar und möglichst fehlerresistent ablaufen.
- Die Migration kann beliebig oft getestet werden, solange die neuen Daten nicht produktiv genutzt werden.
- Nach der Migration muss die Anwendung ausschließlich mit der neuen Struktur arbeiten.

---

## Schritt 7: Firestore-Regeln anpassen (🟡 In Bearbeitung)

**Ziel:**

- Die Firestore-Sicherheitsregeln auf die neue mandantenfähige Datenstruktur und die rollenbasierte Berechtigungslogik anpassen.
- Sicherstellen, dass alle Zugriffe und Änderungen nur gemäß Rolle und Zuordnung möglich sind.

**ToDos:**

- [ ] Neue Regeln für `/tenants/{tenantId}/...` gemäß Konzept implementieren
- [ ] Funktionen für `isMemberOf` und `isAdminOf` in den Regeln anlegen
- [ ] Feingranulare Regeln für Subkollektionen (`persons`, `dayStatusEntries`, etc.) umsetzen
- [ ] Regeln für private Userdaten (`/users/{userId}/privateInfo/...`) beibehalten
- [ ] Validierung der Regeln mit Firestore Emulator und Tests
- [ ] Dokumentation der Regeln im Projekt

**Theoretische Umsetzungsschritte:**

1. **Regeln für private Userdaten:**
   - Weiterhin: Nur der eingeloggte User darf auf seine privaten Daten zugreifen.
2. **Regeln für Tenant-Daten:**
   - Lesezugriff für alle, die im Mandanten als Person mit `userId` eingetragen sind.
   - Schreibzugriff nur für `admin`-Rolle.
   - Feingranulare Regeln für das Bearbeiten/Löschen von Personen, Einträgen etc. gemäß Rolle.
3. **Hilfsfunktionen:**
   - `isMemberOf(tenantId)`, `isAdminOf(tenantId)` als Hilfsfunktionen in den Regeln implementieren.
4. **Validierung:**
   - Mit Emulator und Test-Usern alle Szenarien (admin/member, erlaubte/unerlaubte Aktionen) durchspielen.
5. **Dokumentation:**
   - Die Regeln und ihre Logik im Projekt dokumentieren.

**Hinweise:**

- Die Sicherheit basiert auf der UID und der Zuordnung im `person`-Dokument.
- Die Regeln sollten möglichst keine Custom Claims benötigen, sondern direkt auf die Datenstruktur prüfen.

---

## Schritt 8: Testen & Validieren (🟡 In Bearbeitung)

**Ziel:**

- Sicherstellen, dass die Anwendung nach der Umstellung auf Multi-Tenant fehlerfrei, sicher und wie erwartet funktioniert.
- Alle Rollen, Datenflüsse und Berechtigungen werden umfassend getestet.

**ToDos:**

- [ ] Manuelle Tests für alle Rollen und Use Cases (admin/member, Onboarding, Migration, Einladungen, Datenzugriffe)
- [ ] Automatisierte Tests für zentrale Funktionen und Berechtigungen
- [ ] Tests der Firestore-Regeln mit Emulator und Test-Usern
- [ ] UI-Tests für rollenbasierte Sichtbarkeit und Aktionen
- [ ] Validierung der Datenmigration (Konsistenz, Vollständigkeit)
- [ ] Fehler- und Edge-Case-Tests (z.B. fehlende Zuordnung, ungültige Rollen, Netzwerkfehler)
- [ ] Feedback- und Bugfix-Phase nach ersten Live-Tests

**Theoretische Umsetzungsschritte:**

1. **Manuelle Testszenarien:**
   - Alle Kern-Workflows für beide Rollen (admin/member) durchspielen.
   - Onboarding, Einladung, Migration, Datenbearbeitung, Rechteprüfung testen.
2. **Automatisierte Tests:**
   - Unit- und Integrationstests für zentrale Hooks, Services und Komponenten schreiben/erweitern.
   - Firestore-Regeln mit Emulator und Testdaten prüfen.
3. **UI- und Berechtigungstests:**
   - Sichtbarkeit und Interaktionsmöglichkeiten in der UI für beide Rollen testen.
   - Fehlerfälle und Berechtigungsverletzungen simulieren.
4. **Migration validieren:**
   - Nach Migration prüfen, ob alle Daten korrekt übernommen wurden und keine Altpfade mehr genutzt werden.
5. **Feedback- und Bugfix-Phase:**
   - Nach ersten Live-Tests Rückmeldungen sammeln und ggf. nachbessern.

**Hinweise:**

- Umfassende Tests sind essenziell, um Datenverlust, Sicherheitslücken und Usability-Probleme zu vermeiden.
- Die Testphase sollte vor dem produktiven Rollout abgeschlossen sein.

---

Die Datei wird nach jedem Schritt aktualisiert.
