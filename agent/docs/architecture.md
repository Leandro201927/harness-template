# Architecture (Source of Truth Conceptual)

> **Ubicación oficial:** Este archivo en `/agent/docs/architecture.md` es
> la versión detallada y fuente principal sobre arquitectura.
> La copia espejo `/docs/ARCHITECTURE.md` existe para cumplir con el
> contrato de `check-architecture.sh`. Si modificas este, actualiza aquella.
>
> **Referenciado por:** AGENTS.md Fases 0 y 1.3 (lectura obligatoria antes
> de escribir código).

---

## 1. Principios Arquitectónicos del Harness

Este harness-template se construye sobre 5 principios que NO deben romperse
al adaptarlo a un proyecto concreto:

### P1. Separación Estricta: "Cómo trabajamos" vs "Qué construimos"

Todo lo que vive en `/agent/` describe **cómo trabajamos**: flujos, reglas,
verificaciones, estado de sesiones.

Todo lo que vive FUERA de `/agent/` (excepto los archivos de contrato como
`AGENTS.md`, `evaluator-rubric.md`, `project.config.js`, `app.js`, y `/docs/`)
describe **qué construimos**: el producto real.

Esta separación permite:
- Reusar el harness (`/agent/`) en múltiples proyectos sin modificarlo
- Borrar o reemplazar TODO el código de producto y que el harness siga funcional
- Que un LLM entienda "dónde están las reglas" sin confundirse con código de dominio

### P2. Single Source of Truth Operativo

El directorio `/agent/` es el ÚNICO lugar donde el agente (humano o LLM)
debe mirar para saber:
- Qué hay que hacer (`/agent/state/feature_list.json`)
- En qué estado quedó (`/agent/state/progress.md`)
- Cómo hacerlo (`AGENTS.md` + este docs/ + `/agent/quality-document.md`)
- Cómo verificar que lo hizo bien (`/agent/verification/*.sh`)

### P3. Estado Duradero = Archivos en el Repo

Ningún estado crítico debe vivir solo en la memoria de chat del LLM.
Si una sesión termina y el chat se cierra, la información para retomar
debe estar en archivos:

- Estado global → `/agent/state/progress.md`
- Estado por feature → `/agent/state/feature_list.json` + `/agent/state/features/F-*.md`
- Decisiones y contexto → `/agent/state/features/F-*.md`
- Resúmenes ejecutivos → `/agent/state/session-handoff.md` + `/agent/lifecycle/session-handoff.md`

### P4. Verificación Ejecutable > Documentación

Las reglas más importantes (presencia de archivos, esquema de feature_list.json,
relación project.config.js ↔ app.js) NO están solo escritas aquí: están
CODIFICADAS como scripts en `/agent/verification/*.sh`.

Eso significa que:
- Si cambias una boundary (ej: cambias el path de feature_list.json),
  DEBES actualizar el script correspondiente al mismo tiempo.
- Ninguna regla "arquitectónica" es real a menos que un script la valide.

### P5. Human in the Loop por Diseño (v0.1)

Esta primera versión NO hace commits automáticos sin control humano.
El punto de parada natural es el "estado listo para revisión humana"
(AGENTS.md Fase 3). El commit es responsabilidad humana, o del agente
solo cuando el estado es safe y la evidencia está completa.

---

## 2. Mapa Completo de Archivos y Propósito

(Lee esto solo si necesitas contexto profundo; para el flujo operativo usa AGENTS.md.)

### 2.1 Nivel Raíz (Contrato del Harness)

| Archivo | ¿Pertenece al harness o al producto? | Propósito | ¿Quién lo escribe? |
|---------|--------------------------------------|-----------|---------------------|
| `AGENTS.md` | Harness | Guía operativa completa, flujo de 4 fases | Raramente: solo si cambia el flujo |
| `evaluator-rubric.md` | Harness | Rúbrica de 100 puntos para evaluar trabajo | Raramente: solo si cambian criterios |
| `project.config.js` | Producto | Identidad de producto (nombre, metas, constraints) | Usuario al adaptar template |
| `app.js` | Producto (placeholder) | Entrypoint que consume la config | Se reemplaza por stack real |
| `docs/ARCHITECTURE.md` | Harness (contrato) | Espejo de agent/docs/architecture.md | Sincronizar con versión detallada |
| `docs/PRODUCT.md` | Harness (contrato) | Espejo de agent/docs/product.md | Sincronizar con versión detallada |
| `docs/RELIABILITY.md` | Harness (contrato) | Espejo de agent/docs/reliability.md | Sincronizar con versión detallada |

### 2.2 Nivel `/agent/`

#### `/agent/docs/` (Conceptual: por qué el harness es como es)

- `architecture.md` (este): principios, boundaries, mapa de archivos
- `product.md`: qué producto específico se está construyendo sobre el harness
- `reliability.md`: standard paths, reglas de confiabilidad, clean handoff

#### `/agent/verification/` (Ejecutable: lo que valida el contrato)

- `init.sh`: orquesta todo el baseline (no editar sin muy buena razón)
- `check-architecture.sh`: presencia de archivos, esquema JSON, relación config↔app
- `e2e-check.sh`: smoke test del proyecto real (empieza vacío, lo llena el usuario)

