# Roadmap — Status

> Letzte Aktualisierung: 2026-05-31

## Erledigt (KW 22-23, 2026)

- [x] **ADR-001 entschieden** — Weiterfuehren (Meeting 29.05.2026)
- [x] Code-Tiefenanalyse trendradar durchgefuehrt
- [x] Obsidian-Vault initialisiert
- [x] Entscheidungsvorlage + HTML-Berichte erstellt
- [x] API-Abdeckung analysiert → Entscheid: direkter DB-Zugriff statt API-Wrapping
- [x] Architektur-Vision dokumentiert (Canvas + HTML)
- [x] DB-Schema komplett dokumentiert (74 Tabellen, 4 DBs, ~35 Enums)
- [x] Lokale Entwicklungsumgebung eingerichtet (PostgreSQL 16, .NET 6 SDK, trendradar lokal)
- [x] **MCP Server Phase 1 gebaut** — 13 Tools, 20 Tests, alle gruen
  - Content Types: list, create (mit Widgets + Dropdown-Optionen)
  - Content Items: create, update, list, get details (mit Widget-Werten)
  - Relations: create, list
  - Campaigns: create, list
  - Workflows: create type (mit Stages), create, list
  - Encryption: AES-128-CBC kompatibel mit .NET
- [x] MCP Server Config fuer Claude Code erstellt

## Now (KW 23, 2026)

- [ ] **Azure DevOps PAT revoken** — Sicherheits-Action-Item (Bruno)
- [ ] **Claude Code neu starten** und MCP Server testen
- [ ] **Staging-DB Zugang** organisieren fuer Frontend-Berechtigungssetup
- [ ] Erstes Branchen-Template definieren (welche Branche? welche Content Types?)
- [ ] Frontend 403-Problem loesen (UserContentType / Access Management)

## Next (Phase 2: Operations Platform)

- [ ] Operations Platform aufsetzen (TypeScript, eigene DB)
- [ ] Tenant-Lifecycle API (CRUD, Provisioning)
- [ ] Template-Katalog (Branchen-Templates definieren + speichern)
- [ ] Mini CRM (Leads, Kunden, Kontakte)
- [ ] Ticketing (Support-Requests)
- [ ] MCP Tools fuer Ops Platform ergaenzen (create_tenant etc.)

## Later (Phase 3: Onboarding + Billing)

- [ ] Stripe Integration (199 CHF/Monat, Trial-Logik)
- [ ] Onboarding API + Landing-Page
- [ ] Auto-Provisioning Flow (Template → Tenant → Deploy)
- [ ] generate_image Tool (DALL-E) im MCP Server
- [ ] Marketing/Vertrieb-Strategie mit Urs + Alexander

## Blocked

- Frontend-Testing → braucht Staging-DB fuer korrektes Berechtigungssetup
- Stripe Integration → braucht Stripe Account
- Template-Deployment → braucht definiertes erstes Branchen-Template
- Pipedrive kuendigen → Calendly kuendigen (Bruno), Telefone kuendigen (Bruno)
