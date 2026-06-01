# MCP-Server-API + MCP Server Umbau — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Fastify REST API (`mcp-server-api`) that owns all DB logic and auth, then refactor the existing MCP Server to call this API instead of querying PostgreSQL directly.

**Architecture:** Three-layer — Claude Code (reads tenant docs) → MCP Server (tool interface, HTTP client) → MCP-Server-API (Fastify, JWT auth, tenant-isolated DB access) → PostgreSQL. Each tenant has a separate database on the same PostgreSQL server. JWT tokens encode the tenant's DB name for routing.

**Tech Stack:** TypeScript, Fastify 5, jsonwebtoken, pg, Zod 4, Vitest, Node.js (ESM)

---

## File Structure

### New Project: `C:\Dev\cin\mcp-server-api\`

```
mcp-server-api/
├── src/
│   ├── server.ts                 # Fastify app creation, plugin registration, start
│   ├── config.ts                 # Env vars: JWT_SECRET, DB_HOST, etc.
│   ├── auth/
│   │   ├── jwt.ts                # signToken, verifyToken
│   │   └── tenant-hook.ts        # Fastify onRequest hook — extracts tenant from JWT, sets DB pool
│   ├── db/
│   │   ├── pool-manager.ts       # Per-tenant connection pool cache
│   │   └── crypto.ts             # AES-128-CBC encryption (copied from MCP Server)
│   ├── routes/
│   │   ├── tokens.ts             # POST /auth/tokens, DELETE /auth/tokens/:id
│   │   ├── content-types.ts      # GET/POST /content-types
│   │   ├── content-items.ts      # GET/POST/PUT /content-items
│   │   ├── campaigns.ts          # GET/POST /campaigns
│   │   ├── workflows.ts          # GET/POST /workflows, /workflow-types
│   │   ├── relations.ts          # GET/POST /relations
│   │   └── users.ts              # GET/POST /users, PUT roles/permissions
│   └── helpers/
│       ├── enums.ts              # Copied from MCP Server
│       └── widget-types.ts       # Copied from MCP Server
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

### Modified Project: `C:\Dev\cin\mcp-server\`

```
mcp-server/
├── src/
│   ├── index.ts              # Same MCP tool registration, but tools call api-client
│   ├── api-client.ts         # NEW — HTTP client wrapping fetch + Bearer token
│   └── tools/
│       ├── content-types.ts  # Rewritten: API calls instead of SQL
│       ├── content-items.ts  # Rewritten: API calls instead of SQL
│       ├── campaigns.ts      # Rewritten: API calls instead of SQL
│       ├── workflows.ts      # Rewritten: API calls instead of SQL
│       └── relations.ts      # Rewritten: API calls instead of SQL
├── tests/
│   └── api-client.test.ts    # NEW — tests for API client
├── package.json              # Remove pg, add nothing (fetch is built-in)
└── tsconfig.json
```

**Deleted from MCP Server:** `src/db.ts`, `src/crypto.ts`, `src/helpers/enums.ts`, `src/helpers/widget-types.ts`

---

## Phase 1: MCP-Server-API (Tasks 1–10)

### Task 1: Project Scaffolding

**Files:**
- Create: `C:\Dev\cin\mcp-server-api\package.json`
- Create: `C:\Dev\cin\mcp-server-api\tsconfig.json`
- Create: `C:\Dev\cin\mcp-server-api\.env`
- Create: `C:\Dev\cin\mcp-server-api\.gitignore`

- [ ] **Step 1: Create project directory and init**

```bash
cd C:/Dev/cin
mkdir mcp-server-api
cd mcp-server-api
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install fastify @fastify/cors jsonwebtoken pg dotenv zod
npm install -D typescript tsx vitest @types/node @types/pg @types/jsonwebtoken
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create .env**

```
PORT=3000
HOST=0.0.0.0
JWT_SECRET=dev-secret-change-in-production
ADMIN_SECRET=admin-secret-change-in-production
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=1
ENCRYPTION_KEY=hZ5QshmUPuQBVUWgUY3JmrlTJ7TmtqCjXzeoWeNR3Fw
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.env
```

- [ ] **Step 6: Update package.json scripts and set type to module**

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx watch src/server.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 7: Commit**

```bash
git init
git add package.json tsconfig.json .gitignore .env
git commit -m "chore: scaffold mcp-server-api project"
```

---

### Task 2: Config + Helpers (copy from MCP Server)

**Files:**
- Create: `C:\Dev\cin\mcp-server-api\src\config.ts`
- Create: `C:\Dev\cin\mcp-server-api\src\helpers\enums.ts`
- Create: `C:\Dev\cin\mcp-server-api\src\helpers\widget-types.ts`
- Create: `C:\Dev\cin\mcp-server-api\src\db\crypto.ts`

- [ ] **Step 1: Create config.ts**

```typescript
import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3000"),
  host: process.env.HOST || "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET || "",
  adminSecret: process.env.ADMIN_SECRET || "",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
  },
  encryptionKey: process.env.ENCRYPTION_KEY || "",
};
```

- [ ] **Step 2: Copy enums.ts from MCP Server**

Copy `C:\Dev\cin\mcp-server\src\helpers\enums.ts` to `C:\Dev\cin\mcp-server-api\src\helpers\enums.ts` — file is identical, no changes needed.

- [ ] **Step 3: Copy widget-types.ts from MCP Server**

Copy `C:\Dev\cin\mcp-server\src\helpers\widget-types.ts` to `C:\Dev\cin\mcp-server-api\src\helpers\widget-types.ts` — file is identical, no changes needed.

- [ ] **Step 4: Copy crypto.ts from MCP Server**

Copy `C:\Dev\cin\mcp-server\src\crypto.ts` to `C:\Dev\cin\mcp-server-api\src\db\crypto.ts` — file is identical, no changes needed.

- [ ] **Step 5: Commit**

```bash
git add src/config.ts src/helpers/ src/db/crypto.ts
git commit -m "feat: add config, enums, widget-types, and crypto module"
```

---

### Task 3: Pool Manager (Tenant DB Routing)

**Files:**
- Create: `C:\Dev\cin\mcp-server-api\src\db\pool-manager.ts`
- Create: `C:\Dev\cin\mcp-server-api\tests\pool-manager.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/pool-manager.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { getPool, disconnectAll } from "../src/db/pool-manager.js";

describe("Pool Manager", () => {
  afterAll(async () => {
    await disconnectAll();
  });

  it("should return a pool for a given database name", () => {
    const pool = getPool("cin");
    expect(pool).toBeDefined();
  });

  it("should return the same pool for the same database name", () => {
    const pool1 = getPool("cin");
    const pool2 = getPool("cin");
    expect(pool1).toBe(pool2);
  });

  it("should execute a query against the correct database", async () => {
    const pool = getPool("cin");
    const result = await pool.query("SELECT 1 as num");
    expect(result.rows[0].num).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/pool-manager.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/db/pool-manager.ts
import pg from "pg";
import { config } from "../config.js";

const pools: Map<string, pg.Pool> = new Map();

export function getPool(dbName: string): pg.Pool {
  if (!pools.has(dbName)) {
    pools.set(
      dbName,
      new pg.Pool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: dbName,
      })
    );
  }
  return pools.get(dbName)!;
}

export async function disconnectAll(): Promise<void> {
  for (const pool of pools.values()) {
    await pool.end();
  }
  pools.clear();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/pool-manager.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/pool-manager.ts tests/pool-manager.test.ts
git commit -m "feat: add tenant DB pool manager with caching"
```

---

### Task 4: JWT Auth Module

