# 05 — User, System & Tenants (vollstaendig)

> Erkundet: 2026-05-27 | DBs: cin, tenant-management, tenant-events, common-feedback

---

## A. USER & AUTH Tabellen (DB: cin)

### 1. User

Zentrale Benutzertabelle. Felder wie Email, FirstName, LastName, Phone sind mit AES-128-CBC verschluesselt.

```
User
├── Id                  (int, PK, auto-increment)
├── UId                 (uuid, NOT NULL, default uuid_generate_v4())
├── UserName            (varchar, optional)
├── FirstName           (varchar, VERSCHLUESSELT)
├── LastName            (varchar, VERSCHLUESSELT)
├── Email               (varchar 450, NOT NULL, VERSCHLUESSELT)
├── Phone               (varchar, VERSCHLUESSELT)
├── Address_Street      (text)
├── Address_Zip         (text)
├── Address_Location    (text)
├── Password_Password   (text) — Hash oder Klartext je nach Password_Type
├── Password_Salt       (varchar, VERSCHLUESSELT)
├── Password_CreatedOn  (timestamp)
├── Password_Type       (int, default 10) → PasswordTypeEnum
├── MediaId             (int, FK → Media) — Profilbild
├── CountryId           (int, FK → Country)
├── IsActive            (boolean, NOT NULL, default false)
├── IsGuest             (boolean, NOT NULL, default false)
├── IsRegistered        (boolean, optional)
├── Enabled2FA          (boolean, NOT NULL, default false)
├── Culture             (text) — z.B. "de", "en"
├── UserNotificationPreferences_EnableBellActivationForEditedItems  (boolean, default true)
├── UserNotificationPreferences_EnableEmailNotification             (boolean, default true)
├── UserNotificationPreferences_EnableNotifyForCreatedItems         (boolean, default true)
├── UserNotificationPreferences_EnableNotifyForNewItems             (boolean, default true)
├── CreatedUserId       (int, FK → User, self-ref)
├── CreatedOn           (timestamp, NOT NULL)
├── ModifiedUserId      (int, FK → User, self-ref)
├── ModifiedOn          (timestamp)
└── DeletedOn           (timestamp, soft-delete)
```

**Indexes:**
- `PK_User` — PRIMARY KEY (Id)
- `IX_User_CountryId`, `IX_User_CreatedUserId`, `IX_User_MediaId`, `IX_User_ModifiedUserId`

**FK-Constraints:**
- CountryId → Country(Id) ON DELETE RESTRICT
- MediaId → Media(Id) ON DELETE SET NULL
- CreatedUserId → User(Id) ON DELETE RESTRICT (self-ref)
- ModifiedUserId → User(Id) ON DELETE RESTRICT (self-ref)

**Referenziert von:** UserRoles, UserData, UserActivities, UserInvitations, UserRefreshToken, UserContentType, VerificationProvider, Content, ContentType, Roles, Media, ActionBoard, Campaign, ItemHistoryRecords, AISession, SavedCollections, SavedFilters, Tracks, Workflows, u.v.m.

---

### 2. UserRoles

Zuordnungstabelle User ↔ Rolle. Kann auf einen ContentType eingeschraenkt werden.

```
UserRoles
├── Id             (int, PK, auto-increment)
├── UserId         (int, NOT NULL, FK → User) ON DELETE CASCADE
├── RoleId         (int, NOT NULL, FK → Roles) ON DELETE CASCADE
├── ContentTypeId  (int, FK → ContentType, optional) — NULL = alle Content Types
├── CreatedUserId  (int, FK → User) ON DELETE RESTRICT
├── CreatedOn      (timestamp, NOT NULL)
├── ModifiedUserId (int, FK → User) ON DELETE RESTRICT
└── ModifiedOn     (timestamp)
```

**Indexes:**
- `PK_UserRoles` — PRIMARY KEY (Id)
- `IX_UserRoles_UserId_RoleId_ContentTypeId` — UNIQUE (UserId, RoleId, ContentTypeId)
- `IX_UserRoles_ContentTypeId`, `IX_UserRoles_RoleId`

**Wichtig:** ContentTypeId = NULL bedeutet Zugriff auf alle Content Types. Ein User kann dieselbe Rolle mehrfach mit unterschiedlichen ContentTypeId-Einschraenkungen haben.

---

### 3. Roles

Rollen-Definition. System-Rollen (IsCreatedBySystem=true) sind nicht loeschbar.

