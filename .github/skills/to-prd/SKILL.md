# @to-prd

Converts the current conversation into a Product Requirements Document (PRD) and saves it to `docs/specs/`.
Adapted from Matt Pocock's skill.

> Source: https://github.com/mattpocock/skills/blob/main/skills/engineering/to-prd/SKILL.md

## When to invoke

- After a `@grill-with-docs` or `@brainstorming` session
- When you have discussed a feature enough to know what to build
- Before starting implementation — the PRD becomes the spec for `@spec-driven-development`

## What the agent does

1. **Synthesizes the conversation**: reads back what was discussed and extracts the key decisions
2. **Writes the PRD** using the template below
3. **Saves to `docs/specs/<feature-name>.spec.md`**
4. **Does NOT start implementation** — the PRD is the output, not the code

## PRD template

```markdown
# PRD: <Feature Name>

> Created: <date>
> Status: Draft
> Author: jasnaykel

## Problem Statement
<What problem does this solve? For whom?>

## Proposed Solution
<High-level description of what will be built>

## Scope

### In scope
- ...

### Out of scope
- ...

## Technical Design

### Models affected
- `<module>.<ModelName>`: <what changes>

### Files to modify
- `<path/to/file.py>`: <why>

### New files
- `<path/to/new_file.py>`: <purpose>

## Success Criteria
- [ ] <measurable condition 1>
- [ ] <measurable condition 2>

## Risks
- <risk>: <mitigation>

## Test plan
- Python: `<module>/tests/test_<feature>.py`
- UI: `qa-agent/tests/sweet_cafe/<feature>.spec.ts` (if UI changes)
```

## Rules

1. **No implementation**: this skill ends when the PRD is saved. Use `@spec-driven-development` next.
2. **Odoo naming**: use terms from `CONTEXT.md` for models, fields, and modules
3. **One PRD per feature**: if the conversation covers multiple features, split into multiple PRDs
4. **ADR if needed**: if a non-trivial design decision was made, create `docs/adr/<decision>.md` too
5. **Commit the PRD**: `docs: add PRD for <feature-name>`