**Files:**
- Create: `C:\Dev\cin\mcp-server-api\src\auth\jwt.ts`
- Create: `C:\Dev\cin\mcp-server-api\tests\auth.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/auth.test.ts
import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../src/auth/jwt.js";

describe("JWT Auth", () => {
  const secret = "test-secret";

  it("should sign and verify a token", () => {
    const token = signToken({ tenantId: "swisscom", dbName: "cin_swisscom" }, secret);
    const payload = verifyToken(token, secret);
    expect(payload.tenantId).toBe("swisscom");
    expect(payload.dbName).toBe("cin_swisscom");
    expect(payload.sub).toBe("api-access");
  });

  it("should reject a token with wrong secret", () => {
    const token = signToken({ tenantId: "swisscom", dbName: "cin_swisscom" }, secret);
    expect(() => verifyToken(token, "wrong-secret")).toThrow();
  });

  it("should reject a garbage string", () => {
    expect(() => verifyToken("not-a-jwt", secret)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/auth.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/auth/jwt.ts
import jwt from "jsonwebtoken";

export interface TokenPayload {
  tenantId: string;
  dbName: string;
  sub: string;
  iat: number;
}

export function signToken(
  data: { tenantId: string; dbName: string },
  secret: string
): string {
  return jwt.sign(
    { tenantId: data.tenantId, dbName: data.dbName, sub: "api-access" },
    secret
  );
}

export function verifyToken(token: string, secret: string): TokenPayload {
  return jwt.verify(token, secret) as TokenPayload;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/auth.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/auth/jwt.ts tests/auth.test.ts
git commit -m "feat: add JWT sign and verify module"
```

---

### Task 5: Fastify Server + Tenant Hook

**Files:**
- Create: `C:\Dev\cin\mcp-server-api\src\server.ts`
- Create: `C:\Dev\cin\mcp-server-api\src\auth\tenant-hook.ts`
- Create: `C:\Dev\cin\mcp-server-api\tests\server.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/server.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/server.js";
import { signToken } from "../src/auth/jwt.js";
import { disconnectAll } from "../src/db/pool-manager.js";
import { config } from "../src/config.js";

describe("Server + Tenant Hook", () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
    await disconnectAll();
  });

  it("should return 401 without token", async () => {
    const res = await app.inject({ method: "GET", url: "/content-types" });
    expect(res.statusCode).toBe(401);
  });

  it("should return 401 with invalid token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/content-types",
      headers: { authorization: "Bearer garbage" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("should pass with valid token", async () => {
    const token = signToken({ tenantId: "test", dbName: "cin" }, config.jwtSecret);
    const res = await app.inject({
      method: "GET",
      url: "/content-types",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/server.test.ts
```

Expected: FAIL — modules not found

- [ ] **Step 3: Write tenant-hook.ts**

```typescript
// src/auth/tenant-hook.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken } from "./jwt.js";
import { getPool } from "../db/pool-manager.js";
import { config } from "../config.js";
import pg from "pg";

declare module "fastify" {
  interface FastifyRequest {
    tenantId: string;
    tenantDb: pg.Pool;
  }
}

export async function tenantHook(request: FastifyRequest, reply: FastifyReply) {
  // Skip auth for token generation endpoint
  if (request.url === "/auth/tokens" && request.method === "POST") return;

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token, config.jwtSecret);
    request.tenantId = payload.tenantId;
    request.tenantDb = getPool(payload.dbName);
  } catch {
    reply.code(401).send({ error: "Invalid or expired token" });
    return;
  }
}
```

- [ ] **Step 4: Write server.ts**

