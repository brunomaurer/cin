---
# 02 -- Content, Widgets, Ratings & Relations
> Erkundet: 2026-05-31

## Datenmodell-Uebersicht

Das Content-System basiert auf einem dynamischen Schema-Ansatz:

1. **ContentType** definiert eine Inhaltsvorlage (z.B. "Trend", "Technologie").
2. **WidgetType** definiert einen Feldtyp (Text, Datum, Dropdown, User-Auswahl usw.) -- unabhaengig von einem bestimmten ContentType.
3. **WidgetContentTypeMappings** verbindet WidgetType mit ContentType und legt Spalte/Reihenfolge/Folder fest -- das ergibt die Formularstruktur eines ContentTypes.
4. **Content** ist ein konkretes Inhalts-Objekt, das einem ContentType zugeordnet ist.
5. **WidgetValues** speichert die tatsaechlichen Feldwerte eines Content-Objekts (pro Mapping ein Wert-Satz). Mehrwertige Felder (Multi-User, Multiselect) werden ueber **WidgetArrayValue** abgebildet.
6. **Ratings** bilden ein eigenes Bewertungssystem: RatingTypeField definiert Bewertungskriterien, ContentRatingType ordnet sie einem ContentType zu, ContentRatingTypeValue speichert die abgegebene Bewertung, und ContentFields verknuepft diese mit dem Content.
7. **Relations** verbinden zwei Content-Objekte miteinander; RelationRating bewertet diese Beziehung.
8. **Tags** werden ueber ContentTagMapping an Content gehaengt.

Soft-Delete wird durchgehend ueber `DeletedOn IS NULL` gesteuert.

---

## Tabellen

### ContentType

**Zweck:** Definiert eine Inhaltsvorlage / einen Inhaltstyp (z.B. "Trend", "Technologie"). Legt fest, welche Widgets das Formular hat, ob ein Update-Reminder aktiv ist, und ob der Typ publiziert/sichtbar ist.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| CreatedUserId | integer | NOT NULL | | FK -> User |
| CreatedOn | timestamp(6) | NOT NULL | | |
| ModifiedUserId | integer | nullable | | FK -> User |
| ModifiedOn | timestamp(6) | nullable | | |
| Name | varchar | nullable | | Anzeigename |
| Description | varchar | nullable | | Beschreibungstext |
| Published | boolean | NOT NULL | false | Ob der Typ aktiv ist |
| DeletedOn | timestamp | nullable | | Soft-Delete |
| DisplayOrder | integer | NOT NULL | 0 | Sortierung in der UI |
| UpdateFrequency_ResponsibleUserWidgetId | integer | nullable | | Welches Widget den verantwortlichen User haelt |
| UpdateFrequency_Unit | integer | nullable | | Enum UpdateIntervalUnitEnum (20=Week, 30=Month) |
| UpdateFrequency_Value | integer | nullable | | Anzahl Einheiten |
| UpdateFrequency_NotificationEnabled | boolean | nullable | false | Benachrichtigung bei Faelligkeit |

**FKs:**
- `CreatedUserId` -> User(Id) ON DELETE RESTRICT
- `ModifiedUserId` -> User(Id) ON DELETE RESTRICT

**Referenziert von:** Content, WidgetContentTypeMappings, WidgetFolder, ContentRatingType, ActionBoard, ActionBoardContentTypeMappings, Campaign, CampaignContentTypeMappings, SavedFilters, Stages, UserContentType, UserRoles

---

### Content

