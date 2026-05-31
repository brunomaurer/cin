# 04 -- Workflows, ActionBoards & Media

> Erkundet: 2026-05-27 | DB: cin

## Workflows

Workflows bilden strukturierte Prozesse ab: Ein WorkflowType definiert die Prozessart, Stages sind die Phasen, StageSteps die Unter-Schritte. Tracks sind konkrete Durchlaeufe eines Workflows, in denen Content-Items den einzelnen Steps zugeordnet werden.

### WorkflowTypes

Definition eines Workflow-Typs (z.B. "Innovation Pipeline", "Evaluierung").

```
WorkflowTypes
├── Id             (int, PK, auto-increment)
├── Name           (text, NOT NULL)
├── Description    (text, optional)
├── CreatedUserId  (int, NOT NULL, FK → User) — ON DELETE RESTRICT
├── CreatedOn      (timestamp(6), NOT NULL)
├── ModifiedUserId (int, FK → User, optional) — ON DELETE RESTRICT
├── ModifiedOn     (timestamp(6), optional)
└── DeletedOn      (timestamp, soft-delete)
```

**Referenziert von:**
- Workflows (WorkflowTypeId)
- Stages (WorkflowTypeId)

### Workflows

Konkrete Workflow-Instanzen eines bestimmten Typs.

```
Workflows
├── Id             (int, PK, auto-increment)
├── Name           (text, NOT NULL)
├── WorkflowTypeId (int, NOT NULL, FK → WorkflowTypes) — ON DELETE RESTRICT
├── CreatedUserId  (int, NOT NULL, FK → User) — ON DELETE RESTRICT
├── CreatedOn      (timestamp(6), NOT NULL)
├── ModifiedUserId (int, FK → User, optional) — ON DELETE RESTRICT
├── ModifiedOn     (timestamp(6), optional)
└── DeletedOn      (timestamp, soft-delete)
```

**Referenziert von:** Tracks (WorkflowId)

### Stages

Phasen/Stufen innerhalb eines WorkflowTypes, sortiert per Ordinal. Jede Stage gehoert zu einem ContentType.

```
Stages
├── Id             (int, PK, auto-increment)
├── Name           (text, NOT NULL)
├── Description    (text, optional)
├── WorkflowTypeId (int, NOT NULL, FK → WorkflowTypes) — ON DELETE RESTRICT
├── ContentTypeId  (int, NOT NULL, FK → ContentType) — ON DELETE RESTRICT
├── Ordinal        (int, NOT NULL) — Reihenfolge der Stage
├── CreatedUserId  (int, NOT NULL, FK → User) — ON DELETE RESTRICT
├── CreatedOn      (timestamp(6), NOT NULL)
├── ModifiedUserId (int, FK → User, optional) — ON DELETE RESTRICT
├── ModifiedOn     (timestamp(6), optional)
└── DeletedOn      (timestamp, soft-delete)
```

**Referenziert von:**
- StageSteps (StageId)
- Tracks (StageId)

### StageSteps

Unter-Schritte innerhalb einer Stage, sortiert per Ordinal.

```
StageSteps
├── Id        (int, PK, auto-increment)
├── StageId   (int, NOT NULL, FK → Stages) — ON DELETE RESTRICT
├── Name      (text, NOT NULL)
├── Ordinal   (int, NOT NULL) — Reihenfolge
└── DeletedOn (timestamp, soft-delete)
```

**Referenziert von:** TrackContentMappings (StageStepId)

### Tracks

Konkrete Spuren/Lanes innerhalb eines Workflows, zugeordnet zu einer Stage.

