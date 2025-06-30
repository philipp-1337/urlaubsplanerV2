# Fortschritt Multi-Tenant-Refactoring

Stand: 30.06.2025

## Fortschrittstabelle

| Schritt | Beschreibung | Status | Letztes Update |
|---------|--------------|--------|---------------|
| 1       | Analyse & Vorbereitung | ✅ Abgeschlossen | 27.06.2025 |
| 2       | Erweiterung AuthContext | ✅ Abgeschlossen | - |
| 3       | Refactoring Firestore-Zugriffe | ✅ Abgeschlossen | - |
| 4       | Rollenbasierte UI | ✅ Abgeschlossen | 30.06.2025 |
| 5       | Onboarding/Einladung | 🟡 In Bearbeitung | 28.06.2025 |
| 6       | Migration bestehender Daten | 🟡 In Bearbeitung | - |
| 7       | Firestore-Regeln anpassen | 🟡 In Bearbeitung | 28.06.2025 |
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

## Schritt 3: Refactoring Firestore-Zugriffe (✅ Abgeschlossen)

**Ziel:**

- Alle Firestore-Zugriffe von `/users/{userId}/...` auf `/tenants/{tenantId}/...` umstellen.
- Die `tenantId` wird aus dem AuthContext bezogen.
- Sicherstellen, dass Hooks und Komponenten erst Daten laden, wenn die `tenantId` verfügbar ist.

**Umsetzung:**

- Alle zentralen Firestore-Operationen in `useFirestore.js` nutzen jetzt die neue mandantenfähige Struktur und beziehen die `tenantId` aus dem AuthContext.
- Eine Hilfsfunktion sorgt für konsistente Pfade.
- Die Daten werden nur geladen, wenn die `tenantId` verfügbar ist.
- Alle Haupt- und Detailkomponenten (SettingsPage, PersonManagementSection, YearlyPersonDataSection, GlobalDaySettingsSection, MonthlyView, YearlyOverview, MonthlyDetail, CalendarView, DayCell) wurden systematisch geprüft und auf die neue Datenstruktur umgestellt bzw. benötigen keine eigene Anpassung, da sie ihre Daten und Funktionen korrekt über Context/Hooks erhalten.
- Props, States und useEffect-Dependencies sind überall auf die neue Struktur angepasst.
- Fallbacks und Loading-Handling sind implementiert (Checks auf tenantId, loadingUserTenantRole etc.).
- Tests und Validierung der neuen Datenpfade wurden durchgeführt.

**Status:**

- Schritt 3 ist vollständig abgeschlossen. Es sind keine weiteren Maßnahmen erforderlich.

**Nächster Schritt:**

- Komponenten und UI-Logik anpassen, sodass sie mit der neuen Tenant-Struktur und dem Context arbeiten (Schritt 4: Rollenbasierte UI).

---

## Schritt 4: Rollenbasierte UI (✅ Abgeschlossen)

**Umsetzung (Stand 30.06.2025):**

- Alle relevanten Komponenten (SettingsPage, YearConfigurationSection, PersonManagementSection, YearlyPersonDataSection, GlobalDaySettingsSection, InviteMemberSection, MonthlyView, CalendarView, DayCell) wurden systematisch auf rollenbasierte Logik geprüft und angepasst.
- Nur Nutzer mit der Rolle `admin` können mutierende Aktionen (Hinzufügen, Bearbeiten, Löschen, globale Einstellungen) für alle Einträge durchführen.
- Mitglieder (`member`) können ausschließlich eigene Einträge bearbeiten, keine globalen Einstellungen oder andere Personen.
- In allen Komponenten werden Buttons und Eingabefelder für nicht-berechtigte Nutzer deaktiviert oder gar nicht angezeigt. Überall gibt es sinnvolles UI-Feedback (Disabled-State, Hinweis, Tooltip).
- Die Rollenlogik ist zentral im AuthContext und in den Komponenten implementiert, keine doppelten Checks im Code.
- Die Logik ist sowohl in den Settings- als auch in den Kalender-/Dashboard-Komponenten konsistent umgesetzt.
- Übersichts- und reine Navigationskomponenten benötigen keine zusätzliche Rollenlogik.
- Die Umsetzung wurde manuell geprüft und entspricht dem Konzept.

