# Roadmap — Status

> Letzte Aktualisierung: 2026-05-28

## Now (KW 23, 2026)

- [x] **ADR-001 entschieden** — Weiterfuehren (Meeting 29.05.2026)
- [ ] **Azure DevOps PAT revoken** — Sicherheits-Action-Item
- [x] Code-Tiefenanalyse trendradar durchgefuehrt
- [x] Obsidian-Vault initialisiert
- [x] Entscheidungsvorlage fuer Meeting erstellt
- [x] API-Abdeckung analysiert (Ergebnis: direkter DB-Zugriff statt API-Wrapping)
- [ ] **MCP Server + Ops Platform Spec finalisieren** (Brainstorming laeuft)
- [ ] Offene Fragen klaeren (Dev-Instanz, Branchen-Templates, Stripe)

## Next (Phase 1: MCP Server + MCP-API, ~3-4 Wochen)

- [ ] MCP Server Projekt aufsetzen (TypeScript, MCP SDK)
- [ ] trendradar PostgreSQL DB-Schema verstehen + DB-Client einrichten
- [ ] Content Tools (CRUD Steckbriefe direkt via DB)
- [ ] Content Type + Rating Tools (direkt via DB, kein MVC Form-Post-Hacking)
- [ ] Image Generation + Relations Tools (direkt via DB)
- [ ] Campaign + Workflow Tools (direkt via DB)
- [ ] Testing gegen trendradar PostgreSQL (Konsistenz mit .NET Backend pruefen)

## Later (Phase 2+3)

- [ ] Operations Platform (Tenant-Lifecycle, CRM, Ticketing, Template-Katalog)
- [ ] Stripe Integration + Onboarding Page
- [ ] Erstes Branchen-Template erstellen und testen
- [ ] Marketing/Vertrieb-Strategie mit Urs + Alexander

## Blocked

- MCP Server Testing → braucht Zugang zur trendradar PostgreSQL (Dev/Staging)
- Stripe Integration → braucht Stripe Account
- Template-Deployment → braucht definiertes erstes Branchen-Template
