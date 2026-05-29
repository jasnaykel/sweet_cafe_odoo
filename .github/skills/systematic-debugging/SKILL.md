# @systematic-debugging

Disciplined debugging loop for Odoo 19. Never guess — trace, hypothesize, verify.

## Rules

1. **Read logs first**: Check Odoo server logs before touching code.
2. **Consult base code**: Search `odoo-19.0/` for the failing symbol before assuming a local bug.
3. **Reproduce in isolation**: Write a minimal test case or script that reproduces the error.
4. **One hypothesis at a time**: State the hypothesis, instrument the code, observe, conclude.
5. **Never guess imports**: Use `grep_search` in `odoo-19.0/` to find the correct import path.

## Workflow

1. Identify: exact error message, stack trace, affected model/method.
2. Search base: `grep_search` in `odoo-19.0/` for the class or method name.
3. Compare: local implementation vs Odoo 19 reference.
4. Hypothesize: form ONE specific hypothesis.
5. Instrument: add a `_logger.debug(...)` or a test assertion.
6. Fix: apply the minimal surgical change.
7. Regression test: run or write a test in the module's `tests/` folder.

## Anti-patterns (never do these)

- Do not add `try/except` to hide errors.
- Do not change multiple things at once.
- Do not assume Odoo 17 behavior applies to Odoo 19.