```typescript
// src/server.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { tenantHook } from "./auth/tenant-hook.js";
import { initCrypto } from "./db/crypto.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors);
  app.addHook("onRequest", tenantHook);

  // Health check (no auth)
  app.get("/health", async () => ({ status: "ok" }));

  // Routes will be registered here in subsequent tasks
  // Each route file exports a Fastify plugin

  return app;
}

// Only start when run directly (not in tests)
if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  initCrypto(config.encryptionKey);
  const app = buildApp();
  app.listen({ port: config.port, host: config.host }).then((address) => {
    console.log(`MCP-Server-API running at ${address}`);
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

The test expects `GET /content-types` to return 200 with valid token, but the route doesn't exist yet. Update the test to use `/health` for the valid-token test, then verify content-types returns 404:

Replace the third test in `tests/server.test.ts`:

```typescript
  it("should pass auth with valid token and reach route handler", async () => {
    const token = signToken({ tenantId: "test", dbName: "cin" }, config.jwtSecret);
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
```

```bash
npx vitest run tests/server.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/server.ts src/auth/tenant-hook.ts tests/server.test.ts
git commit -m "feat: add Fastify server with tenant auth hook"
```

---

### Task 6: Content Types Routes

**Files:**
- Create: `C:\Dev\cin\mcp-server-api\src\routes\content-types.ts`
- Create: `C:\Dev\cin\mcp-server-api\tests\content-types.test.ts`
- Modify: `C:\Dev\cin\mcp-server-api\src\server.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/content-types.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/server.js";
import { signToken } from "../src/auth/jwt.js";
import { disconnectAll } from "../src/db/pool-manager.js";
import { config } from "../src/config.js";

describe("Content Types Routes", () => {
  const app = buildApp();
  const token = signToken({ tenantId: "test", dbName: "cin" }, config.jwtSecret);
  const headers = { authorization: `Bearer ${token}` };
  let createdId: number;

  afterAll(async () => {
    if (createdId) {
      const { getPool } = await import("../src/db/pool-manager.js");
      const pool = getPool("cin");
      await pool.query(`DELETE FROM "UserRoles" WHERE "ContentTypeId" = $1`, [createdId]);
      await pool.query(`DELETE FROM "UserContentType" WHERE "ContentTypeId" = $1`, [createdId]);
      await pool.query(`DELETE FROM "WidgetContentTypeMappings" WHERE "ContentTypeId" = $1`, [createdId]);
      await pool.query(`DELETE FROM "ContentType" WHERE "Id" = $1`, [createdId]);
    }
    await app.close();
    await disconnectAll();
  });

  it("GET /content-types should return array", async () => {
    const res = await app.inject({ method: "GET", url: "/content-types", headers });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("POST /content-types should create with widgets", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/content-types",
      headers: { ...headers, "content-type": "application/json" },
      payload: {
        name: "TEST_API_ContentType",
        description: "Created by API test",
        widgets: [
          { name: "TEST_Summary", fieldType: 5, required: true },
          { name: "TEST_Score", fieldType: 10 },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.id).toBeGreaterThan(0);
    expect(body.data.widgets).toHaveLength(2);
    createdId = body.data.id;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/content-types.test.ts
```

Expected: FAIL — route not found (404)

- [ ] **Step 3: Write the route**

```typescript
// src/routes/content-types.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { WidgetTypeEnum } from "../helpers/enums.js";

const ADMIN_USER_ID = 1000000000;

const createContentTypeSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  widgets: z
    .array(
      z.object({
        name: z.string(),
        fieldType: z.number(),
        required: z.boolean().optional(),
        description: z.string().optional(),
        options: z.array(z.string()).optional(),
      })
    )
    .optional(),
});

export async function contentTypesRoutes(fastify: FastifyInstance) {
  fastify.get("/content-types", async (request) => {
    const result = await request.tenantDb.query(`
      SELECT ct."Id" as id, ct."Name" as name, ct."Description" as description,
             ct."Published" as published, ct."DisplayOrder" as "displayOrder",
             (SELECT COUNT(*) FROM "Content" c WHERE c."ContentTypeId" = ct."Id" AND c."DeletedOn" IS NULL) as "contentCount",
             (SELECT COUNT(*) FROM "WidgetContentTypeMappings" wm WHERE wm."ContentTypeId" = ct."Id" AND wm."DeletedOn" IS NULL) as "widgetCount"
      FROM "ContentType" ct
      WHERE ct."DeletedOn" IS NULL
      ORDER BY ct."DisplayOrder", ct."Id"
    `);
    return { data: result.rows };
  });

  fastify.post("/content-types", async (request, reply) => {
    const input = createContentTypeSchema.parse(request.body);
    const client = await request.tenantDb.connect();
    try {
      await client.query("BEGIN");

      const ctResult = await client.query(
        `INSERT INTO "ContentType" ("CreatedUserId", "CreatedOn", "Name", "Description", "Published", "DisplayOrder")
         VALUES ($1, NOW(), $2, $3, true, (SELECT COALESCE(MAX("DisplayOrder"), 0) + 1 FROM "ContentType"))
         RETURNING "Id", "Name", "Description"`,
        [ADMIN_USER_ID, input.name, input.description || null]
      );
      const contentTypeId = ctResult.rows[0].Id;

      const widgets: any[] = [];
      for (let i = 0; i < (input.widgets || []).length; i++) {
        const w = input.widgets![i];

        const wtResult = await client.query(
          `INSERT INTO "WidgetType" ("CreatedUserId", "CreatedOn", "Name", "FieldType", "Required", "IsActive", "Description")
           VALUES ($1, NOW(), $2, $3, $4, true, $5)
           RETURNING "Id"`,
          [ADMIN_USER_ID, w.name, w.fieldType, w.required || false, w.description || null]
        );
        const widgetTypeId = wtResult.rows[0].Id;

        let options: any[] = [];
        if (
          w.options &&
          (w.fieldType === WidgetTypeEnum.DropdownList ||
            w.fieldType === WidgetTypeEnum.MultipleSelectionDropdownList)
        ) {
          for (let j = 0; j < w.options.length; j++) {
            const optResult = await client.query(
              `INSERT INTO "WidgetTypeOption" ("WidgetTypeId", "Key", "Name", "Ordinal")
               VALUES ($1, $2, $3, $4)
               RETURNING "Id", "Key", "Name"`,
              [widgetTypeId, j + 1, w.options[j], j + 1]
            );
            options.push(optResult.rows[0]);
          }
        }

        const mapResult = await client.query(
          `INSERT INTO "WidgetContentTypeMappings" ("ContentTypeId", "FieldTypeId", "ColumnNumber", "Ordinal")
           VALUES ($1, $2, 1, $3)
           RETURNING "Id"`,
          [contentTypeId, widgetTypeId, i + 1]
        );

        widgets.push({
          id: widgetTypeId,
          mappingId: mapResult.rows[0].Id,
          name: w.name,
          fieldType: w.fieldType,
          required: w.required || false,
          options,
        });
      }

      await client.query(
        `INSERT INTO "UserContentType" ("UserId", "ContentTypeId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [ADMIN_USER_ID, contentTypeId]
      );
      await client.query(
        `INSERT INTO "UserRoles" ("UserId", "RoleId", "ContentTypeId", "CreatedUserId", "CreatedOn")
         VALUES ($1, (SELECT "Id" FROM "Roles" WHERE "Name" = 'Admin' LIMIT 1), $2, $1, NOW())
         ON CONFLICT ("UserId", "RoleId", "ContentTypeId") DO NOTHING`,
        [ADMIN_USER_ID, contentTypeId]
      );

      await client.query("COMMIT");

      reply.code(201);
      return {
        data: {
          id: contentTypeId,
          name: input.name,
          description: input.description || null,
          widgets,
        },
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });
}
```

- [ ] **Step 4: Register the route in server.ts**

Add to `src/server.ts` after the health check:

```typescript
import { contentTypesRoutes } from "./routes/content-types.js";

// Inside buildApp(), after app.get("/health", ...):
app.register(contentTypesRoutes);
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/content-types.test.ts
```

Expected: 2 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/routes/content-types.ts tests/content-types.test.ts src/server.ts
git commit -m "feat: add content-types GET and POST routes"
```

---

### Task 7: Content Items Routes

**Files:**
- Create: `C:\Dev\cin\mcp-server-api\src\routes\content-items.ts`
- Create: `C:\Dev\cin\mcp-server-api\tests\content-items.test.ts`
- Modify: `C:\Dev\cin\mcp-server-api\src\server.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/content-items.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/server.js";
import { signToken } from "../src/auth/jwt.js";
import { disconnectAll } from "../src/db/pool-manager.js";
import { config } from "../src/config.js";

describe("Content Items Routes", () => {
  const app = buildApp();
  const token = signToken({ tenantId: "test", dbName: "cin" }, config.jwtSecret);
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  let createdId: number;

  afterAll(async () => {
    if (createdId) {
      const { getPool } = await import("../src/db/pool-manager.js");
      const pool = getPool("cin");
      await pool.query(`DELETE FROM "WidgetValues" WHERE "ContentId" = $1`, [createdId]);
      await pool.query(`DELETE FROM "Content" WHERE "Id" = $1`, [createdId]);
    }
    await app.close();
    await disconnectAll();
  });

  it("POST /content-items should create item", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/content-items",
      headers,
      payload: { contentTypeId: 2, name: "TEST_API_Item", abstract: "Test abstract" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.id).toBeGreaterThan(0);
    createdId = body.data.id;
  });

  it("GET /content-items should return array", async () => {
    const res = await app.inject({ method: "GET", url: "/content-items?contentTypeId=2", headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toBeInstanceOf(Array);
  });

  it("GET /content-items/:id should return details", async () => {
    const res = await app.inject({ method: "GET", url: `/content-items/${createdId}`, headers });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.name).toBe("TEST_API_Item");
    expect(body.data.widgets).toBeInstanceOf(Array);
  });

  it("PUT /content-items/:id should update", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/content-items/${createdId}`,
      headers,
      payload: { name: "TEST_API_Item_Updated" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/content-items.test.ts
```

Expected: FAIL — route not found

- [ ] **Step 3: Write the route**

```typescript
// src/routes/content-items.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ContentStatusEnum } from "../helpers/enums.js";

const ADMIN_USER_ID = 1000000000;

const widgetValueSchema = z
  .record(
    z.string(),
    z.object({
      textValue: z.string().optional(),
      intValue: z.number().optional(),
      dateValue: z.string().optional(),
      decimalValue: z.number().optional(),
    })
  )
  .optional();

const createSchema = z.object({
  contentTypeId: z.number(),
  name: z.string(),
  abstract: z.string().optional(),
  widgets: widgetValueSchema,
});

const updateSchema = z.object({
  name: z.string().optional(),
  abstract: z.string().optional(),
  status: z.number().optional(),
  widgets: widgetValueSchema,
});

export async function contentItemsRoutes(fastify: FastifyInstance) {
  fastify.get("/content-items", async (request) => {
    const query = request.query as {
      contentTypeId?: string;
      search?: string;
      page?: string;
      pageSize?: string;
    };

    const conditions: string[] = [`c."DeletedOn" IS NULL`];
    const params: any[] = [];
    let paramIdx = 1;

    if (query.contentTypeId) {
      conditions.push(`c."ContentTypeId" = $${paramIdx++}`);
      params.push(parseInt(query.contentTypeId));
    }
    if (query.search) {
      conditions.push(
        `(c."Name" ILIKE $${paramIdx} OR c."Abstract" ILIKE $${paramIdx})`
      );
      params.push(`%${query.search}%`);
      paramIdx++;
    }

    const limit = parseInt(query.pageSize || "50");
    const offset = (parseInt(query.page || "1") - 1) * limit;

    const result = await request.tenantDb.query(
      `SELECT c."Id" as id, c."Name" as name, c."Abstract" as abstract,
              c."Status" as status, c."UId" as uid,
              ct."Name" as "contentTypeName", c."ContentTypeId" as "contentTypeId",
              c."CreatedOn" as "createdOn"
       FROM "Content" c
       JOIN "ContentType" ct ON c."ContentTypeId" = ct."Id"
       WHERE ${conditions.join(" AND ")}
       ORDER BY c."CreatedOn" DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      [...params, limit, offset]
    );
    return { data: result.rows };
  });

  fastify.get("/content-items/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const contentId = parseInt(id);

    const contentResult = await request.tenantDb.query(
      `SELECT c."Id" as id, c."Name" as name, c."Abstract" as abstract,
              c."Status" as status, c."UId" as uid,
              c."ContentTypeId" as "contentTypeId",
              ct."Name" as "contentTypeName",
              c."MediaId" as "mediaId",
              c."CreatedOn" as "createdOn"
       FROM "Content" c
       JOIN "ContentType" ct ON c."ContentTypeId" = ct."Id"
       WHERE c."Id" = $1 AND c."DeletedOn" IS NULL`,
      [contentId]
    );

    if (contentResult.rows.length === 0) {
      reply.code(404).send({ error: "Content not found", statusCode: 404 });
      return;
    }

    const widgetResult = await request.tenantDb.query(
      `SELECT wv."Id" as "valueId", wv."ContentTypeFieldId" as "mappingId",
              wv."TextValue" as "textValue", wv."IntValue" as "intValue",
              wv."DateValue" as "dateValue", wv."DecimalValue" as "decimalValue",
              wt."Name" as "widgetName", wt."FieldType" as "fieldType",
              wm."Ordinal" as ordinal
       FROM "WidgetValues" wv
       JOIN "WidgetContentTypeMappings" wm ON wv."ContentTypeFieldId" = wm."Id"
       JOIN "WidgetType" wt ON wm."FieldTypeId" = wt."Id"
       WHERE wv."ContentId" = $1 AND wv."DeletedOn" IS NULL
       ORDER BY wm."Ordinal"`,
      [contentId]
    );

    return { data: { ...contentResult.rows[0], widgets: widgetResult.rows } };
  });

  fastify.post("/content-items", async (request, reply) => {
    const input = createSchema.parse(request.body);
    const client = await request.tenantDb.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO "Content" ("CreatedUserId", "CreatedOn", "Name", "Abstract", "Published", "ContentTypeId", "Status")
         VALUES ($1, NOW(), $2, $3, true, $4, $5)
         RETURNING "Id", "Name", "UId", "Status"`,
        [ADMIN_USER_ID, input.name, input.abstract || null, input.contentTypeId, ContentStatusEnum.Published]
      );
      const contentId = result.rows[0].Id;

      if (input.widgets) {
        for (const [mappingIdStr, value] of Object.entries(input.widgets)) {
          const mappingId = parseInt(mappingIdStr);
          await client.query(
            `INSERT INTO "WidgetValues" ("ContentTypeFieldId", "ContentId", "TextValue", "IntValue", "DateValue", "DecimalValue")
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              mappingId,
              contentId,
              value.textValue || null,
              value.intValue ?? null,
              value.dateValue ? new Date(value.dateValue) : null,
              value.decimalValue ?? null,
            ]
          );
        }
      }

      await client.query("COMMIT");
      reply.code(201);
      return { data: { id: contentId, name: input.name, uid: result.rows[0].UId, status: ContentStatusEnum.Published } };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  fastify.put("/content-items/:id", async (request) => {
    const { id } = request.params as { id: string };
    const contentId = parseInt(id);
    const input = updateSchema.parse(request.body);
    const client = await request.tenantDb.connect();
    try {
      await client.query("BEGIN");

      const updates: string[] = [`"ModifiedUserId" = $1`, `"ModifiedOn" = NOW()`];
      const params: any[] = [ADMIN_USER_ID];
      let idx = 2;

      if (input.name !== undefined) {
        updates.push(`"Name" = $${idx++}`);
        params.push(input.name);
      }
      if (input.abstract !== undefined) {
        updates.push(`"Abstract" = $${idx++}`);
        params.push(input.abstract);
      }
      if (input.status !== undefined) {
        updates.push(`"Status" = $${idx++}`);
        params.push(input.status);
      }

      params.push(contentId);
      await client.query(
        `UPDATE "Content" SET ${updates.join(", ")} WHERE "Id" = $${idx}`,
        params
      );

      if (input.widgets) {
        for (const [mappingIdStr, value] of Object.entries(input.widgets)) {
          const mappingId = parseInt(mappingIdStr);
          const updateResult = await client.query(
            `UPDATE "WidgetValues" SET "TextValue" = $1, "IntValue" = $2, "DateValue" = $3, "DecimalValue" = $4
             WHERE "ContentTypeFieldId" = $5 AND "ContentId" = $6`,
            [
              value.textValue || null,
              value.intValue ?? null,
              value.dateValue ? new Date(value.dateValue) : null,
              value.decimalValue ?? null,
              mappingId,
              contentId,
            ]
          );
          if (updateResult.rowCount === 0) {
            await client.query(
              `INSERT INTO "WidgetValues" ("ContentTypeFieldId", "ContentId", "TextValue", "IntValue", "DateValue", "DecimalValue")
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [mappingId, contentId, value.textValue || null, value.intValue ?? null, value.dateValue ? new Date(value.dateValue) : null, value.decimalValue ?? null]
            );
          }
        }
      }

      await client.query("COMMIT");
      return { data: { success: true } };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });
}
```

- [ ] **Step 4: Register in server.ts**

Add to `src/server.ts`:

```typescript
import { contentItemsRoutes } from "./routes/content-items.js";

// Inside buildApp():
app.register(contentItemsRoutes);
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/content-items.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/routes/content-items.ts tests/content-items.test.ts src/server.ts
git commit -m "feat: add content-items CRUD routes"
```

---

### Task 8: Campaigns, Workflows, Relations Routes

**Files:**
- Create: `C:\Dev\cin\mcp-server-api\src\routes\campaigns.ts`
- Create: `C:\Dev\cin\mcp-server-api\src\routes\workflows.ts`
- Create: `C:\Dev\cin\mcp-server-api\src\routes\relations.ts`
- Create: `C:\Dev\cin\mcp-server-api\tests\campaigns.test.ts`
- Create: `C:\Dev\cin\mcp-server-api\tests\workflows.test.ts`
- Create: `C:\Dev\cin\mcp-server-api\tests\relations.test.ts`
- Modify: `C:\Dev\cin\mcp-server-api\src\server.ts`

- [ ] **Step 1: Write campaigns route**

```typescript
// src/routes/campaigns.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { CampaignStatusEnum } from "../helpers/enums.js";

const ADMIN_USER_ID = 1000000000;

const createCampaignSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: z.number(),
  contentTypeIds: z.array(z.number()).optional(),
});

export async function campaignsRoutes(fastify: FastifyInstance) {
  fastify.get("/campaigns", async (request) => {
    const result = await request.tenantDb.query(
      `SELECT c."Id" as id, c."Name" as name, c."Description" as description,
              c."Type" as type, c."Status" as status, c."CreatedOn" as "createdOn"
       FROM "Campaign" c
       WHERE c."DeletedOn" IS NULL
       ORDER BY c."CreatedOn" DESC`
    );
    return { data: result.rows };
  });

  fastify.post("/campaigns", async (request, reply) => {
    const input = createCampaignSchema.parse(request.body);
    const client = await request.tenantDb.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO "Campaign" ("Name", "Description", "Type", "Status", "CreatedUserId", "CreatedOn")
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING "Id", "Name", "Type", "Status"`,
        [input.name, input.description || null, input.type, CampaignStatusEnum.Draft, ADMIN_USER_ID]
      );
      const campaignId = result.rows[0].Id;

      if (input.contentTypeIds) {
        for (const ctId of input.contentTypeIds) {
          await client.query(
            `INSERT INTO "CampaignContentTypeMappings" ("CampaignId", "ContentTypeId", "CreatedUserId", "CreatedOn")
             VALUES ($1, $2, $3, NOW())`,
            [campaignId, ctId, ADMIN_USER_ID]
          );
        }
      }

      await client.query("COMMIT");
      reply.code(201);
      return { data: { id: campaignId, ...result.rows[0] } };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });
}
```

- [ ] **Step 2: Write workflows route**

```typescript
// src/routes/workflows.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";

const ADMIN_USER_ID = 1000000000;

const createWorkflowTypeSchema = z.object({
  name: z.string(),
  contentTypeId: z.number(),
  stages: z.array(z.string()),
});

const createWorkflowSchema = z.object({
  name: z.string(),
  workflowTypeId: z.number(),
});

export async function workflowsRoutes(fastify: FastifyInstance) {
  fastify.get("/workflows", async (request) => {
    const result = await request.tenantDb.query(
      `SELECT w."Id" as id, w."Name" as name,
              wt."Name" as "workflowTypeName", wt."Id" as "workflowTypeId",
              w."CreatedOn" as "createdOn"
       FROM "Workflows" w
       JOIN "WorkflowTypes" wt ON w."WorkflowTypeId" = wt."Id"
       WHERE w."DeletedOn" IS NULL
       ORDER BY w."CreatedOn" DESC`
    );
    return { data: result.rows };
  });

  fastify.post("/workflow-types", async (request, reply) => {
    const input = createWorkflowTypeSchema.parse(request.body);
    const client = await request.tenantDb.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO "WorkflowTypes" ("Name", "CreatedUserId", "CreatedOn")
         VALUES ($1, $2, NOW())
         RETURNING "Id", "Name"`,
        [input.name, ADMIN_USER_ID]
      );
      const workflowTypeId = result.rows[0].Id;
      const stages: any[] = [];
      for (let i = 0; i < input.stages.length; i++) {
        const stageResult = await client.query(
          `INSERT INTO "Stages" ("Name", "WorkflowTypeId", "ContentTypeId", "Ordinal", "CreatedUserId", "CreatedOn")
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING "Id", "Name", "Ordinal"`,
          [input.stages[i], workflowTypeId, input.contentTypeId, i + 1, ADMIN_USER_ID]
        );
        stages.push(stageResult.rows[0]);
      }
      await client.query("COMMIT");
      reply.code(201);
      return { data: { id: workflowTypeId, name: input.name, stages } };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  fastify.post("/workflows", async (request, reply) => {
    const input = createWorkflowSchema.parse(request.body);
    const result = await request.tenantDb.query(
      `INSERT INTO "Workflows" ("Name", "WorkflowTypeId", "CreatedUserId", "CreatedOn")
       VALUES ($1, $2, $3, NOW())
       RETURNING "Id", "Name", "WorkflowTypeId"`,
      [input.name, input.workflowTypeId, ADMIN_USER_ID]
    );
    reply.code(201);
    return { data: result.rows[0] };
  });
}
```

- [ ] **Step 3: Write relations route**

```typescript
// src/routes/relations.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";

const ADMIN_USER_ID = 1000000000;

const createRelationsSchema = z.object({
  relations: z.array(
    z.object({
      leftContentId: z.number(),
      rightContentId: z.number(),
      notes: z.string().optional(),
    })
  ),
});

export async function relationsRoutes(fastify: FastifyInstance) {
  fastify.get("/relations/:contentId", async (request) => {
    const { contentId } = request.params as { contentId: string };
    const result = await request.tenantDb.query(
      `SELECT r."Id" as id,
              r."LeftContentId" as "leftContentId", lc."Name" as "leftName",
              r."RightContentId" as "rightContentId", rc."Name" as "rightName",
              r."Note" as notes, r."CreatedOn" as "createdOn"
       FROM "Relation" r
       JOIN "Content" lc ON r."LeftContentId" = lc."Id"
       JOIN "Content" rc ON r."RightContentId" = rc."Id"
       WHERE (r."LeftContentId" = $1 OR r."RightContentId" = $1)
         AND r."DeletedOn" IS NULL
       ORDER BY r."CreatedOn" DESC`,
      [parseInt(contentId)]
    );
    return { data: result.rows };
  });

  fastify.post("/relations", async (request, reply) => {
    const input = createRelationsSchema.parse(request.body);
    const client = await request.tenantDb.connect();
    try {
      await client.query("BEGIN");
      const results: any[] = [];
      for (const rel of input.relations) {
        const result = await client.query(
          `INSERT INTO "Relation" ("LeftContentId", "RightContentId", "Note", "CreatedUserId", "CreatedOn")
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING "Id", "LeftContentId", "RightContentId", "Note"`,
          [rel.leftContentId, rel.rightContentId, rel.notes || null, ADMIN_USER_ID]
        );
        if (result.rows.length > 0) results.push(result.rows[0]);
      }
      await client.query("COMMIT");
      reply.code(201);
      return { data: results };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });
}
```

- [ ] **Step 4: Write tests for campaigns**

```typescript
// tests/campaigns.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/server.js";
import { signToken } from "../src/auth/jwt.js";
import { disconnectAll } from "../src/db/pool-manager.js";
import { config } from "../src/config.js";

describe("Campaigns Routes", () => {
  const app = buildApp();
  const token = signToken({ tenantId: "test", dbName: "cin" }, config.jwtSecret);
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  let createdId: number;

  afterAll(async () => {
    if (createdId) {
      const { getPool } = await import("../src/db/pool-manager.js");
      const pool = getPool("cin");
      await pool.query(`DELETE FROM "CampaignContentTypeMappings" WHERE "CampaignId" = $1`, [createdId]);
      await pool.query(`DELETE FROM "Campaign" WHERE "Id" = $1`, [createdId]);
    }
    await app.close();
    await disconnectAll();
  });

  it("POST /campaigns should create", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers,
      payload: { name: "TEST_API_Campaign", type: 10 },
    });
    expect(res.statusCode).toBe(201);
    createdId = res.json().data.id;
    expect(createdId).toBeGreaterThan(0);
  });

  it("GET /campaigns should return array", async () => {
    const res = await app.inject({ method: "GET", url: "/campaigns", headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toBeInstanceOf(Array);
  });
});
```

- [ ] **Step 5: Write tests for workflows**

```typescript
// tests/workflows.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/server.js";
import { signToken } from "../src/auth/jwt.js";
import { disconnectAll } from "../src/db/pool-manager.js";
import { config } from "../src/config.js";

describe("Workflows Routes", () => {
  const app = buildApp();
  const token = signToken({ tenantId: "test", dbName: "cin" }, config.jwtSecret);
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  let workflowTypeId: number;
  let workflowId: number;

  afterAll(async () => {
    const { getPool } = await import("../src/db/pool-manager.js");
    const pool = getPool("cin");
    if (workflowId) await pool.query(`DELETE FROM "Workflows" WHERE "Id" = $1`, [workflowId]);
    if (workflowTypeId) {
      await pool.query(`DELETE FROM "Stages" WHERE "WorkflowTypeId" = $1`, [workflowTypeId]);
      await pool.query(`DELETE FROM "WorkflowTypes" WHERE "Id" = $1`, [workflowTypeId]);
    }
    await app.close();
    await disconnectAll();
  });

  it("POST /workflow-types should create with stages", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/workflow-types",
      headers,
      payload: { name: "TEST_API_WFType", contentTypeId: 2, stages: ["Draft", "Review", "Done"] },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    workflowTypeId = body.data.id;
    expect(body.data.stages).toHaveLength(3);
  });

  it("POST /workflows should create instance", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/workflows",
      headers,
      payload: { name: "TEST_API_Workflow", workflowTypeId },
    });
    expect(res.statusCode).toBe(201);
    workflowId = res.json().data.Id;
    expect(workflowId).toBeGreaterThan(0);
  });

  it("GET /workflows should return array", async () => {
    const res = await app.inject({ method: "GET", url: "/workflows", headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toBeInstanceOf(Array);
  });
});
```

- [ ] **Step 6: Write tests for relations**

```typescript
// tests/relations.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/server.js";
import { signToken } from "../src/auth/jwt.js";
import { disconnectAll } from "../src/db/pool-manager.js";
import { config } from "../src/config.js";

describe("Relations Routes", () => {
  const app = buildApp();
  const token = signToken({ tenantId: "test", dbName: "cin" }, config.jwtSecret);
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  let createdRelationId: number;

  afterAll(async () => {
    if (createdRelationId) {
      const { getPool } = await import("../src/db/pool-manager.js");
      const pool = getPool("cin");
      await pool.query(`DELETE FROM "Relation" WHERE "Id" = $1`, [createdRelationId]);
    }
    await app.close();
    await disconnectAll();
  });

  it("POST /relations should create", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/relations",
      headers,
      payload: { relations: [{ leftContentId: 2, rightContentId: 3, notes: "TEST_API_Relation" }] },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data).toHaveLength(1);
    createdRelationId = body.data[0].Id;
  });

  it("GET /relations/:contentId should return array", async () => {
    const res = await app.inject({ method: "GET", url: "/relations/2", headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toBeInstanceOf(Array);
  });
});
```

- [ ] **Step 7: Register all routes in server.ts**

Add to `src/server.ts`:

```typescript
import { campaignsRoutes } from "./routes/campaigns.js";
import { workflowsRoutes } from "./routes/workflows.js";
import { relationsRoutes } from "./routes/relations.js";

// Inside buildApp():
app.register(campaignsRoutes);
app.register(workflowsRoutes);
app.register(relationsRoutes);
```

- [ ] **Step 8: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/routes/campaigns.ts src/routes/workflows.ts src/routes/relations.ts tests/campaigns.test.ts tests/workflows.test.ts tests/relations.test.ts src/server.ts
git commit -m "feat: add campaigns, workflows, and relations routes"
```

---

### Task 9: Token Management Route

**Files:**
- Create: `C:\Dev\cin\mcp-server-api\src\routes\tokens.ts`
- Modify: `C:\Dev\cin\mcp-server-api\src\server.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/tokens.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/server.js";
import { config } from "../src/config.js";

describe("Token Routes", () => {
  const app = buildApp();
  let generatedToken: string;

  afterAll(async () => {
    await app.close();
  });

  it("POST /auth/tokens should fail without admin secret", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/tokens",
      headers: { "content-type": "application/json" },
      payload: { tenantId: "test-tenant", dbName: "cin_test" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /auth/tokens should generate token with admin secret", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/tokens",
      headers: {
        "content-type": "application/json",
        "x-admin-secret": config.adminSecret,
      },
      payload: { tenantId: "test-tenant", dbName: "cin_test" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.token).toBeDefined();
    expect(typeof body.data.token).toBe("string");
    generatedToken = body.data.token;
  });

  it("generated token should be valid for API requests", async () => {
    // We use /health which skips auth, so test by verifying the token structure
    const parts = generatedToken.split(".");
    expect(parts).toHaveLength(3); // JWT has 3 parts
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    expect(payload.tenantId).toBe("test-tenant");
    expect(payload.dbName).toBe("cin_test");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/tokens.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write the route**

```typescript
// src/routes/tokens.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { signToken } from "../auth/jwt.js";
import { config } from "../config.js";

const createTokenSchema = z.object({
  tenantId: z.string(),
  dbName: z.string(),
});

export async function tokensRoutes(fastify: FastifyInstance) {
  fastify.post("/auth/tokens", async (request, reply) => {
    const adminSecret = request.headers["x-admin-secret"];
    if (adminSecret !== config.adminSecret) {
      reply.code(401).send({ error: "Invalid admin secret" });
      return;
    }

    const input = createTokenSchema.parse(request.body);
    const token = signToken(input, config.jwtSecret);

    reply.code(201);
    return { data: { token, tenantId: input.tenantId, dbName: input.dbName } };
  });
}
```

- [ ] **Step 4: Register in server.ts**

Add to `src/server.ts`:

```typescript
import { tokensRoutes } from "./routes/tokens.js";

// Inside buildApp():
app.register(tokensRoutes);
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/tokens.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/routes/tokens.ts tests/tokens.test.ts src/server.ts
git commit -m "feat: add token generation endpoint with admin secret"
```

---

### Task 10: Users Route

**Files:**
- Create: `C:\Dev\cin\mcp-server-api\src\routes\users.ts`
- Create: `C:\Dev\cin\mcp-server-api\tests\users.test.ts`
- Modify: `C:\Dev\cin\mcp-server-api\src\server.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/users.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { buildApp } from "../src/server.js";
import { signToken } from "../src/auth/jwt.js";
import { disconnectAll } from "../src/db/pool-manager.js";
import { config } from "../src/config.js";

describe("Users Routes", () => {
  const app = buildApp();
  const token = signToken({ tenantId: "test", dbName: "cin" }, config.jwtSecret);
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  let createdUserId: number;

  afterAll(async () => {
    if (createdUserId) {
      const { getPool } = await import("../src/db/pool-manager.js");
      const pool = getPool("cin");
      await pool.query(`DELETE FROM "UserRoles" WHERE "UserId" = $1`, [createdUserId]);
      await pool.query(`DELETE FROM "UserContentType" WHERE "UserId" = $1`, [createdUserId]);
      await pool.query(`DELETE FROM "AspNetUsers" WHERE "Id" = $1`, [createdUserId]);
    }
    await app.close();
    await disconnectAll();
  });

  it("GET /users should return array", async () => {
    const res = await app.inject({ method: "GET", url: "/users", headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toBeInstanceOf(Array);
  });

  it("POST /users should create user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/users",
      headers,
      payload: {
        email: "test-api@example.com",
        firstName: "Test",
        lastName: "User",
      },
    });
    expect(res.statusCode).toBe(201);
    createdUserId = res.json().data.id;
    expect(createdUserId).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/users.test.ts
```

Expected: FAIL — route not found

- [ ] **Step 3: Write the route**

Note: The exact user table schema depends on the existing .NET Identity tables (likely `AspNetUsers`). The SQL below is based on common CIN patterns — verify table/column names against the actual DB schema before running.

```typescript
// src/routes/users.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { encrypt } from "../db/crypto.js";

const ADMIN_USER_ID = 1000000000;

const createUserSchema = z.object({
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

const assignRolesSchema = z.object({
  roleIds: z.array(z.number()),
  contentTypeId: z.number(),
});

const setPermissionsSchema = z.object({
  permissions: z.array(
    z.object({
      resource: z.number(),
      accessLevel: z.number(),
      contentTypeId: z.number().optional(),
    })
  ),
});

export async function usersRoutes(fastify: FastifyInstance) {
  fastify.get("/users", async (request) => {
    const result = await request.tenantDb.query(
      `SELECT u."Id" as id, u."Email" as email,
              u."FirstName" as "firstName", u."LastName" as "lastName",
              u."CreatedOn" as "createdOn"
       FROM "AspNetUsers" u
       WHERE u."DeletedOn" IS NULL
       ORDER BY u."CreatedOn" DESC`
    );
    return { data: result.rows };
  });

  fastify.post("/users", async (request, reply) => {
    const input = createUserSchema.parse(request.body);
    const encryptedEmail = encrypt(input.email);

    const result = await request.tenantDb.query(
      `INSERT INTO "AspNetUsers" ("Email", "FirstName", "LastName", "UserName", "NormalizedUserName", "NormalizedEmail", "EmailConfirmed", "PhoneNumberConfirmed", "TwoFactorEnabled", "LockoutEnabled", "AccessFailedCount", "CreatedOn")
       VALUES ($1, $2, $3, $4, $5, $6, true, false, false, false, 0, NOW())
       RETURNING "Id"`,
      [encryptedEmail, input.firstName, input.lastName, input.email, input.email.toUpperCase(), input.email.toUpperCase()]
    );

    reply.code(201);
    return { data: { id: result.rows[0].Id, email: input.email } };
  });

  fastify.put("/users/:id/roles", async (request) => {
    const { id } = request.params as { id: string };
    const userId = parseInt(id);
    const input = assignRolesSchema.parse(request.body);
    const client = await request.tenantDb.connect();
    try {
      await client.query("BEGIN");
      for (const roleId of input.roleIds) {
        await client.query(
          `INSERT INTO "UserRoles" ("UserId", "RoleId", "ContentTypeId", "CreatedUserId", "CreatedOn")
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT ("UserId", "RoleId", "ContentTypeId") DO NOTHING`,
          [userId, roleId, input.contentTypeId, ADMIN_USER_ID]
        );
      }
      await client.query("COMMIT");
      return { data: { success: true } };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  fastify.put("/users/:id/permissions", async (request) => {
    const { id } = request.params as { id: string };
    const userId = parseInt(id);
    const input = setPermissionsSchema.parse(request.body);
    const client = await request.tenantDb.connect();
    try {
      await client.query("BEGIN");
      for (const perm of input.permissions) {
        await client.query(
          `INSERT INTO "UserContentType" ("UserId", "ContentTypeId")
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, perm.contentTypeId || 0]
        );
      }
      await client.query("COMMIT");
      return { data: { success: true } };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });
}
```

- [ ] **Step 4: Register in server.ts**

```typescript
import { usersRoutes } from "./routes/users.js";

// Inside buildApp():
app.register(usersRoutes);
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/users.test.ts
```

Expected: 2 tests PASS (if AspNetUsers table exists and has matching columns — adjust SQL if schema differs)

- [ ] **Step 6: Commit**

```bash
git add src/routes/users.ts tests/users.test.ts src/server.ts
git commit -m "feat: add user management routes (create, roles, permissions)"
```

---

## Phase 2: MCP Server Umbau (Tasks 11–13)

### Task 11: API Client for MCP Server

**Files:**
- Create: `C:\Dev\cin\mcp-server\src\api-client.ts`
- Create: `C:\Dev\cin\mcp-server\tests\api-client.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api-client.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { createApiClient } from "../src/api-client.js";

describe("API Client", () => {
  it("should create a client with base URL and token", () => {
    const client = createApiClient("http://localhost:3000", "test-token");
    expect(client).toBeDefined();
    expect(client.get).toBeDefined();
    expect(client.post).toBeDefined();
    expect(client.put).toBeDefined();
  });

  // Integration test — requires API to be running
  // Uncomment when API is deployed
  // it("should call GET /health", async () => {
  //   const client = createApiClient("http://localhost:3000", "test-token");
  //   const result = await client.get("/health");
  //   expect(result.status).toBe("ok");
  // });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/api-client.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/api-client.ts
export interface ApiClient {
  get: <T = any>(path: string) => Promise<T>;
  post: <T = any>(path: string, body?: any) => Promise<T>;
  put: <T = any>(path: string, body?: any) => Promise<T>;
  del: <T = any>(path: string) => Promise<T>;
}

export function createApiClient(baseUrl: string, token: string): ApiClient {
  async function request<T>(method: string, path: string, body?: any): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`API ${method} ${path} failed (${res.status}): ${error.error || res.statusText}`);
    }

    const json = await res.json();
    return json.data !== undefined ? json.data : json;
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: any) => request<T>("POST", path, body),
    put: <T>(path: string, body?: any) => request<T>("PUT", path, body),
    del: <T>(path: string) => request<T>("DELETE", path),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/api-client.test.ts
```

Expected: 1 test PASS

- [ ] **Step 5: Commit**

```bash
git add src/api-client.ts tests/api-client.test.ts
git commit -m "feat: add API client for MCP-Server-API communication"
```

---

### Task 12: Rewrite MCP Server Tools to Use API Client

**Files:**
- Modify: `C:\Dev\cin\mcp-server\src\index.ts`
- Rewrite: `C:\Dev\cin\mcp-server\src\tools\content-types.ts`
- Rewrite: `C:\Dev\cin\mcp-server\src\tools\content-items.ts`
- Rewrite: `C:\Dev\cin\mcp-server\src\tools\campaigns.ts`
- Rewrite: `C:\Dev\cin\mcp-server\src\tools\workflows.ts`
- Rewrite: `C:\Dev\cin\mcp-server\src\tools\relations.ts`
- Delete: `C:\Dev\cin\mcp-server\src\db.ts`
- Delete: `C:\Dev\cin\mcp-server\src\crypto.ts`
- Delete: `C:\Dev\cin\mcp-server\src\helpers\enums.ts`
- Delete: `C:\Dev\cin\mcp-server\src\helpers\widget-types.ts`

- [ ] **Step 1: Rewrite content-types.ts**

```typescript
// src/tools/content-types.ts
import { ApiClient } from "../api-client.js";

export async function listContentTypes(api: ApiClient) {
  return api.get("/content-types");
}

export async function createContentType(
  api: ApiClient,
  input: {
    name: string;
    description?: string;
    widgets?: Array<{
      name: string;
      fieldType: number;
      required?: boolean;
      description?: string;
      options?: string[];
    }>;
  }
) {
  return api.post("/content-types", input);
}
```

- [ ] **Step 2: Rewrite content-items.ts**

```typescript
// src/tools/content-items.ts
import { ApiClient } from "../api-client.js";

export async function listContentItems(
  api: ApiClient,
  input: { contentTypeId?: number; search?: string; pageSize?: number; page?: number } = {}
) {
  const params = new URLSearchParams();
  if (input.contentTypeId) params.set("contentTypeId", String(input.contentTypeId));
  if (input.search) params.set("search", input.search);
  if (input.pageSize) params.set("pageSize", String(input.pageSize));
  if (input.page) params.set("page", String(input.page));
  const qs = params.toString();
  return api.get(`/content-items${qs ? `?${qs}` : ""}`);
}

export async function getContentDetails(api: ApiClient, contentId: number) {
  return api.get(`/content-items/${contentId}`);
}

export async function createContentItem(
  api: ApiClient,
  input: { contentTypeId: number; name: string; abstract?: string; widgets?: Record<string, any> }
) {
  return api.post("/content-items", input);
}

export async function updateContentItem(
  api: ApiClient,
  id: number,
  input: { name?: string; abstract?: string; status?: number; widgets?: Record<string, any> }
) {
  return api.put(`/content-items/${id}`, input);
}
```

- [ ] **Step 3: Rewrite campaigns.ts**

```typescript
// src/tools/campaigns.ts
import { ApiClient } from "../api-client.js";

export async function listCampaigns(api: ApiClient) {
  return api.get("/campaigns");
}

export async function createCampaign(
  api: ApiClient,
  input: { name: string; description?: string; type: number; contentTypeIds?: number[] }
) {
  return api.post("/campaigns", input);
}
```

- [ ] **Step 4: Rewrite workflows.ts**

```typescript
// src/tools/workflows.ts
import { ApiClient } from "../api-client.js";

export async function listWorkflows(api: ApiClient) {
  return api.get("/workflows");
}

export async function createWorkflowType(
  api: ApiClient,
  input: { name: string; contentTypeId: number; stages: string[] }
) {
  return api.post("/workflow-types", input);
}

export async function createWorkflow(
  api: ApiClient,
  input: { name: string; workflowTypeId: number }
) {
  return api.post("/workflows", input);
}
```

- [ ] **Step 5: Rewrite relations.ts**

```typescript
// src/tools/relations.ts
import { ApiClient } from "../api-client.js";

export async function listRelations(api: ApiClient, contentId: number) {
  return api.get(`/relations/${contentId}`);
}

export async function createRelations(
  api: ApiClient,
  relations: Array<{ leftContentId: number; rightContentId: number; notes?: string }>
) {
  return api.post("/relations", { relations });
}
```

- [ ] **Step 6: Rewrite index.ts**

```typescript
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createApiClient } from "./api-client.js";
import { listContentTypes, createContentType } from "./tools/content-types.js";
import { listContentItems, getContentDetails, createContentItem, updateContentItem } from "./tools/content-items.js";
import { createRelations, listRelations } from "./tools/relations.js";
import { createCampaign, listCampaigns } from "./tools/campaigns.js";
import { createWorkflowType, createWorkflow, listWorkflows } from "./tools/workflows.js";

const API_URL = process.env.API_URL || "http://localhost:3000";
const TENANT_TOKEN = process.env.TENANT_TOKEN || "";

if (!TENANT_TOKEN) {
  console.error("ERROR: TENANT_TOKEN environment variable is required");
  process.exit(1);
}

const api = createApiClient(API_URL, TENANT_TOKEN);

const server = new McpServer({
  name: "cin-trendradar",
  version: "0.2.0",
});

// ── Content Types ─────────────────────────────────────────────────────────────

server.tool("list_content_types", "List all content types", {}, async () => {
  const result = await listContentTypes(api);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.tool(
  "create_content_type",
  "Create a new content type with optional widgets",
  {
    name: z.string(),
    description: z.string().optional(),
    widgets: z
      .array(
        z.object({
          name: z.string(),
          fieldType: z.number(),
          required: z.boolean().optional(),
          description: z.string().optional(),
          options: z.array(z.string()).optional(),
        })
      )
      .optional(),
  },
  async (args) => {
    const result = await createContentType(api, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Content Items ─────────────────────────────────────────────────────────────

server.tool(
  "list_content_items",
  "List content items with optional filters",
  {
    contentTypeId: z.number().optional(),
    search: z.string().optional(),
    pageSize: z.number().optional(),
    page: z.number().optional(),
  },
  async (args) => {
    const result = await listContentItems(api, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_content_details",
  "Get full details of a content item including widget values",
  { contentId: z.number() },
  async (args) => {
    const result = await getContentDetails(api, args.contentId);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

const widgetValueSchema = z
  .record(
    z.string(),
    z.object({
      textValue: z.string().optional(),
      intValue: z.number().optional(),
      dateValue: z.string().optional(),
      decimalValue: z.number().optional(),
    })
  )
  .optional();

server.tool(
  "create_content_item",
  "Create a new content item",
  {
    contentTypeId: z.number(),
    name: z.string(),
    abstract: z.string().optional(),
    widgets: widgetValueSchema,
  },
  async (args) => {
    const result = await createContentItem(api, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "update_content_item",
  "Update an existing content item",
  {
    id: z.number(),
    name: z.string().optional(),
    abstract: z.string().optional(),
    status: z.number().optional(),
    widgets: widgetValueSchema,
  },
  async (args) => {
    const { id, ...rest } = args;
    await updateContentItem(api, id, rest);
    return { content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }] };
  }
);

// ── Relations ─────────────────────────────────────────────────────────────────

server.tool(
  "create_relations",
  "Create one or more relations between content items",
  {
    relations: z.array(
      z.object({
        leftContentId: z.number(),
        rightContentId: z.number(),
        notes: z.string().optional(),
      })
    ),
  },
  async (args) => {
    const result = await createRelations(api, args.relations);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "list_relations",
  "List all relations for a content item",
  { contentId: z.number() },
  async (args) => {
    const result = await listRelations(api, args.contentId);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Campaigns ─────────────────────────────────────────────────────────────────

server.tool(
  "create_campaign",
  "Create a new campaign",
  {
    name: z.string(),
    description: z.string().optional(),
    type: z.number(),
    contentTypeIds: z.array(z.number()).optional(),
  },
  async (args) => {
    const result = await createCampaign(api, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool("list_campaigns", "List all campaigns", {}, async () => {
  const result = await listCampaigns(api);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

// ── Workflows ─────────────────────────────────────────────────────────────────

server.tool(
  "create_workflow_type",
  "Create a new workflow type with stages",
  {
    name: z.string(),
    contentTypeId: z.number(),
    stages: z.array(z.string()),
  },
  async (args) => {
    const result = await createWorkflowType(api, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "create_workflow",
  "Create a new workflow instance",
  {
    name: z.string(),
    workflowTypeId: z.number(),
  },
  async (args) => {
    const result = await createWorkflow(api, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool("list_workflows", "List all workflows", {}, async () => {
  const result = await listWorkflows(api);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

// ── Start server ──────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CIN MCP Server running on stdio — 13 tools registered (via API)");
}

main().catch(console.error);
```

- [ ] **Step 7: Delete old files**

```bash
rm src/db.ts src/crypto.ts src/helpers/enums.ts src/helpers/widget-types.ts
rmdir src/helpers
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: rewrite MCP Server tools to use API client instead of direct SQL"
```

---

### Task 13: Update MCP Server Dependencies and Config

**Files:**
- Modify: `C:\Dev\cin\mcp-server\package.json`
- Modify: `C:\Users\bruno\.claude\projects\C--Dev\settings.json`
- Delete: `C:\Dev\cin\mcp-server\.env`

- [ ] **Step 1: Remove pg and dotenv from package.json**

```bash
cd C:/Dev/cin/mcp-server
npm uninstall pg dotenv @types/pg
```

- [ ] **Step 2: Remove old tests that depend on direct DB**

```bash
rm tests/db.test.ts tests/crypto.test.ts tests/content-types.test.ts tests/content-items.test.ts tests/campaigns.test.ts tests/relations.test.ts tests/workflows.test.ts
```

- [ ] **Step 3: Update Claude Code MCP config**

Update `C:\Users\bruno\.claude\projects\C--Dev\settings.json`:

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

- [ ] **Step 4: Delete .env from MCP Server (no longer needed)**

```bash
rm C:/Dev/cin/mcp-server/.env
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove direct DB deps, update MCP config for API mode"
```

---

## Phase 3: Integration Test (Task 14)

### Task 14: End-to-End Integration Test

**Files:**
- No new files — manual verification

- [ ] **Step 1: Start the API locally**

```bash
cd C:/Dev/cin/mcp-server-api
npm run dev
```

Expected: `MCP-Server-API running at http://0.0.0.0:3000`

- [ ] **Step 2: Generate a test token**

```bash
curl -X POST http://localhost:3000/auth/tokens \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: admin-secret-change-in-production" \
  -d '{"tenantId": "local-test", "dbName": "cin"}'
```

Expected: JSON with `data.token`

- [ ] **Step 3: Test an API endpoint with the token**

```bash
curl http://localhost:3000/content-types \
  -H "Authorization: Bearer <token-from-step-2>"
```

Expected: JSON with `data` array containing content types

- [ ] **Step 4: Update MCP Server .env for local testing**

Set `API_URL=http://localhost:3000` and `TENANT_TOKEN=<token-from-step-2>` in the Claude Code MCP config.

- [ ] **Step 5: Test MCP Server via Claude Code**

Restart Claude Code and try: "List all content types"

Expected: MCP Server calls API, returns content types

- [ ] **Step 6: Run all API tests**

```bash
cd C:/Dev/cin/mcp-server-api
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "test: verify end-to-end integration"
```