```
Roles
├── Id                (int, PK, auto-increment)
├── Name              (varchar 450, NOT NULL)
├── RoleType          (int, NOT NULL, default 10) → RoleTypeEnum
├── IsCreatedBySystem (boolean, NOT NULL, default false)
├── CreatedUserId     (int, FK → User) ON DELETE RESTRICT
├── CreatedOn         (timestamp, NOT NULL)
├── ModifiedUserId    (int, FK → User) ON DELETE RESTRICT
├── ModifiedOn        (timestamp)
└── DeletedOn         (timestamp, soft-delete)
```

**Referenziert von:** UserRoles, ResourceRight, RolePermissionsOld

---

### 4. ResourceRight

Berechtigungszuordnung pro Rolle: Welche Ressource mit welchem Access-Level.

```
ResourceRight
├── Id       (int, PK, auto-increment)
├── RoleId   (int, NOT NULL, default 0, FK → Roles) ON DELETE CASCADE
├── Resource (int, NOT NULL) → ResourceEnum
└── Level    (int, NOT NULL) → ResourceAccessLevelEnum
```

**Logik:** Level ist hierarchisch — Delete (30) impliziert auch Write (20) und View (10).

---

### 5. UserContentType

Zuordnungstabelle: Welche Content Types ein User sehen darf. Composite PK.

```
UserContentType
├── UserId        (int, NOT NULL, FK → User) ON DELETE CASCADE
└── ContentTypeId (int, NOT NULL, FK → ContentType) ON DELETE CASCADE
```

**PK:** Composite (UserId, ContentTypeId)

---

### 6. UserData

Key-Value-Store fuer zusaetzliche User-Informationen (z.B. letzte App-Version, letzte Anmeldung).

```
UserData
├── Id        (bigint, PK, auto-increment)
├── UserId    (int, NOT NULL, FK → User) ON DELETE CASCADE
├── Type      (int, NOT NULL, default 10) → UserDataTypeEnum
├── Name      (text)
├── Value     (text)
└── CreatedOn (timestamp, NOT NULL)
```

**Indexes:** IX_UserData_UserId, IX_UserData_Type

---

### 7. UserActivities

Audit-Log fuer Benutzeraktivitaeten (Logins, ActionBoard-Views, Campaign-Aktionen etc.).

```
UserActivities
├── Id            (bigint, PK, auto-increment)
├── Type          (int, NOT NULL) → UserActivityEnum
├── CreatedOn     (timestamp, NOT NULL)
├── CreatedUserId (int, NOT NULL, FK → User) ON DELETE CASCADE
├── EntityId      (int, optional) — Referenz auf das betroffene Objekt
└── Details       (text, optional) — Zusaetzliche Infos als Text/JSON
```

**Index:** IX_UserActivities_CreatedUserId_EntityId_Type (Composite)

---

### 8. UserInvitations

Einladungen fuer neue Benutzer. Status-Tracking von Erstellung bis Akzeptanz.

```
UserInvitations
├── Id             (uuid, PK)
├── UserId         (int, NOT NULL, FK → User) ON DELETE CASCADE
├── Status         (int, NOT NULL) → UserInvitationStatusEnum
├── CreatedUserId  (int, NOT NULL, FK → User) ON DELETE CASCADE
├── CreatedOn      (timestamp, NOT NULL)
├── ModifiedUserId (int, FK → User)
└── ModifiedOn     (timestamp)
```

---

### 9. UserRefreshToken

Refresh-Tokens fuer JWT-basierte Authentifizierung.

```
UserRefreshToken
├── Id        (uuid, PK)
├── Token     (text)
├── JwtId     (text) — Referenz auf den zugehoerigen JWT
├── UserId    (int, NOT NULL, FK → User) ON DELETE CASCADE
├── CreatedOn (timestamp, NOT NULL)
├── ExpiresAt (timestamp, NOT NULL)
├── IsUsed    (boolean, NOT NULL)
└── IsRevoked (boolean, NOT NULL)
```

**Logik:** Token ist einmalig verwendbar (IsUsed). Kann widerrufen werden (IsRevoked). Lifetime: 3 Tage.

---

### 10. TwoFAProvider

Konfiguration der verfuegbaren Zwei-Faktor-Authentifizierungs-Provider.

```
TwoFAProvider
├── Id      (int, PK, auto-increment)
├── Type    (int, NOT NULL) → TwoFATypeEnum
├── Name    (varchar 75, NOT NULL)
└── Enabled (boolean, NOT NULL)
```

