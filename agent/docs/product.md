# Product (Source of Truth Conceptual)

> **Ubicación oficial:** Este archivo en `/agent/docs/product.md` es la
> versión detallada sobre QUÉ producto se construye sobre el harness.
> La copia espejo `/docs/PRODUCT.md` existe para cumplir con el contrato
> de `check-architecture.sh`. Sincroniza ambos si haces cambios.
>
> **Referenciado por:** AGENTS.md Fases 0 y 1.3; también debes actualizarlo
> cada vez que una feature cambie el comportamiento visible al usuario.

---

## 1. Distinción Importante: Harness vs Producto Real

ANTES de definir producto, hay que separar claramente dos capas:

| Capa | ¿Qué es? | Dónde vive |
|------|---------:|-----------:|
| **Harness** | El sistema de trabajo: flujos, reglas, verificación, estado | `/agent/` + `AGENTS.md` + `evaluator-rubric.md` + `/docs/` |
| **Producto** | Lo que el usuario final consume | Todo lo demás: `project.config.js`, `app.js`, `src/`, `backend/`, `mobile/`, etc. |

Este harness-template viene con un **Producto Placeholder** en `project.config.js`.
TU MISIÓN al usar este template es REEMPLAZAR ese placeholder por el
producto real que TU quieras construir (frontend, backend, mobile, fullstack).

El resto de este documento tiene DOBLE PROPÓSITO:

1. Explicar el Producto Placeholder (para validar que el harness funciona).
2. Darte una plantilla para que la rellenes con TU producto real.

---

## 2. El Producto Placeholder del Template

El Producto Placeholder existe ÚNICAMENTE para que los scripts de verificación
puedan pasar en un template vacío. No tiene valor comercial ni de usuario real.

### 2.1 Feature foundation-000 (Harness Baseline Passing)

Esta es la única feature marcada como `passing` en el template, y es obligatoria
por `check-architecture.sh`.

| Atributo | Valor |
|----------|-------|
| ID | foundation-000 |
| Priority | 0 (virtual: siempre está hecha) |
| Area | harness |
| User visible behavior | Al ejecutar `bash ./agent/verification/init.sh`, el template reporta éxito y todos los archivos del harness están presentes y válidos. |
| Verification steps | 1. Ejecutar `bash ./agent/verification/check-architecture.sh`. 2. Confirmar exit code = 0. 3. Abrir `agent/state/feature_list.json` y confirmar que `foundation-000` tiene `status: "passing"`. 4. Confirmar que `project.config.js` define `window.PROJECT_CONFIG` y `app.js` lo consume. |
| Evidence | La propia existencia de este template como se entrega. |

### 2.2 Configurable Project Shell (Feature Shell Inicial)

Ejemplo de primera feature visible (luego reemplázala por la tuya):

**Problema que resuelve:**
Cuando un equipo empieza un proyecto nuevo, suele pasar horas/días en
"configuración inicial" sin tener nada que mostrar. Este shell da
un primer paso concreto visible: nombre, tagline, propósito.

**Comportamiento visible (en el template):**
- Al abrir la página inicial (o ejecutar `node app.js` en Node.js), se
  muestra el `projectName` y `projectTagline` definidos en `project.config.js`.
- No hay backend, no hay persistencia, no hay autenticación.
- Cambiando `project.config.js`, cambia lo que se muestra, sin tocar `app.js`.

---

## 3. Plantilla para TU Producto Real

Rellena ESTA sección cuando adaptes el template a TU proyecto.
Borra todo el contenido de arriba desde "El Producto Placeholder"
cuando ya tengas claro lo que construyes.

### 3.1 Nombre del Producto

**Nombre:** [ej: TaskFlow, API de Pagos Latinoamérica, App de Recetas Veganas]

**Tagline (1 frase):** [ej: "Gestiona proyectos sin perder el hilo entre sesiones"]

### 3.2 Usuarios Objetivo

Descripción concreta de QUIÉN usará este producto. No escribas "todos".
Sé específico:

| Persona | Rol | Dolor principal que resolveremos |
|---------|-----|----------------------------------|
| Persona 1 | ej: Desarrollador freelance | Pierde horas cada lunes recordando en qué quedó cada proyecto cliente |
| Persona 2 | ej: PM de startup sin analista | No tiene forma sencilla de validar que las features pedidas realmente se implementaron |
| Persona 3 | ... | ... |

### 3.3 Propósito Único (Most Important Thing)

> ¿Qué es lo ÚNICO que este producto hace extraordinariamente bien,
> de forma que si lo quitamos, el producto no tiene razón de existir?