**Status:**

- Die rollenbasierte UI ist in allen Kernbereichen vollständig umgesetzt und geprüft.
- Nächste Schritte: Validierung, Tests und ggf. Feinschliff in Spezial- oder Hilfskomponenten.

---

## Schritt 5: Onboarding/Einladung (🟡 In Bearbeitung)

**Update 28.06.2025:**
- Onboarding-Dialog für neue Nutzer ist implementiert und wird automatisch angezeigt, wenn nach Login keine Tenant-Zuordnung existiert. Nutzer können so einen neuen Mandanten anlegen und werden als Admin-Person eingetragen.
- Admins können über die neue Komponente `InviteMemberSection` in den Einstellungen neue Mitglieder (Personen) zum Tenant einladen. Optional kann eine E-Mail-Adresse angegeben werden.
- Die Einladung ist nur für Admins sichtbar. Die Person wird ohne `userId` angelegt und kann nach Registrierung zugeordnet werden.
- Feedback für erfolgreiche Einladungen ist im UI enthalten.
- Nächste Schritte: Validierung auf doppelte Einladungen/E-Mails, optional E-Mail-Versand, Self-Service-Registrierung, weitere Tests und Feinschliff.

**Status:**
- Onboarding- und Einladungs-Flow sind im UI technisch umgesetzt und testbar.

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

**Update 28.06.2025:**
- Die Firestore-Regeln wurden so erweitert, dass sowohl das alte (`/users/{userId}/...`) als auch das neue Multi-Tenant-Modell (`/tenants/{tenantId}/...`) parallel abgesichert sind.
- Die bestehenden Regeln wurden nicht verändert, sondern um die neuen ergänzt. Beide Datenstrukturen sind während der Übergangsphase sicher nutzbar.
- Nächste Schritte: Validierung der Regeln mit Emulator und Test-Usern, Dokumentation und ggf. Entfernen der alten Regeln nach Abschluss der Migration.

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

## Stand der Multi-Tenant-Umstellung (27.06.2025)

**Bereits umgesetzt:**

- Analyse, Vorbereitung und Konzeptdokumentation
- Erweiterung des AuthContext: Tenant- und Rollen-Infos werden global bereitgestellt
- Refactoring aller zentralen Firestore-Hooks und Contexts auf die neue Struktur (`/tenants/{tenantId}/...`)
- Umstellung und Prüfung aller Haupt- und Detailkomponenten (Settings, Dashboard, Kalender, Personenverwaltung, Detailansichten, Spezialkomponenten)
- Komponenten greifen nur noch auf Context/Hooks zu, keine alten Firestore-Pfade mehr
- UI-Logik ist tenant- und rollenbasiert vorbereitet

**Offen/Empfohlene nächste Schritte:**

- Schritt 4: Rollenbasierte UI finalisieren (Sichtbarkeit, Schreibrechte, UI-Feedback für Rollen)
- Schritt 5: Onboarding/Einladungs-Flow implementieren und testen
- Schritt 6: Migration bestehender Daten (UI-Button/Prozess, Validierung, ggf. Alt-Daten löschen)
- Schritt 7: Firestore-Regeln final anpassen und mit Emulator testen
- Schritt 8: End-to-End-Tests, Fehlerfälle, Edge Cases und Feedback-Phase
- Kleinere Hilfs- oder Spezialkomponenten prüfen (falls noch nicht geschehen)

**Fazit:**
Die technische Basis und die Kernlogik sind mandantenfähig. Die letzten Schritte betreffen vor allem die User Experience, Sicherheit und Datenmigration.

---

Die Datei wird nach jedem Schritt aktualisiert.
