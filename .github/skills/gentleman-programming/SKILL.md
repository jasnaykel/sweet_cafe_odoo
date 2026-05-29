# @gentleman-programming

Clean architecture and SDD workflow conventions from Gentleman-Programming.
Adapted for Odoo 19 + Sweet Café project.

## Core Principles

1. **Single Responsibility**: Each model, method, and class does ONE thing well.
2. **Dependency Inversion**: Depend on abstractions (Odoo interfaces/mixins), not concretions.
3. **Separation of Concerns**: Business logic in `models/`, presentation in `views/`, routing in `controllers/`.
4. **No God Objects**: If a model has more than 10 methods, consider splitting it.
5. **Explicit over Implicit**: Prefer clear naming and explicit parameters over magic.

## Code Quality Rules

- Max function length: **30 lines** (Odoo methods). If longer, extract helper methods.
- Max file length: **300 lines**. If longer, split the model.
- No nested ternaries.
- No inline comments explaining WHAT the code does — only WHY (if non-obvious).
- Use descriptive names: `compute_total_with_tax()` not `calc()`.

## Odoo-Specific Conventions

- Computed fields: always set `compute=`, `store=True/False`, and `depends=[]` explicitly.
- Onchange methods: never perform database writes — only update field values in memory.
- Business logic: goes in model methods, not in views or controllers.
- Controllers: thin — validate input, call model method, return response. No business logic here.

## SDD Phase Boundaries (Delegation Triggers)

Stop and re-plan when:
- Reading 4+ files to understand a flow → use `@brainstorming` first
- Touching 2+ non-trivial files → ensure spec in `docs/specs/` exists
- Adding a new Odoo model → run `@odoo-module-scaffold` first
- Modifying controllers → run `@security-auditor` before committing

## Architecture Layers (Sweet Café)

```
Views/Controllers (UI)
      ↓
  Models (Business Logic)
      ↓
  Odoo ORM / Base Models
      ↓
  PostgreSQL
```

Never skip layers. Controllers do not call `env.cr.execute()` directly.
