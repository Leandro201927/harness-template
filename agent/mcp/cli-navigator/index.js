#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import pty from "node-pty";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Solo se permite spawnear binarios de scaffolding/paquetería oficiales.
// Amplía esta lista si tu SKILL.md de referencia incluye más frameworks.
const ALLOWED_COMMANDS = new Set([
  "npm", "npx", "yarn", "pnpm", "bun",
  "uv", "pip", "pip3", "poetry",
  "cargo", "go",
  "git",
  "ng", "ng.cmd",
  "django-admin", "python", "python3",
  "composer", "symfony",
  "rails",
  "sam", "cdk",
  "spring",
]);

const DEFAULT_QUIET_MS = 500;      // cuánto silencio en la terminal consideramos "terminó de escribir"
const DEFAULT_MAX_WAIT_MS = 20000; // tope duro por si el proceso no calla nunca
const MAX_RETURNED_CHARS = 8000;   // recorte para no reventar contexto del agente

// Teclas nombradas -> secuencias reales de terminal
const NAMED_KEYS = {
  enter: "\r",
  up: "\x1b[A",
  down: "\x1b[B",
  right: "\x1b[C",
  left: "\x1b[D",
  space: " ",
  tab: "\t",
  escape: "\x1b",
  "ctrl-c": "\x03",
  backspace: "\x7f",
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function stripAnsi(str) {
  // Elimina secuencias de escape ANSI (colores, movimiento de cursor, etc.)
  // Suficiente para limpiar output antes de devolverlo al agente.
  return str
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
    .replace(/\x1b\][^\x07]*\x07/g, "")
    .replace(/\x1b[()][A-Za-z0-9]/g, "")
    .replace(/\r/g, "");
}

function resolveKeys(keys) {
  // Acepta: una tecla nombrada ("down"), varias separadas por "+" ("down+down+enter"),
  // o texto literal a escribir tal cual (p. ej. un nombre de proyecto).
  if (Object.prototype.hasOwnProperty.call(NAMED_KEYS, keys)) {
    return NAMED_KEYS[keys];
  }
  if (keys.includes("+") && keys.split("+").every((k) => k in NAMED_KEYS)) {
    return keys.split("+").map((k) => NAMED_KEYS[k]).join("");
  }
  // Texto literal: se envía tal cual, sin interpretar escapes.
  return keys;
}

function truncate(str) {
  if (str.length <= MAX_RETURNED_CHARS) return str;
  const head = str.slice(0, 500);
  const tail = str.slice(-MAX_RETURNED_CHARS + 500);
  return `${head}\n...[recortado]...\n${tail}`;
}

// ---------------------------------------------------------------------------
// Estado de sesiones activas
// ---------------------------------------------------------------------------