```
Tracks
├── Id             (bigint, PK, auto-increment)
├── Name           (text, NOT NULL)
├── Description    (text, optional)
├── WorkflowId     (int, NOT NULL, FK → Workflows) — ON DELETE RESTRICT
├── StageId        (int, NOT NULL, FK → Stages) — ON DELETE RESTRICT
├── Ordinal        (int, NOT NULL) — Reihenfolge
├── CreatedUserId  (int, NOT NULL, FK → User) — ON DELETE RESTRICT
├── CreatedOn      (timestamp(6), NOT NULL)
├── ModifiedUserId (int, FK → User, optional) — ON DELETE RESTRICT
├── ModifiedOn     (timestamp(6), optional)
└── DeletedOn      (timestamp, soft-delete)
```

**Referenziert von:** TrackContentMappings (TrackId)

### TrackContentMappings

Zuordnung von Content-Items zu Tracks mit Position im StageStep. Unterstuetzt verkettete Listen via SuccessorId.

```
TrackContentMappings
├── Id             (bigint, PK, auto-increment)
├── TrackId        (bigint, NOT NULL, FK → Tracks) — ON DELETE RESTRICT
├── ContentId      (int, NOT NULL, FK → Content, UNIQUE) — ON DELETE RESTRICT
├── StageStepId    (int, NOT NULL, FK → StageSteps) — ON DELETE RESTRICT
├── SuccessorId    (bigint, FK → TrackContentMappings, optional, UNIQUE) — Selbstreferenz, ON DELETE RESTRICT
├── IsLinked       (boolean, NOT NULL, default false) — Ob das Item verlinkt ist
├── CreatedUserId  (int, NOT NULL, FK → User) — ON DELETE RESTRICT
├── CreatedOn      (timestamp(6), NOT NULL)
├── ModifiedUserId (int, FK → User, optional) — ON DELETE RESTRICT
├── ModifiedOn     (timestamp(6), optional)
└── DeletedOn      (timestamp, soft-delete)
```

**Hinweis:** ContentId ist UNIQUE -- jedes Content-Item kann nur in einem Track sein. SuccessorId ist ebenfalls UNIQUE -- es bildet eine verkettete Liste (Linked List) fuer die Reihenfolge der Items.

---

## ActionBoards

ActionBoards sind visuelle Darstellungen von Content-Items -- z.B. als Radar, Funnel, Matrix, Timeline oder Relation-Graph.

### ActionBoard

Definition eines ActionBoards mit Achsen-Konfiguration.

```
ActionBoard
├── Id                    (int, PK, auto-increment)
├── Name                  (varchar, optional)
├── Type                  (int, NOT NULL) — ActionBoardTypeEnum
├── ContentTypeId         (int, FK → ContentType, optional) — ON DELETE SET NULL (OBSOLETE, ersetzt durch Mapping-Tabelle)
├── FieldTypeId           (int, NOT NULL) — Primaeres Feld fuer die Darstellung (FK-Referenz auf FieldType)
├── IsRating              (boolean, NOT NULL, default false) — Ob FieldTypeId ein Rating-Feld ist
├── SecondFieldTypeId     (int, optional) — Zweites Feld (z.B. Y-Achse bei Matrix)
├── SecondIsRating        (boolean, NOT NULL, default false)
├── PointSizeFieldTypeId  (int, optional) — Feld fuer Punkt-Groesse (Bubble-Charts)
├── PointColorFieldTypeId (int, optional) — Feld fuer Punkt-Farbe
├── TimeLineAggregateType (int, optional) — Aggregationstyp fuer Timeline-Boards
├── SegmentId             (int, NOT NULL) — Segment-Konfiguration
├── ExtendedConfig        (varchar, optional) — Zusaetzliche JSON-Konfiguration
├── CreatedUserId         (int, NOT NULL, FK → User) — ON DELETE RESTRICT
├── CreatedOn             (timestamp(6), NOT NULL, default '0001-01-01')
├── ModifiedUserId        (int, FK → User, optional) — ON DELETE RESTRICT
├── ModifiedOn            (timestamp(6), optional)
└── DeletedOn             (timestamp, soft-delete)
```

**Referenziert von:** ActionBoardContentTypeMappings (ActionBoardId)

