# KI-Komponente: Interview-Agent — Bewertung

> Analyse: 2026-05-28 | Deep-Dive auf alle AI-relevanten Files im trendradar-Repo

## Was ist da?

Ein vollstaendiges **AI-Interview-System** — Kunden koennen per Chat-Interface interviewt werden, die KI fuehrt das Gespraech, fasst zusammen und konvertiert die Ergebnisse in Content-Items.

## Architektur-Ueberblick

```
Agent-Setup (Admin konfiguriert)
  ├── BasePrompt (System-Prompt)
  ├── Questions (Fragen die gestellt werden sollen)
  └── Templates mit Slots (Topics: MustCover / NiceToHave)
         │
         ▼
Interview-Session (User chattet)
  ├── StartChat() → Session eroeffnen
  ├── AddMessage() → Nachricht senden, KI antwortet
  ├── StreamMessage() → SSE Streaming (Echtzeit)
  ├── SubmitIdea() → Zusammenfassung generieren
  └── ConvertIdea() → Interview → Content-Item
         │
         ▼
Externer AI-Service (nicht OpenAI direkt)
  └── Abstrahiert via ChatInterviewHttpClient
      └── Konfigurierbar: URL + Auth-Token + Mock-Modus
```

## Code-Umfang

| Komponente | LOC | Bewertung |
|---|---|---|
| Domain-Entities | 158 | **Sauber** — 8 Entities, klare Aggregate |
| Backend Services | 1'679 | **25-30% Bloat** — aber Kernlogik ist solid |
| Controller | 358 | **Sauber** — duenn, delegieren an Services |
| Frontend Interview | 2'035 | **20-25% Bloat** — ChatInterface 627 LOC zu gross |
| Frontend Campaign-Setup | 297 | **Gut** — Drag-Drop, Templates, Presets |
| Schemas + Mapper | 110 | **Sauber** — Zod, kein Bloat |
| **Total** | **~4'500 LOC** | |

## Was ist GUT (behalten / als Blaupause)

1. **Domain-Modell** — AgentSetup → Session → Messages → ConvertedSession ist ein sauberes Aggregate. Genau richtig fuer eine KI-Interview-Engine.

2. **SSE-Streaming** — Sowohl Backend (IAsyncEnumerable) als auch Frontend (EventSource-Parser) korrekt implementiert. Nicht trivial, funktioniert.

3. **Mock-Client** — Testmodus ohne echte KI-Aufrufe. Genuein nuetzlich fuer Entwicklung.

4. **Agent-Konfiguration** — Admins koennen System-Prompt, Fragen und Topic-Abdeckung konfigurieren. Flexibel aber nicht ueberkomplex.

5. **Progress-Tracking** — KI meldet zurueck welche Topics abgedeckt sind und wie weit das Interview ist.

6. **Content-Konvertierung** — Interview-Ergebnisse werden automatisch in strukturierte Content-Items umgewandelt (Widget-Mapping).

7. **Kampagnen-Integration** — Interviews sind als Campaign-Typ eingebaut, public-facing ohne Login moeglich.

8. **Template-Presets** — 6 vordefinierte Interview-Templates im Frontend. Reduziert Setup-Aufwand.

## Was ist BLOAT (vereinfachen bei Neubau)

### Backend

1. **Generic UpdateCollection Pattern** (AgentService) — Abstraktion die Lesbarkeit kostet. Direktes CRUD waere klarer und 40% kuerzer.

2. **Doppelte Message-Save-Logik** (ChatInterviewService) — SaveUserMessage und SaveAssistantResponse sind quasi identisch. Eine Methode reicht.

3. **Doppelte Sequence-Number-Logik** — Gleicher Code an 2 Stellen. Sollte ein Helper sein.

4. **Widget-Type-Switch** (ChatToItemService) — 55 Zeilen Case-Statements fuer 5 Widget-Typen. Koennte datengetrieben oder per Reflection geloest werden.

5. **Mock-Logik im Production-Client** — MockResponse-Generierung gehoert in eine eigene Klasse, nicht in den echten HTTP-Client.

6. **Settings werden 4x pro Request geholt** — Sollte gecacht oder einmal durchgereicht werden.

### Frontend

1. **ChatInterface.tsx (627 LOC)** — Utility-Funktionen (34 Zeilen) gehoeren in eigene Datei. State-Proliferation (6 useState) koennte ein useReducer sein.

2. **Hard-coded Progress-Steps** — Labels und Gradients direkt im Code. Sollte datengetrieben sein.

3. **Doppelte Attachment-Tile-Logik** — ChatAttachmentTiles vs SessionAttachmentTiles mit aehnlichem Code.

### Legacy

4. **OpenAI-Wrapper** (ThirdPartyLibrary/OpenAI_API, 100+ Files) — Komplett selbstgebaut statt offizielles SDK. Wird nur fuer DALL-E genutzt. Bei Neubau durch offizielles SDK ersetzen.

## Fazit: Was man aus der Schublade ziehen kann

### Direkt wiederverwendbar (Konzept + Patterns)
- ✅ Agent-Setup Datenmodell (Prompt + Questions + Slots)
- ✅ Session-Management Pattern (Start → Chat → Submit → Convert)
- ✅ SSE-Streaming Architektur (Backend + Frontend)
- ✅ Campaign-Integration (public interviews ohne Login)
- ✅ Template-Presets (vordefinierte Konfigurationen)
- ✅ Content-Konvertierung (Interview → strukturiertes Item)
- ✅ Zod-Schemas fuer Interview-Kampagnen

### Bei Neubau vereinfachen
- 🔧 Services von 1'679 auf ~1'000 LOC reduzierbar
- 🔧 ChatInterface von 627 auf ~400 LOC reduzierbar
- 🔧 OpenAI-Wrapper komplett durch SDK ersetzen
- 🔧 Gesamt: **~4'500 LOC → ~2'800 LOC** (38% weniger) bei gleicher Funktionalitaet

### Nicht uebernehmen
- ❌ Generic UpdateCollection Abstraction
- ❌ Custom OpenAI-Wrapper (100+ Files)
- ❌ Widget-Type Switch-Statement
- ❌ Doppelte Mock/Prod Logik im selben Client

## Einordnung fuer Greenfield

Die KI-Interview-Komponente ist das **wertvollste wiederverwendbare Konzept** im ganzen Repo. Bei einem Neubau wuerde man:

1. Das **Domain-Modell 1:1 uebernehmen** (Agent → Session → Messages)
2. Das **Streaming-Pattern uebernehmen** (SSE, gleiche Frontend-Architektur)
3. Die **Kampagnen-Integration uebernehmen** (public interviews)
4. Den **Backend-Service neu schreiben** — schlanker, ohne .NET-Ballast
5. Die **Frontend-Komponenten refactoren** — ChatInterface aufteilen, Utils extrahieren
6. **Claude API statt externem Service** — direkte Integration, kein Zwischenserver noetig
