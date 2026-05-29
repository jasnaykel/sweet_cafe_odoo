# @grill-with-docs

Pre-implementation grilling session. Aligns agent with existing domain model before any code is written.
Inspired by Matt Pocock's skill — adapted for Odoo 19 + Sweet Café project.

## When to invoke

Before starting any non-trivial task: new model, new feature, refactor, integration.

## Workflow

1. **Read CONTEXT.md**: Load the shared language. Use exact terms — no paraphrasing.
2. **Read ARCHITECTURE.md**: Identify which modules are involved.
3. **Ask clarifying questions** (at least 5) covering:
   - What is the exact input and expected output?
   - Which Odoo models are involved?
   - Are there Cuban localization constraints? (check `CONTEXT.md` for NIT, MLC, IS Progresivo, etc.)
   - What is the success criterion?
   - What could go wrong?
4. **Challenge the plan**: Point out risks, edge cases, or missing constraints.
5. **Update CONTEXT.md** if a new term or concept is introduced.
6. **Create ADR** in `docs/adr/` if a non-trivial design decision is made.
7. **Only then**: proceed to `@brainstorming` or implementation.

## Output

- Updated `CONTEXT.md` (if applicable)
- New ADR file (if applicable)
- A written summary of the agreed plan before implementation begins