**Zweck:** Ein konkretes Inhalts-Objekt (z.B. ein einzelner Trend). Gehoert zu genau einem ContentType.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| CreatedUserId | integer | NOT NULL | | FK -> User |
| CreatedOn | timestamp(6) | NOT NULL | | |
| ModifiedUserId | integer | nullable | | FK -> User |
| ModifiedOn | timestamp(6) | nullable | | |
| Name | varchar | nullable | | Titel des Inhalts |
| Abstract | varchar | nullable | | Kurzbeschreibung |
| Published | boolean | NOT NULL | | Veraltet -- Status nutzen |
| ContentTypeId | integer | NOT NULL | | FK -> ContentType |
| Tags | varchar | nullable | | Veraltet -- ContentTagMapping nutzen |
| MediaId | integer | nullable | | FK -> Media (Titelbild) |
| DeletedOn | timestamp(6) | nullable | | Soft-Delete |
| CampaignId | integer | nullable | | FK -> Campaign |
| Status | integer | NOT NULL | 0 | ContentStatusEnum (10=Published..60=Archived) |
| UId | uuid | NOT NULL | uuid_generate_v4() | Oeffentlicher Bezeichner |

**FKs:**
- `ContentTypeId` -> ContentType(Id) ON DELETE RESTRICT
- `CreatedUserId` -> User(Id) ON DELETE RESTRICT
- `ModifiedUserId` -> User(Id) ON DELETE RESTRICT
- `MediaId` -> Media(Id) ON DELETE SET NULL
- `CampaignId` -> Campaign(Id) ON DELETE SET NULL

**Referenziert von:** WidgetValues, ContentFields, ContentLikes, ContentTagMapping, Relation, ContentTransfer, ContentUpdateMetadata, CampaignContentMapping, ArticleContentMapping, SavedCollectionContentMappings, TrackContentMappings, AIConvertedSession

---

### WidgetType

**Zweck:** Definiert einen wiederverwendbaren Feld-/Widget-Typ (z.B. Text, Numeric, Dropdown). Global -- nicht an einen ContentType gebunden.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| CreatedUserId | integer | NOT NULL | | FK -> User |
| CreatedOn | timestamp(6) | NOT NULL | | |
| ModifiedUserId | integer | nullable | | FK -> User |
| ModifiedOn | timestamp(6) | nullable | | |
| Name | varchar | NOT NULL | | Anzeigename des Widgets |
| FieldType | integer | NOT NULL | | WidgetTypeEnum (5=Text..180=Address) |
| Required | boolean | NOT NULL | | Pflichtfeld? |
| IsActive | boolean | NOT NULL | | Aktiv/sichtbar |
| OptionalValues | varchar | nullable | | JSON-Konfiguration (Optionen) |
| WidgetConfiguration | varchar | nullable | | Zusaetzliche JSON-Konfiguration |
| DeletedOn | timestamp | nullable | | Soft-Delete |
| Description | text | nullable | | Beschreibung |

**FKs:**
- `CreatedUserId` -> User(Id)
- `ModifiedUserId` -> User(Id)

**Referenziert von:** WidgetContentTypeMappings, WidgetTypeOption

---

### WidgetTypeOption

**Zweck:** Definiert eine einzelne Auswahloption fuer Dropdown-/Select-Widgets. Gehoert zu genau einem WidgetType.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| Key | integer | NOT NULL | | Numerischer Schluessel der Option |
| Name | text | nullable | | Anzeigename |
| Ordinal | integer | NOT NULL | | Sortierung |
| Color | text | nullable | | Farbe fuer die UI |
| WidgetTypeId | integer | NOT NULL | | FK -> WidgetType |
| DeletedOn | timestamp | nullable | | Soft-Delete |

**FKs:**
- `WidgetTypeId` -> WidgetType(Id) ON DELETE CASCADE

---

### WidgetContentTypeMappings

**Zweck:** Verknuepft einen WidgetType mit einem ContentType -- das ergibt ein "Feld" im Formular. Bestimmt Spalte, Reihenfolge und optionalen Folder.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| ContentTypeId | integer | NOT NULL | | FK -> ContentType |
| FieldTypeId | integer | NOT NULL | | FK -> WidgetType |
| ColumnNumber | integer | NOT NULL | | Spalte im Layout (1 oder 2) |
| Ordinal | integer | NOT NULL | | Reihenfolge innerhalb der Spalte |
| WidgetFolderId | integer | nullable | | FK -> WidgetFolder (Gruppierung) |
| DeletedOn | timestamp | nullable | | Soft-Delete |