**Keine FKs.** Standalone-Konfigurationstabelle.

---

### 11. VerificationProvider

Verifizierungscodes fuer E-Mail-Bestaetigung, Passwort-Reset etc.

```
VerificationProvider
├── Id         (int, PK, auto-increment)
├── Name       (varchar, optional) — Art der Verifikation
├── UserId     (int, NOT NULL, FK → User) ON DELETE CASCADE
├── Email      (varchar, optional)
├── Code       (varchar 450, optional) — Verifikationscode
├── CreatedOn  (timestamp, NOT NULL)
├── ExpiredOn  (timestamp, NOT NULL)
├── IsVerified (boolean, NOT NULL)
└── ApprovedOn (timestamp, optional)
```

---

## B. SYSTEM Tabellen (DB: cin)

### 12. Setting

Key-Value-Konfigurationstabelle fuer globale Einstellungen.

```
Setting
├── Id          (int, PK, auto-increment)
├── Key         (text, UNIQUE)
├── Value       (text)
└── SettingType (int, NOT NULL) → SettingTypeEnum
```

**Index:** IX_Setting_Key (UNIQUE) — jeder Key darf nur einmal existieren.

---

### 13. Theme

UI-Theme-Konfiguration (Farben, Schriften etc.) als JSON.

```
Theme
├── Id        (int, PK, auto-increment)
├── Config    (varchar) — JSON-Konfiguration des Themes
├── MediaId   (int, FK → Media) ON DELETE SET NULL — Logo/Bild
├── Version   (int, NOT NULL, default 0) — Versionierung
├── Type      (int, NOT NULL, default 0) → ThemeTypeEnum [OBSOLETE]
└── DeletedOn (timestamp, soft-delete)
```

---

### 14. Country

Laendertabelle mit ISO-Codes.

```
Country
├── Id             (int, PK, auto-increment)
├── Name           (varchar)
├── ISO2           (text) — z.B. "DE", "AT"
├── ISO3           (text) — z.B. "DEU", "AUT"
├── Published      (boolean, NOT NULL) — sichtbar in der UI
├── DisplayOrder   (int, NOT NULL) — Sortierung
├── CreatedUserId  (int, NOT NULL, FK → User) ON DELETE CASCADE
├── CreatedOn      (timestamp, NOT NULL)
├── ModifiedUserId (int, FK → User) ON DELETE CASCADE
├── ModifiedOn     (timestamp)
└── DeletedOn      (timestamp, soft-delete)
```

**Referenziert von:** User(CountryId), Address(CountryId), StateProvince(CountryId)

---

### 15. StateProvince

Bundeslaender/Provinzen, gehoeren zu einem Land.

```
StateProvince
├── Id        (int, PK, auto-increment)
├── Name      (varchar)
├── StateCode (varchar) — z.B. "BY", "NW"
├── CountryId (int, NOT NULL, FK → Country) ON DELETE CASCADE
└── DeletedOn (timestamp, soft-delete)
```

**Referenziert von:** Address(StateProvinceId)

---

### 16. Address

Allgemeine Adresstabelle (nicht zu verwechseln mit den Address_*-Feldern in User).

```
Address
├── Id              (int, PK, auto-increment)
├── FirstName       (text)
├── LastName        (text)
├── Title           (text)
├── Company         (text)
├── Email           (text)
├── Phone           (text)
├── Cell            (text)
├── Street          (text)
├── Apartment       (text)
├── City            (text)
├── ZipCode         (text)
├── CountryId       (int, FK → Country) ON DELETE SET NULL
├── StateProvinceId (int, FK → StateProvince) ON DELETE SET NULL
├── Longitude       (numeric)
├── Latitude        (numeric)
├── CreatedUserId   (int, NOT NULL, FK → User) ON DELETE CASCADE
├── CreatedOn       (timestamp, NOT NULL)
├── ModifiedUserId  (int, FK → User) ON DELETE CASCADE
├── ModifiedOn      (timestamp)
└── DeletedOn       (timestamp, soft-delete)
```

---

### 17. EmailQueue

Ausgehende E-Mail-Warteschlange. Wird von einem Background-Service verarbeitet.

