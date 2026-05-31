# 01 — Tenant & Auth

> Erkundet: 2026-05-31 | DB: tenant-management + cin

## Multi-Tenancy Architektur

trendradar nutzt ein **Shared-Database, Row-Level-Filtering** Modell mit einer separaten Tenant-Routing-DB.

### Zwei Datenbanken

| DB | Zweck |
|---|---|
| `tenant-management` | Routing: Welche Domain gehoert zu welchem Tenant, welche DB-Connection |
| `cin` | Alle Tenant-Daten (User, Content, Kampagnen etc.) — shared DB |

### Tenant-Tabelle (DB: tenant-management)

```
Tenant
├── TenantId        (int, PK, auto-increment)
├── Domains         (text) — komma-separierte Liste von URLs
├── DatabaseConnection (varchar 512) — Connection String zur Tenant-DB
└── Enabled         (boolean)
```

**Aktueller Eintrag:**
- TenantId: 1
- Domains: `https://localhost:5001/, https://demo.crossinnovation.network/, ...`
- DatabaseConnection: `User ID=postgres;Password=1;Server=localhost;Port=5432;Database=cin;...`
- Enabled: true

**Wie es funktioniert:**
1. Request kommt rein (z.B. `https://localhost:5001/`)
2. .NET Backend schaut in `tenant-management.Tenant` welcher Eintrag diese Domain hat
3. Nimmt den `DatabaseConnection` String und verbindet sich zur Tenant-DB (`cin`)
4. Alle weiteren Queries gehen gegen diese DB

**Fuer MCP-API:** Wir brauchen die Domain-Aufloesung nicht — wir verbinden direkt zur `cin` DB. Aber wir muessen wissen welcher TenantId wir sind (fuer Row-Level Filtering).

## User & Auth

### User-Tabelle (DB: cin)

```
User
├── Id                  (int, PK, auto-increment, Seed: 1000000000)
├── UserName            (varchar, optional)
├── FirstName           (varchar, VERSCHLUESSELT via AES-128-CBC)
├── LastName            (varchar, VERSCHLUESSELT)
├── Email               (varchar 450, NOT NULL, VERSCHLUESSELT)
├── Phone               (varchar, VERSCHLUESSELT)
├── Password_Password   (text) — Klartext oder Hash je nach Password_Type
├── Password_Salt       (varchar)
├── Password_Type       (int, default 10) — 10 = Klartext
├── IsActive            (boolean)
├── IsGuest             (boolean)
├── Enabled2FA          (boolean)
├── UId                 (uuid, auto-generated)
├── Culture             (text, z.B. "de" oder "en")
├── MediaId             (int, FK → Media) — Profilbild
├── CountryId           (int, FK → Country)
├── Address_Street/Zip/Location (text)
├── CreatedUserId / CreatedOn / ModifiedUserId / ModifiedOn
├── DeletedOn           (timestamp, soft-delete)
└── UserNotificationPreferences_* (boolean flags)
```

**Seed-Admin:**
- Id: 1000000000
- Email: `saas.admin@crossinnovation.network` (verschluesselt gespeichert)
- Passwort: `admin1,2` (Klartext, Password_Type=10)

### Verschluesselung

Die Felder Email, FirstName, LastName, Phone sind mit **AES-128-CBC** verschluesselt.

**Key-Derivation:**
- Encryption-Passwort aus `appsettings.json` → `DatabaseEncryption.EncryptPassword`
- Aktueller Wert: `hZ5QshmUPuQBVUWgUY3JmrlTJ7TmtqCjXzeoWeNR3Fw`
- `PasswordFixer()`: Nimmt erste 16 Bytes des Passworts, padded mit 0x6F (111)
- `IvFixer()`: Nimmt Bytes 16-32 des Passworts, padded mit 0x6F (111)
- Key-Length: **128 Bit** (nicht 256 wie im Code als Default!)

**Fuer MCP-API:** Wir muessen die gleiche Verschluesselung implementieren um User-Daten lesen/schreiben zu koennen. Node.js Implementierung existiert bereits (getestet).

## Rollen & Berechtigungen

### Roles-Tabelle

```
Roles
├── Id                  (int, PK)
├── Name                (varchar 450)
├── IsCreatedBySystem   (boolean) — System-Rollen nicht loeschbar
├── RoleType            (int, default 10)
├── DeletedOn           (soft-delete)
└── CreatedUserId / CreatedOn / ModifiedUserId / ModifiedOn
```

**Seed-Rollen:**
| Id | Name | System | Typ |
|---|---|---|---|
| 1000000 | Admin | ja | 10 |
| 1000001 | Creator | nein | 10 |
| 1000002 | Viewer | nein | 10 |

### ResourceRight-Tabelle (Berechtigungen pro Rolle)

```
ResourceRight
├── Id       (int, PK)
├── RoleId   (int, FK → Roles)
├── Resource (int) — Enum-Wert (10=Item, 20=Campaign, 30=ContentTypeManagement, 40=UserManagement)
└── Level    (int) — Enum-Wert (10=View, 20=Write, 30=Delete)
```

**Admin hat:**
| Resource | Level | Bedeutung |
|---|---|---|
| 10 | 30 | Item: Delete (= auch View + Write) |
| 20 | 30 | Campaign: Delete |
| 30 | 30 | ContentTypeManagement: Delete |
| 40 | 30 | UserManagement: Delete |

### UserRoles-Tabelle (User ↔ Rolle Zuordnung)

```
UserRoles
├── Id             (int, PK)
├── UserId         (int, FK → User)
├── RoleId         (int, FK → Roles)
├── ContentTypeId  (int, FK → ContentType, optional) — Rolle kann auf Content Type eingeschraenkt sein!
└── CreatedUserId / CreatedOn / ModifiedUserId / ModifiedOn
```

**Wichtig:** `ContentTypeId` bedeutet dass eine Rolle auf einen bestimmten Content Type beschraenkt werden kann. Der Admin hat `ContentTypeId = NULL` = Zugriff auf alles.

## API-Login

**Endpoint:** `POST /api/v2/authentication/authenticate`
**Request:** `{ "email": "...", "password": "..." }`
**Response:** `{ "token": "eyJ...", "refreshToken": "fb7ce..." }`

- Token Lifetime: 5 Minuten
- Refresh Token Lifetime: 3 Tage
- Issuer/Audience: `crossinnovation.network`
- JWT enthält: UserId, Email, JTI

**Token-Refresh:** `POST /api/v2/authentication/refresh`
**Request:** `{ "accessToken": "eyJ...", "refreshToken": "fb7ce..." }`

## Fuer MCP-API Relevanz

| Aspekt | Fuer MCP-API |
|---|---|
| Tenant-Routing | Nicht noetig — wir gehen direkt auf die DB |
| User-Verschluesselung | Muss implementiert werden (AES-128-CBC) |
| Rollen/Rechte | Beim direkten DB-Zugriff umgehen wir die Auth-Checks. MCP-API muss selbst sicherstellen dass sie nur mit Admin-Rechten operiert |
| JWT | Nicht noetig fuer DB-Zugriff, aber koennte nuetzlich sein wenn MCP-API auch die REST-API nutzen will |
| Password_Type 10 | Klartext-Passwoerter in der DB — sicherheitskritisch, aber fuer uns irrelevant |