**FKs:**
- `ContentTypeId` -> ContentType(Id) ON DELETE CASCADE
- `FieldTypeId` -> WidgetType(Id) ON DELETE CASCADE
- `WidgetFolderId` -> WidgetFolder(Id) ON DELETE SET NULL

**Referenziert von:** WidgetValues

---

### WidgetFolder

**Zweck:** Gruppiert Widgets innerhalb eines ContentType-Formulars in benannte Abschnitte (Akkordeons/Tabs).

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| CreatedUserId | integer | NOT NULL | | FK -> User |
| CreatedOn | timestamp | NOT NULL | | |
| ModifiedUserId | integer | nullable | | FK -> User |
| ModifiedOn | timestamp | nullable | | |
| Name | text | nullable | | Anzeigename |
| ContentTypeId | integer | NOT NULL | | FK -> ContentType |
| DeletedOn | timestamp | nullable | | Soft-Delete |

**FKs:**
- `ContentTypeId` -> ContentType(Id) ON DELETE CASCADE
- `CreatedUserId` -> User(Id) ON DELETE CASCADE
- `ModifiedUserId` -> User(Id) ON DELETE RESTRICT

**Referenziert von:** WidgetContentTypeMappings

---

### WidgetValues

**Zweck:** Speichert den konkreten Wert eines Widgets fuer ein bestimmtes Content-Objekt. Pro Mapping-Feld und Content genau ein Eintrag. Werte sind in typisierten Spalten abgelegt (EAV-Muster).

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| ContentTypeFieldId | integer | NOT NULL | | FK -> WidgetContentTypeMappings |
| ContentId | integer | NOT NULL | | FK -> Content |
| TextValue | varchar | nullable | | Textwert |
| IntValue | integer | nullable | | Ganzzahlwert / Enum-Key |
| DateValue | timestamp(6) | nullable | | Datumswert |
| TimeValue | time(6) | nullable | | Zeitwert |
| DecimalValue | numeric(18,2) | nullable | | Dezimalwert |
| DeletedOn | timestamp | nullable | | Soft-Delete |

**FKs:**
- `ContentTypeFieldId` -> WidgetContentTypeMappings(Id) ON DELETE CASCADE
- `ContentId` -> Content(Id) ON DELETE CASCADE

**Referenziert von:** WidgetArrayValue

---

### WidgetArrayValue

**Zweck:** Speichert einzelne Eintraege fuer mehrwertige Widgets (Multi-User, Multiselect, Collapsible List, References). Gehoert zu genau einem WidgetValues-Eintrag.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| WidgetValueId | integer | NOT NULL | | FK -> WidgetValues |
| TextValue | varchar | nullable | | Textwert |
| IntValue | integer | nullable | | Ganzzahlwert (z.B. UserId, OptionKey) |
| DateValue | timestamp(6) | nullable | | Datumswert |
| TimeValue | time(6) | nullable | | Zeitwert |
| DecimalValue | numeric(18,2) | nullable | | Dezimalwert |
| DeletedOn | timestamp | nullable | | Soft-Delete |
| MediaId | integer | nullable | | FK -> Media (Datei/Bild) |
| Ordinal | integer | NOT NULL | 0 | Sortierung |
| Key | text | nullable | | Schluessel (z.B. JSON-Key fuer Collapsible List) |

**FKs:**
- `WidgetValueId` -> WidgetValues(Id) ON DELETE CASCADE
- `MediaId` -> Media(Id)

---

### ContentFields