### ActionBoardContentTypeMappings

N:M-Zuordnung von ContentTypes zu ActionBoards.

```
ActionBoardContentTypeMappings
├── Id             (int, PK, auto-increment)
├── ActionBoardId  (int, NOT NULL, FK → ActionBoard) — ON DELETE CASCADE
├── ContentTypeId  (int, NOT NULL, FK → ContentType) — ON DELETE CASCADE
├── CreatedUserId  (int, NOT NULL, FK → User) — ON DELETE CASCADE
├── CreatedOn      (timestamp, NOT NULL)
├── ModifiedUserId (int, FK → User, optional)
├── ModifiedOn     (timestamp, optional)
└── DeletedOn      (timestamp, soft-delete)
```

### ActionBoard-Enums

**ActionBoardTypeEnum** (Spalte: ActionBoard.Type)
```
Funnel   = 10  — Trichter-Darstellung
Radar    = 20  — Radar-Chart (Standard trendradar)
Matrix   = 40  — 2D-Matrix (Scatter/Bubble)
Timeline = 50  — Zeitachsen-Darstellung
Relation = 60  — Beziehungs-Graph
```

---

## Media

Zentrale Tabelle fuer alle hochgeladenen Dateien (Bilder, Dokumente, Avatare etc.).

### Media

```
Media
├── Id             (int, PK, auto-increment)
├── Name           (varchar, NOT NULL) — Dateiname
├── MediaType      (int, NOT NULL) — MediaType Enum
├── Size           (int, NOT NULL) — Dateigroesse in Bytes
├── ContentType    (varchar, optional) — MIME-Type (z.B. "image/png")
├── MediaBinary    (bytea, optional) — Binaerdaten der Datei
├── Temporary      (boolean, optional) — Temporaer hochgeladen, noch nicht zugewiesen
├── CreatedUserId  (int, NOT NULL, FK → User) — ON DELETE RESTRICT
├── CreatedOn      (timestamp(6), NOT NULL)
├── ModifiedUserId (int, FK → User, optional) — ON DELETE RESTRICT
├── ModifiedOn     (timestamp(6), optional)
└── DeletedOn      (timestamp, soft-delete)
```

**Referenziert von:**
- AIMessageFiles (MediaId)
- Content (MediaId)
- Theme (MediaId)
- User (MediaId) -- Profilbild
- WidgetArrayValue (MediaId)

**MediaType Enum**
```
Avatar     = 5   — Profilbild
CompanyLogo = 10 — Firmen-Logo
Images     = 15  — Allgemeine Bilder
Files      = 20  — Dokumente/Dateien
```

---

## Articles

Externe Artikel (z.B. Web-Links) die Content-Items zugeordnet werden koennen. Metadata wird aus der URL extrahiert.

### Article

```
Article
├── Id                  (int, PK, auto-increment)
├── UId                 (uuid, NOT NULL, default '00000000-...') — Eindeutige ID
├── Title               (text, optional) — Artikel-Titel (aus Metadata)
├── WebsiteUrl          (text, optional) — Website-Domain
├── PageUrl             (text, optional) — Volle URL der Seite
├── DescriptionMetadata (text, optional) — Beschreibung aus Metadata
├── ImageMetadataUrl    (text, optional) — Vorschaubild-URL aus Metadata
├── CreatedOn           (timestamp(6), NOT NULL, default '0001-01-01')
├── CreatedMetadata     (timestamp(6), optional) — Erstellungsdatum laut Metadata
└── DeletedOn           (timestamp, soft-delete)
```

**Unique Index:** (UId, DeletedOn)

**Referenziert von:** ArticleContentMapping (ArticleId)

### ArticleContentMapping

N:M-Zuordnung von Artikeln zu Content-Items.

