# harness-template — Boilerplate para Cualquier Proyecto Técnico

> Este template proporciona un **harness operativo** predefinido para trabajar
> en proyectos de software con un flujo disciplinado, compatible con agentes
> LLM y humanos por igual.
>
> La regla fundamental del repo: **todo el conocimiento operativo vive
> en archivos del directorio `/agent/`, no en memoria de chat.**

---

## 🚀 Punto de Entrada ÚNICO: Lee `AGENTS.md`

Cualquier persona (humano o LLM) que abra este repositorio por primera vez
debe empezar por el mismo sitio:

👉 **[AGENTS.md](file:///Users/leandro/Documents/projects/harness-template/AGENTS.md)** 👈

Ese archivo define el flujo operativo completo en 4 fases:

1. **Fase 1 — Baseline:** context retrieval + smoke check, asegurar repo sano
2. **Fase 2 — Implementation:** una y solo una feature por vez, con tests y re-verificación de baseline
3. **Fase 3 — Human in the Loop + Commit:** safe state checklist + rúbrica de evaluación antes de commit
4. **Fase 4 — Handoff / End of Session:** actualizar estado para que el próximo agente retome sin preguntas

---

## 🧱 Qué Trae Incluido Este Template

El harness vive principalmente en `/agent/` y cubre:

### Source of Truth Operativo

| Ruta | ¿Qué es? |
|------|----------|
| `AGENTS.md` | Guía operativa completa, flujo de 4 fases |
| `agent/state/feature_list.json` | Source of truth de features (prioridad, estado, verificación, evidencia) |
| `agent/state/progress.md` | Estado verificado actual + log lineal de sesiones |
| `agent/state/features/F-*.md` | Un archivo por feature → decisiones, aproximaciones descartadas, log |
| `agent/state/session-handoff.md` | Resumen ejecutivo corto para el próximo agente (requerido por contrato) |

### Guías / Reglas

| Ruta | ¿Qué es? |
|------|----------|
| `agent/docs/architecture.md` | Principios, boundaries, mapa de archivos, evolución esperada (source of truth conceptual) |
| `agent/docs/product.md` | Definición de producto placeholder + plantilla para tu producto real |
| `agent/docs/reliability.md` | Standard paths, 6 reglas de confiabilidad, clean handoff checklist |
| `agent/quality-document.md` | Definition of Done universal + calidad por dominio + calidad por capa + reglas de test |
| `agent/clean-state-checklist.md` | 8 secciones pre-commit para validar safe state |
| `evaluator-rubric.md` | Rúbrica de 100 puntos (5 secciones) para evaluar trabajo realizado |

### Scripts de Verificación (NUNCA se modifican junto a features de producto)

| Ruta | ¿Qué hace? |
|------|------------|
| `agent/verification/init.sh` | Orquesta smoke + architecture + e2e (punto de entrada recomendado) |
| `agent/verification/check-architecture.sh` | Valida presencia de archivos requeridos, esquema de feature_list.json, relación project.config.js ↔ app.js |
| `agent/verification/e2e-check.sh` | Smoke tests del proyecto real (vacío en el template; lo rellenas tú con tu stack) |

### Docs Espejo (Contrato del Script)

El script `check-architecture.sh` requiere también docs en `/docs/` mayúsculas:
- `docs/ARCHITECTURE.md` — espejo de `agent/docs/architecture.md`
- `docs/PRODUCT.md` — espejo de `agent/docs/product.md`
- `docs/RELIABILITY.md` — espejo de `agent/docs/reliability.md`

Si modificas unos, sincroniza los otros.

### Placeholders de Proyecto Real (tu código empieza aquí)

| Ruta | ¿Qué es? |
|------|----------|
| `project.config.js` | Identidad de producto (nombre, tagline, metas, constraints). Edita este archivo primero. |
| `app.js` | Entrypoint placeholder que consume `window.PROJECT_CONFIG`. Luego lo reemplazas por tu stack real (React, Express, etc.) |

---

## 🛠️ Uso Rápido (3 Pasos Para Adaptar Este Template a Tu Proyecto)

1. **Edita `project.config.js`**: reemplaza `projectName`, `projectTagline`, `targetUsers`, `primaryGoal`, `initialBacklog`, `constraints` por TU producto.
2. **Define tus features reales**: abre `agent/state/feature_list.json`, convierte la plantilla `feature-001` en tu primera feature real con `user_visible_behavior` y `verification` concretos, añade las features que necesites.
3. **Sigue `AGENTS.md` al pie de la letra**: empieza en Fase 1.1 (pwd), lee progress.md + feature_list.json, corre `check-architecture.sh`, pasa a Fase 2 si todo es verde, implementa 1 feature, pasa Fase 3 (checklist + rúbrica), cierra con Fase 4.

---

## 📝 Nota Sobre Paths Conocidos en Scripts de Verificación

Los scripts de verificación NO se modifican según las instrucciones iniciales.
Por eso existen 2 riesgos documentados de wiring en esta versión v0.1 del template:

1. `agent/verification/init.sh` referencia `bash scripts/smoke-check.sh` pero el directorio `scripts/` no existe aún en este template. Si `init.sh` falla por esto, ejecuta `check-architecture.sh` y `e2e-check.sh` individualmente.
2. `agent/verification/check-architecture.sh` usa `Path("feature_list.json")` (asumiéndolo en raíz) cuando realmente vive en `agent/state/feature_list.json`.

Si posteriormente autorizas a modificar los scripts de verificación, estas son las primeras líneas a ajustar.

---

## 🤖 Para LLMs y Agentes que Abren Este Repo

> TL;DR para ti, agente:
> 1. `pwd`
> 2. Abre `AGENTS.md` y síguelo EXACTAMENTE paso a paso.
> 3. `/agent/` es tu único source of truth.
> 4. Los scripts de `/agent/verification/*.sh` son la ley. Si fallan, arréglalos antes de escribir features.
> 5. Al terminar, cierra correctamente la sesión con Fase 4 de AGENTS.md
>    para que el próximo no tenga que preguntarte nada.

¡Happy hacking con disciplina! 🏗️
