# @zoom-out

Forces the agent to explain code in the context of the whole system before diving into implementation.
Adapted from Matt Pocock's skill.

> Source: https://github.com/mattpocock/skills/blob/main/skills/engineering/zoom-out/SKILL.md

## When to invoke

- Entering unfamiliar code in the project
- Before touching a module you haven't worked on in a while
- When the agent starts proposing changes without explaining how pieces connect
- When a bug spans multiple modules and the root cause is unclear

## What the agent must do

1. **Read `ARCHITECTURE.md`** — identify which layer the code lives in
2. **Read `CONTEXT.md`** — identify the domain terms involved
3. **Map the call chain**: from entry point (controller/view/cron) → model → ORM → DB
4. **Identify dependencies**: what other modules does this code call? what calls it?
5. **Summarize in plain language** before proposing any change:

```
"This code is part of [module]. It is called by [caller] when [trigger].
It depends on [dependencies]. The domain concept it implements is [term from CONTEXT.md].
The change requested will affect [scope]."
```

## Rules

1. **No implementation before zoom-out**: the agent must complete the summary first
2. **Use Codegraph for call traces**: `codegraph callers <symbol>` and `codegraph callees <symbol>`
3. **Identify blast radius**: use `codegraph impact <symbol>` to see what breaks if this changes
4. **Name things correctly**: use terms from `CONTEXT.md`, not generic words

## Odoo 19 specifics

- Entry points: HTTP controllers (`/controllers/`), scheduled actions (cron), wizard `action_*` methods
- Check `odoo-19.0/` to understand inherited behavior before assuming local behavior
- Use `codegraph trace <entry> <model_method>` to see the full call path

## Output format

```
## Zoom-out: <ClassName.method_name>

**Layer**: Model / Controller / View / Wizard
**Module**: <module_name>
**Called by**: <callers>
**Calls**: <callees>
**Domain concept**: <term from CONTEXT.md>
**Impact radius**: <what breaks if this changes>
**Summary**: <plain language explanation>
```
