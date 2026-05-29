# @skill-sync

**Meta-skill orquestador.** Cuando se invoca en un workspace nuevo, el agente:
1. Inspecciona el proyecto (stack, lenguaje, framework)
2. Consulta los repositorios upstream de referencia
3. Genera skills específicas para el proyecto
4. Instala las herramientas faltantes
5. Queda listo para actualizarse cuando los repos upstream cambien

---

## Upstream repositories (fuentes de verdad)

El agente SIEMPRE consulta estos repos antes de generar skills o instalar herramientas:

| Repo | Propósito | URL |
|---|---|---|
| **antigravity-awesome-skills** | 1,480+ skills universales: brainstorming, TDD, security, debugging, etc. | https://github.com/jasnaykel/antigravity-awesome-skills |
| **codegraph** | Knowledge graph local — fewer tokens, fewer tool calls | https://github.com/colbymchenry/codegraph |
| **gentle-ai** | SDD workflows, Engram memory, multi-agent orchestration | https://github.com/Gentleman-Programming/gentle-ai |
| **mattpocock/skills** | Engineering skills reales: grill-with-docs, tdd, diagnose, to-prd | https://github.com/mattpocock/skills |
| **spec-kit** | Spec-Driven Development templates y GitHub integration | https://github.com/github/spec-kit |
| **andrej-karpathy-skills** | Minimal surgical changes, simplicity-first coding philosophy | https://github.com/multica-ai/andrej-karpathy-skills |
| **LambdaTest/agent-skills** | 46 skills de testing: E2E, unit, BDD, visual, cloud | https://github.com/LambdaTest/agent-skills |
| **zebbern/claude-code-guide** | Security suite: ~60 skills de seguridad | https://github.com/zebbern/claude-code-guide |
| **anthropics/skills** | Manipulación de documentos PDF/DOCX/XLSX — útil para reportes de nómina | https://github.com/anthropics/claude-code-skills |
| **uxuiprinciples/agent-skills** | 168 principios UX/UI auditados — e-commerce y configuradores visuales | https://github.com/uxuiprinciples/agent-skills |

---

## Fase 1 — Inspección del proyecto (SIEMPRE primero)

Al invocar este skill en un workspace nuevo, el agente ejecuta esta inspección:

```
1. Leer el directorio raíz del workspace
2. Detectar: lenguaje principal, framework, estructura de carpetas
3. Verificar si existe: CONTEXT.md, ARCHITECTURE.md, docs/, .github/skills/
4. Verificar herramientas instaladas: node, codegraph, gentle-ai, git
5. Verificar si existe .codegraph/ (índice Codegraph)
```

### Detección de stack → skills a generar

| Si detecta... | Skills a generar obligatoriamente |
|---|---|
| Python / Odoo | `@debug-consultant`, `@odoo-module-scaffold`, `@systematic-debugging`, `@security-auditor` |
| TypeScript / React | `@frontend-design`, `@api-design-principles`, `@security-auditor` |
| Cualquier stack | `@brainstorming`, `@grill-with-docs`, `@spec-driven-development`, `@test-driven-development` |
| QA / Playwright presente | `@qa-validator` |
| Git presente | `@gentleman-programming`, `@workspace-bootstrap`, `@skill-sync` |

---

## Fase 2 — Instalación de herramientas

Para cada herramienta, verificar si existe antes de instalar:

### Node.js 22+
```powershell
node --version
# Si falta: descargar de https://nodejs.org
```

### Codegraph (knowledge graph)
```powershell
codegraph --version
# Si falta (Windows):
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npm i -g @colbymchenry/codegraph
# Si falta (Mac/Linux):
curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh

# Inicializar en el proyecto:
codegraph init
codegraph index
```

### Gentle-AI (SDD + memoria)
```powershell
gentle-ai --version
# Si falta (Windows):
irm get.scoop.sh | iex                          # instalar Scoop si no existe
$env:PATH += ";$env:USERPROFILE\scoop\shims"
scoop bucket add gentleman https://github.com/Gentleman-Programming/scoop-bucket
scoop install gentle-ai
# Si falta (Mac/Linux):
brew tap Gentleman-Programming/homebrew-tap
brew install gentle-ai
```

### Playwright (QA)
```powershell
# Solo si existe carpeta qa-agent/ o tests/ con archivos .spec.ts
cd qa-agent
npm install
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npx playwright install chromium
```

---

## Fase 3 — Generación automática de skills

### Reglas de generación

El agente genera cada skill como `.github/skills/<nombre>/SKILL.md` siguiendo este proceso:

