# 03 -- Kampagnen & AI Features

> Erkundet: 2026-05-27 | DB: cin

## Kampagnen

Kampagnen sind Container fuer strukturierte Aktionen auf Content-Items -- z.B. Bewertungs-Runden (Rating), Erstellungs-Workflows (Create), Teilen (Share) oder AI-Interviews.

### Campaign

Zentrale Tabelle fuer alle Kampagnen-Typen.

```
Campaign
├── Id              (int, PK, auto-increment)
├── Name            (varchar, optional)
├── Type            (int, NOT NULL) — CampaignTypeEnum
├── Status          (int, NOT NULL) — CampaignStatusEnum
├── ContentTypeId   (int, FK → ContentType, optional, OBSOLETE) — ON DELETE SET NULL
├── Description     (varchar, optional)
├── IsPublic        (boolean, NOT NULL, default false)
├── ExtendedConfig  (text, optional) — JSON-Konfiguration je nach Typ
├── CreatedUserId   (int, FK → User, NOT NULL) — ON DELETE CASCADE
├── CreatedOn       (timestamp(6), NOT NULL)
├── ModifiedUserId  (int, FK → User, optional) — ON DELETE RESTRICT
├── ModifiedOn      (timestamp(6), optional)
└── DeletedOn       (timestamp(6), soft-delete)
```

**Referenziert von:**
- CampaignActivityItem (CampaignId)
- CampaignContentMapping (CampaignId)
- CampaignContentTypeMappings (CampaignId)
- ContentRatingTypeValue (CampaignId)
- Content (CampaignId)

### CampaignActivityItem

Protokolliert User-Aktivitaeten innerhalb einer Kampagne (z.B. letzter besuchter Item, uebersprungene Items, verarbeitete Items).

```
CampaignActivityItem
├── Id               (int, PK, auto-increment)
├── CampaignId       (int, NOT NULL, FK → Campaign) — ON DELETE SET NULL
├── CampaignActivity (int, NOT NULL) — CampaignActivityEnum
├── ItemType         (int, NOT NULL) — ItemTypeEnum (dynamische Beziehung)
├── RelatedItem      (int, optional) — ID des betroffenen Items (kein FK, dynamisch via ItemType)
├── CreatedOn        (timestamp(6), NOT NULL)
├── CreatedUserId    (int, NOT NULL, FK → User) — ON DELETE CASCADE
└── DeletedOn        (timestamp(6), soft-delete)
```

### CampaignContentMapping

N:M-Zuordnung von Content-Items zu einer Kampagne, mit Sortierung.

```
CampaignContentMapping
├── Id             (int, PK, auto-increment)
├── CampaignId     (int, NOT NULL, FK → Campaign) — ON DELETE CASCADE
├── ContentId      (int, NOT NULL, FK → Content) — ON DELETE CASCADE
├── Ordinal        (int, NOT NULL, default 0) — Reihenfolge
├── CreatedUserId  (int, NOT NULL, FK → User) — ON DELETE CASCADE
├── CreatedOn      (timestamp, NOT NULL)
├── ModifiedUserId (int, FK → User, optional) — ON DELETE CASCADE
├── ModifiedOn     (timestamp, optional)
└── DeletedOn      (timestamp, soft-delete)
```

**Index:** Composite Index auf (ContentId, CampaignId)

### CampaignContentTypeMappings

Ordnet einer Kampagne mehrere ContentTypes zu (ersetzt das obsolete ContentTypeId auf Campaign).

```
CampaignContentTypeMappings
├── Id             (int, PK, auto-increment)
├── CampaignId     (int, NOT NULL, FK → Campaign) — ON DELETE CASCADE
├── ContentTypeId  (int, NOT NULL, FK → ContentType) — ON DELETE CASCADE
├── CreatedUserId  (int, NOT NULL, FK → User) — ON DELETE CASCADE
├── CreatedOn      (timestamp, NOT NULL)
├── ModifiedUserId (int, FK → User, optional)
├── ModifiedOn     (timestamp, optional)
└── DeletedOn      (timestamp, soft-delete)
```

### Kampagnen-Enums

