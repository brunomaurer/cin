# KI-Komponente — Zukunftsfaehigkeit

> Analyse: 2026-05-28 | Frage: Kann die bestehende KI-Architektur fuer weitere Use Cases wiederverwendet werden?

## Ergebnis: Nein — nicht zukunftsbasiert aufgebaut

Die KI-Komponente wurde **fuer Interviews gebaut, nicht als wiederverwendbare AI-Plattform**. Es gibt kein gemeinsames Fundament fuer weitere AI-Features wie Trend Scouting, Content-Analyse oder Ideation.

## Wiederverwendbarkeit pro Bereich

| Bereich | Interview-spezifisch? | Wiederverwendbar | Problem |
|---|---|---|---|
| HTTP-Client (Send/Stream) | Wenig | **80%** | Bestes Stueck — generisch nutzbar |
| Ordner-Struktur | Nein | **90%** | Platz fuer Siblings vorhanden |
| Domain-Modell | Mittel | **60%** | Felder passen, Semantik ist Interview |
| Request/Response Models | Mittel-Hoch | **50%** | Haelfte interview-spezifisch (ExtraQuestions, CoverageSlots) |
| Frontend Chat-UI | Hoch | **40%** | "Submit Idea", Progress-Labels, Modals alles Interview |
| Service-Layer | Hoch | **30%** | Methoden heissen SubmitIdea, ConvertIdea |
| Campaign-Kopplung | Sehr hoch | **10%** | Kein Agent ohne Campaign moeglich |
| Content-Konvertierung | Sehr hoch | **20%** | Hart auf Widget-Modell verdrahtet |
| Controller / API | Sehr hoch | **10%** | Routing, Auth, alles Campaign-gebunden |

## Konkretes Beispiel: Trend Scouting als zweites Feature

Wenn man heute Trend Scouting als zweites AI-Feature bauen wollte:

- **60-70% des Codes muesste kopiert werden** (Domain, Service, Controller)
- **30-40% muesste angepasst werden** (andere Workflows, andere Outputs)
- **Nur 10-20% echte Wiederverwendung** (HTTP-Client, Streaming, Message-Modelle)

Das ist **Copy-Paste-and-Pray**, keine Plattform.

## Was fehlt fuer echte Erweiterbarkeit

| Was fehlt | Was es loesen wuerde |
|---|---|
| `BaseAiChatService` | Generisches Session- & Message-Management, einmal gebaut, ueberall genutzt |
| `IAiOutputConverter<TIn, TOut>` | Interview → Item, TrendScout → Report, Ideation → Idea — jeweils spezialisiert |
| Agent ohne Campaign | Agents als eigenstaendige Entitaet, nicht an Kampagnen gekoppelt |
| `GenericChatInterface` (Frontend) | Chat-UI mit konfigurierbaren Actions, Modals, Progress statt hart-codiert |
| `Common/` Ordner | Geteilte Basis-Klassen, Interfaces, Utilities fuer alle AI-Features |

## Ziel-Architektur (bei Greenfield)

```
AIFeatures/
├── Common/                ← Generische AI-Engine (FEHLT HEUTE)
│   ├── BaseAiChatService     (Session + Messages)
│   ├── BaseAiHttpClient      (Send + Stream)
│   ├── IAiOutputConverter    (Pluggable Konvertierung)
│   └── GenericChatUI         (Konfigurierbares Frontend)
├── Interview/             ← Spezialisierung 1
├── TrendScouting/         ← Spezialisierung 2
├── Ideation/              ← Spezialisierung 3
└── ContentAnalysis/       ← Spezialisierung 4
```

Jede Spezialisierung konfiguriert den Kern, statt ihn zu kopieren. Neue AI-Features in Tagen statt Wochen.

## Fazit

Die bestehende KI-Komponente ist **funktional gut aber architektonisch eine Sackgasse**. Bei einem Greenfield wuerde man eine generische AI-Chat-Engine als Kern bauen und darauf spezialisierte Module als Konfiguration. Das ist der groesste Architektur-Gewinn eines Neubaus.

**Siehe auch:** [[KI-Komponente-Bewertung]] fuer die technische Detail-Analyse.
