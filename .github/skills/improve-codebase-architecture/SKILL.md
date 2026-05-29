# @improve-codebase-architecture

Finds deepening opportunities in the codebase — simplification, better abstraction, reduced coupling.
Adapted from Matt Pocock's skill.

> Source: https://github.com/mattpocock/skills/blob/main/skills/engineering/improve-codebase-architecture/SKILL.md

## When to invoke

- Once a week as a health check
- After a sprint with many fast changes
- When the codebase feels "heavy" to navigate
- Before starting a major new feature

## What the agent analyzes

### 1. Coupling violations
- Models that import from other custom modules directly (should go through ORM relations)
- Controllers with business logic (should call model methods)
- Views/QWeb that compute values (should use computed fields)

### 2. Depth opportunities (John Ousterhout)
- Methods longer than 30 lines → extract helper
- Classes with more than 10 public methods → consider splitting
- Repeated patterns across modules → candidate for a shared mixin

### 3. Domain language drift (CONTEXT.md)
- Variable/method names that don't use terms from `CONTEXT.md`
- Inconsistent naming across modules (e.g., `sucursal` in one place, `branch` in another)

### 4. Dead code
- Models with no `ir.model.access.csv` entry (never accessible)
- Views registered but never linked to a menu or action
- Methods with no callers (use `codegraph callers <symbol>`)

## Workflow

1. Run `codegraph status` to confirm index is fresh
2. Read `CONTEXT.md` and `ARCHITECTURE.md` to establish baseline
3. Run `codegraph files` to see the module structure
4. For each finding, create an issue or ADR — do NOT fix inline during this pass
5. Prioritize: High (coupling violation) → Medium (naming drift) → Low (dead code)

## Output format

```markdown
## Architecture Review — <date>

### High Priority
- [ ] <file>: <issue> → <suggested fix>

### Medium Priority
- [ ] <file>: <issue> → <suggested fix>

### Low Priority
- [ ] <file>: <issue> → <suggested fix>

### Positives (what is working well)
- ...
```

## Rules

1. **Read-only pass**: this skill only identifies problems, never fixes them directly
2. **One fix per commit**: after this review, fix issues one by one with `@spec-driven-development`
3. **Consult `docs/adr/`**: don't flag decisions that were intentional (already have an ADR)
4. **Use Codegraph**: `codegraph impact <symbol>` before suggesting any refactor
