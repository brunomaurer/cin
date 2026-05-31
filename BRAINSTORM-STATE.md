# CIN 3.0 — Brainstorm-State

> **Status:** pausiert · letzte Aktualisierung 2026-05-26
> **Zweck:** Hand-off-Notiz. Eine neue Claude-Session (oder ein Founder) muss diese Datei lesen können und sofort weiterarbeiten oder die Entscheidung treffen können.
> **Sprache:** Deutsch (Brainstorm-Sprache des Teams).

---

## ⚠️ Sicherheits-Action-Item zuerst

Bruno hat im Chat vom 2026-05-25 einen **Personal Access Token** für Azure DevOps (`crossinnovationnetwork/trendradar`) geteilt, damit das Repo geklont werden konnte. Der Token ist damit Teil des Chat-Transkripts (könnte gecacht/indexiert sein).

**→ PAT in Azure DevOps **revoken und neu erzeugen**, sobald möglich.** Im lokalen Repo (`C:\Dev\trendradar\.git\config`) wurde der Token sofort wieder entfernt; persistiert ist er nur im Chat.

---

## 1 · Wer ist im Boot (4 Founder)

| Founder | Rolle laut Strategie-Memo | Realität aus dem Code |
|---|---|---|
| **Urs** | Marketing / GTM | — (kein Code-Footprint) |
| **Bruno** (du) | „Software bauen (mit Claude Code)" laut Memo | Stratege, schreibt das Memo, will mit Mischa bauen |
| **Mischa** | „Software bauen" (laut Bruno im Chat) | — (kein Code-Footprint) |
| **Alexander** | Vertrieb / Operations | Kein Dev, kein Code-Footprint |

→ Kein Founder hat Code geschrieben. `alex.st` ist ein externer Entwickler (Haupt-Dev, 83% der Commits), nicht Alexander der Founder.

---

## 2 · Drei Codebasen — Karte

| Pfad | Was | Stack | Status |
|---|---|---|---|
| `C:\Dev\trendradar` | **Das echte 3-Jahre-SaaS** (5510 Commits seit Feb 2022, letzter 22.05.2026 von alex.st) | **.NET 6** + PostgreSQL + custom column-encryption + **React 19/Chakra v3/Vite 7/React Query + Redux Toolkit** | aktiv, geklont, analysiert |
| `C:\Dev\CinRadar` | Prototyp der AI-Vision (Apr 2026, ~86 Commits in 4 Tagen) | React/Vite + Vercel + Upstash Redis + Anthropic | Wegwerf-Prototyp · keine Auth/Multi-Tenancy |
| `C:\Dev\CIN\Docs` | Strategie + Pricing-Calculator | `CIN_3.0_Strategie.pptx` (14 Slides) + `CIN_3.0_Calculator.html` | Vision-Memo, schlägt Vercel/Supabase Greenfield + „100 % Bruno" vor |

Repo-Remote (Token-frei): `https://dev.azure.com/crossinnovationnetwork/trendradar/_git/trendradar`

---

## 3 · Architektur-Befunde (komprimiert aus zwei Tiefenanalysen)

