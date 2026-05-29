# @odoo-module-scaffold

Create a new Odoo 19 module with the correct structure and mandatory files.

## When to invoke

When creating a new custom module from scratch.

## Required files checklist

```
<module_name>/
  __init__.py
  __manifest__.py
  models/
    __init__.py
    <model>.py
  views/
    <model>_views.xml
    <model>_menus.xml
  security/
    ir.model.access.csv
  data/           (optional: demo/seed data)
  tests/
    __init__.py
    test_<model>.py
  static/
    description/
      icon.png
```

## __manifest__.py mandatory fields

```python
{
    'name': '',
    'version': '19.0.1.0.0',
    'category': '',
    'summary': '',
    'depends': ['base'],
    'data': [
        'security/ir.model.access.csv',
        'views/<model>_views.xml',
    ],
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}
```

## Rules

1. Version format: `19.0.<major>.<minor>.<patch>`
2. Always include `ir.model.access.csv` — never skip security.
3. Use `_logger = logging.getLogger(__name__)` in every model file.
4. Check `ARCHITECTURE.md` before adding a dependency to avoid circular deps.