**CampaignTypeEnum** (Spalte: Campaign.Type)
```
Create    = 1   — Erstellungs-Kampagne (User erstellen Content)
Rating    = 3   — Bewertungs-Kampagne
Share     = 4   — Teilen-Kampagne
Interview = 5   — AI-Interview-Kampagne
```

**CampaignStatusEnum** (Spalte: Campaign.Status)
```
Deactivated = 1
Active      = 2
Expired     = 3
```

**CampaignActivityEnum** (Spalte: CampaignActivityItem.CampaignActivity)
```
LastVisited   = 10  — Letzter besuchter Item
SkippedItem   = 20  — Uebersprungener Item
ProcessedItem = 30  — Verarbeiteter Item
```

**ItemTypeEnum** (Spalte: CampaignActivityItem.ItemType -- bestimmt worauf RelatedItem zeigt)
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

---

## AI Features

Das AI-System besteht aus einem konfigurierbaren Agent (AgentSetup) mit vordefinierten Fragen und Slot-Templates. User fuehren AI-Sessions (Interviews/Chats), deren Nachrichten gespeichert werden. Sessions koennen zu Content-Items konvertiert werden.

### AgentSetup

Konfiguration eines AI-Agenten (System-Prompt, Begruessung, Abschlussnachricht).

```
AgentSetup
├── Id             (uuid, PK)
├── HelloMessage   (varchar(500), optional) — Begruessung beim Session-Start
├── EndMessage     (text, optional) — Nachricht nach Session-Abschluss
├── BasePrompt     (text, optional) — System-Prompt fuer den AI-Agenten
├── CreatedUserId  (int, NOT NULL, FK → User) — ON DELETE RESTRICT
├── CreatedOn      (timestamp(6), NOT NULL)
├── ModifiedUserId (int, FK → User, optional) — ON DELETE RESTRICT
├── ModifiedOn     (timestamp(6), optional)
└── DeletedOn      (timestamp, soft-delete)
```

**Referenziert von:**
- AISession (AgentSetupId)
- Questions (AgentSetupId)
- AgentSlotTemplates (AgentSetupId)

### Questions

Vordefinierte Fragen fuer einen Agenten, sortiert nach Ordinal.

```
Questions
├── Id             (bigint, PK, auto-increment)
├── AgentSetupId   (uuid, NOT NULL, FK → AgentSetup) — ON DELETE RESTRICT
├── Text           (varchar(500), optional) — Fragetext
├── Ordinal        (int, NOT NULL) — Reihenfolge
├── CreatedUserId  (int, NOT NULL, FK → User) — ON DELETE RESTRICT
├── CreatedOn      (timestamp(6), NOT NULL)
├── ModifiedUserId (int, FK → User, optional) — ON DELETE RESTRICT
├── ModifiedOn     (timestamp(6), optional)
└── DeletedOn      (timestamp, soft-delete)
```

### AgentSlotTemplates

Templates fuer thematische Slots, die in einer Session abgearbeitet werden sollen.

```
AgentSlotTemplates
├── Id           (bigint, PK, auto-increment)
├── AgentSetupId (uuid, NOT NULL, FK → AgentSetup) — ON DELETE RESTRICT
├── Name         (varchar(500), optional) — Template-Name
├── Ordinal      (int, NOT NULL, default 0) — Reihenfolge
└── DeletedOn    (timestamp, soft-delete)
```

**Referenziert von:**
- AISession (TemplateId)
- AgentSlots (AgentSlotTemplateId)

### AgentSlots

Einzelne Themen-Slots innerhalb eines Templates, mit Prioritaet.

```
AgentSlots
├── Id                  (bigint, PK, auto-increment)
├── AgentSlotTemplateId (bigint, NOT NULL, FK → AgentSlotTemplates) — ON DELETE RESTRICT
├── Topic               (varchar(500), optional) — Thema des Slots
├── Priority            (int, NOT NULL) — SlotPriorityEnum
├── Ordinal             (int, NOT NULL, default 0) — Reihenfolge
└── DeletedOn           (timestamp, soft-delete)
```

### AISession

Eine Chat-/Interview-Session eines Users mit einem AI-Agenten.