### Backend (trendradar/.NET)
- **.NET 6 (EOL!)**, EF Core 7 (Version-Mismatch zum Target-Framework)
- **~50 Domain-Entities** in `CIN.Domain`: Content/Trends, Campaigns (mit Interview-AI), Articles, Relations, Workflows/Stages, Users/Roles/Resources, Tenants/Settings/Themes/Media, Widgets, EmailQueue
- **165 Service-Klassen** in `CIN.Services` — etliche God-Classes (UserActionHistoryServiceExtensions 947 LOC, WidgetService 784, ExplorerServiceV2 601, RelationService 557, ContentService 533)
- **87 Controller / ~250 REST-Endpoints**, v1 + v2 API parallel + 32 Legacy-MVC
- **Multi-Tenancy:** Shared DB, row-level via EF `HasQueryFilter()` (`QueryFilterConfiguration<T>`). Tenant-Injection via `ICurrentUserProvider`.
- **Auth:** JWT Bearer (primär) + Basic Auth. Roles + Resource-Rights mit Access-Levels None/View/Write/Delete.
- **Column-Encryption:** Custom AES-128 CBC in `CIN.PostgreSQL.ColumnEncryption` via `[NpgsqlEncrypt]`-Attribut, hauptsächlich User-PII (Email/Name/Phone). Key-Derivation eher schlicht — sicherheitskritisch reviewen.
- **AI ist schon drin:** Interview-Campaigns (`AgentSetup` + `Session` + `Message`-Aggregate), eigener OpenAI-Client (`ThirdPartyLibrary/OpenAI_API`, 43 Klassen), DALL-E, Azure Text Analytics, Streaming-Chat via `IAsyncEnumerable<ChatStreamEvent>`. **Stil:** Request/Response, nicht „permanent".
- **302 EF-Migrationen** · **~2,7 % Testabdeckung** (40 Tests vs. ~1486 Production-Files) · **Hangfire** mit In-Memory-Storage (nicht produktionstauglich)
- **Größe:** ~68k LOC Business-Logic (596k inkl. EF-Migrationen)

### Frontend (trendradar/CIN.UI/react-app)
- **Modern — initialisiert Feb 2025 von `alex.st` (externer Haupt-Dev).** Letzter Commit 20.05.2026.
- **Stack:** React 19, TypeScript strict, **Vite 7**, **Chakra UI v3** (aktiv migrierend weg von MUI 7), **React Query 5** + Redux Toolkit, **axios + axios-retry + Bottleneck + Opossum** (Retry/Rate-Limit/Circuit-Breaker)
- **i18n** EN/DE via i18next, **Forms** react-hook-form + Zod
- **Struktur:** `@core/` (UI-Kit, axios, theme, hooks), `features/` (16 Feature-Module, je mit `api/`+`hooks/`+`store/`+`components/`), `pages/` (Route-Shells), `app/routes.ts`
- **Größe:** ~44k LOC, 398 Source-Files
- **Reuse-Verdict (aus Analyse):** UI-Kit, Theming, Axios-Client, React Query Patterns, Redux Slices, i18n, Form+Zod, Router-Pattern → **wholesale reusable**. Feature-Module sind backend-DTO-gekoppelt (Explorer 332 KB, Workflows 254 KB, Campaign 100 KB, Interview 88 KB) — UI bleibt, DTOs/Widget-Registry müssten an neues Datenmodell angepasst werden.
- **Tech-Debt minimal:** keine Class-Components, gute Memoization, 6 TODOs, Tests vorhanden. Hauptthema: 10+ Komponenten über 500 LOC (FiltersOverlay 896, WorkflowTypeForm 750, ChatInterface 627 …) — vor Migration aufteilen.

### Commit-Verteilung
```
alex.st         4575   ← Externer Entwickler (Haupt-Dev), 83 %
TC-Nikolay       395   ← extern (vermutlich Pecode/TwinCore/CoxIT-Cluster)
Kolya Goroshko   262   ← extern
vika.k           129
Pavel Motorniy   126
kolya             97
igor.golovko      11
… Igor Prokofjev   2   ← erster Commit Feb 2022
```

---

## 4 · Die zentrale Erkenntnis (= der blockierende offene Punkt)

**Das Strategie-Memo geht von „komplett neu auf Vercel/Supabase, 100 % Bruno mit Claude Code" aus. Der Code zeigt das Gegenteil:**