```
EmailQueue
├── Id            (bigint, PK, auto-increment)
├── Status        (int, NOT NULL) → EmailQueueStatusEnum
├── FromIp        (text)
├── EmailFrom     (text)
├── EmailFromName (text)
├── EmailTo       (text)
├── CCList        (text) — komma-separiert
├── Subject       (text)
├── Body          (text)
├── IsHtml        (boolean, NOT NULL)
├── CreatedOn     (timestamp, NOT NULL)
├── SentDateTime  (timestamp, optional) — Zeitpunkt des erfolgreichen Versands
└── RetryCount    (int, optional)
```

**Referenziert von:** EmailQueueAttachments(EmailQueueId)

---

### 18. EmailQueueAttachments

Anhaenge fuer E-Mails in der Warteschlange.

```
EmailQueueAttachments
├── Id           (bigint, PK, auto-increment)
├── EmailQueueId (bigint, NOT NULL, FK → EmailQueue) ON DELETE CASCADE
├── FileName     (text)
├── Content      (text) — Base64-kodierter Inhalt
└── ContentType  (text) — MIME-Type, z.B. "application/pdf"
```

---

### 19. Log_Inbound

Protokollierung eingehender API-Requests.

```
Log_Inbound
├── Id             (int, PK, auto-increment)
├── Status         (int, NOT NULL) → LogInboundStatus
├── LogDate        (timestamp, NOT NULL)
├── User           (varchar 50)
├── IP             (varchar 50)
├── Hostname       (varchar 50)
├── Function       (varchar 50) — Aufgerufener Endpoint/Funktion
├── Data           (varchar) — Request-Daten
├── ResponseCode   (varchar 50)
└── ResponseDetail (varchar 512)
```

**Keine FKs.** Standalone-Log-Tabelle.

---

### 20. ItemHistoryRecords

Aenderungsprotokoll fuer beliebige Entitaeten. Speichert alte und neue Werte pro Feld.

```
ItemHistoryRecords
├── Id               (int, PK, auto-increment)
├── TimeStamp        (timestamp, NOT NULL)
├── ItemId           (int, NOT NULL) — ID des geaenderten Objekts
├── ItemType         (int, NOT NULL) → ItemTypeEnum
├── UserId           (int, FK → User) — Wer die Aenderung gemacht hat
├── FieldId          (int, optional) — Feld-ID (bei Custom Fields)
├── FieldName        (varchar, NOT NULL) — Name des geaenderten Felds
├── ValueType        (int, NOT NULL) → ValueTypeEnum
├── OldStringValue   (varchar)
├── OldIntValue      (int)
├── OldDecimalValue  (numeric 18,2)
├── OldDateTimeValue (timestamp)
├── OldTimeSpanValue (time)
├── NewStringValue   (varchar)
├── NewIntValue      (int)
├── NewDecimalValue  (numeric 18,2)
├── NewDateTimeValue (timestamp)
└── NewTimeSpanValue (time)
```

**Logik:** Je nach ValueType wird nur das entsprechende Old/New-Wertpaar befuellt.

---

### 21. PermissionsOld [LEGACY]

Alte Berechtigungsdefinitionen. Durch ResourceRight abgeloest.

```
PermissionsOld
├── Id       (int, PK, auto-increment)
├── Name     (varchar)
├── Category (int, NOT NULL) → OldPermissionCategoryEnum
├── Resource (int, NOT NULL, default 0) → OldPermissionResourceEnum
└── Module   (int, NOT NULL, default 0) → OldModuleEnum
```

**Referenziert von:** RolePermissionsOld(PermissionId)

---

### 22. RolePermissionsOld [LEGACY]

Alte Zuordnung Rolle ↔ Berechtigung. Durch ResourceRight abgeloest.

```
RolePermissionsOld
├── RoleId       (int, NOT NULL, FK → Roles) ON DELETE CASCADE
└── PermissionId (int, NOT NULL, FK → PermissionsOld) ON DELETE CASCADE
```

**PK:** Composite (RoleId, PermissionId)

---

## C. TENANT DB (DB: tenant-management)

### Tenant

Routing-Tabelle: Welcher Tenant gehoert zu welcher Domain und welcher Datenbank.

```
Tenant
├── TenantId           (int, PK, auto-increment)
├── Domains            (text) — komma-separierte Domain-Liste
├── DatabaseConnection (varchar 512, NOT NULL) — Connection String
└── Enabled            (boolean, NOT NULL)
```

**Keine FKs.** Standalone-Routing-Tabelle. Aktuell typischerweise ein Eintrag pro Deployment.

---

## D. EVENTS DB (DB: tenant-events)

### Events

