# @debug-consultant

Systematic debugging skill for Odoo developers. This skill enforces consulting the Odoo base code before attempting fixes.

## Rules

1. **Never Guess**: If an import fails or a method behavior is unclear, you MUST search in `odoo-19.0/`.
2. **Trace the Base**: If inheriting from a class (e.g., `models.Model`, `res.partner`), read the definition in `odoo-19.0/odoo/addons/base/models/`.
3. **Check Versions**: Ensure the code syntax matches Odoo 19 (Check `odoo-bin` requirements if needed).

## Workflow

1. Identify the failing symbol or module.
2. Run `grep_search` or `file_search` targeting the `odoo-19.0/` directory.
3. Compare your local implementation with the Odoo reference.
4. Correct the local code using the Odoo pattern.
