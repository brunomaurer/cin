# CIN Operations Center — Design Spec

> Status: Draft | Stand: 2026-06-07
> Canvas: [[Operations Brainstorming.canvas]]
> Kontext: [[../MCP-Server-und-Operations-Platform]]

## Zusammenfassung

Das Operations Center ist das interne Betriebssystem fuer CIN. Es verwaltet Kunden, Plattformen, Deployments und Support in einer einzigen Anwendung. Jede Funktion ist sowohl ueber ein Web-UI als auch ueber Agents/MCP steuerbar (API-First, Dual Interface).

## Architektur-Entscheidungen

| Entscheidung | Wahl | Begruendung |
|---|---|---|
| Architektur-Muster | Modularer Monolith | Einfach, klar strukturiert, spaeter auftrennbar |
| Stack | Next.js 16, React 19, TypeScript, Drizzle ORM | Gleicher Stack wie Finutti, Claude Code kann es bauen |
| Datenbank | Eigene Ops-DB (PostgreSQL) | Getrennt von Mandanten-DBs |
| Mandanten-DBs | Multi-DB beibehalten (1 pro Kunde) | Maximale Isolation, Updates via Agent automatisiert |
| Auth | Eigene Implementierung (JWT + TOTP 2FA) | Kein externer Service, volle Kontrolle |
| Hosting | Cloudsigma Linux VM | Alles auf einer Infrastruktur, neben MCP-API |
| Prozess-Manager | pm2 + nginx | Bewaehrt, laeuft so fuer MCP-API |
| CI/CD | Azure DevOps Pipelines | Bestehendes System, Integration ueber DevOps REST API |
| Interface | Dual: Web-UI + Agent/MCP | Alles was im UI geht, kann auch ein Agent |

## Rollen und Zugang

| Rolle | Wer | Zugang |
|---|---|---|
| Admin | Founder (Bruno, Mischa, Alexander, Urs) | Alles |
| Support | Mitarbeiter (spaeter) | Tickets, Kunden-Read, kein Billing/Lifecycle |
| Kunde | Endkunden | Eigene Tickets, Rechnungen, Account-Infos |

## Universelles Tagging-System

Alle Entitaeten im Operations Center koennen frei getaggt werden: Leads, Kunden, Kontakte, Plattformen, Deployments, Tickets. Tags sind farbcodiert (9 Farben: Blue, Teal, Green, Yellow, Red, Purple, Gray, Pink, Orange) und koennen moduluebergreifend gefiltert werden.

**Anwendungsbeispiele:**
- Leads: Branche (IT, Pharma, Bau), Prioritaet (Hot Lead, VIP), Kampagne (Q2, LinkedIn)
- Kunden: Branche, VIP, Tier-Zusatzinfo
- Plattformen: Environment (Prod, Test), Branche
- Deployments: Typ (Bugfix, Feature, Hotfix)
- Tickets: Typ (Bug, Feature, UX), Modul (Rating, Widget, Auth)

**Datenmodell (Ops-DB):**
- `tags` — Tag-Definitionen (Name, Farbe, Beschreibung)
- `entity_tags` — Zuordnung (entity_type, entity_id, tag_id) — polymorph fuer alle Entitaeten

**UI:**
- Jede Entitaet zeigt ihre Tags als farbige Badges
- `+ Tag` Button zum Hinzufuegen (Autocomplete aus bestehenden Tags)
- Tag-Filter-Bar oben auf Listen-Seiten (ein Klick = filtern)
- Tags werden auch in Detail-Ansichten angezeigt und sind dort editierbar

## Module

### Modul 1: CRM (Prioritaet 1)

Verwaltet den gesamten Kunden-Lebenszyklus von LinkedIn-Klick bis Churn. Ziel: Jeden Lead zur Kreditkarten-Eingabe fuehren und zum zahlenden Kunden machen.

**Lead-Akquise-Flow:**
```
LinkedIn-Kampagne
→ Link auf Onboarding-Page
→ ABSPRUNG? → LinkedIn-Profil-Link trotzdem ins CRM aufnehmen
→ Fullenrich: E-Mail aus LinkedIn-Profil ermitteln
→ Auto-Mail: "Willkommen bei CIN" (evt. mit Gutscheincode fuer Trial)
→ Lead wird vom KI-Agent weiter bearbeitet
```

