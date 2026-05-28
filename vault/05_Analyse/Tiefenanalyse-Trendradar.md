# Tiefenanalyse: trendradar Codebase

> Durchgefuehrt: 2026-05-28 | Repo: 5'635 Commits, 4+ Jahre, 10 Autoren

## Eckdaten

| Kennzahl | Wert |
|---|---|
| Erster Commit | 06.02.2022 |
| Letzter Commit | 28.05.2026 |
| Total Commits | 5'635 |
| Hauptautor | alex.st (80%, koordinierte externe Devs) |
| Backend LOC | ~31'000 (C#) |
| Frontend LOC | ~12'000 (TypeScript/React) |
| Entities | 63 |
| Services | 91 (in 47 Ordnern) |
| Controller | 87 |
| REST Endpoints | ~250 |
| DB-Migrationen | 153 |
| Test-Coverage Backend | 2.7% (35 Testklassen) |
| Test-Coverage Frontend | ~0% (2 Testfiles fuer 398 Komponenten) |

## Frontend-Bewertung: B+

**Staerken:**
- React 19, TypeScript strict, Vite 7, Chakra v3
- Feature-basierte Architektur mit sauberer Trennung
- Redux Toolkit + React Query (intelligent getrennt)
- API-Layer mit Retry, Throttling, Circuit Breaker
- Zod + react-hook-form + i18n-Integration

**Schwaechen:**
- 6 Komponenten ueber 500 LOC (FiltersOverlay 896, WorkflowTypeForm 750)
- Quasi null Tests
- MUI → Chakra Migration noch nicht abgeschlossen

**Fazit:** Das Frontend ist das beste Asset. Patterns sind wiederverwendbar.

## Backend-Bewertung: D+

**Staerken:**
- Sauberes Projekt-Layering (14 Projekte)
- Async/await durchgehend
- API-Versionierung vorhanden
- Multi-Tenancy-Awareness (separate DB-Contexts)

**Kritische Schwaechen:**

### God-Classes
| Service | LOC | Problem |
|---|---|---|
| UserActionHistoryServiceExtensions | 947 | Riesige Case-Statements, TODO "use RabbitMQ" nie umgesetzt |
| WidgetService | 784 | Validation + Creation + Mapping + History + Notifications in einer Klasse |
| ExplorerServiceV2 | 601 | **19 Dependencies** im Konstruktor |
| RelationService | 566 | Monolithische Business-Logik |
| BoardContentService | 552 | Aufgeblaeht |
| ContentService | 533 | Sollte Read/Write getrennt sein |

### Sicherheit
- **Custom AES-Crypto:** IV aus Key-Material abgeleitet (kryptographisch schwach), Key-Padding mit konstantem Byte (111)
- **Tenant-Isolation:** Nur im Application-Code, nicht auf DB-Ebene. Ein Bug kann Kundendaten leaken.
- **.NET 6 EOL:** Keine Security-Patches seit November 2024

### Architektur
- 87 Controller in 3 verschiedenen Patterns (v1 API, v1 MVC, v2 API)
- 153 DB-Migrationen + 19 Custom-SQL-Scripts
- Authorization verstreut ueber Services (kein zentraler Filter)
- Keine Policy-basierte Autorisierung

### Tests
- 0 Controller-Tests
- 0 Tests fuer AI-Features
- 0 Tests fuer Custom Crypto
- 0 Concurrency-Tests trotz async/await ueberall

## Git-History Erkenntnisse

- **alex.st** (80%) koordinierte, ukrainische Devs machten die Arbeit
- **Professioneller Workflow:** GitFlow, PRs, semantische Releases
- **Commit-Messages:** 30-40% gut, 60% nur Ticket-IDs
- **Tempo:** ~15 Commits/Monat historisch = 3 Features/Quartal bei 20k Budget
- **Hotspots:** site.css (681 Aenderungen), AppDbContextModelSnapshot (195), BoardContentService (116), WidgetService (110)
- **Juengste Aktivitaet:** vika.k seit Maerz 2026 aktiv (129 Commits)

## Gesamtfazit

Das Frontend ist gut und wiederverwendbar. Das Backend ist die Altlast: EOL-Framework, God-Classes, keine Tests, Sicherheitsmaengel. Die Architektur erklaert warum Feature-Entwicklung so teuer und langsam ist — das Problem ist strukturell, nicht personell.
