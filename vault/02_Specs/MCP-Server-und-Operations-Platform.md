# MCP Server + CIN Operations Platform

> Status: Brainstorming | Stand: 2026-05-30
> Meeting-Protokoll: [[../01_Decisions/Meeting-2026-05-29]]
> Architektur-Diagramm: [[Architektur-Vision.canvas]]

## Kontext

Am Founder-Meeting vom 29. Mai 2026 wurde entschieden, CIN weiterzufuehren und zu fokussieren. Das Budget fuer externe Entwicklung ist aufgebraucht. Der Vertrieb wird per Ende Juni heruntergefahren. Stattdessen soll CIN mit einem Self-Service-Modell neue Kunden gewinnen: Eine Landing-Page mit Template-Auswahl, Zahlungsanbindung und automatisiertem Onboarding. Intro-Preis: 199 CHF fuer einen Monat.

Die bestehenden AI-Agents (Interview-Agent, Content-Generator, Widget-basierte Content-Generierung) sind die technologische Grundlage. Agents werden die Zukunft von CIN sein.

## Vision

Claude (oder ein anderer AI-Orchestrator) kann ueber einen MCP Server **komplette Branchen-Radars automatisiert aufsetzen**. Ein Lead waehlt auf einer Onepage sein Branchen-Template, gibt die Kreditkarte ein und hat fuer 199 CHF/Monat einen laufenden Trend-Radar. Das Paket beinhaltet 15 branchenspezifische Trends (im Onboarding per KI-Bot erfragt), eine vorbereitete Rating-Kampagne und 4-5 Action Boards.

## Die zwei Bausteine

### 1. MCP Server (Steuerrad)

**Was:** Ein MCP-kompatibler Server der Claude Tools zur Verfuegung stellt um den trendradar zu steuern.

**Stack:** TypeScript / Node.js (MCP SDK ist TypeScript-first)

**Spricht mit:**
- trendradar PostgreSQL (direkter DB-Zugriff, dieselbe Datenbank wie das .NET Backend)
- CIN Operations Platform (Tenant-Management)

**Architektur-Ansatz:** Der MCP Server hat eine eigene MCP-API (TypeScript), die direkt auf die trendradar PostgreSQL-Datenbank zugreift — dieselbe Datenbank, die auch das bestehende .NET Backend nutzt. Kein API-Wrapping, kein Token-Refresh, kein Form-Post-Hacking. Kunden, die im React Frontend arbeiten, sehen Aenderungen sofort, weil beide Systeme dieselbe Datenbank lesen und schreiben.

**Tools die Claude bekommt:**

| Tool | Was es tut | Backend |
|---|---|---|
| `create_tenant` | Neuen Mandanten anlegen | Operations Platform |
| `create_content_type` | Steckbrief-Typ erstellen mit Widgets | MCP-API (direkt DB) |
| `create_rating_structure` | Rating-Felder fuer Content Type definieren | MCP-API (direkt DB) |
| `create_content_item` | Steckbrief anlegen und alle Widgets ausfuellen | MCP-API (direkt DB) |
| `update_content_item` | Steckbrief aktualisieren | MCP-API (direkt DB) |
| `generate_image` | Bild fuer Steckbrief via DALL-E generieren | MCP-API (direkt DB) |
| `create_relations` | Verlinkungen zwischen Steckbriefen erstellen | MCP-API (direkt DB) |
| `create_campaign` | Interview-Kampagne aufsetzen | MCP-API (direkt DB) |
| `create_workflow_type` | Workflow-Typ definieren | MCP-API (direkt DB) |
| `create_workflow` | Workflow mit Tracks erstellen | MCP-API (direkt DB) |
| `list_content_items` | Steckbriefe durchsuchen/filtern | MCP-API (direkt DB) |
| `get_content_details` | Steckbrief-Details abrufen | MCP-API (direkt DB) |
| `list_campaigns` | Kampagnen auflisten | MCP-API (direkt DB) |
| `list_workflows` | Workflows auflisten | MCP-API (direkt DB) |

**DB-Zugriff:**
1. MCP-API verbindet sich direkt mit der trendradar PostgreSQL-Datenbank
2. Kein JWT-Token-Management noetig — direkter DB-Zugriff
3. Tenant-Context wird pro Aufruf als DB-Filter mitgegeben
4. Eine TypeScript-Codebasis fuer alle MCP Tools

### 2. CIN Operations Platform (Backoffice)

**Was:** Eigener Microservice der alles managed was um das Produkt herum laeuft.