/** @type {Map<string, { proc: import("node-pty").IPty, rawOutput: string, lastReadIndex: number, exited: boolean, exitCode: number|null }>} */
const sessions = new Map();

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Sesión desconocida o ya cerrada: ${sessionId}`);
  }
  return session;
}

// Espera hasta que la terminal lleve `quietMs` sin emitir datos nuevos,
// o hasta `maxWaitMs` como tope absoluto. Devuelve solo lo NUEVO desde
// la última lectura de esa sesión.
function waitForQuiet(session, { quietMs = DEFAULT_QUIET_MS, maxWaitMs = DEFAULT_MAX_WAIT_MS } = {}) {
  return new Promise((resolve) => {
    let quietTimer = null;
    let maxTimer = null;
    const startIndex = session.rawOutput.length;

    const finish = () => {
      clearTimeout(quietTimer);
      clearTimeout(maxTimer);
      session.proc.removeListener?.("data", onData); // no-op si no existe
      offData();
      const newRaw = session.rawOutput.slice(startIndex);
      session.lastReadIndex = session.rawOutput.length;
      resolve({
        newOutput: truncate(stripAnsi(newRaw)),
        exited: session.exited,
        exitCode: session.exitCode,
      });
    };

    const armQuietTimer = () => {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(finish, quietMs);
    };

    const onData = () => armQuietTimer();
    const disposable = session.proc.onData(onData);
    const offData = () => disposable.dispose();

    const onExit = () => finish();
    const exitDisposable = session.proc.onExit(onExit);
    const origFinish = finish;
    // asegurar que también limpiamos el listener de exit al terminar
    const wrappedFinish = () => {
      exitDisposable.dispose();
      origFinish();
    };
    quietTimer = setTimeout(wrappedFinish, quietMs);
    maxTimer = setTimeout(wrappedFinish, maxWaitMs);
  });
}

// ---------------------------------------------------------------------------
// Servidor MCP
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "mcp-cli-navigator", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "start_cli_session",
      description:
        "Lanza un comando CLI en un pseudo-terminal (PTY) y devuelve el output inicial una vez que la terminal se queda en silencio (prompt listo para interactuar). Usa send_key para enviar pulsaciones siguientes.",
      inputSchema: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: `Binario a ejecutar. Debe estar en la allowlist: ${[...ALLOWED_COMMANDS].join(", ")}`,
          },
          args: {
            type: "array",
            items: { type: "string" },
            description: "Argumentos del comando (ej. ['create-vite@latest', '.'])",
          },
          cwd: {
            type: "string",
            description: "Directorio de trabajo donde se ejecuta el comando (ej. './src' o './.tmp-bootstrap').",
          },
        },
        required: ["command", "cwd"],
      },
    },
    {
      name: "send_key",
      description:
        "Envía una pulsación de teclado (o texto literal) a una sesión CLI abierta y devuelve el output nuevo tras esperar a que la terminal se quede en silencio. Teclas nombradas soportadas: " +
        Object.keys(NAMED_KEYS).join(", ") +
        ". También se pueden combinar con '+' (ej. 'down+down+enter'), o enviar texto literal (ej. un nombre de proyecto) seguido de una llamada aparte con 'enter'.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string", description: "ID devuelto por start_cli_session." },
          keys: { type: "string", description: "Tecla nombrada, combinación con '+', o texto literal a escribir." },
        },
        required: ["sessionId", "keys"],
      },
    },
    {
      name: "read_output",
      description:
        "Lee el output nuevo de una sesión sin enviar ninguna tecla (útil para esperar más tiempo si el proceso está tardando, por ejemplo durante una instalación de dependencias).",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          maxWaitMs: { type: "number", description: "Tope de espera en ms (default 20000)." },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "close_session",
      description: "Mata el proceso de una sesión CLI abierta y libera sus recursos.",
      inputSchema: {
        type: "object",
        properties: { sessionId: { type: "string" } },
        required: ["sessionId"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "start_cli_session":
        return await handleStart(args);
      case "send_key":
        return await handleSendKey(args);
      case "read_output":
        return await handleReadOutput(args);
      case "close_session":
        return handleClose(args);
      default:
        throw new Error(`Herramienta no encontrada: ${name}`);
    }
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: error.message }] };
  }
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleStart({ command, args = [], cwd }) {
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new Error(
      `Comando no permitido: "${command}". Solo se permiten comandos oficiales de scaffolding/paquetería: ${[...ALLOWED_COMMANDS].join(", ")}`
    );
  }

  const proc = pty.spawn(command, args, {
    name: "xterm-color",
    cols: 100,
    rows: 30,
    cwd,
    env: process.env,
  });

  const sessionId = randomUUID();
  const session = { proc, rawOutput: "", lastReadIndex: 0, exited: false, exitCode: null };
  sessions.set(sessionId, session);

  proc.onData((data) => {
    session.rawOutput += data;
  });
  proc.onExit(({ exitCode }) => {
    session.exited = true;
    session.exitCode = exitCode;
  });

  const { newOutput, exited, exitCode } = await waitForQuiet(session);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ sessionId, output: newOutput, exited, exitCode }, null, 2),
      },
    ],
  };
}

async function handleSendKey({ sessionId, keys }) {
  const session = getSession(sessionId);
  if (session.exited) {
    throw new Error(`La sesión ${sessionId} ya terminó (exitCode=${session.exitCode}). Usa close_session y abre una nueva si necesitas reintentar.`);
  }

  const payload = resolveKeys(keys);
  session.proc.write(payload);

  const { newOutput, exited, exitCode } = await waitForQuiet(session);

  return {
    content: [
      { type: "text", text: JSON.stringify({ sessionId, output: newOutput, exited, exitCode }, null, 2) },
    ],
  };
}

async function handleReadOutput({ sessionId, maxWaitMs }) {
  const session = getSession(sessionId);
  const { newOutput, exited, exitCode } = await waitForQuiet(session, {
    maxWaitMs: maxWaitMs ?? DEFAULT_MAX_WAIT_MS,
  });

  return {
    content: [
      { type: "text", text: JSON.stringify({ sessionId, output: newOutput, exited, exitCode }, null, 2) },
    ],
  };
}

function handleClose({ sessionId }) {
  const session = getSession(sessionId);
  if (!session.exited) {
    try {
      session.proc.kill();
    } catch {
      // proceso ya muerto, ignorar
    }
  }
  sessions.delete(sessionId);
  return { content: [{ type: "text", text: JSON.stringify({ sessionId, closed: true }) }] };
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Servidor MCP de Navegación CLI (turn-based) corriendo en Stdio...");