**Onboarding-Flow (wenn Lead bleibt):**
```
Lead gibt KK ein + beschreibt Unternehmen kurz
→ Demo-Instanz wird automatisch erstellt (14 Tage kostenlos)
→ Nach 14 Tagen: Conversion oder Demo wird geloescht
→ Lead bleibt in jedem Fall im CRM zur Weiterbearbeitung
```

**Conversion:**
```
Lead bezahlt → wird Kunde
→ Erscheint in separater Kunden-Liste
→ Tier wird zugewiesen
→ Plattform-Aktivitaet wird sichtbar (Logins, Aktionen)
→ Direktlink zur Kunden-Plattform
```

**Funktionen:**
- Lead erfassen (Name, Firma, Branche, LinkedIn-Profil-URL, Quelle)
- Fullenrich.com API (LinkedIn-Profil → E-Mail + Firmendaten automatisch)
- E-Mail senden/empfangen ueber CRM-Mailbox (sales@cin.swiss, SMTP + IMAP)
- Antworten landen automatisch im CRM beim richtigen Lead/Kunden-Datensatz
- Lead → Kunde Konvertierung (KK-Eingabe, Demo-Erstellung)
- Kunden-Liste (separat von Leads, mit Tier-Anzeige + Plattform-Link)
- Aktivitaeten-Tracking (einfach: Anrufe, Mails, Notizen — manuell + automatisch)
- Plattform-Aktivitaet sichtbar (bewegt sich der Kunde auf der Plattform?)
- Kontakte-Pool (zusaetzliche Kontakte einladen, aus Pipedrive migriert)
- KI-Agent bearbeitet Kontakte-Pool (Neuigkeiten senden, Engagement)
- Payment / Stripe (einfache Anbindung):
  - Stripe Checkout Session fuer Trial-Start (KK-Eingabe)
  - Stripe Subscriptions (automatische monatliche Abrechnung)
  - Webhooks: payment_intent.succeeded, subscription.updated, subscription.deleted
  - Kunden-Ansicht: aktueller Tier, naechste Rechnung, Zahlungshistorie
  - Mahnungen bei fehlgeschlagener Zahlung (Stripe Dunning + E-Mail)
- Gutscheinverwaltung (Promo-Codes fuer Trial, Rabatte, Gueltigkeit → Stripe Coupons)
- Benutzerverwaltung Operations Center (Admins, Support-User anlegen/sperren)

**Pipedrive-Migration:**
- Bestehende Kontakte aus Pipedrive importieren
- Landen im Kontakte-Pool
- Werden durch KI-Agent bearbeitet und mit Neuigkeiten versorgt

**Datenmodell (Ops-DB):**
- `leads` — Interessenten (LinkedIn-URL, E-Mail, Firma, Status, Quelle)
- `customers` — Zahlende Kunden (Tenant-Referenz, Tier, Plattform-URL)
- `contacts` — Kontakte-Pool (aus Pipedrive + manuell, unabhaengig von Lead/Kunde)
- `activities` — Aktivitaeten pro Lead/Kunde/Kontakt (Typ, Datum, Notiz, Auto-Flag)
- `emails` — Gesendete + empfangene Mails (Thread pro Lead/Kunde)
- `subscriptions` — Stripe Subscription-Referenz, Tier, Status
- `invoices` — Rechnungshistorie (Stripe-Sync)
- `coupons` — Gutschein-Definitionen (Code, Rabatt, Gueltigkeit)
- `demo_instances` — Laufende Demos (Lead-Referenz, Erstelldatum, Ablaufdatum, Status)
- `ops_users` — Operations Center Benutzer (Admin/Support)

**Kunden-Status-Flow:**
```
LinkedIn-Klick → Lead (im CRM) → Trial (14 Tage Demo) → Kunde (bezahlt) → Upsell → Churned
                                                        ↘ Abgebrochen (Lead bleibt, Demo geloescht)
```

