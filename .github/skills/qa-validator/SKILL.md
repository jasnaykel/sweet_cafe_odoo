# @qa-validator

Skill for validating UI and end-to-end flows using the `qa-agent` Playwright suite.

## Rules

1. **Test Before Release**: Any UI change in `sweet_cafe_ecommerce` or `sweet_cafe_configurator` must be validated with an existing or new Playwright test.
2. **Consult QA Manifest**: Read `qa-agent/package.json` and `qa-agent/playwright.config.ts` to understand the test environment.
3. **Reproduce First**: If a bug is reported in UI, write a Playwright test in `qa-agent/tests/` to reproduce it before fixing.

## Workflow

1. Locate relevant tests in `qa-agent/src/` or `qa-agent/tests/`.
2. Run tests using `npm test` or a terminal command within the `qa-agent` directory.
3. Verify pass/fail via the `playwright-report`.