Cross-Tenant-Event-Queue fuer asynchrone Verarbeitung (z.B. Notifications, Sync).

```
Events
├── Id               (bigint, PK, auto-increment)
├── EntityId         (int, optional) — ID des betroffenen Objekts
├── TenantId         (int, NOT NULL) — Zuordnung zum Tenant
├── CreatedUserId    (int, NOT NULL) — Ausloeser
├── Name             (text) — Event-Name
├── CreatedOn        (timestamp, NOT NULL)
├── JsonData         (text) — Event-Payload als JSON
├── AssemblyTypeName (text) — .NET-Typ fuer Deserialisierung
├── Status           (int, NOT NULL, default 0) → EventStatusEnum
└── TryCount         (int, NOT NULL, default 0) — Retry-Zaehler
```

**Index:** IX_Events_TenantId_CreatedUserId_EntityId (Composite)

**Hinweis:** Status-Default ist 0, aber die EventStatusEnum beginnt bei 10 (New). Wert 0 koennte "Unprocessed" bedeuten.

---

## E. FEEDBACK DB (DB: common-feedback)

**Keine Tabellen vorhanden.** Die Datenbank existiert, ist aber leer (keine Relationen gefunden).

---

## F. ENUMS

### Benutzer-bezogen

#### PasswordTypeEnum
Quelle: `CIN.Core/Enums/PasswordTypeEnum.cs`
```
Raw    = 10   — Klartext-Passwort
SHA1   = 20
SHA256 = 30
SHA512 = 40
```

#### RoleTypeEnum
Quelle: `CIN.Domain/User/RoleEntity.cs`
```
System      = 10   — Globale System-Rolle (Admin, Creator, Viewer)
ContentType = 20   — Rolle auf Content-Type-Ebene
```

#### UserInvitationStatusEnum
Quelle: `CIN.Domain/User/UserInvitationEntity.cs`
```
New      = 10
Pending  = 20
Accepted = 30
Expired  = 40
```

#### UserDataTypeEnum
Quelle: `CIN.Domain/User/UserDataEntity.cs`
```
Text           = 10   — Freitext-Eintrag
LastAppVersion = 20
LastSync       = 30
LastLogin      = 40
ExplorerSetup  = 50   — Gespeicherte Explorer-Einstellungen
```

#### UserActivityEnum
Quelle: `CIN.Domain/Entities/App/UserActivity/UserActivityEntity.cs`
```
None              = 0
UserLogin         = 10   — Benutzer-Login
ActionBoardView   = 20
ActionBoardCreate = 30
ActionBoardUpdate = 40
CampaignView      = 50
CampaignViewItems = 55   — Campaign Detail-Ansicht
CampaignCreate    = 60
CampaignUpdate    = 70
CampaignWizardView = 80  — Campaign-Wizard Link geoeffnet
ItemEmailView     = 90   — Item per E-Mail-Link geoeffnet
```

#### TwoFATypeEnum
Quelle: `CIN.Domain/Entities/App/AuthProvider/2FATypeEnum.cs`
```
Email   = 1
SMS     = 2
AuthApp = 3
```

### Berechtigungs-bezogen

#### ResourceEnum
Quelle: `CIN.Domain/Permissions/ResourceEnum.cs`
```
ContentTypeManagement = 10   — Globale Ressource
AccessManagement      = 20   — Globale Ressource
UserManagement        = 30   — Globale Ressource
ExportImport          = 40   — Globale Ressource
ActionBoard           = 100  — CT-bezogene Ressource
Item                  = 110  — CT-bezogene Ressource
Campaign              = 120  — CT-bezogene Ressource
```

#### ResourceAccessLevelEnum
Quelle: `CIN.Domain/Permissions/ResourceEnum.cs`
```
None   = 0
View   = 10
Write  = 20
Delete = 30   — Impliziert auch View + Write
```

### System-bezogen

#### SettingTypeEnum
Quelle: `CIN.Domain/Entities/App/Setting/SettingEntity.cs`
```
Common       = 10
User         = 20
Database     = 30
Campaign     = 40
ActionBoard  = 50
ScoutClient  = 60
OpenId       = 70
DalleOpenAI  = 80
AzureTags    = 90
Explorer     = 100
AIChat       = 110
AzureOpenAI  = 120
```

#### ThemeTypeEnum [OBSOLETE]
Quelle: `CIN.Domain/Entities/App/Theme/ThemeEntity.cs`
```
Component = 0
Palette   = 10
```

