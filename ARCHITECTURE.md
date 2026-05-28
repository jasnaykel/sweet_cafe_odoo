# Project Architecture - Sweet Café

## Module Dependency Graph

```mermaid
graph TD
    A[sweet_cafe_management] -->|Core| B[res.company]
    A -->|Fiscal| C[l10n_cu_address]
    A -->|Fiscal| D[l10n_cu_banks]

    E[sweet_cafe_ecommerce] -->|Depends| A

    F[sweet_cafe_configurator] -->|Depends| E
    F -->|Depends| A

    G[l10n_cu_hr_payroll] -->|Depends| H[l10n_cu_hr]
    H -->|Depends| A
```

## Layers

1. **Odoo Base Layer (`odoo-19.0/`)**: The Odoo framework itself.
2. **Fiscal Layer (`l10n_cu_*`)**: Modules handling Cuban specific laws, provinces, and payroll.
3. **Core Business Layer (`sweet_cafe_management`)**: Extension of Odoo models for bakery specific needs (branches, bakery inventory).
4. **Interactive Layer (`sweet_cafe_configurator`)**: Frontend heavy AI tool and Fabric.js editor.
5. **QA Layer (`qa-agent/`)**: Playwright test suite for cross-browser validation.

## Standards

- **Linter**: Follow Odoo standards (Pylint Odoo).
- **Frontend**: OWL (Odoo Web Library) for native Odoo UI, Fabric.js for the custom configurator.
- **Backend**: Python 3.10+ with type hints.