**Zweck:** Verknuepft einen Content-Eintrag mit einem abgegebenen Rating-Wert (ContentRatingTypeValue). Stellt die n:m-Beziehung zwischen Content und individuellen Bewertungen her.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| FieldId | integer | NOT NULL | UNIQUE | FK -> ContentRatingTypeValue |
| ContentEntityId | integer | NOT NULL | | FK -> Content |
| DeletedOn | timestamp | nullable | | Soft-Delete |

**FKs:**
- `FieldId` -> ContentRatingTypeValue(Id) ON DELETE CASCADE
- `ContentEntityId` -> Content(Id) ON DELETE CASCADE

**Hinweis:** Unique-Index auf FieldId -- jeder Rating-Wert gehoert zu genau einem Content.

---

### ContentRatingType

**Zweck:** Ordnet ein RatingTypeField einem ContentType zu. Definiert damit, welche Bewertungskriterien fuer einen bestimmten Inhaltstyp verfuegbar sind.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| ContentTypeId | integer | NOT NULL | | FK -> ContentType |
| RatingTypeFieldId | integer | NOT NULL | | FK -> RatingTypeField |
| Id | integer | NOT NULL | identity | PK |
| DeletedOn | timestamp | nullable | | Soft-Delete |

**FKs:**
- `ContentTypeId` -> ContentType(Id) ON DELETE CASCADE
- `RatingTypeFieldId` -> RatingTypeField(Id) ON DELETE CASCADE

---

### ContentRatingTypeValue

**Zweck:** Speichert eine einzelne Bewertungsabgabe eines Users fuer ein bestimmtes RatingTypeField. Wird ueber ContentFields mit dem Content verknuepft.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| TextValue | varchar | nullable | | Text-Bewertung |
| IntValue | integer | nullable | | Numerische Bewertung / Option-Key |
| DateValue | timestamp(6) | nullable | | Datums-Bewertung |
| TimeValue | time(6) | nullable | | Zeit-Bewertung |
| RatingTypeFieldId | integer | NOT NULL | | FK -> RatingTypeField |
| CreatedUserId | integer | NOT NULL | | FK -> User (Bewertender) |
| CreatedOn | timestamp(6) | NOT NULL | '0001-01-01' | |
| CampaignId | integer | nullable | | FK -> Campaign |
| DeletedOn | timestamp | nullable | | Soft-Delete |

**FKs:**
- `RatingTypeFieldId` -> RatingTypeField(Id) ON DELETE CASCADE
- `CreatedUserId` -> User(Id) ON DELETE SET NULL
- `CampaignId` -> Campaign(Id) ON DELETE SET NULL

**Referenziert von:** ContentFields

---

### RatingTypeField

**Zweck:** Definiert ein Bewertungskriterium (z.B. "Relevanz", "Reifegrad"). Global wiederverwendbar -- wird ueber ContentRatingType einem ContentType zugeordnet.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| CreatedUserId | integer | NOT NULL | | FK -> User |
| CreatedOn | timestamp(6) | NOT NULL | '0001-01-01' | |
| ModifiedUserId | integer | nullable | | FK -> User |
| ModifiedOn | timestamp(6) | nullable | | |
| Name | varchar | NOT NULL | '' | Name des Kriteriums |
| Description | varchar | nullable | | Beschreibung |
| FieldType | integer | NOT NULL | | RatingFieldType Enum (5=Boolean..30=SingleOption) |
| IsRequired | boolean | NOT NULL | false | Pflichtbewertung? |
| Ordinal | integer | NOT NULL | | Sortierung |
| OptionalValues | varchar | nullable | | JSON-Konfiguration (Optionen fuer SingleOption) |
| DeletedOn | timestamp | nullable | | Soft-Delete |

**FKs:**
- `CreatedUserId` -> User(Id) ON DELETE RESTRICT
- `ModifiedUserId` -> User(Id) ON DELETE RESTRICT

**Referenziert von:** ContentRatingType, ContentRatingTypeValue, RatingTypeOption

---

### RatingTypeOption

