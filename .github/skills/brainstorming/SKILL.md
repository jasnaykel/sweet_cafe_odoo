# @brainstorming

Systematic planning skill. Use BEFORE writing any code. Prevents misalignment between intent and implementation.

## When to invoke

- Starting a new feature or module
- Uncertain about the best approach
- Need to break down a complex task

## Workflow

1. **Define the goal**: What is the expected output? Who consumes it?
2. **Map the domain**: Check `CONTEXT.md` for existing terminology. Do not invent new terms.
3. **Consult architecture**: Read `ARCHITECTURE.md` to identify affected modules and dependencies.
4. **List constraints**: Odoo version, Cuban localization rules, security requirements.
5. **Generate 3 approaches**: Briefly describe each. Evaluate trade-offs.
6. **Choose and document**: Pick the best approach. If non-trivial, write an ADR in `docs/adr/`.
7. **Create spec**: Write a `.spec.md` in `docs/specs/` before touching any code.

## Output

A written plan with: chosen approach, files to be modified, success criteria, and risks.
