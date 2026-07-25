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


const SENSITIVE_HTTP_HEADERS = new Set([
  "authorization",
  "api-key",
  "x-api-key",
  "cookie",
  "set-cookie",
]);


function sanitizedHeaders(headers: Headers): Record<string, string> {
  return Object.fromEntries(
    Array.from(headers.entries()).map(([name, value]) => [
      name,
      SENSITIVE_HTTP_HEADERS.has(name.toLowerCase())
        ? "<redacted>"
        : value,
    ]),
  );
}


function formatHttpBody(body: string): string {
  if (!body) {
    return "<empty>";
  }

  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}


export function createLoggingFetch(
  baseFetch: typeof fetch = globalThis.fetch,
): typeof fetch {
  const loggingFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const requestBody = await request.clone().text();

    console.log("\n=== OpenAI Request ===");
    console.log(`${request.method} ${request.url}`);
    console.log("Headers:");
    console.log(JSON.stringify(sanitizedHeaders(request.headers), null, 2));
    console.log("Body:");
    console.log(formatHttpBody(requestBody));

    const response = await baseFetch(request);
    const responseBody = await response.clone().text();

    console.log("=== OpenAI Response ===");
    console.log(`Status: ${response.status}`);
    console.log("Headers:");
    console.log(JSON.stringify(sanitizedHeaders(response.headers), null, 2));
    console.log("Body:");
    console.log(formatHttpBody(responseBody));
    console.log("=======================\n");

    return response;
  };

  return loggingFetch;
}


function requiredArgument(
  actionData: AgentAction,
  name: string,
): string {
  const value = actionData.args[name];
  if (value === undefined) {
    throw new Error(`Fehlendes Argument: ${name}`);
  }
  return value;
}


export function createOpenAIClient(httpLogging = false): OpenAI {
  return new OpenAI({
    fetch: httpLogging ? createLoggingFetch() : globalThis.fetch,
    logLevel: "warn",
  });
}


export function isHttpLoggingEnabled(args: readonly string[]): boolean {
  return args.includes("--http-logging");
}


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

    try {
      const actionData = parseAgentAction(content);

      console.log(`\n[Gedanke]: ${actionData.thought}`);

      if (actionData.action === "finish") {
        console.log("Fertig!");
        break;
      }

      let toolResult: string;
      switch (actionData.action) {
        case "run_shell":
          toolResult = runShell(requiredArgument(actionData, "command"));
          break;
        case "read_file":
          toolResult = readFile(requiredArgument(actionData, "path"));
          break;
        case "write_file":
          toolResult = writeFile(
            requiredArgument(actionData, "path"),
            requiredArgument(actionData, "content"),
          );
          break;
        default:
          toolResult = `Fehler: Unbekanntes Tool ${actionData.action}`;
      }

      const displayResult = toolResult.length > 100
        ? `${toolResult.slice(0, 100)}...`
        : toolResult;
      console.log(`   [Ergebnis]: ${displayResult}`);

      messages.push({ role: "assistant", content });
      messages.push({
        role: "user",
        content: `Tool Output: ${toolResult}`,
      });
    } catch (error) {
      console.error(
        `JSON Parsing Fehler oder Ausnahmefehler: ${errorMessage(error)}`,
      );
      console.error(`Raw Content: ${content}`);
    }
  }
}


async function main(args: readonly string[] = process.argv.slice(2)): Promise<void> {
  const client = createOpenAIClient(isHttpLoggingEnabled(args));
  await runAgent(client);
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