**Zweck:** Definiert eine Auswahloption fuer ein RatingTypeField vom Typ SingleOption (analog zu WidgetTypeOption fuer Widgets).

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| Key | integer | NOT NULL | | Numerischer Schluessel |
| Name | text | nullable | | Anzeigename |
| RatingTypeFieldId | integer | NOT NULL | | FK -> RatingTypeField |
| DeletedOn | timestamp | nullable | | Soft-Delete |

**FKs:**
- `RatingTypeFieldId` -> RatingTypeField(Id) ON DELETE CASCADE

---

### ContentLikes

**Zweck:** Speichert Likes/Favorisierungen eines Users fuer einen Content-Eintrag. Ein User kann pro Content nur einmal liken (Compound-Index).

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| ContentId | integer | NOT NULL | | FK -> Content |
| UserId | integer | NOT NULL | | FK -> User |
| Id | integer | NOT NULL | identity | PK |
| DeletedOn | timestamp | nullable | | Soft-Delete |

**FKs:**
- `ContentId` -> Content(Id) ON DELETE CASCADE
- `UserId` -> User(Id) ON DELETE CASCADE

**Index:** Compound-Index auf (ContentId, UserId)

---

### ContentTagMapping

**Zweck:** Verknuepft einen Content-Eintrag mit einem Tag und speichert ein Rating fuer diese Zuordnung.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| CreatedUserId | integer | NOT NULL | | FK -> User |
| CreatedOn | timestamp(6) | NOT NULL | | |
| ModifiedUserId | integer | nullable | | FK -> User |
| ModifiedOn | timestamp(6) | nullable | | |
| ContentId | integer | NOT NULL | | FK -> Content |
| TagId | integer | NOT NULL | | FK -> Tag |
| Rating | integer | NOT NULL | | Bewertung der Tag-Zuordnung |
| DeletedOn | timestamp | nullable | | Soft-Delete |

**FKs:**
- `ContentId` -> Content(Id) ON DELETE RESTRICT
- `TagId` -> Tag(Id) ON DELETE CASCADE
- `CreatedUserId` -> User(Id) ON DELETE CASCADE
- `ModifiedUserId` -> User(Id) ON DELETE CASCADE

---

### Tag

**Zweck:** Ein Schlagwort/Tag, das ueber ContentTagMapping an Content-Objekte gehaengt werden kann.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| Name | varchar(450) | nullable | | Tag-Name |
| Rating | integer | NOT NULL | | Standard-Rating |
| DeletedOn | timestamp | nullable | | Soft-Delete |

**Referenziert von:** ContentTagMapping

---

### Relation

**Zweck:** Verbindet zwei Content-Objekte miteinander (bidirektionale Beziehung). Kann optional mit einer Notiz versehen werden.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| CreatedUserId | integer | NOT NULL | | FK -> User |
| CreatedOn | timestamp(6) | NOT NULL | '0001-01-01' | |
| ModifiedUserId | integer | nullable | | FK -> User |
| ModifiedOn | timestamp(6) | nullable | | |
| LeftContentId | integer | NOT NULL | | FK -> Content (linke Seite) |
| RightContentId | integer | NOT NULL | | FK -> Content (rechte Seite) |
| Note | varchar | nullable | | Freitext-Notiz |
| DeletedOn | timestamp | nullable | | Soft-Delete |

**FKs:**
- `LeftContentId` -> Content(Id) ON DELETE RESTRICT
- `RightContentId` -> Content(Id) ON DELETE RESTRICT
- `CreatedUserId` -> User(Id) ON DELETE RESTRICT
- `ModifiedUserId` -> User(Id) ON DELETE RESTRICT

**Referenziert von:** RelationRating

---

### RelationRating

