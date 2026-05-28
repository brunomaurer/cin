# Weg A — Weiterentwicklung bestehende Plattform

> Analyse: 2026-05-28 | Quelle: Code-Tiefenanalyse trendradar-Repo (5'635 Commits, 4+ Jahre)

## Zusammenfassung

Die bestehende Plattform weiterentwickeln, modernisieren und mit KI erweitern.

## Was muesste passieren

1. **.NET 6 → .NET 8/9 Upgrade** (Framework ist EOL seit Nov 2024)
2. **EF Core Version-Alignment** (aktuell EF 7 auf .NET 6 — Mismatch)
3. **God-Classes zerlegen** (6+ Services ueber 500 LOC, ExplorerServiceV2 hat 19 Dependencies)
4. **Tests schreiben** (aktuell 2.7% Backend, ~0% Frontend)
5. **Security fixen** (Custom AES-Crypto mit schwacher IV-Ableitung, Tenant-Isolation nur Application-Level)
6. **153 DB-Migrationen aufraaeumen**
7. **87 Controller / 250 Endpoints** konsolidieren (v1 API + v1 MVC + v2 API parallel)
8. **AI-Features erweitern** (bestehende Interview-Runtime als Basis)

## Warum die KI das nicht einfach uebernehmen kann

### Domaenenwissen fehlt
- 63 Entities, 165 Services, 250 Endpoints — das Business-Wissen warum der Code was tut steckt **in den Koepfen der ukrainischen Devs**, nicht im Code
- Keine Kommentare, keine Specs, keine Architektur-Docs
- Jede Aenderung an einer God-Class kann unvorhersehbare Seiteneffekte haben

### Keine Tests = Blindflug
- 35 Testklassen fuer ~1'500 Produktionsdateien
- **0 Controller-Tests** (87 Controller, null Tests)
- **0 Tests fuer AI-Features** (Kernprodukt!)
- **0 Tests fuer Custom Crypto** (sicherheitskritisch!)
- Claude kann Code aendern, aber niemand kann verifizieren ob die Aenderung was kaputt macht

### Strukturelle Kopplung
- UserActionHistoryServiceExtensions: **947 Zeilen** mit riesigen Case-Statements
- WidgetService: **784 Zeilen**, macht Validation + Creation + Mapping + History + Notifications
- ExplorerServiceV2: **601 Zeilen**, 19 Dependencies im Konstruktor
- Eine Aenderung zieht 5 andere nach sich → deshalb dauert jedes Feature so lange

### Kein Live-Zugang
- Claude kann nicht deployen, nicht monitoren, nicht auf Prod-Incidents reagieren
- Claude kann die App nicht starten und durchklicken
- Jede Session ist ein Neustart — kein "morgens Laptop aufklappen und weitermachen"

## EOL- und Sicherheitsrisiken

| Risiko | Schwere | Detail |
|---|---|---|
| .NET 6 EOL | **KRITISCH** | Keine Security-Patches seit Nov 2024. Jede bekannte Vulnerability ist offen. |
| Custom AES-Crypto | **HOCH** | IV aus Key-Material abgeleitet (kryptographisch schwach). Key-Padding mit konstantem Byte. Sollte durch PostgreSQL-native Loesung ersetzt werden. |
| Tenant-Isolation | **HOCH** | TenantId-Filtering nur im C#-Code, nicht auf DB-Ebene. Ein Bug kann Kundendaten leaken. |
| EF Core Mismatch | **MITTEL** | EF 7 auf .NET 6 Target — ungetestete Kombination, kann bei Upgrade brechen. |
| Hangfire veraltet | **NIEDRIG** | In-Memory-Storage, nicht produktionstauglich fuer Skalierung. |

## Kostenabschaetzung

| Posten | Aufwand | Kosten (extern, ~80 CHF/h) |
|---|---|---|
| .NET 8 Upgrade + EF Alignment | 2-3 Wochen | 8'000-12'000 CHF |
| Test-Aufbau (Mindest-Coverage 30%) | 4-6 Wochen | 16'000-24'000 CHF |
| God-Class-Decomposition | 3-4 Wochen | 12'000-16'000 CHF |
| Security-Fixes (Crypto + Tenant) | 2 Wochen | 8'000 CHF |
| **Summe nur Modernisierung** | **11-15 Wochen** | **44'000-60'000 CHF** |

→ Das ist **ein ganzer Jahresumsatz** nur fuer Modernisierung, **ohne ein einziges neues Feature**.

## Wenn Bruno + Mischa + Claude statt externe Devs

- Kosten fallen weg (nur Claude-Abo)
- **Aber:** Zeitaufwand bleibt, Risiko steigt (kein Domaenenwissen, keine Tests)
- Realistisch: 6-12 Monate bis die Plattform modernisiert waere
- In dieser Zeit: **Null neue Features, null neuer Umsatz**

## Fazit

Weiterentwicklung ist **technisch moeglich, aber oekonomisch sinnlos**. Der Aufwand die Altlasten zu bereinigen frisst mindestens ein Jahr — ohne dass ein einziger neuer Kunde gewonnen wird. Das Backend ist strukturell so verkoppelt, dass schnelle Feature-Entwicklung auch nach Modernisierung schwierig bleibt.