```
AISession
├── Id              (uuid, PK)
├── AgentSetupId    (uuid, NOT NULL, FK → AgentSetup) — ON DELETE RESTRICT
├── UserId          (int, FK → User, optional) — ON DELETE RESTRICT (Gast-Sessions moeglich)
├── TemplateId      (bigint, FK → AgentSlotTemplates, optional) — ON DELETE RESTRICT
├── EntrySource     (varchar(100), optional) — Woher kam der User (z.B. URL, QR-Code)
├── Status          (int, NOT NULL) — SessionStatusEnum
├── Title           (text, optional)
├── DirtySummary    (text, optional) — Roh-Zusammenfassung
├── CleanSummary    (text, optional) — Bereinigte Zusammenfassung
├── SubmittedByUser (boolean, NOT NULL) — Wurde die Session vom User abgeschickt?
├── CreatedOn       (timestamp(6), NOT NULL)
├── LastActivityOn  (timestamp(6), NOT NULL) — Letzte Aktivitaet
├── SubmittedOn     (timestamp(6), optional) — Zeitpunkt der Abgabe
└── DeletedOn       (timestamp, soft-delete)
```

**Indizes:** Status, LastActivityOn, AgentSetupId, TemplateId, UserId

**Referenziert von:**
- AIMessage (SessionId)
- AIConvertedSession (SessionId)

### AIMessage

Einzelne Nachrichten innerhalb einer AI-Session, sequenziell nummeriert.

```
AIMessage
├── Id             (uuid, PK)
├── SessionId      (uuid, NOT NULL, FK → AISession) — ON DELETE RESTRICT
├── Role           (int, NOT NULL) — RoleTypeEnum
├── Content        (text, NOT NULL) — Nachrichteninhalt
├── SequenceNumber (int, NOT NULL) — Reihenfolge innerhalb der Session
├── CreatedOn      (timestamp(6), NOT NULL)
└── DeletedOn      (timestamp, soft-delete)
```

**Unique Index:** (SessionId, SequenceNumber)

**Referenziert von:** AIMessageFiles (MessageId)

### AIMessageFiles

Datei-Anhaenge zu AI-Nachrichten (1:1 Beziehung zu Media).

```
AIMessageFiles
├── Id        (bigint, PK, auto-increment)
├── MessageId (uuid, NOT NULL, FK → AIMessage) — ON DELETE CASCADE
└── MediaId   (int, NOT NULL, FK → Media, UNIQUE) — ON DELETE CASCADE
```

**Hinweis:** MediaId ist UNIQUE -- jede Media-Datei kann nur einer Nachricht zugeordnet sein.

### AIConvertedSession

Verknuepfung wenn eine AI-Session zu einem Content-Item konvertiert wurde.

```
AIConvertedSession
├── Id            (uuid, PK)
├── SessionId     (uuid, NOT NULL, FK → AISession) — ON DELETE RESTRICT
├── ContentItemId (int, NOT NULL, FK → Content) — ON DELETE RESTRICT
└── CreatedOn     (timestamp(6), NOT NULL)
```

### AI-Enums

**SessionStatusEnum** (Spalte: AISession.Status)
```
Active    = 10  — Laufende Session
Submitted = 20  — Abgegeben
Abandoned = 30  — Abgebrochen
Converted = 40  — Zu Content konvertiert
```

**RoleTypeEnum** (Spalte: AIMessage.Role)
```
System    = 10  — System-Nachricht (Prompt)
User      = 20  — User-Nachricht
Assistant = 30  — AI-Antwort
```

**SlotPriorityEnum** (Spalte: AgentSlots.Priority)
```
MustCover  = 0  — Muss abgedeckt werden
NiceToHave = 1  — Optional
```

---

## Beziehungs-Diagramm

```
Campaign (1) ──< CampaignContentMapping >── Content (N)
Campaign (1) ──< CampaignContentTypeMappings >── ContentType (N)
Campaign (1) ──< CampaignActivityItem (N)

AgentSetup (1) ──< Questions (N)
AgentSetup (1) ──< AgentSlotTemplates (1) ──< AgentSlots (N)
AgentSetup (1) ──< AISession (N)
AgentSlotTemplates (1) ──< AISession (optional)

AISession (1) ──< AIMessage (N) ──< AIMessageFiles (N) >── Media
AISession (1) ──< AIConvertedSession >── Content
```
