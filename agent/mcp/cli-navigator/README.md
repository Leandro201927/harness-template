# CLI Navigator

## Instalación:

### 1. Enlazarlo localmente con npm link
En lugar de publicar tu código en internet (npm registry), puedes crear un "acceso directo" en tu sistema operativo que apunte a tu repositorio local.

  1. Abre tu terminal y navega a `agent/mcp/cli-navigator`.
  2. Instala las dependencias del MCP: `npm install `
  3. Ejecuta el comando de enlace: `npm link `
   
(A partir de este momento, puedes escribir `mcp-cli-navigator` en cualquier terminal de tu computadora y el código se ejecutará, reflejando al instante cualquier cambio que hagas en el archivo index.js sin necesidad de reinstalar).


### 2. Simplificar la configuración en Trae IDE
Ahora que tu MCP es un comando del sistema, tu configuración en .trae/mcp.json se vuelve limpia, portable y estándar:

```json
{
  "mcpServers": {
    "CLI Navigator": {
      "command": "mcp-cli-navigator",
      "args": [],
      "env": {
        "PATH": "/Users/${USER_NAME}/.nvm/versions/node/v22.23.1/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

### 3. Asignar permiso de ejecución a node-pty

#### 1. MacOS Silicon
Si estás en MacOS, posiblemente saldrá el error ´posix_spawnp failed´ al ejecutar el MCP en 'start_cli_session'. Para que el MCP funcione, es necesario asignar permiso de ejecución `+x` al comando `node-pty`. En tu terminal, ejecuta:
 
```bash
cd agent/mcp/cli-navigator/node_modules/node-pty
chmod +x prebuilds/darwin-arm64/spawn-helper # MacOS Silicon es darwin-arm64
ls -la prebuilds/darwin-arm64 # spawn-helper debería tener permisos de ejecución -rwxr-xr-x
```

### 4. Probar el MCP

Se puede probar manualmente el MCP ejecutando:

`npx @modelcontextprotocol/inspector mcp-cli-navigator`

Esto abrirá una ventana de navegador en tu sistema operativo y mostrará la interfaz de usuario del MCP.

Aquí tienes una batería de pruebas para el inspector, pensada para verificar cada método por separado y también el fix del PATH/cwd. Sigue el orden — cada bloque depende del `sessionId` que te devuelva el anterior.

#### 1. `start_cli_session` — caso no interactivo (verifica el fix del PATH)

```json
{
  "command": "npm",
  "args": ["--version"],
  "cwd": "/tmp"
}
```
**Esperado:** `exited: true`, `exitCode: 0`, `output` con el número de versión. Si esto falla con `posix_spawnp failed`, el fix del PATH no está aplicado o no reiniciaste el servidor MCP.

#### 2. `start_cli_session` — verifica creación automática de `cwd`

```json
{
  "command": "npm",
  "args": ["--version"],
  "cwd": "/tmp/bootstrap-test-nonexistent"
}
```
**Esperado:** funciona igual que el caso 1 aunque la carpeta no exista aún (la crea `mkdirSync` antes de spawnear). Verifica después con `ls /tmp/bootstrap-test-nonexistent` en tu terminal que sí se creó.

#### 3. `start_cli_session` — comando fuera de la allowlist (verifica el guard de seguridad)

```json
{
  "command": "rm",
  "args": ["-rf", "/"],
  "cwd": "/tmp"
}
```
**Esperado:** error inmediato tipo `Comando no permitido: "rm"...`, sin llegar a `pty.spawn`. Si esto se ejecuta, tu allowlist no está activa — revisa que `ALLOWED_COMMANDS.has(command)` corra antes del spawn.

#### 4. `start_cli_session` — caso interactivo real (el importante)

```json
{
  "command": "npm",
  "args": ["create", "vite@latest", "test-app"],
  "cwd": "/tmp/bootstrap-vite-test"
}
```
**Esperado:** `exited: false`, y en `output` debería verse el primer prompt (típicamente "Package name:" o similar). Guarda el `sessionId` que te devuelve — lo usas en los siguientes pasos.

#### 5. `send_key` — texto literal (responder el nombre del proyecto)

```json
{
  "sessionId": "<pega aquí el sessionId del paso 4>",
  "keys": "test-app"
}
```
**Esperado:** el `output` nuevo muestra el texto escrito en pantalla (eco del input).

#### 6. `send_key` — tecla nombrada `enter` (confirmar)

```json
{
  "sessionId": "<mismo sessionId>",
  "keys": "enter"
}
```
**Esperado:** avanza al siguiente prompt (p. ej. selección de framework con flechas).

#### 7. `send_key` — navegación con flechas + combo

```json
{
  "sessionId": "<mismo sessionId>",
  "keys": "down+down+enter"
}
```
**Esperado:** en el `output` se ve el cursor/resaltado moverse dos opciones abajo y confirmar. Sirve para probar tanto teclas combinadas como que el ANSI-strip no te esté comiendo la señal de qué opción está resaltada (revisa que en el texto puedas distinguir cuál quedó seleccionada).

#### 8. `read_output` — polling sin enviar tecla (simula instalación larga)

```json
{
  "sessionId": "<mismo sessionId>",
  "maxWaitMs": 15000
}
```
**Esperado:** si el scaffold ya terminó de generar archivos y el proceso salió solo, verás `exited: true`. Si sigue interactivo, verás el siguiente prompt sin que se haya enviado ninguna tecla — útil para diferenciar "está pensando" de "está esperando input".

#### 9. `close_session` — liberar recursos

```json
{
  "sessionId": "<mismo sessionId>"
}
```
**Esperado:** `{ "sessionId": "...", "closed": true }`. Corre esto siempre al final, incluso si el proceso ya salió solo (limpia la entrada del `Map` de sesiones).

#### 10. `send_key` sobre sesión ya cerrada (verifica manejo de error)

Repite el mismo `sessionId` del paso 9 en un `send_key`:
```json
{
  "sessionId": "<sessionId ya cerrado>",
  "keys": "enter"
}
```
**Esperado:** error controlado tipo `Sesión desconocida o ya cerrada: ...`, no un crash del servidor.

---

Orden sugerido para correr todo: **1 → 2 → 3 → (borra `/tmp/bootstrap-vite-test` si ya existe) → 4 → 5 → 6 → 7 → 8 (repite hasta `exited:true`) → 9 → 10**. Si el paso 4 en adelante falla justo donde antes fallaba (`posix_spawnp`), es señal de que Trae/el inspector sigue apuntando a una instancia vieja del proceso — cierra el inspector, mata cualquier proceso `mcp-cli-navigator` colgado (`pkill -f mcp-cli-navigator`), y vuelve a lanzarlo para que tome el `index.js` parcheado.