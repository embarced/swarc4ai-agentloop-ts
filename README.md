# Anleitung: TypeScript-Übung "Agentic Loop"

## Ziel der Übung

In dieser Übung baut ihr einen einfachen Agentic Loop in TypeScript:

1. Ein System Prompt definiert das erlaubte JSON-Format.
2. Das LLM entscheidet pro Schritt über die nächste Aktion.
3. TypeScript führt Tools wie `run_shell`, `read_file` und `write_file` aus.
4. Die Tool-Ergebnisse werden wieder in die Nachrichtenhistorie eingespeist.
5. Der Agent arbeitet iterativ, bis die Aufgabe erledigt ist.

Am Ende steht ein einfacher autonomer Coding-Agent mit ReAct-artigem Loop:
Prompt -> LLM-Antwort -> Tool-Ausführung -> Tool-Feedback -> nächster Schritt.
Zod validiert dabei die JSON-Antworten des LLMs zur Laufzeit und leitet den
zugehörigen TypeScript-Typ ab.

## Voraussetzungen

- Node.js 22 oder neuer
- `npm`
- OpenAI API Key

## Installation

Abhängigkeiten reproduzierbar aus der mitgelieferten Lock-Datei installieren:

```bash
npm ci
```

Für die lokale Weiterentwicklung kann alternativ `npm install` verwendet werden.

## API-Key setzen

Unter macOS und Linux:

```bash
export OPENAI_API_KEY="<dein-key>"
```

Unter Windows PowerShell:

```powershell
$env:OPENAI_API_KEY="<dein-key>"
```

## Anwendung starten

```bash
npm start
```

### Optionales HTTP-Logging

Auf dem Branch `main` kann ein vollständiger HTTP-Log mit `--http-logging`
aktiviert werden:

```bash
npm start -- --http-logging
```

Für die kompilierte Anwendung:

```bash
npm run start:compiled -- --http-logging
```

Der Logger gibt die JSON-Bodies vollständig und eingerückt aus. Besonders
interessant ist im Request das Feld `messages`: Dort sind der System Prompt,
die Aufgabe, frühere Agent-Antworten und die bisherigen Tool-Ergebnisse zu
sehen.

Diese Übung verwendet bewusst nicht das native Tool-Calling der OpenAI API.
Deshalb gibt es im Request kein `tools`-Feld. Stattdessen beschreibt der
System Prompt die erlaubten Aktionen `run_shell`, `read_file`, `write_file`
und `finish`. Das Modell antwortet mit einer JSON-Aktion, die anschließend
vom TypeScript-Code ausgeführt wird.

Ohne den Parameter bleibt das HTTP-Logging deaktiviert.
Authentifizierungs-Header und Cookies werden maskiert. Request- und
Response-Bodies können jedoch Prompts, Tool-Ergebnisse und Modellantworten
enthalten und sollten deshalb nicht in öffentliche Logs kopiert werden.

## Arbeitsweise

Dieses Repository enthält:

- den Branch `ex1` mit einer unvollständigen Übungsaufgabe
- den Branch `main` mit der vollständigen Referenzlösung

Wichtig:

- `// TODO`-Texte und `// SO PRÜFST DU ES` sind auf Deutsch
- Typen, Funktionen und Variablennamen bleiben Englisch

## Branch-Ablauf

### 1) Übungs-Branch: `ex1`

```bash
git checkout ex1
```

Sucht TODOs nach `ÜBUNG 1`.

Inhaltlich:

- JSON-Antwort in `AgentAction` parsen
- JSON-Struktur mit dem vorhandenen Zod-Schema validieren
- den `thought` des Agenten ausgeben
- auf `finish` reagieren
- je nach `action` die passende Tool-Funktion ausführen
- unbekannte Actions sinnvoll behandeln
- Tool-Ergebnis wieder in die History zurückschreiben

Testidee:

- App starten
- Prüfen, ob der Agent mehrere Schritte ausführt
- Beobachten, dass der Agent den Ordner `HelloWorld` anlegt
- Beobachten, dass darin `main.ts` erstellt und ausgeführt wird

### 2) Referenzlösung: `main`

```bash
git checkout main
```

`main` enthält die vollständige, lauffähige Lösung.

## Nützliche Kommandos

TypeScript-Typen prüfen:

```bash
npm run check
```

JavaScript nach `dist/` kompilieren:

```bash
npm run build
```

Kompilierte Anwendung starten:

```bash
npm run start:compiled
```

TODOs finden:

```bash
rg "ÜBUNG" src
```

Status prüfen:

```bash
git status
git diff
```

Branch wechseln:

```bash
git checkout <branch-name>
```

## Wichtige Datei

- `src/agentLoop.ts`
  - System Prompt, Tool-Funktionen, OpenAI-Aufruf, Loop, History-Update und Aufgabenstellung

## Abschluss

Wenn die TODOs in `ex1` gelöst sind, vergleicht mit:

```bash
git checkout main
```