#### EmailQueueStatusEnum
Quelle: `CIN.Domain/Entities/App/EmailQueue/EmailQueueEntity.cs`
```
NotSent = 10
Sent    = 20
Error   = 30
```

#### LogInboundStatus
Quelle: `CIN.Domain/LogInbound/LogInboundStatus.cs`
```
New = 0
```

#### EventStatusEnum
Quelle: `CIN.Domain/Entities/Event/EventEntity.cs`
```
New        = 10
Pending    = 20
Failed     = 30
Successful = 40
```

### History-Tracking

#### ItemTypeEnum
Quelle: `CIN.Domain/Entities/App/ContentTracking/ItemTypeEnum.cs`
```
Content           = 1
Rating            = 2
Widget            = 3
ContentType       = 4
User              = 5
Relation          = 6
AccessDefinition  = 7
AccessAssignments = 8
AccessDefaults    = 9
```

#### ValueTypeEnum
Quelle: `CIN.Domain/Entities/App/ContentTracking/ValueTypeEnum.cs`
```
Decimal  = 1
Int      = 2
String   = 3
Date     = 4
TimeSpan = 5
```

### Legacy-Berechtigungen (PermissionsOld)

#### OldPermissionCategoryEnum
Quelle: `CIN.Domain/Permissions/Obsolete/OldPermissionCategoryEnum.cs`
```
View       = 10
CreateEdit = 20
Delete     = 30
Other      = 40
```

#### OldPermissionResourceEnum
Quelle: `CIN.Domain/Permissions/Obsolete/OldPermissionResourceEnum.cs`
```
SeeAllContentTypes     = 5
Explorer               = 10
ExplorerDetail         = 20
Funnel                 = 30
Radar                  = 40
Timeline               = 50
Matrix                 = 60
RelationActionBoard    = 70
ContentType            = 80
RatingConfiguration    = 90
RatingData             = 95
LikeUnlike             = 100
UserManagement         = 110
Import                 = 120
Export                  = 130
File                   = 140
ActionBoard            = 160
RoleManagement         = 170
WidgetConfiguration    = 180
WidgetData             = 190
Relation               = 200
Publishing             = 220
Campaigns              = 230
ExplorerHistory        = 240
EditAnyItem            = 270
```

#### OldModuleEnum
Quelle: `CIN.Domain/Permissions/Obsolete/OldModuleEnum.cs`
```
ActionBoard  = 10
Campaign     = 20
ContentType  = 30
Explorer     = 40
Settings     = 50
```

---

## G. ER-Beziehungen (Zusammenfassung)

```
User ──1:N──→ UserRoles ──N:1──→ Roles ──1:N──→ ResourceRight
  │                │
  │                └── N:1 → ContentType (optional, Einschraenkung)
  │
  ├──1:N──→ UserData
  ├──1:N──→ UserActivities
  ├──1:N──→ UserInvitations
  ├──1:N──→ UserRefreshToken
  ├──1:N──→ VerificationProvider
  ├──N:M──→ ContentType  (via UserContentType)
  ├──N:1──→ Country ──1:N──→ StateProvince
  └──N:1──→ Media (Profilbild)

Roles ──1:N──→ RolePermissionsOld ──N:1──→ PermissionsOld  [LEGACY]

EmailQueue ──1:N──→ EmailQueueAttachments

Country ──1:N──→ StateProvince
        ──1:N──→ Address
```

---

## H. Hinweise fuer MCP-API

| Aspekt | Relevanz |
|---|---|
| User-Verschluesselung | Email, FirstName, LastName, Phone, Password_Salt sind AES-128-CBC verschluesselt. Muss beim Lesen/Schreiben beruecksichtigt werden. |
| Soft-Delete | User, Roles, Country, StateProvince, Address, Theme haben DeletedOn. Queries muessen `WHERE "DeletedOn" IS NULL` filtern. |
| Password_Type = 10 | Klartext-Passwoerter in der DB (Typ "Raw"). Sicherheitskritisch. |
| Events-DB | Separate DB `tenant-events` — Events referenzieren TenantId aber ohne FK. Lose Kopplung. |
| Feedback-DB | DB `common-feedback` existiert, aber ist aktuell leer. |
| PermissionsOld | Legacy-System. Aktives System nutzt ResourceRight mit ResourceEnum + ResourceAccessLevelEnum. |
| UserContentType | Steuert welche Content Types ein User sieht. Getrennt von der Rollen-basierten Berechtigung. |
