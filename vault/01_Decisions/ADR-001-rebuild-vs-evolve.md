# ADR-001: Rebuild vs. Evolve vs. Einstampfen

> **Status:** OFFEN — Entscheidung am Founder-Meeting 29.05.2026
> **Beteiligte:** Bruno, Mischa, Alexander, Urs
> **Erstellt:** 2026-05-28

## Kontext

CIN steht vor einer existenziellen Entscheidung. Das Geld fuer externe Entwickler geht aus. Die bestehende Plattform (trendradar) hat strukturelle Probleme die eine kosteneffiziente Weiterentwicklung verhindern. Gleichzeitig stecken 3 Jahre Domaenenwissen und 3 zahlende Kunden im System.

## Optionen

### Option A — Weiterentwicklung bestehende Plattform

Bestehenden .NET 6 + React 19 Stack modernisieren und weiterentwickeln.

**Siehe:** [[../05_Analyse/Weg-A-Weiterentwicklung.md]]

### Option B — Fokussiertes Greenfield

Neues, schlankes Produkt mit Kern-Features: Trend-Radar, Ideation, KI-native Kampagnen, Mandantenfaehigkeit.

**Siehe:** [[../05_Analyse/Weg-B-Greenfield.md]]

### Option C — CIN auflösen

Gesellschaft aufloesen, keine weitere Investition.

## Entscheidungskriterien

1. Machbarkeit ohne externes Dev-Team (Bruno + Mischa + Claude Code)
2. Time-to-Value: Wann koennen wir neuen Umsatz generieren?
3. Finanzziel: 5'000 CHF/Founder ab Jahr 1, Verdoppelung pro Jahr
4. Risiko: Was passiert wenn es schiefgeht?
5. Bestehende Kunden: Wie sichern wir die 60k Umsatz?

## Entscheidung (29.05.2026)

**Weiterführen.** trendradar wird als Fundament beibehalten und mit MCP Server + Operations Platform erweitert.

- MCP Server als AI-Steuerung fuer automatisiertes Aufsetzen von Branchen-Radars
- Eigene Operations Platform fuer Tenant-Management, CRM, Ticketing, Billing
- Self-Service Onboarding: Template waehlen → 99 CHF → fertiger Radar
- Stack: TypeScript / Node.js
- Siehe: [[../02_Specs/MCP-Server-und-Operations-Platform]]