```
ArticleContentMapping
├── Id        (int, PK, auto-increment)
├── ArticleId (int, NOT NULL, FK → Article) — ON DELETE CASCADE
├── ContentId (int, NOT NULL, FK → Content) — ON DELETE CASCADE
├── IsNew     (boolean, NOT NULL) — Ob der Artikel neu hinzugefuegt wurde
└── DeletedOn (timestamp, soft-delete)
```

**Referenziert von:** ArticleBookmarks (ArticleContentMappingId)

### ArticleBookmarks

User-Lesezeichen auf Artikel-Content-Zuordnungen.

```
ArticleBookmarks
├── Id                      (int, PK, auto-increment)
├── ArticleContentMappingId (int, NOT NULL, FK → ArticleContentMapping) — ON DELETE CASCADE
├── CreatedUserId           (int, NOT NULL, FK → User) — ON DELETE CASCADE
├── CreatedOn               (timestamp, NOT NULL)
├── ModifiedUserId          (int, FK → User, optional) — ON DELETE RESTRICT
├── ModifiedOn              (timestamp, optional)
└── DeletedOn               (timestamp, soft-delete)
```

---

## SavedCollections

Benutzerdefinierte Sammlungen von Content-Items (wie "Favoriten" oder "Merklisten").

### SavedCollections

```
SavedCollections
├── Id                (bigint, PK, auto-increment)
├── Name              (text, optional)
├── IsCreatedBySystem (boolean, NOT NULL, default false) — System-Sammlungen nicht loeschbar
├── CreatedUserId     (int, NOT NULL, FK → User) — ON DELETE CASCADE
├── CreatedOn         (timestamp, NOT NULL)
├── ModifiedUserId    (int, FK → User, optional)
├── ModifiedOn        (timestamp, optional)
└── DeletedOn         (timestamp, soft-delete)
```

**Referenziert von:** SavedCollectionContentMappings (SavedCollectionId)

### SavedCollectionContentMappings

N:M-Zuordnung von Content-Items zu Sammlungen.

```
SavedCollectionContentMappings
├── Id                (bigint, PK, auto-increment)
├── SavedCollectionId (bigint, NOT NULL, FK → SavedCollections) — ON DELETE CASCADE
├── ContentId         (int, NOT NULL, FK → Content) — ON DELETE CASCADE
└── DeletedOn         (timestamp, soft-delete)
```

---

## SavedFilters

Gespeicherte Filtereinstellungen fuer Content-Listen, pro User und ContentType.

### SavedFilters

```
SavedFilters
├── Id             (bigint, PK, auto-increment)
├── Name           (text, optional)
├── ContentTypeId  (int, NOT NULL, FK → ContentType) — ON DELETE CASCADE
├── Filters        (jsonb, optional) — Filter-Konfiguration als JSON
├── Status         (int, NOT NULL) — Filter-Status (aktiv/inaktiv)
├── Subscribed     (boolean, optional) — Ob Benachrichtigungen aktiviert sind
├── CreatedUserId  (int, NOT NULL, FK → User)
├── CreatedOn      (timestamp, NOT NULL)
├── ModifiedUserId (int, FK → User, optional)
├── ModifiedOn     (timestamp, optional)
└── DeletedOn      (timestamp, soft-delete)
```

---

## Beziehungs-Diagramm

```
WorkflowTypes (1) ──< Workflows (N)
WorkflowTypes (1) ──< Stages (N) ──< StageSteps (N)
Workflows (1) ──< Tracks (N)
Stages (1) ──< Tracks (N)

Tracks (1) ──< TrackContentMappings (N) >── Content (1:1)
StageSteps (1) ──< TrackContentMappings (N)
TrackContentMappings ──> TrackContentMappings (SuccessorId, Linked List)

ActionBoard (1) ──< ActionBoardContentTypeMappings >── ContentType (N)

Article (1) ──< ArticleContentMapping >── Content (N)
ArticleContentMapping (1) ──< ArticleBookmarks (N)

SavedCollections (1) ──< SavedCollectionContentMappings >── Content (N)

SavedFilters >── ContentType
```
