# Weg B — Fokussiertes Greenfield

> Analyse: 2026-05-28

## Zusammenfassung

Neues, schlankes Produkt bauen. Fokus auf den Kern-Value: **Trend-Radar + Ideation + KI-native Kampagnen + Action Boards**. Voll mandantenfaehig ab Tag 1. Altes System im Maintenance-Modus (Bugfixes only) fuer bestehende Kunden.

## Was anders waere

### Fokus statt Feature-Bloat
- Bestehende Plattform: **63 Entities, 165 Services, 250 Endpoints, 87 Controller**
- Neues Produkt: **~10-15 Kern-Entities, ~20-30 Endpoints** fuer den Start
- Nur bauen was Kunden wirklich nutzen und zahlen

### KI-native statt KI-angeflanscht
- Bestehend: OpenAI-Client nachtraeglich reingebaut, Interview-Campaigns als Sonderfall
- Neu: **KI ist der Kern** — Trend-Analyse, Ideation-Assistenz, Kampagnen-Auswertung, intelligentes Onboarding
- KI reduziert Klickerei: Statt 3 Leute fuer Setup → KI-gestuetzter Wizard der eine Plattform in 15 Minuten aufbaut

### Mandantenfaehigkeit richtig
- Bestehend: Tenant-Filtering im Application-Code (unsicher)
- Neu: **Row-Level Security auf DB-Ebene** (PostgreSQL Policies) — kann nicht durch Bugs umgangen werden

### Moderner Stack, den Bruno + Mischa + Claude ownen koennen
- **Frontend:** React 19 (Patterns aus bestehendem Frontend uebernehmen — das ist gut!)
- **Backend:** Node.js/TypeScript oder Python/FastAPI (kein .NET → Bruno + Mischa koennen reviewen)
- **DB:** PostgreSQL + Supabase (Auth, RLS, Realtime out-of-the-box)
- **Hosting:** Vercel (Frontend) + Supabase oder Railway (Backend)
- **KI:** Claude API / OpenAI direkt integriert

## Kern-Module (MVP)

| Modul | Was | Warum zuerst |
|---|---|---|
| **A · Trend-Radar** | Trends erfassen, kategorisieren, bewerten, visualisieren | Kern-Value fuer alle 3 Kunden |
| **B · Ideation** | Ideen sammeln, mit KI anreichern, bewerten | Zweiter Haupt-Usecase |
| **C · Kampagnen** | Outside-In Interviews/Umfragen mit KI-Auswertung | Differenzierung gegenueber Wettbewerb |
| **D · Action Boards** | Portfolio-Sicht, Umsetzungs-Tracking | Steuerungsinstrument fuer Management |

## Zeitplan (realistisch)

| Phase | Was | Dauer | Ergebnis |
|---|---|---|---|
| **1 — Foundation** | Auth, Tenants, DB-Schema, API-Grundgeruest, CI/CD | 4-6 Wochen | Lauffaehiges Skelett |
| **2 — Modul A (Trend-Radar)** | CRUD, Visualisierung, KI-Anreicherung | 4-6 Wochen | Erster Demo-faehiger Prototyp |
| **3 — Modul B+C (Ideation + Kampagnen)** | Ideen-Flow, Interview-KI, Auswertung | 6-8 Wochen | Feature-Paritaet fuer Kern-Usecases |
| **4 — Modul D (Action Boards)** | Portfolio-View, Dashboards | 4 Wochen | MVP komplett |
| **5 — Migration** | Bestehende Kundendaten migrieren | 2-4 Wochen | Kunden auf neuem System |
| **Gesamt** | | **20-28 Wochen** | **~5-7 Monate** |

## Kosten

| Posten | Kosten/Monat | Total (7 Monate) |
|---|---|---|
| Claude Code (Max-Plan) | ~180 CHF | ~1'260 CHF |
| Supabase (Pro) | ~25 CHF | ~175 CHF |
| Vercel (Pro) | ~20 CHF | ~140 CHF |
| Domain + Misc | ~10 CHF | ~70 CHF |
| **Total Infrastruktur** | **~235 CHF/Monat** | **~1'645 CHF** |

→ Gegenueber 44'000-60'000 CHF fuer Modernisierung des Bestehenden.

**Founder-Zeit:** Bruno + Mischa je ~10-15h/Woche fuer Review, Specs, Testing, Kundenfeedback.

## Was vom Bestehenden uebernommen wird

- **Frontend-Patterns:** Feature-Struktur, Axios-Client, React Query Setup, Chakra-Komponenten, Zod-Validation, i18n → alles reusable
- **Domaenenwissen:** Entity-Struktur als Referenz fuer neues DB-Schema
- **UX-Patterns:** Was funktioniert behalten, was zu kompliziert ist vereinfachen

## Risiken

| Risiko | Mitigierung |
|---|---|
| Bestehende Kunden verlieren | Altes System im Maintenance-Modus halten bis Migration |
| MVP reicht nicht | Eng mit 1-2 Kunden entwickeln, fruehes Feedback |
| Bruno + Mischa haben zu wenig Zeit | Klarer Spec-Prozess, Claude macht Implementation |
| KI-Kosten | Token-Budget pro Tenant, guenstigere Modelle fuer Standard-Tasks |
| Kein Product-Market-Fit | Validieren BEVOR Modul C+D gebaut werden |

## Finanzziel-Rechnung

**Ziel: 5'000 CHF/Founder/Jahr ab Jahr 1, Verdoppelung pro Jahr**

| Jahr | Ausschuettung/Founder | Total (4 Founder) | Noetige Einnahmen (inkl. Kosten ~5k/Jahr) |
|---|---|---|---|
| 1 | 5'000 CHF | 20'000 CHF | ~25'000 CHF |
| 2 | 10'000 CHF | 40'000 CHF | ~45'000 CHF |
| 3 | 20'000 CHF | 80'000 CHF | ~85'000 CHF |
| 4 | 40'000 CHF | 160'000 CHF | ~165'000 CHF |

**Szenarien fuer Jahr 1 (25k noetig):**
- Bestehende 3 Kunden migrieren = 60k → Ziel **sofort erreicht** wenn Kunden bleiben
- Oder: 3 Kunden auf reduziertem Preis (Migration-Rabatt) + 1 Neukunde
- Oder: 5 Neukunden a 5'000 CHF (niedrigere Einstiegsschwelle, mehr Volumen)

**Fuer Jahr 3 (85k):**
- ~10-15 Kunden a 7'000-8'000 CHF (durchschnittlich)
- Oder: Mix aus grossen (25k) und kleinen (5k) Kunden

**Hebel KI-natives Produkt:**
- Geringere Onboarding-Kosten → niedrigerer Preis moeglich → mehr Kunden
- Self-Service statt 3-Leute-Setup → Skalierbar ohne linearen Personalaufbau
- KI als Differenzierung → hoehere Zahlungsbereitschaft

## Fazit

Greenfield ist **guenstiger, schneller und fuehrt zu einem Produkt das Bruno + Mischa tatsaechlich ownen**. Der groesste Vorteil: Statt 12 Monate Modernisierung ohne neuen Umsatz → nach 5-7 Monaten ein lauffaehiges neues Produkt. Das bestehende Frontend liefert erprobte Patterns die uebernommen werden koennen.
