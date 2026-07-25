import { spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
} from "node:fs";
import { pathToFileURL } from "node:url";

import OpenAI from "openai";
import { z } from "zod";


export const agentActionSchema = z.object({
  thought: z.string(),
  action: z.string(),
  args: z.record(z.string(), z.string()),
});

export type AgentAction = z.infer<typeof agentActionSchema>;


export function parseAgentAction(content: string): AgentAction {
  return agentActionSchema.parse(JSON.parse(content));
}


function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}


export function runShell(command: string): string {
  console.log(`Führe Shell aus: ${command}`);

  const process = spawnSync(command, {
    shell: true,
    encoding: "utf8",
  });

  if (process.error) {
    return `Fehler: ${process.error.message}`;
  }

  const output = `${process.stdout ?? ""}${process.stderr ?? ""}`;
  return output.trim() ? output : "Befehl ausgeführt (kein Output)";
}


export function readFile(path: string): string {
  console.log(`Lese Datei: ${path}`);
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    return `Fehler: ${errorMessage(error)}`;
  }
}


export function writeFile(path: string, content: string): string {
  console.log(`Schreibe Datei: ${path}`);
  try {
    writeFileSync(path, content, "utf8");
    return "Erfolg: Datei gespeichert.";
  } catch (error) {
    return `Fehler: ${errorMessage(error)}`;
  }
}


export const SYSTEM_PROMPT = `
Du bist ein autonomer TypeScript Coding-Agent.
Antworte IMMER im rohen JSON-Format. Kein Markdown!

Struktur:
{
  "thought": "Überlegung...",
  "action": "run_shell" | "read_file" | "write_file" | "finish",
  "args": { "command": "...", "path": "...", "content": "..." }
}

Tools:
1. run_shell(command): Führt Befehle aus.
2. write_file(path, content): Erstellt Dateien.
3. read_file(path): Liest Dateien.
4. finish(): Wenn Aufgabe erledigt.
`.trim();

export const TASK = [
  "Erstelle einen neuen Unterordner 'HelloWorld'.",
  "Lege darin eine Datei 'main.ts' an,",
  "die 'Hallo Welt aus TypeScript' ausgibt.",
  "Führe das Programm in diesem Ordner mit 'npx tsx main.ts' aus.",
].join(" ");


export async function runAgent(
  client: OpenAI = new OpenAI(),
  maxSteps = 15,
): Promise<void> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Aufgabe: ${TASK}` },
  ];

  console.log("Starte Agent...\n");

  for (let step = 0; step < maxSteps; step += 1) {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages,
    });
    const content = response.choices[0]?.message.content ?? "";

    // TODO: ÜBUNG 1 - Parse und validiere den JSON-String mit
    // parseAgentAction in ein AgentAction-Objekt.
    // TODO: ÜBUNG 1 - Gib den Gedanken des Agenten aus, damit der Loop
    // nachvollziehbar wird.
    // TODO: ÜBUNG 1 - Beende den Loop sofort, wenn die Action "finish" ist.
    // TODO: ÜBUNG 1 - Rufe je nach Action die passende Tool-Funktion auf:
    // runShell, readFile oder writeFile.
    // TODO: ÜBUNG 1 - Behandle unbekannte Actions als Fehlertext.
    // TODO: ÜBUNG 1 - Gib das Tool-Ergebnis gekürzt auf der Konsole aus.
    // TODO: ÜBUNG 1 - Füge die Assistant-Antwort und das Tool-Ergebnis wieder
    // zur Message-History hinzu, damit der Agent im nächsten Schritt auf dem
    // letzten Ergebnis weiterarbeiten kann.
    // SO PRÜFST DU ES: Starte das Programm. Der Agent sollte mehrere Schritte
    // ausführen, eine Datei im Ordner "HelloWorld" erzeugen, sie ausführen und
    // am Ende "Hallo Welt aus TypeScript" ausgeben.
    throw new Error(
      "ÜBUNG 1: Implementiere JSON-Parsing, Tool-Routing und History-Update.",
    );
  }
}


async function main(): Promise<void> {
  await runAgent();
}


const entryPoint = process.argv[1];
if (
  entryPoint !== undefined
  && import.meta.url === pathToFileURL(entryPoint).href
) {
  main().catch((error: unknown) => {
    console.error(`Fehler: ${errorMessage(error)}`);
    process.exitCode = 1;
  });
}
