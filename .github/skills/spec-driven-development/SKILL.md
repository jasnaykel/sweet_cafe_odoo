# @spec-driven-development

Full SDD lifecycle for Sweet Café. Enforces specification before implementation.

## Lifecycle (mandatory order)

### 1. SPECIFICATION
- Create `docs/specs/<feature-name>.spec.md`
- Define:
  - **Input**: what data enters the feature
  - **Output**: what the feature produces
  - **Success criteria**: measurable, testable conditions
  - **Out of scope**: what this feature does NOT do

### 2. PLANNING
- List every file to be modified and why
- Identify Odoo base classes to inherit (search `odoo-19.0/`)
- Estimate risk: Low / Medium / High
- If High: write an ADR in `docs/adr/` first

### 3. IMPLEMENTATION
- Small, surgical changes (Karpathy-style: minimal diff)
- One commit per logical unit
- No speculative abstractions

### 4. TESTING
- Python changes: test in `<module>/tests/`
- UI changes: Playwright test in `qa-agent/tests/`
- Run tests before marking the task done

## Spec template

```markdown
# Spec: <Feature Name>

## Input
...

## Output
...

## Success Criteria
- [ ] ...
- [ ] ...

## Out of Scope
...

## Risks
...
```
