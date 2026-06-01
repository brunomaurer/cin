# MCP-Server-API Architecture Design

**Date:** 2026-05-31
**Status:** Approved
**Approach:** Fastify REST API (Ansatz A)

---

## Overview

Dreischicht-Architektur fuer das CIN TrendRadar System:

```
Claude Code → MCP Server (Tools, stdio) → MCP-Server-API (Fastify, REST) → PostgreSQL
```

- **Claude Code** liest Tenant-spezifische MD-Dokumente als Business-Kontext
- **MCP Server** ist das Tool-Interface fuer Claude, ruft die API per HTTP auf
- **MCP-Server-API** ist ein eigenstaendiger Fastify Service, gehostet auf `mcpapi.cin.swiss`, verantwortlich fuer Auth, Tenant-Isolation und DB-Zugriff

---

## Architecture Diagram

```
┌─────────────┐     stdio      ┌─────────────┐    HTTPS     ┌─────────────────┐
│ Claude Code │ ◄────────────► │ MCP Server  │ ──────────► │ MCP-Server-API  │
│             │                │ (Tools)     │  + Token    │ (Fastify)       │
│ liest Tenant│                │             │             │ mcpapi.cin.swiss │
│ MD-Docs     │                └─────────────┘             └────────┬────────┘
└─────────────┘                                                     │
                                                          Token dekodieren
                                                          → DB-Name extrahieren
                                                                    │
                                                            ┌───────▼────────┐
                                                            │  PostgreSQL    │
                                                            │  (ein Server)  │
                                                            │  ┌───────────┐ │
                                                            │  │cin_tenant1│ │
                                                            │  │cin_tenant2│ │
                                                            │  │cin_tenant3│ │
                                                            │  └───────────┘ │
                                                            └────────────────┘
```

---

## 1. Token Design

### Format
JWT (JSON Web Token), signiert mit HS256.

### Payload
```json
{
  "tenantId": "swisscom",
  "dbName": "cin_swisscom",
  "iat": 1748700000,
  "sub": "api-access"
}
```

### Properties
- **Statisch:** Kein Ablaufdatum. Tokens werden manuell generiert und bei Bedarf widerrufen.
- **Signierung:** HS256 mit Server-Secret (Env Variable `JWT_SECRET`)
- **Widerruf:** Token-Blacklist in einer zentralen Admin-DB (`cin_admin` auf demselben PostgreSQL Server, nicht in Tenant-DBs)
- **Erstellung:** Ueber Admin-Endpoint in der API oder spaeter via Operations Platform

### MCP Server Konfiguration
```json
{
  "env": {
    "API_URL": "https://mcpapi.cin.swiss",
    "TENANT_TOKEN": "<jwt-token>"
  }
}
```

---

## 2. Tenant Isolation

### Prinzip
Jeder Tenant = ein Kunde = eine eigene PostgreSQL-Datenbank auf demselben DB-Server. Der Token enthaelt den DB-Namen. Die API verbindet sich pro Request zur richtigen DB.

### Mechanismus
```typescript
// Fastify onRequest Hook
fastify.addHook('onRequest', async (request, reply) => {
  const token = extractBearerToken(request);
  const payload = verifyJWT(token, JWT_SECRET);

  if (await isRevoked(payload.tenantId, token)) {
    reply.code(401).send({ error: 'Token revoked' });
    return;
  }

  request.tenantDb = getPoolForDatabase(payload.dbName);
  request.tenantId = payload.tenantId;
});
```

### Garantien
- Kein Request ohne gueltigen Token (401)
- Jeder Request bekommt einen DB-Pool der nur auf die Tenant-DB zeigt
- Kein Cross-Tenant Zugriff moeglich (physische DB-Trennung)
- Connection Pools werden pro DB-Name gecacht und wiederverwendet

### Pool Manager
```typescript
// Connection Pool Cache
const pools: Map<string, pg.Pool> = new Map();

function getPoolForDatabase(dbName: string): pg.Pool {
  if (!pools.has(dbName)) {
    pools.set(dbName, new pg.Pool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: dbName,
    }));
  }
  return pools.get(dbName)!;
}
```

---

## 3. API Endpoints

Alle Endpoints (ausser `/auth/tokens`) erwarten:
```
Authorization: Bearer <jwt-token>
```

