# @test-driven-development

Red-green-refactor loop for Odoo 19 Python modules. One vertical slice at a time.

## Rules

1. **Write the test first**: Define the expected behavior before writing implementation code.
2. **Red**: Confirm the test fails for the right reason.
3. **Green**: Write the minimal code to make it pass.
4. **Refactor**: Clean up without breaking the test.
5. **One slice at a time**: Do not implement multiple features before testing each.

## Workflow

1. Identify the behavior to test (from the spec in `docs/specs/`).
2. Create or update a test file in `<module>/tests/test_<feature>.py`.
3. Inherit from `odoo.tests.common.TransactionCase` or `SavepointCase`.
4. Run: `python odoo-bin -i <module> --test-enable --stop-after-init -d <db>`.
5. Confirm red (test fails).
6. Implement the minimum code.
7. Confirm green (test passes).
8. Refactor and re-run.

## Test structure template

```python
from odoo.tests.common import TransactionCase

class TestFeatureName(TransactionCase):
    def setUp(self):
        super().setUp()
        # setup test data

    def test_expected_behavior(self):
        # arrange
        # act
        # assert
        self.assertEqual(...)
```

## For UI changes

Use `@qa-validator` instead — it runs Playwright tests in `qa-agent/tests/`.