1. **Consultar el upstream correspondiente**: fetch del SKILL.md del repo origen (si existe)
2. **Adaptar al contexto del proyecto**: reemplazar referencias genéricas con paths reales del workspace
3. **No duplicar**: si ya existe la skill, verificar si el upstream tiene cambios recientes y actualizar solo las secciones que cambiaron

### Estructura mínima de cada SKILL.md generada

```markdown
# @<nombre-skill>

> Adaptada de: <URL del repo upstream>
> Versión upstream: <fecha o tag>

## Propósito
...

## Reglas
...

## Workflow
...

## Contexto de este proyecto
...  ← sección específica del workspace actual
```

### Skills universales — siempre generar estas en cualquier proyecto

Obtener las últimas versiones desde antigravity-awesome-skills:

| Skill | Path en upstream |
|---|---|
| `@brainstorming` | `skills/brainstorming/SKILL.md` |
| `@test-driven-development` | `skills/test-driven-development/SKILL.md` |
| `@security-auditor` | `skills/security-auditor/SKILL.md` |
| `@systematic-debugging` | `skills/systematic-debugging/SKILL.md` |
| `@grill-with-docs` | Matt Pocock: `skills/engineering/grill-with-docs/SKILL.md` |
| `@tdd` | Matt Pocock: `skills/engineering/tdd/SKILL.md` |
| `@diagnose` | Matt Pocock: `skills/engineering/diagnose/SKILL.md` |
| `@zoom-out` | Matt Pocock: `skills/engineering/zoom-out/SKILL.md` |
| `@improve-codebase-architecture` | Matt Pocock: `skills/engineering/improve-codebase-architecture/SKILL.md` |
| `@to-prd` | Matt Pocock: `skills/engineering/to-prd/SKILL.md` |
| `@spec-driven-development` | spec-kit: adaptación del workflow SDD |
| `@gentleman-programming` | Adaptar principios de Gentle-AI al stack detectado |

---

## Fase 4 — Archivos de contexto requeridos

Si no existen, crear con estructura mínima:

### CONTEXT.md (si no existe)
```markdown
# Contexto del Proyecto

## Nombre del proyecto
<detectado del package.json, __manifest__.py o README>

## Stack
<detectado automáticamente>

## Glosario de términos
<!-- Agregar términos específicos del dominio aquí -->
```

### ARCHITECTURE.md (si no existe)
```markdown
# Architecture

## Module/Component Map
<!-- El agente mapea los directorios detectados aquí -->

## Dependency Rules
- No circular dependencies
- Business logic never in controllers/views
```

### docs/specs/ y docs/adr/ (si no existen)
```
docs/
  specs/.gitkeep
  adr/.gitkeep
```

---

## Fase 5 — Actualización desde upstream

Ejecutar cuando el usuario diga "actualiza skills" o "sync skills":

### Verificar versiones disponibles

```
1. Para antigravity-awesome-skills:
   - Consultar https://github.com/jasnaykel/antigravity-awesome-skills/releases
   - Comparar con la fecha de creación de las skills locales

2. Para mattpocock/skills:
   - Consultar https://github.com/mattpocock/skills/commits/main
   - Verificar si hay commits nuevos en skills/ después de la última sync

3. Para codegraph:
   - Ejecutar: codegraph --version
   - Comparar con https://github.com/colbymchenry/codegraph/releases/latest

4. Para gentle-ai (Windows):
   - Ejecutar: scoop update gentle-ai
```

### Actualizar skills modificadas

Para cada skill local que tenga cambios en upstream:
1. Leer el nuevo SKILL.md del repo upstream
2. Comparar con la versión local
3. Actualizar SOLO la sección estándar (Reglas, Workflow)
4. Preservar la sección `## Contexto de este proyecto` (es local)
5. Hacer commit: `chore: sync <skill-name> from upstream <fecha>`

---

## Checklist de ejecución completa

Al ejecutar `@skill-sync` en un workspace nuevo:

- [ ] Fase 1: Inspección del proyecto completada
- [ ] Fase 2: Todas las herramientas instaladas y verificadas
- [ ] Fase 3: Skills generadas en `.github/skills/`
- [ ] Fase 4: CONTEXT.md, ARCHITECTURE.md, docs/ existen
- [ ] Fase 5: Codegraph indexado (`codegraph status` muestra archivos)
- [ ] `.github/copilot-instructions.md` existe con tabla de skills
- [ ] Commit inicial: `chore: bootstrap workspace with @skill-sync`

---

## Invocación

```
# Nuevo workspace (todo desde cero):
usa @skill-sync para configurar este workspace nuevo

# Solo actualizar herramientas:
usa @skill-sync para actualizar las herramientas instaladas

# Solo sincronizar skills desde upstream:
usa @skill-sync para sincronizar skills con los repos upstream

# Verificar estado:
usa @skill-sync para verificar el estado del ecosistema AI
```