**Zweck:** Bewertet eine Relation zwischen zwei Content-Objekten. Jeder User kann ein Rating abgeben.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| CreatedUserId | integer | NOT NULL | 1 | FK -> User (Bewertender) |
| CreatedOn | timestamp(6) | NOT NULL | '0001-01-01' | |
| ModifiedUserId | integer | nullable | | FK -> User |
| ModifiedOn | timestamp(6) | nullable | | |
| RelationId | integer | NOT NULL | | FK -> Relation |
| Rating | integer | NOT NULL | | Bewertungswert |
| DeletedOn | timestamp | nullable | | Soft-Delete |

**FKs:**
- `RelationId` -> Relation(Id) ON DELETE CASCADE
- `CreatedUserId` -> User(Id) ON DELETE RESTRICT
- `ModifiedUserId` -> User(Id) ON DELETE RESTRICT

---

### ContentTransfer

**Zweck:** Dokumentiert die Migration/Aufspaltung eines Content-Objekts von einem ContentType zu einem anderen. Haelt Quelle, Ziel und Status fest.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | bigint | NOT NULL | identity | PK |
| SourceContentId | integer | NOT NULL | | FK -> Content (Original) |
| TargetContentId | integer | NOT NULL | | FK -> Content (Ziel) |
| MigrateToContentTypeId | integer | NOT NULL | | Ziel-ContentType-Id |
| MigrateToContentTypeName | text | nullable | | Ziel-ContentType-Name (denormalisiert) |
| MigrateFromContentTypeId | integer | NOT NULL | | Quell-ContentType-Id |
| MigrateFromContentTypeName | text | nullable | | Quell-ContentType-Name (denormalisiert) |
| CreatedUserId | integer | NOT NULL | | FK -> User |
| CreatedOn | timestamp(6) | NOT NULL | | |
| ModifiedUserId | integer | nullable | | FK -> User |
| ModifiedOn | timestamp(6) | nullable | | |
| Status | integer | NOT NULL | 10 | ContentTransferStatusEnum (10=Active, 20=Splited, 30=Removed) |

**FKs:**
- `SourceContentId` -> Content(Id) ON DELETE CASCADE
- `TargetContentId` -> Content(Id) ON DELETE CASCADE
- `CreatedUserId` -> User(Id) ON DELETE CASCADE
- `ModifiedUserId` -> User(Id)

---

### ContentUpdateMetadata

**Zweck:** Steuert die Aktualisierungs-Benachrichtigungen pro Content-Objekt. Speichert wann zuletzt benachrichtigt wurde und ob Benachrichtigungen aktiv sind.

| Spalte | Typ | Nullable | Default | Beschreibung |
|--------|-----|----------|---------|--------------|
| Id | integer | NOT NULL | identity | PK |
| ContentId | integer | NOT NULL | UNIQUE | FK -> Content |
| LastNotification | timestamp | nullable | | Letzte Benachrichtigung |
| IsEnabled | boolean | NOT NULL | true | Benachrichtigungen aktiv |

**FKs:**
- `ContentId` -> Content(Id) ON DELETE CASCADE

---

## Views

### ContentRatingView

Aggregiert die Durchschnittsbewertung und Anzahl Bewertungen pro Content und RatingTypeField.

```sql
SELECT c."ContentEntityId" AS "ContentId",
       t."RatingTypeFieldId",
       round(avg(t."IntValue"))::numeric AS "Rating",
       count(t."IntValue") AS "RatedUserAmount"
FROM "ContentFields" c
JOIN "ContentRatingTypeValue" t ON c."FieldId" = t."Id"
WHERE c."DeletedOn" IS NULL
  AND t."IntValue" IS NOT NULL
  AND t."DeletedOn" IS NULL
GROUP BY c."ContentEntityId", t."RatingTypeFieldId";
```

### ContentWidgetView

Flacht WidgetValues + WidgetContentTypeMappings ab, um Widget-Werte zusammen mit ContentTypeId und WidgetTypeId auszugeben. Filtert Soft-Deletes.