**Stack:** TypeScript / Node.js + PostgreSQL (oder Supabase)

**Module:**

| Modul | Funktion |
|---|---|
| **Tenant-Lifecycle** | Erstellen, aktivieren, pausieren, loeschen. Template-basiertes Provisioning. |
| **Template-Katalog** | Branchen-Radar-Templates verwalten (welche Content Types, Widgets, Beispiel-Steckbriefe) |
| **Mini CRM** | Leads, Kunden, Kontakte. Kein Salesforce — nur das Noetigste. |
| **Ticketing** | Support-Anfragen erfassen, Status tracken. Kein Jira — minimale Request/Response-Liste. |
| **Billing + Token-System** | Stripe-Integration. Tier-basiertes Modell mit monatlichen Token-Limits. Zusaetzliche Token-Pakete dazukaufbar. Trial (199 CHF), Conversion, Kuendigung. |
| **Onboarding API** | Endpoint fuer die Onepage: Template waehlen → Tenant erstellen → Stripe Session → Fertig. |
| **Transaktionssystem** (Prio 3) | Token-Verbrauch pro Tenant tracken, Tier-Upgrades anstossen, Zusatzpakete verkaufen. |

## Strategische Vorteile

### Kunde im Zentrum — vom ersten Klick bis zum Upsell

Mit einem kompakten, integrierten System (CRM + Ticketing + Billing in einer Plattform) ist der Kunde immer im Zentrum. Keine Medienbrueche, kein Pipedrive, kein separates Ticketing — ein Datensatz pro Kunde vom Lead bis zum Enterprise.

**Automatisierte Lead-to-Revenue Pipeline:**
Neue Leads koennen komplett automatisiert zum Abschluss geleitet werden. Kein manueller Uebergabepunkt zwischen Marketing, Vertrieb und Onboarding. Die gesamte Kette laeuft ohne menschlichen Eingriff:

```
Landing-Page → CRM (auto) → Stripe (199 CHF) → MCP (Radar deployed) → Kunde arbeitet → Upsell
```

### Tier- und Token-Modell fuer Revenue-Wachstum

Sobald Geld fliesst, geht es darum die Kunden auf hoehere Tiers zu heben und weitere User abzuschliessen. Die Operations Platform trackt den Token-Verbrauch, erkennt Power-User und kann automatisiert Upgrade-Vorschlaege machen.

| Tier | Preis | Inkludiert |
|---|---|---|
| **Starter** | 199 CHF/Mt | 15 Trends, 1 Kampagne, 5 Action Boards, Basis-Token-Kontingent |
| **Professional** | TBD | Unbegrenzte Trends, mehrere Kampagnen, erweitertes Token-Kontingent, mehrere User |
| **Enterprise** | TBD | Alles unbegrenzt, dedizierter Support, Custom Templates |
| **Token-Pakete** | Ab TBD | Zusaetzliche KI-Token wenn Monatskontingent aufgebraucht |

### Warum CRM und Ticketing integriert sein muessen

- **Ein Datensatz pro Kunde** — Kontaktdaten, Vertrag, Tickets, Token-Verbrauch, Zahlungshistorie an einem Ort
- **Automatische Statusuebergaenge** — Lead → Trial → Kunde → Churn-Risiko, alles automatisch
- **Support im Kontext** — bei einem Ticket sieht man sofort: Welcher Tier, wie lange dabei, Token-Verbrauch
- **Datengetriebene Entscheidungen** — Conversion-Rates, beste Templates, Upgrade-Muster aus einer Quelle

### Zusammenspiel

```
Lead besucht Onepage
  → waehlt Branchen-Template
  → gibt Kreditkarte ein (Stripe)
  → Operations Platform erstellt Tenant
  → MCP Server deployed Template in den Tenant (direkt via DB):
      1. Content Types + Rating-Strukturen anlegen
      2. Beispiel-Steckbriefe mit Bildern erstellen
      3. Relations setzen
      4. Standard-Kampagne aufsetzen
      5. Workflow-Template aktivieren
  → Kunde hat fertigen Branchen-Radar in 5 Minuten
  → Kunde arbeitet im React Frontend (.NET Backend liest/schreibt dieselbe DB)
```

## Zeitplan (Claude Code baut)

### Phase 1 — MCP Server + MCP-API (3-4 Wochen)