**Respuesta (1 o 2 frases máximo):**
[Ej: "Permite retomar un proyecto de software donde lo dejaste, sin depender de la memoria de nadie."]

### 3.4 Metas Iniciales (Primeras 3 Features Reales)

Ordenadas por prioridad (1 = máxima). Cada una DEBE tener una entrada
correspondiente en `/agent/state/feature_list.json`.

| Prioridad | ID sugerido | Título | Criterio de éxito observable |
|----------:|------------:|--------|-------------------------------|
| 1 | feature-001 | [ej: Config shell renderiza identidad de producto] | [ej: Al abrir el front se ve NOMBRE + TAGLINE sacados de config] |
| 2 | feature-002 | [ej: Primera interacción de usuario funcional] | [ej: Botón de "Crear tarea" crea un item en lista (en memoria)] |
| 3 | feature-003 | [ej: Persistencia inicial] | [ej: Al recargar la página, las tareas siguen ahí (localStorage)] |

### 3.5 No Objetivos (v1)

Cosas que EXPLÍCITAMENTE NO haremos en la primera versión:

- [ej: No multiusuario ni autenticación]
- [ej: No sync en la nube; solo almacenamiento local]
- [ej: No app nativa mobile; solo web responsive]
- [ej: No integración con terceros (Slack, Jira, etc.)]

Esto es TUYO. Mientras más claro sea el "no hacemos", más fácil será
mantener foco en las features de producto reales.

### 3.6 Restricciones No Funcionales Clave

Estas restricciones afectan decisiones de arquitectura. Anótalas aquí
y actualiza `/agent/docs/architecture.md` y `/agent/quality-document.md`
si son relevantes:

| Restricción | Valor | Impacto |
|------------:|------:|--------:|
| Presupuesto de host / ancho de banda | [ej: Gratuito la primera etapa] | Sin servidores propios; usar Vercel/Netlify/Supabase free tier |
| Compatibilidad browsers / SO | [ej: Últimas 2 versiones de Chrome/Firefox/Safari, iOS 16+, Android 12+] | No polyfills antiguos |
| Máximo bundle size JS inicial | [ej: < 200 KB gzipped] | Sin dependencias pesadas sin justificación |
| Idiomas | [ej: Español primero, luego inglés] | i18n como feature futura, no parte del core inicial |
| Offline | [ej: Soportar uso offline completo desde v1] | Service Workers / PWA como feature temprana |

### 3.7 Mapa Feature → Documentación

Regla de actualización sincronizada:
CUANDO una feature cambie el comportamiento visible al usuario o las
boundaries del sistema, DEBES actualizar:

| Tipo de cambio en feature | ¿Actualizar este doc? | ¿Actualizar architecture.md? | ¿Actualizar reliability.md? | ¿Actualizar quality-document.md? |
|---------------------------|----------------------:|------------------------------:|----------------------------:|----------------------------------:|
| Cambio de UI flujo visible | ✅ Sí | ⚠️ Solo si cambia boundaries | ❌ | ❌ |
| Nuevo dominio / nuevo módulo grande | ✅ Sí (sección 3.4) | ✅ Sí (boundaries nuevas) | ❌ | ✅ Sí (nueva fila en tabla de dominios) |
| Nuevo standard path (startup/test) | ❌ | ❌ | ✅ Sí (Standard Paths) | ❌ |
| Cambio de criterio de DoD | ❌ | ⚠️ Si es arquitectónico | ⚠️ Si afecta confiabilidad | ✅ Sí |
| Nuevo criterio de evaluación | ❌ | ❌ | ❌ | ✅ Sí |

---

## 4. Ejemplo de Sincronización Completa (para referencia)

Imagina que implementas la feature `feature-002: Primera interacción de usuario`:

1. Antes de implementar: asegúrate de que esté en feature_list.json con status `not_started` y `priority: 2`.
2. Marca a `in_progress`, crea `/agent/state/features/F-feature-002.md`.
3. Implementa siguiendo quality-document.md.
4. Pasa tests propios.
5. Re-verifica baseline (nada de foundation-000 se rompió).
6. **Ahora toca docs:**
   - Si la interacción cambia la sección 3.4 de este doc, actualízala.
   - Si introdujiste un módulo nuevo (ej: `src/tasks/`), revisa si toca boundaries en architecture.md.
   - Si añadiste un comando nuevo para probar (ej: `npm run test:tasks`), actualiza reliability.md (Standard Paths) opcionalmente.
7. Marca feature como passing con evidence.
8. Actualiza progress.md, pasa clean-state-checklist.md, evalúate con evaluator-rubric.md.
9. Listo para human review y commit.