```sql
SELECT widgetvalue."Id" AS "WidgetValueId",
       widgetvalue."ContentId",
       widgetvalue."ContentTypeFieldId",
       widgetvalue."DateValue", "DecimalValue", "IntValue", "TextValue", "TimeValue",
       contenttypewidgetmapping."ContentTypeId",
       contenttypewidgetmapping."FieldTypeId" AS "WidgetTypeId"
FROM "WidgetValues" widgetvalue
JOIN "WidgetContentTypeMappings" contenttypewidgetmapping
  ON widgetvalue."ContentTypeFieldId" = contenttypewidgetmapping."Id"
WHERE widgetvalue."DeletedOn" IS NULL
  AND contenttypewidgetmapping."DeletedOn" IS NULL;
```

### ContentUpdateStatusView

Berechnet fuer jeden Content, ob er laut UpdateFrequency des ContentType veraltet ist. Ermittelt `DueAt`, `IsOutdated`, `DaysOverdue` und `AgeSinceModified`.

- FreqUnit 10 = Tage, 20 = Wochen, 30 = Monate
- `DueAt` = ModifiedOn + Frequenz-Intervall
- `IsOutdated` = DueAt < now()

### OutdatedContentResponsibleUsersView

Findet die verantwortlichen User fuer veralteten Content. Joined ContentUpdateStatusView mit ContentWidgetView und WidgetArrayValue, um die User-IDs aus dem zugeordneten "Responsible-User"-Widget zu extrahieren. Filtert nur Content, der tatsaechlich veraltet ist, Benachrichtigungen aktiviert hat und in den letzten 7 Tagen nicht benachrichtigt wurde.

---

## Enums

### WidgetTypeEnum (CIN.Domain.Enums)

Definiert alle verfuegbaren Widget-/Feldtypen:

| Wert | Name | Beschreibung |
|------|------|--------------|
| 5 | Text | Alphanumerische Eingabe |
| 10 | Numeric | Zahleneingabe |
| 25 | Date | Datum und Uhrzeit |
| 30 | File | Datei-Upload |
| 35 | Image | Bild-Upload |
| 40 | User | User-Auswahl |
| 45 | DropdownList | Einfachauswahl |
| 46 | MultipleSelectionDropdownList | Mehrfachauswahl |
| 50 | CollapsibleList | Auf-/zuklappbare Datenliste |
| 70 | TextWithSubtitles | Text mit Untertiteln |
| 80 | References | URL-Links |
| 110 | Picture | Bild (Anzeige) |
| 115 | ItemProfile | Item-Profil |
| 120 | Tags | Tags |
| 140 | Rating | Bewertung |
| 150 | Relation | Beziehung |
| 160 | Folder | Ordner |
| 170 | Articles | Artikel |
| 180 | Address | Adresse |

### RatingFieldType (CIN.Domain.Enums)

Typen fuer Bewertungsfelder:

| Wert | Name |
|------|------|
| 5 | Boolean |
| 10 | Numerical |
| 15 | Text |
| 20 | Time |
| 25 | Date |
| 30 | SingleOption |

### RatingTypes (CIN.Domain.Enums)

| Wert | Name |
|------|------|
| 10 | Number |
| 20 | String |
| 30 | Range |
| 40 | DateRange |
| 50 | Options |

### MediaType (CIN.Domain.Enums)

| Wert | Name |
|------|------|
| 5 | Avatar |
| 10 | CompanyLogo |
| 15 | Images |
| 20 | Files |

### ActionBoardTypeEnum (CIN.Domain.Enums)

| Wert | Name |
|------|------|
| 10 | Funnel |
| 20 | Radar |
| 40 | Matrix |
| 50 | Timeline |
| 60 | Relation |

### ContentStatusEnum (CIN.Domain.Entities -- in ContentEntity.cs)

| Wert | Name | Beschreibung |
|------|------|--------------|
| 10 | Published | Veroeffentlicht |
| 20 | Unpublished | Nicht veroeffentlicht |
| 30 | Submitted | Eingereicht (zur Pruefung) |
| 40 | Rejected | Abgelehnt |
| 50 | Transferred | Migriert (readonly) |
| 60 | Archived | Archiviert (readonly) |