**Tiers (sichtbar pro Kunde):**
- Starter (199 CHF/Mt)
- Professional (TBD)
- Enterprise (TBD)

### Modul 2: Lifecycle (Prioritaet 2)

Technischer Betrieb aller Mandanten-Plattformen.

**Funktionen:**
- Plattform-Monitoring (Uptime, DB-Gesundheit, Fehler-Logs)
- Release Management (Versionen, Changelog, welcher Mandant auf welcher Version)
- Update / Deployment (1-Klick alle oder einzelne Mandanten updaten)
- Azure DevOps Integration (Pipelines triggern, Build-Status, Release-History)
- Environments (Production / Integration / Test pro Mandant)

**Azure DevOps Integration:**
- REST API Anbindung an Azure DevOps
- Pipelines lesen und triggern
- Release-Definitionen abfragen
- Build-Artefakte referenzieren

**Deployment-Flow:**
```
Release in DevOps → Ops Center zeigt neue Version
→ Admin waehlt Mandanten + Environment
→ 1-Klick → Pipeline wird getriggert
→ Status-Tracking bis fertig
→ DB-Migration laeuft automatisch pro Mandant-DB
```

**Datenmodell (Ops-DB):**
- `platforms` — Mandanten-Plattformen (DB-Connection, URL, Status, Version)
- `deployments` — Deployment-Historie (wann, wer, welche Version, welcher Mandant)
- `health_checks` — Monitoring-Ergebnisse (Timestamp, Status, Metriken)
- `releases` — Bekannte Releases (Version, Changelog, DevOps-Referenz)

### Modul 3: Onboarding (Prioritaet 3)

Automatisiertes Aufsetzen neuer Mandanten-Plattformen.

**Funktionen:**
- Agent Neue Plattform (vollautomatisch: DB erstellen, MCP Server triggern, Template deployen)
- Agent Monitoring (Token-Verbrauch tracken, Nutzungs-Analyse, Churn-Risiko erkennen)

**Onboarding-Flow:**
```
Kunde zahlt (Stripe Webhook)
→ Ops Center erstellt Mandant in Ops-DB
→ Agent erstellt neue PostgreSQL-DB
→ Agent triggert MCP Server:
    1. Content Types + Widgets anlegen
    2. 15 Branchen-Trends erstellen (KI-generiert)
    3. Rating-Kampagne aufsetzen
    4. Action Boards konfigurieren
→ Kunde erhaelt Zugangs-Email
→ Monitoring startet
```

**Agent Monitoring trackt:**
- Token-Verbrauch pro Mandant (AI-Aufrufe)
- Nutzungsmuster (Logins, erstellte Inhalte, Kampagnen-Aktivitaet)
- Churn-Indikatoren (keine Logins seit X Tagen, keine neuen Inhalte)
- Alerts bei Schwellwert-Ueberschreitungen

**Datenmodell (Ops-DB):**
- `onboarding_jobs` — Laufende/abgeschlossene Onboarding-Prozesse
- `token_usage` — AI-Token-Verbrauch pro Mandant/Monat
- `activity_metrics` — Nutzungsmetriken (daily aggregates)
- `alerts` — Generierte Alerts (Churn-Risiko, Token-Limit, etc.)

### Modul 4: Ticketing (Prioritaet 4)

Minimales Support-System fuer Kundenanfragen.

**Funktionen:**
- Supportanfragen (Kunde erstellt Ticket, Admin antwortet)
- Bug Reports / Feature Requests (interne Kategorisierung)
- Agent Auto Ticket Antwort (AI antwortet auf Standard-Fragen)

**Datenmodell (Ops-DB):**
- `tickets` — Ticket mit Status, Prioritaet, Kategorie
- `ticket_messages` — Nachrichten-Thread pro Ticket
- `ticket_templates` — Vorlagen fuer Auto-Antworten
- `knowledge_base` — Artikel fuer Agent-Antworten (spaeter)

**Ticket-Status-Flow:**
```
Open → In Progress → Waiting for Customer → Resolved → Closed
```