### Auth & Token Management
| Method | Path | Beschreibung |
|--------|------|-------------|
| POST | `/auth/tokens` | Token generieren (Admin-only, separates Admin-Secret) |
| DELETE | `/auth/tokens/:id` | Token widerrufen |

### Content Types
| Method | Path | Beschreibung |
|--------|------|-------------|
| GET | `/content-types` | Alle Content Types listen |
| POST | `/content-types` | Content Type erstellen (mit Widgets) |

### Content Items
| Method | Path | Beschreibung |
|--------|------|-------------|
| GET | `/content-items` | Items listen (Filter: contentTypeId, search, page, pageSize) |
| GET | `/content-items/:id` | Item Details mit Widget-Werten |
| POST | `/content-items` | Item erstellen |
| PUT | `/content-items/:id` | Item aktualisieren |

### Relations
| Method | Path | Beschreibung |
|--------|------|-------------|
| GET | `/relations/:contentId` | Relations eines Items listen |
| POST | `/relations` | Relations erstellen (batch) |

### Campaigns
| Method | Path | Beschreibung |
|--------|------|-------------|
| GET | `/campaigns` | Alle Campaigns listen |
| POST | `/campaigns` | Campaign erstellen |

### Workflows
| Method | Path | Beschreibung |
|--------|------|-------------|
| GET | `/workflows` | Alle Workflows listen |
| POST | `/workflows` | Workflow erstellen |
| POST | `/workflow-types` | Workflow Type erstellen |

### User Management
| Method | Path | Beschreibung |
|--------|------|-------------|
| GET | `/users` | Alle User listen |
| POST | `/users` | User erstellen |
| PUT | `/users/:id/roles` | Rollen zuweisen |
| PUT | `/users/:id/permissions` | Berechtigungen setzen |

---

## 4. Projekt-Struktur: mcp-server-api

```
mcp-server-api/
├── src/
│   ├── server.ts                 # Fastify Setup, Plugin-Registrierung, Start
│   ├── config.ts                 # Env-Variablen (JWT_SECRET, DB_HOST, etc.)
│   ├── auth/
│   │   ├── jwt.ts                # sign, verify, decode JWT
│   │   ├── tenant-hook.ts        # onRequest Hook fuer Tenant-Isolation
│   │   └── token-blacklist.ts    # Widerrufene Tokens pruefen (Admin-DB)
│   ├── db/
│   │   ├── pool-manager.ts       # Connection Pool Cache pro Tenant-DB
│   │   └── crypto.ts             # AES-128-CBC Encryption (kompatibel mit .NET)
│   ├── routes/
│   │   ├── content-types.ts      # GET/POST /content-types
│   │   ├── content-items.ts      # GET/POST/PUT /content-items
│   │   ├── campaigns.ts          # GET/POST /campaigns
│   │   ├── workflows.ts          # GET/POST /workflows, /workflow-types
│   │   ├── relations.ts          # GET/POST /relations
│   │   ├── users.ts              # GET/POST /users, PUT roles/permissions
│   │   └── tokens.ts             # POST/DELETE /auth/tokens
│   └── helpers/
│       ├── enums.ts              # Enum Definitionen (aus MCP Server uebernommen)
│       └── widget-types.ts       # Widget Type Mappings (aus MCP Server uebernommen)
├── tests/
│   ├── auth.test.ts
│   ├── content-types.test.ts
│   ├── content-items.test.ts
│   ├── campaigns.test.ts
│   ├── workflows.test.ts
│   ├── relations.test.ts
│   └── users.test.ts
├── package.json
├── tsconfig.json
└── .env
```

### Dependencies
```json
{
  "dependencies": {
    "fastify": "^5.x",
    "@fastify/cors": "^10.x",
    "jsonwebtoken": "^9.x",
    "pg": "^8.x",
    "zod": "^4.x",
    "dotenv": "^17.x"
  },
  "devDependencies": {
    "typescript": "^6.x",
    "tsx": "^4.x",
    "vitest": "^4.x",
    "@types/node": "*",
    "@types/pg": "*",
    "@types/jsonwebtoken": "*"
  }
}
```

### Environment Variables (.env)
```
# Server
PORT=3000
HOST=0.0.0.0

# JWT
JWT_SECRET=<strong-random-secret>
ADMIN_SECRET=<admin-secret-for-token-generation>

# PostgreSQL (shared server)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=1

# Encryption (AES-128-CBC, .NET kompatibel)
ENCRYPTION_KEY=hZ5QshmUPuQBVUWgUY3JmrlTJ7TmtqCjXzeoWeNR3Fw
```