### ContentTransferStatusEnum (CIN.Domain.Entities -- in ContentTransferEntity.cs)

| Wert | Name |
|------|------|
| 10 | Active |
| 20 | Splited |
| 30 | Removed |

### UpdateIntervalUnitEnum (CIN.Domain.Entities)

Verwendet in ContentType.UpdateFrequency_Unit:

| Wert | Name |
|------|------|
| 20 | Week |
| 30 | Month |

**Hinweis:** In der ContentUpdateStatusView wird auch Unit=10 (Day) behandelt, obwohl dieser Wert im Enum auskommentiert ist.

### ValueTypeEnum (CIN.Domain.Entities -- ContentTracking)

| Wert | Name |
|------|------|
| 1 | Decimal |
| 2 | Int |
| 3 | String |
| 4 | Date |
| 5 | TimeSpan |

### ItemTypeEnum (CIN.Domain.Entities -- ContentTracking)

| Wert | Name |
|------|------|
| 1 | Content |
| 2 | Rating |
| 3 | Widget |
| 4 | ContentType |
| 5 | User |
| 6 | Relation |
| 7 | AccessDefinition |
| 8 | AccessAssignments |
| 9 | AccessDefaults |

---

## Beziehungen

### Datenfluss: ContentType -> Widgets -> Content -> WidgetValues

```
ContentType (1)
  |
  |-- (1:n) WidgetFolder          -- optionale Gruppen fuer Widgets
  |
  |-- (1:n) WidgetContentTypeMappings
  |           |
  |           |-- (n:1) WidgetType           -- welcher Feldtyp
  |           |           |
  |           |           |-- (1:n) WidgetTypeOption  -- Auswahl-Optionen
  |           |
  |           |-- (n:1) WidgetFolder          -- optionale Gruppierung
  |           |
  |           |-- (1:n) WidgetValues          -- gespeicherte Werte
  |                       |
  |                       |-- (n:1) Content   -- zu welchem Inhalt
  |                       |
  |                       |-- (1:n) WidgetArrayValue  -- Mehrfachwerte
  |
  |-- (1:n) Content
              |
              |-- (1:n) ContentFields
              |           |
              |           |-- (n:1) ContentRatingTypeValue  -- Bewertungswert
              |
              |-- (1:n) ContentLikes
              |
              |-- (1:n) ContentTagMapping
              |           |
              |           |-- (n:1) Tag
              |
              |-- (n:m) Relation (via LeftContentId / RightContentId)
              |           |
              |           |-- (1:n) RelationRating
              |
              |-- (1:1) ContentUpdateMetadata
              |
              |-- (n:m) ContentTransfer (als Source oder Target)
```

### Rating-System

```
RatingTypeField (1)             -- Bewertungskriterium (global)
  |
  |-- (1:n) RatingTypeOption     -- Optionen fuer SingleOption-Typ
  |
  |-- (1:n) ContentRatingType    -- Zuordnung zu ContentType
  |           |
  |           |-- (n:1) ContentType
  |
  |-- (1:n) ContentRatingTypeValue  -- abgegebene Bewertung
              |
              |-- (n:1) User        -- wer hat bewertet
              |
              |-- (1:1) ContentFields  -- Verknuepfung zum Content
                          |
                          |-- (n:1) Content
```

### Update-Frequenz-System

ContentType definiert ein Update-Intervall (Unit + Value) und ein Widget, das den verantwortlichen User haelt. Die View `ContentUpdateStatusView` berechnet daraus ob Content veraltet ist. `OutdatedContentResponsibleUsersView` ermittelt dann die zu benachrichtigenden User. `ContentUpdateMetadata` steuert pro Content, ob Benachrichtigungen aktiv sind und speichert den Zeitpunkt der letzten Benachrichtigung (Cooldown: 7 Tage).