| Was | Sessions | Detail |
|---|---|---|
| Projekt-Setup + MCP SDK | 1-2 | TypeScript, MCP Server Skeleton, Config |
| DB-Schema verstehen + Zugriff | 3-4 | trendradar PostgreSQL Schema analysieren, DB-Client einrichten |
| Content Tools (CRUD + Widgets) | 3-4 | create/update/list/get Content Items direkt via DB |
| Content Type + Rating Tools | 3-4 | Direkt via DB (kein MVC Form-Post-Hacking noetig) |
| Image Generation Tool | 1-2 | DALL-E Integration |
| Relations Tool | 1-2 | Create/Read direkt via DB |
| Campaign + Workflow Tools | 2-3 | Direkt via DB |
| Testing + Debugging | 3-4 | Gegen trendradar PostgreSQL testen, Konsistenz pruefen |
| **Total Phase 1** | **~18-24 Sessions** | **Ergebnis: MCP Server mit eigener MCP-API und direktem DB-Zugriff** |

### Phase 2 — Operations Platform (1-2 Wochen)

| Was | Sessions | Detail |
|---|---|---|
| DB-Schema + Setup | 1-2 | Eigene Operations DB: Tenants, Contacts, Tickets, Templates |
| Tenant-Lifecycle API | 2-3 | CRUD, Status-Management, Provisioning |
| Template-Katalog | 1-2 | Branchen-Templates definieren + speichern |
| Mini CRM | 1-2 | Leads, Kunden, minimale Kontaktverwaltung |
| Ticketing | 1-2 | Requests erfassen, Status, Antworten |
| MCP Tools fuer Ops | 1-2 | create_tenant, list_tenants etc. in MCP einhaengen |
| **Total Phase 2** | **~8-12 Sessions** | **Ergebnis: Laufende Operations Platform (eigene DB)** |

### Phase 3 — Onboarding + Billing (1-2 Wochen)

| Was | Sessions | Detail |
|---|---|---|
| Stripe Integration | 2-3 | Checkout Session, Webhooks, Trial-Logik |
| Onboarding API | 1-2 | Template → Tenant → Stripe → Deploy |
| Onepage Frontend | 2-3 | React Landing, Template-Picker, Stripe Elements |
| Auto-Provisioning Flow | 2-3 | MCP orchestriert Template-Deployment in neuen Tenant |
| **Total Phase 3** | **~8-12 Sessions** | **Ergebnis: Self-Service Onboarding live** |

### Gesamtschaetzung

| Phase | Sessions | Kalenderzeit |
|---|---|---|
| Phase 1: MCP Server + MCP-API | 18-24 | 3-4 Wochen |
| Phase 2: Operations Platform | 8-12 | 1-2 Wochen |
| Phase 3: Onboarding + Stripe | 8-12 | 1-2 Wochen |
| **Total** | **34-48 Sessions** | **5-8 Wochen** |

**"Session"** = eine Claude Code Sitzung (typisch 1-3 Stunden effektive Arbeit). Bei 2-3 Sessions pro Tag realistisch 5-8 Wochen Kalenderzeit.

**Voraussetzung:** Bruno oder Mischa muss pro Session ~15-30 Min fuer Review, Testing und Fragen einplanen. Ich baue, ihr prueft.

## Abhaengigkeiten und Risiken

| Risiko | Mitigierung |
|---|---|
| Parallele DB-Writes (MCP-API + .NET Backend schreiben gleichzeitig) | Saubere Transaktionen, DB-Constraints, keine ueberlappenden Schreiboperationen auf denselben Records |
| DB-Schema muss vollstaendig verstanden werden | Gruendliche Analyse in Phase 1, Testabfragen gegen Dev-DB |
| Schema-Aenderungen im .NET Backend | Absprache mit Entwicklern, DB-Migrationen gemeinsam managen |
| trendradar PostgreSQL muss erreichbar sein fuer Tests | Dev-Instanz oder Staging-DB nutzen |
| Stripe-Integration braucht Account | Stripe Test-Mode nutzen |
| Operations Platform hat eigene DB — Konsistenz mit trendradar | Klare Trennung: Ops DB nur fuer CRM/Tickets/Billing, trendradar DB fuer Produkt-Daten |

## Offene Fragen

1. Laeuft eine trendradar Dev-Instanz die ich ansprechen kann? (URL + Credentials)
2. Welche Branchen-Templates wollt ihr als erste? (damit ich ein konkretes Beispiel habe)
3. Habt ihr schon einen Stripe-Account?
4. Soll die Operations Platform eine eigene UI bekommen oder reicht API + Claude?