1. Das **Frontend ist State-of-the-Art** (React 19/Chakra v3/Vite, Feb 2025 von alex.st gebaut). Es neu zu bauen wäre Wertvernichtung.
2. Das **Backend ist die echte Altlast** (.NET 6 EOL, God-Classes, 2,7 % Tests, custom Crypto) — aber enthält **3 Jahre Domänenwissen** (~50 Entities/165 Services). Ein From-scratch-Rewrite davon ist die klassische Rewrite-Falle.
3. **AI ist bereits integriert** (Interview-Campaigns). Der Sprung zur „permanenten" AI ist **eine Evolution der bestehenden Agent-Runtime**, nicht Greenfield.
4. Der Pain „externe Devs fressen die Marge" löst man **durch In-sourcing + AI-gestützte Modernisierung**, nicht durch Wegwerfen. alex.st (externer Haupt-Dev) hat 83% der Commits gemacht.
5. **Greenfield bedeutet Abhängigkeit vom externen Haupt-Dev alex.st geht verloren** — das gesamte Domänenwissen steckt bei den externen Devs, nicht bei den Foundern.

**Wichtig:** alex.st ist NICHT Alexander der Founder. Alexander (Founder) ist Vertrieb/Operations. alex.st ist ein externer Entwickler, der zusammen mit den ukrainischen Devs die Plattform gebaut hat. Kein Founder hat Code geschrieben.

→ Die rebuild-vs-evolve-Entscheidung **muss vor allem anderen fallen** und ist eine **Founder-Entscheidung (alle 4 Founder am Tisch)**.

---

## 5 · Strategie-Optionen (vorbereitet für Founder-Sitzung)