#### `/agent/state/` (Mutables: lo que cambia sesión a sesión)

- `progress.md`: Current Verified State + log lineal de sesiones
- `feature_list.json`: Source of truth de features (estado, prioridad, evidencia)
- `features/`: Un `F-<id>.md` por feature → decisiones, aproximaciones descartadas, log
- `session-handoff.md`: Resumen ejecutivo corto para el próximo agente (requerido por check-architecture.sh)

#### `/agent/lifecycle/` (Opcional: resúmenes detallados de sesión)

- `session-handoff.md`: Versión extendida / histórica del handoff

#### Resto de `/agent/`

- `quality-document.md`: Definition of Done, criterios de calidad, arquitectura por capas
- `clean-state-checklist.md`: Checklist de 8 secciones para validar safe state pre-commit

---

## 3. Boundaries Arquitectónicas que NUNCA se Deben Romper

Estas son boundaries FUERTES. Si realmente necesitas romperlas, abre primero
un issue/documenta por qué, y actualiza AGENTS.md + scripts de verificación
ANTES de tocar el código.

### B1. No codees lógica de producto DENTRO de `/agent/`

`/agent/` es meta (es el código sobre cómo gestionar el proyecto).
No pongas un endpoint REST, un componente React, un modelo de datos, etc.
dentro de `/agent/`. Eso vive fuera.

### B2. No crees features por fuera de `feature_list.json`

Ningún trabajo de implementación debe empezar sin una entrada correspondiente
en `/agent/state/feature_list.json` con:
- `id` único
- `priority` definida
- `user_visible_behavior` concreto
- `verification` (array de pasos ejecutables por un humano)

Si una idea aparece en el chat: primero se registra en feature_list.json,
luego se implementa.

### B3. No pases a "passing" sin `evidence` concreta

El status `passing` significa: "yo u otra persona podemos re-ejecutar
estos comandos hoy y obtener el mismo resultado". Para eso necesitas:

- Qué comandos se corrieron (texto literal)
- Timestamp aproximado
- Output clave o resultado (resumen)

Sin evidence, status = `not_started`, `in_progress` o `blocked`. Nunca passing.

### B4. No hagas commits que rompan `check-architecture.sh`

`check-architecture.sh` valida la estructura mínima del harness. Si te
encuentras que para una feature necesitas borrar un archivo requerido
o cambiar la estructura de feature_list.json, entonces NO es una feature
de producto: es un CAMBIO AL HARNESS, y debe tratarse como tal
(cambiar AGENTS.md, docs, y scripts al mismo tiempo, como bloque único).

---

## 4. Evolución Arquitectónica Esperada (Template → Proyecto Real)

Cuando este template se convierta en un proyecto con stack real,
se espera la siguiente progresión. El harness NO te impone nada de esto,
solo te sugiere un camino coherente:

### Fase A: Stack Frontend Básico

- Crea `src/` con tu framework: `src/components/`, `src/pages/`, `src/lib/`
- `project.config.js` → migra a `src/config.ts` tipado si usas TypeScript
- Actualiza `app.js` para que sea un shim que cargue el bundle de `src/`
- Agrega build: Vite, Webpack, Turbopack
- Actualiza `agent/verification/init.sh`: `npm install && npm run build && npm test`
- Actualiza `agent/verification/e2e-check.sh`: Playwright/Cypress apuntando a build

### Fase B: Añadir Backend

- Crea `server/` o `backend/`: Express/FastAPI/Spring/etc.
- Agrega `shared/` o `contracts/` para tipos compartidos entre front y back (si fullstack)
- Añade BBDD: esquema en `db/schema.sql` o migraciones en `prisma/`
- Agrega feature `infra-001` en feature_list.json: "Backend inicial arranca y responde health check"
- Actualiza `check-architecture.sh` si quieres validar nuevos paths requeridos

### Fase C: Mobile / Multiplataforma

- Crea `mobile/`: Flutter, React Native, Swift, Kotlin
- Agrega feature `mobile-001`: "Mobile app renderiza la identidad de producto"
- Sincroniza `project.config.js` para que sea consumible también desde el mobile
  (ej: JSON compartido, o script que exporta variables nativas)

### Fase D: Madurez Operativa

- CI/CD: GitHub Actions que corren `init.sh` + tests en cada PR
- Feature flags: sistema que lea de config, y actualiza quality-document.md
- Monitoreo: reglas de confiabilidad extendidas en `reliability.md`

---

## 5. Cómo Proponer Cambios al Propio Harness

El harness también puede evolucionar. Si tienes una idea para mejorar
AGENTS.md, los scripts, o la estructura de archivos:

1. Abre una entrada en `feature_list.json` con `area: "harness"`
   (ej: `harness-001: "Añadir pre-commit hook que corra check-architecture.sh"`)
2. Implementa el cambio siguiendo el flujo normal
3. Asegúrate de que el cambio sea compatible hacia atrás (o documenta la migración)
4. Actualiza `/agent/docs/architecture.md` y su espejo `/docs/ARCHITECTURE.md`
5. Marca como passing solo si TODO el flujo sigue funcionando con un proyecto de ejemplo
