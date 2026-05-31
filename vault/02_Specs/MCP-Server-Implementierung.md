# MCP Server — Implementierungs-Dokumentation

> Stand: 2026-05-31 | Projekt: C:\Dev\cin\mcp-server\

## Uebersicht

Der MCP Server ist gebaut und einsatzbereit. Er verbindet Claude direkt mit der trendradar PostgreSQL-Datenbank und stellt 13 Tools zur Verfuegung um Content Types, Steckbriefe, Relations, Kampagnen und Workflows zu verwalten.

## Tech Stack

| Komponente | Version |
|---|---|
| TypeScript | 6.x |
| Node.js | 24.x |
| @modelcontextprotocol/sdk | 1.29.x |
| pg (node-postgres) | 8.x |
| vitest | Tests |
| zod | Schema-Validierung |

## Projektstruktur

```
mcp-server/
├── package.json
├── tsconfig.json
├── .env                        # DB Connection + Encryption Key
├── src/
│   ├── index.ts                # MCP Server Entry, 13 Tools registriert
│   ├── db.ts                   # PostgreSQL Connection Pool
│   ├── crypto.ts               # AES-128-CBC (kompatibel mit .NET)
│   ├── tools/
│   │   ├── content-types.ts    # list, create (mit Widgets + Optionen)
│   │   ├── content-items.ts    # create, update, list, get details
│   │   ├── relations.ts        # create, list
│   │   ├── campaigns.ts        # create, list
│   │   └── workflows.ts        # create type + stages, create, list
│   └── helpers/
│       ├── enums.ts            # Alle Domain-Enums
│       └── widget-types.ts     # Widget-Typ Helpers
└── tests/
    ├── db.test.ts              # 2 Tests
    ├── crypto.test.ts          # 5 Tests
    ├── content-types.test.ts   # 2 Tests
    ├── content-items.test.ts   # 4 Tests
    ├── relations.test.ts       # 2 Tests
    ├── campaigns.test.ts       # 2 Tests
    └── workflows.test.ts       # 3 Tests
```

**Total: 20 Tests, alle gruen.**

## Die 13 Tools

### Content Types (2 Tools)

| Tool | Parameter | Beschreibung |
|---|---|---|
| `list_content_types` | keine | Listet alle Content Types mit Widget- und Content-Anzahl |
| `create_content_type` | name, description?, widgets[] | Erstellt Content Type mit Widgets, Dropdown-Optionen, Berechtigungen |

### Content Items / Steckbriefe (4 Tools)

| Tool | Parameter | Beschreibung |
|---|---|---|
| `list_content_items` | contentTypeId?, search?, pageSize?, page? | Listet Steckbriefe, filterbar nach Typ und Suchbegriff |
| `get_content_details` | contentId | Volle Details inkl. aller Widget-Werte |
| `create_content_item` | contentTypeId, name, abstract?, widgets{} | Erstellt Steckbrief mit allen Widget-Werten |
| `update_content_item` | id, name?, abstract?, status?, widgets{} | Aktualisiert Steckbrief und/oder Widget-Werte |

### Relations (2 Tools)

| Tool | Parameter | Beschreibung |
|---|---|---|
| `create_relations` | relations[] (left, right, notes?) | Erstellt Verlinkungen zwischen Steckbriefen |
| `list_relations` | contentId | Listet alle Verlinkungen eines Steckbriefs |

### Campaigns (2 Tools)

| Tool | Parameter | Beschreibung |
|---|---|---|
| `create_campaign` | name, description?, type, contentTypeIds[] | Erstellt Rating- oder Interview-Kampagne |
| `list_campaigns` | keine | Listet alle Kampagnen |

### Workflows (3 Tools)

| Tool | Parameter | Beschreibung |
|---|---|---|
| `create_workflow_type` | name, contentTypeId, stages[] | Erstellt Workflow-Typ mit Stages |
| `create_workflow` | name, workflowTypeId | Erstellt Workflow-Instanz |
| `list_workflows` | keine | Listet alle Workflows |

## Noch nicht implementiert

| Tool | Grund | Prioritaet |
|---|---|---|
| `generate_image` | DALL-E API Key noetig | Phase 1 (spaeter) |
| `create_tenant` | Wartet auf Operations Platform | Phase 2 |

## Konfiguration

### Claude Code Settings (C:\Users\bruno\.claude\projects\C--Dev\settings.json)

```json
{
  "mcpServers": {
    "cin-trendradar": {
      "command": "npx",
      "args": ["tsx", "C:/Dev/cin/mcp-server/src/index.ts"],
      "cwd": "C:/Dev/cin/mcp-server",
      "env": {
        "DATABASE_URL": "postgresql://postgres:1@localhost:5432/cin",
        "ENCRYPTION_KEY": "hZ5QshmUPuQBVUWgUY3JmrlTJ7TmtqCjXzeoWeNR3Fw"
      }
    }
  }
}
```

### Voraussetzungen

- PostgreSQL 16 muss laufen (Port 5432, Passwort: 1)
- Die `cin` Datenbank muss existieren mit migrierten Tabellen
- trendradar muss NICHT laufen — MCP Server arbeitet direkt mit der DB

## Encryption

Das Crypto-Modul repliziert exakt die .NET AES-128-CBC Verschluesselung:
- Key: Erste 16 Bytes des Encryption-Passworts, gepadded mit 0x6F
- IV: Bytes 16-32 des Passworts, gepadded mit 0x6F
- Verifiziert gegen bekannte .NET-verschluesselte Werte (Admin-Email, Admin-Name)

## Testdaten in der DB

| Tabelle | Inhalt |
|---|---|
| ContentType | Trend (Id=2), Startup (Id=3) |
| Content | Generative AI (Id=2), Digital Twins (Id=3), Quantum Computing (Id=4) |
| WidgetType | Beschreibung (Text), Reifegrad (Dropdown), Relevanz (Numeric), Entdeckt am (Date) |
| WidgetTypeOption | Emerging, Growing, Mature, Declining (fuer Reifegrad) |
| WidgetValues | 12 Eintraege (4 pro Content Item) |
| User | saas.admin (Id=1000000000) |

## Bekannte Einschraenkungen

1. **Frontend 403:** Die trendradar React UI zeigt 403 weil das Access Management nicht korrekt konfiguriert ist (UserContentType + UserRoles). Braucht Staging-DB als Referenz.
2. **Widget-IDs:** create_content_item erwartet WidgetContentTypeMappings IDs als Keys — der Aufrufer muss diese erst via list_content_types oder get_content_details ermitteln.
3. **Kein Multi-Tenant:** Der MCP Server arbeitet immer gegen die eine `cin` DB. Fuer Multi-Tenancy muesste der Connection String dynamisch gesetzt werden.
