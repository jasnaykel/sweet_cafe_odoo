# Sweet Café - Engineering Instructions & Standards

You are a Senior Odoo Developer and Software Architect. Follow these instructions strictly to ensure the project maintains world-class standards by integrating methodologies from Matt Pocock, Gentleman Programming, Codegraph, and Spec-Kit.

## 1. Core Mandate: Consult Base Code (odoo-19.0)

Whenever you encounter an error, a missing import, or need to understand how a native Odoo feature works:

- **Rule**: ALWAYS search and read files in `odoo-19.0/` before suggesting a fix or implementing a new feature that inherits from Odoo base.
- **Why**: `odoo-19.0/` contains the source of truth for the Odoo version this project uses.
- **Action**: Use `grep_search` or `file_search` scoped to `odoo-19.0/` to find reference implementations.

## 2. Spec-Driven Development (SDD)

Follow the lifecycle for EVERY change:

1. **SPECIFICATION**: Before coding, create or update a `.spec.md` in `docs/specs/` (or outline it here). Define input, output, and success criteria.
2. **PLANNING**: Create a technical plan. List files to be modified and why.
3. **IMPLEMENTATION**: Small, surgical changes (Karpathy-style).
4. **TESTING**: For every Python change, create/update a test in the module's `tests/` folder. For UI changes, update `qa-agent/`.

## 3. "Grill with Docs" (Matt Pocock Style)

- Maintain a `CONTEXT.md` in the root. If a term is ambiguous (e.g., "IS Progresivo", "NIT", "MLC"), check `CONTEXT.md` first.
- Use **ADRs** (Architecture Decision Records) in `docs/adr/` for any non-trivial design choice (e.g., "Choosing Stability AI for design generation").

## 4. Odoo 19 Technical Standards

- **Python**: Use Type Hints. Follow PEP 8 + Odoo Guidelines (2-space indent for XML, 4-space for Python).
- **Validations**: Use `@api.constrains` for data integrity.
- **Logging**: Use `_logger = logging.getLogger(__name__)`. Log critical failures and external API calls.
- **Security**: Always define `ir.model.access.csv` and appropriate `security/rules.xml`.

## 5. QA & Browser Automation (qa-agent)

- The folder `qa-agent/` contains Playwright tests.
- Before considering a UI feature "done", ensure its corresponding test in `qa-agent/tests/` passes.
- If a UI bug is found, reproduce it first with a Playwright script.

## 6. Dependency Graph (Codegraph Style)

- Consult `ARCHITECTURE.md` to understand the module hierarchy.
- Do not introduce circular dependencies.

## 7. Antigravity Awesome Skills Philosophy

- Use systematic `@brainstorming` for planning.
- Apply `@test-driven-development` mindset.
- Prioritize `@systematic-debugging` by analyzing logs and base code before guessing.

## 8. Available Skills Reference

All skills live in `.github/skills/<name>/SKILL.md`. Invoke them by mentioning `@<name>` in your request.

| Skill | When to use |
|---|---|
| `@brainstorming` | Before any implementation — plan, map domain, evaluate approaches |
| `@grill-with-docs` | Align with agent on complex tasks; reads `CONTEXT.md` + `ARCHITECTURE.md` first |
| `@spec-driven-development` | Full SDD lifecycle: spec → plan → implement → test |
| `@test-driven-development` | Red-green-refactor loop for Odoo 19 Python modules |
| `@systematic-debugging` | Disciplined debugging — trace logs, consult `odoo-19.0/`, hypothesize |
| `@debug-consultant` | Deep Odoo base code consultation before any fix |
| `@security-auditor` | OWASP Top 10 review before merging controllers or models |
| `@qa-validator` | Run/write Playwright tests in `qa-agent/` for UI validation |
| `@odoo-module-scaffold` | Create a new Odoo 19 module with correct structure and mandatory files |

### Recommended workflow per task type

- **New feature**: `@grill-with-docs` → `@brainstorming` → `@spec-driven-development` → `@test-driven-development`
- **Bug fix**: `@systematic-debugging` → `@debug-consultant` → `@test-driven-development`
- **New module**: `@brainstorming` → `@odoo-module-scaffold` → `@test-driven-development`
- **UI change**: `@brainstorming` → implement → `@qa-validator`
- **Security review**: `@security-auditor` on all changed files before merge