---

## 5. MCP Server Umbau

### Vorher (direkt SQL)
```typescript
import { query, getClient } from './db.js';
const result = await query('SELECT * FROM "ContentType" WHERE "DeletedOn" IS NULL');
```

### Nachher (API-Call)
```typescript
import { apiClient } from './api-client.js';
const result = await apiClient.get('/content-types');
```

### Neue MCP Server Struktur
```
mcp-server/
├── src/
│   ├── index.ts              # MCP Server Setup, Tool-Registrierung
│   ├── api-client.ts         # HTTP Client (fetch) fuer API-Calls
│   └── tools/
│       ├── content-types.ts  # Ruft API auf statt SQL
│       ├── content-items.ts
│       ├── campaigns.ts
│       ├── workflows.ts
│       └── relations.ts
├── tests/
├── package.json
└── tsconfig.json
```

### Entfernte Dateien
- `db.ts` — keine direkte DB-Verbindung mehr
- `crypto.ts` — Encryption ist jetzt API-seitig
- `helpers/enums.ts` — lebt jetzt in der API
- `helpers/widget-types.ts` — lebt jetzt in der API

### MCP Server Config
```json
{
  "mcpServers": {
    "cin-trendradar": {
      "command": "npx",
      "args": ["tsx", "C:/Dev/cin/mcp-server/src/index.ts"],
      "cwd": "C:/Dev/cin/mcp-server",
      "env": {
        "API_URL": "https://mcpapi.cin.swiss",
        "TENANT_TOKEN": "<jwt-token-des-kunden>"
      }
    }
  }
}
```

---

## 6. Tenant-Dokumente (Claude Code Seite)

### Konfiguration
In der CLAUDE.md oder als Anweisung an Claude:
```markdown
## Tenant Business-Kontext
Lies alle MD-Dateien in C:\CIN\docs\<tenant-name>\ als Business-Anweisungen.
Halte dich an die dort definierten Regeln bei der Nutzung der MCP Tools.
```

### Verhalten
- Claude liest beim Gespraechsstart alle `.md` Dateien im konfigurierten Verzeichnis
- Inhalte dienen als Kontext: Geschaeftsregeln, Taxonomien, Namenskonventionen etc.
- Kein MCP Server oder API Involvement — rein Claude-seitig

---

## 7. Error Handling

### API Responses
```json
// Erfolg
{ "data": { ... } }

// Fehler
{ "error": "Content type not found", "statusCode": 404 }
```

### HTTP Status Codes
| Code | Bedeutung |
|------|-----------|
| 200 | Erfolg |
| 201 | Erstellt |
| 400 | Ungueltige Eingabe |
| 401 | Kein/ungueltiger Token |
| 404 | Ressource nicht gefunden |
| 500 | Server-Fehler |

### MCP Server Error Handling
Der MCP Server mappt API-Fehler auf MCP-Fehlermeldungen:
```typescript
const response = await apiClient.post('/content-items', data);
if (!response.ok) {
  const error = await response.json();
  return { content: [{ type: "text", text: `Error: ${error.error}` }] };
}
```

---

## 8. Security

- **Transport:** HTTPS (TLS) zwischen MCP Server und API
- **Auth:** JWT Bearer Token bei jedem Request
- **Tenant-Isolation:** Physische DB-Trennung (separate Datenbanken)
- **Token-Widerruf:** Blacklist in Admin-DB
- **Admin-Schutz:** Token-Generierung erfordert separates Admin-Secret
- **SQL Injection:** Parameterisierte Queries (wie bisher)
- **Encryption:** AES-128-CBC fuer sensible Felder (kompatibel mit .NET Backend)
- **CORS:** Konfiguriert fuer erlaubte Origins

---

## 9. Nicht im Scope (spaeter)

- Rate Limiting (kann spaeter via Reverse Proxy oder Fastify Plugin)
- API Versioning (v1/v2)
- Logging/Monitoring (strukturiertes Logging kommt mit Production-Deployment)
- generate_image (DALL-E) — braucht API Key
- create_tenant — wartet auf Operations Platform
- Cloud Document Storage (Dropbox, Google Drive) — erstmal lokale MD-Files