## Projekt-Struktur

```
cin-operations/
├── src/
│   ├── app/                    (Next.js App Router)
│   │   ├── (auth)/             Login, Register, 2FA
│   │   ├── (admin)/            Admin-Dashboard
│   │   │   ├── crm/
│   │   │   ├── lifecycle/
│   │   │   ├── onboarding/
│   │   │   └── tickets/
│   │   ├── (customer)/         Kunden-Portal
│   │   │   ├── tickets/
│   │   │   └── billing/
│   │   └── api/                API-Routes (Agent-Zugang)
│   ├── modules/
│   │   ├── crm/
│   │   │   ├── schema.ts       Drizzle-Schema
│   │   │   ├── actions.ts      Server Actions
│   │   │   └── queries.ts      Read-Queries
│   │   ├── lifecycle/
│   │   │   ├── schema.ts
│   │   │   ├── actions.ts
│   │   │   ├── devops.ts       Azure DevOps Client
│   │   │   └── queries.ts
│   │   ├── onboarding/
│   │   │   ├── schema.ts
│   │   │   ├── actions.ts
│   │   │   ├── mcp-client.ts   MCP Server Anbindung
│   │   │   └── agents.ts       Agent-Logik
│   │   └── ticketing/
│   │       ├── schema.ts
│   │       ├── actions.ts
│   │       └── queries.ts
│   └── shared/
│       ├── auth/               JWT + TOTP Logik
│       ├── db/                 Drizzle-Client, Migrations
│       ├── ui/                 Shared Komponenten
│       └── lib/                Utilities
├── drizzle/                    Migrations
├── package.json
├── next.config.ts
├── drizzle.config.ts
└── tsconfig.json
```

## API-Design (Dual Interface)

Jede Funktion ist ueber zwei Wege erreichbar:

1. **Web-UI:** Next.js Server Actions (formulare, Buttons)
2. **Agent/API:** REST-Endpunkte unter `/api/` mit JWT-Auth

Beispiel:
```
POST /api/crm/leads          → Lead erstellen
POST /api/lifecycle/deploy    → Deployment triggern
POST /api/onboarding/start    → Neuen Mandanten aufsetzen
GET  /api/tickets             → Tickets auflisten
```

Der MCP Server bekommt zusaetzliche Tools die gegen diese API sprechen:
- `ops_create_lead`
- `ops_deploy_release`
- `ops_onboard_customer`
- `ops_list_tickets`

## Infrastruktur

```
Cloudsigma Linux VM
├── nginx (Reverse Proxy)
│   ├── ops.crossinnovation.network → Next.js :3001
│   ├── mcp.crossinnovation.network → MCP-API :3000
│   └── *.crossinnovation.network   → .NET Backend
├── pm2
│   ├── cin-operations (next start, Port 3001)
│   └── mcp-server-api (fastify, Port 3000)
├── PostgreSQL
│   ├── cin_operations    (Ops-DB, neu)
│   ├── cin_demo          (Mandant)
│   ├── cin_hgc           (Mandant)
│   ├── cin_jura          (Mandant)
│   └── tenant-management (NICHT ANFASSEN)
└── MCP Server (Claude Code Sitzungen)
```

## Abhaengigkeiten

- MCP-Server-API muss laufen (Onboarding-Modul spricht damit)
- Azure DevOps Zugang (PAT Token fuer API)
- Stripe Account (Payment-Modul)
- PostgreSQL auf Cloudsigma (Ops-DB + Mandanten-DBs)
- Domain-Setup: ops.crossinnovation.network

## Offene Punkte

1. **UI-Design:** Brauchen wir Mockups/Prototypen, oder bauen wir iterativ?
2. **Stripe-Konfiguration:** Welche Produkte/Preise anlegen (Starter 199 CHF, etc.)?
3. **DevOps PAT:** Wer erstellt den Token, welche Permissions?
4. **Monitoring-Details:** Welche Health-Checks konkret (HTTP Ping, DB Query, Disk Space)?
5. **Kunden-Portal:** Ab wann relevant, oder erstmal nur Admin-Bereich?
