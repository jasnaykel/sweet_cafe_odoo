# @diagnose

Disciplined diagnosis loop for hard bugs and performance regressions.
Adapted from Matt Pocock's skill — enforces a strict reproduce-before-fix contract.

> Source: https://github.com/mattpocock/skills/blob/main/skills/engineering/diagnose/SKILL.md

## When to invoke

Use instead of `@systematic-debugging` when:
- The bug is hard to reproduce consistently
- You've tried once and failed to fix it
- It's a performance regression, not just a crash
- The stack trace points to Odoo internals

## The loop (never skip a step)

```
1. REPRODUCE   → Write the minimal steps to trigger the bug. If you can't reproduce it, stop.
2. MINIMISE    → Strip out everything not needed to trigger it. Smallest possible case.
3. HYPOTHESISE → State ONE specific hypothesis. Write it down explicitly.
4. INSTRUMENT  → Add _logger.debug() or a test assertion to verify the hypothesis.
5. FIX         → Apply the minimal surgical change. One change at a time.
6. REGRESSION  → Write a test that would have caught this. Add to module's tests/.
```

## Rules

1. **Never skip step 1**: If you can't reproduce it, you are guessing. Stop.
2. **One hypothesis at a time**: Write it in plain language before instrumenting.
3. **Minimal fix**: The diff should be as small as possible. No refactoring during a bugfix.
4. **Always end with a regression test**: A fixed bug without a test will return.

## Odoo 19 specifics

- Check `odoo-19.0/` before assuming the bug is in local code
- Use `_logger = logging.getLogger(__name__)` — never `print()`
- For performance regressions: check N+1 queries with `odoo.tools.sql.log_queries()`
- For UI bugs: reproduce first with a Playwright test in `qa-agent/tests/` before touching Python

## Output at each step

State explicitly:
- **Step 1**: "I can reproduce it by: ..."
- **Step 3**: "My hypothesis is: ..."
- **Step 5**: "The fix is: ... because ..."
- **Step 6**: "The regression test is in: ..."