| Option | Was es bedeutet | Pro | Contra |
|---|---|---|---|
| **A · Evolve / Strangler-Fig** ⭐ *Empfehlung Claude* | Modernes FE übernehmen → .NET-Backend modernisieren (.NET 8/9, Tests, God-Classes zerlegen) + in-sourcen → permanente AI-Agent-Runtime als **neuen Service daneben** → Modul für Modul A→B→C→D migrieren | Behält 3 Jahre Domäne · billigster/schnellster Weg · behält Beziehung zu externem Haupt-Dev (alex.st) · echtes Greenfield nur dort wo's Sinn macht (AI-Runtime) | Kein „strategischer Neuanfang" · .NET-Modernisierung braucht Disziplin |
| **B · Greenfield (wie Memo)** | Komplett neu auf Vercel/Supabase/React, trendradar wird abgelöst | Stack-Freiheit · klares Schnitt-Datum | **Rewrite-Falle** · höchste Kosten · wirft modernes FE weg · Domänenwissen der externen Devs geht verloren · Strategie sagt selbst „kein Reset" — widerspricht sich |
| **C · Hybrid** | Neues AI-natives Frontend (CinRadar-Stil) + bestehendes .NET-Backend mit AI-Layer umhüllen | Freie UX-Reinvention · behält Backend/Daten | FE-Doppelarbeit (Alex' FE ist schon modern) · zwei Frontends parallel pflegen bis Cutover |
| **D · Erst Decision-Note** | Wir entscheiden nichts, sondern bereiten ADR-001 für Founder-Sitzung auf | Saubere Governance · Alexander wird einbezogen | Verzögerung, bis Sitzung steht |

---

## 6 · Vorgeschlagenes Framing (unabhängig von der Strategie-Wahl)

### Drei Agenten-Ebenen sauber trennen
| Ebene | Wer | Was | Orchestrierung |
|---|---|---|---|
| **A · Build-Agents** | Bruno + Mischa | CIN *bauen* | **ruflo** + Claude Code |
| **B · Produkt-Agents** | Kernprodukt | Was Kunden *kaufen* — Trend-Mining, Insight, Interview, Validation … | Eigene Runtime-Architektur (≠ ruflo). Heute existiert die Interview-Variante — Basis für „permanent AI". |
| **C · GTM-Agents** | Urs | Content, GEO, Funnel/Webinar-Automation, AI-Chat statt Sales | HubSpot + Stripe + Cal.com + Workflow-Agents |

### Team-Alignment-Pattern (Obsidian-Vault als gemeinsames Gehirn)
```
CIN-Vault/
  00_Strategie/      ← Memo, Positionierung, Pricing (read-only Referenz)
  01_Decisions/      ← ADRs: jede Entscheidung async, datiert (inkl. ADR-001 = rebuild-vs-evolve)
  02_Specs/          ← 1 Seite pro Feature, BEVOR Agents bauen → alle kommentieren
  03_Roadmap/        ← Now / Next / Blocked pro Person
  04_Marketing/      ← Urs: Content-Plan, GEO-Tracking, Webinar-Playbook
  90_Agent-Log/      ← ruflo schreibt Fortschritt/Ergebnisse hierhin
```
Agents lesen Specs aus `02_Specs/`, schreiben nach `90_Agent-Log/` → **alle 4 Founder sehen Fortschritt live ohne Code zu lesen.** Async-Ritual: wöchentlich 5 Min Roadmap-Update + ADR-Durchsicht.

---

## 7 · Wo wir pausiert haben

Beim Stellen der `AskUserQuestion` zur Strategie-Wahl (A/B/C/D oben). Bruno hat abgebrochen und um diese Hand-off-Notiz gebeten. Er sagte vorher: „will zuerst noch brainstormen lege noch nicht los" → **kein Build-Start ohne explizite Freigabe.**

---

## 8 · Nächste Schritte beim Wiederaufnehmen

In der Reihenfolge:

1. **PAT in Azure DevOps revoken** (Action-Item ganz oben). Falls neuer PAT nötig: über sicheren Kanal, nicht erneut im Chat.
2. **Strategie-Entscheidung** treffen (A/B/C aus §5) — wenn nicht entscheidbar: **Option D**, also Decision-Note `01_Decisions/ADR-001-rebuild-vs-evolve.md` schreiben + Founder-Sitzung mit Alexander ansetzen.
3. **Bei Variante A (Evolve):**
   - Modulgrenzen A→D auf trendradar-Entities mappen (Content/Campaign/Workflow/Interview → CIN-3.0-Pakete A/B/C/D)
   - Agent-Runtime-Architektur (Ebene B) skizzieren — Hosting, Isolation, Cost-Control, CH-Residency
   - .NET-Modernisierungs-Plan: .NET 8/9-Upgrade, Test-Aufbau, God-Class-Decomposition, EF-Version-Fix
   - Erste Spec für Modul A im Vault
4. **Obsidian-Vault initialisieren** (Struktur §6) — als Git-Repo, z. B. `C:\Dev\CIN\vault`.
5. **ruflo-Swarm** erst danach starten (Modul-Ownership-Modell: Bruno → AI-Runtime, Mischa → ein Modul).

---

## 9 · Wichtige Pfade & Referenzen

- `C:\Dev\trendradar` — geklontes Prod-Repo (Token-frei)
- `C:\Dev\trendradar\CIN.UI\react-app` — modernes Frontend
- `C:\Dev\trendradar\CIN.Domain` — Domain-Entities (Feature-Landkarte)
- `C:\Dev\trendradar\CIN.Services\AIFeatures\Interview` — bestehende AI-Implementierung als Vorbild
- `C:\Dev\CinRadar` — Prototyp (UX-Inspiration, nicht Code-Quelle)
- `C:\Dev\CIN\Docs\CIN_3.0_Strategie.pptx` — Strategie-Memo (Bruno, Mai 2026)
- `C:\Dev\CIN\Docs\CIN_3.0_Calculator.html` — Pricing-/Funnel-Calculator
- Memory: `C:\Users\BrunoMaurer\.claude\projects\C--Dev\memory\cin-3.0-rebuild-project.md` — sessionübergreifende Kurzfassung

---

*Diese Datei ist Brainstorm-Stand, kein Strategie-Memo. Bei Konflikt gilt das offizielle Memo, ergänzt um die hier dokumentierten Code-Fakten.*
