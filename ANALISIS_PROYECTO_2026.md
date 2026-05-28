# 📊 ANÁLISIS TÉCNICO COMPLETO — Sweet Café Odoo 19

**Fecha:** 2026-05-28 | **Metodología:** Spec-Driven Development + Security Audit + Code Review

---

## 1. RESUMEN EJECUTIVO

El proyecto **Sweet Café** es un sistema Odoo 19 de alta complejidad orientado a la gestión integral de pastelerías cubanas con cumplimiento fiscal ONAT. Aunque funcionalmente está muy bien cubierto (localización, e-commerce, configurador IA, RRHH), se identificaron **4 problemas críticos de seguridad y flujo** corregidos en esta sesión, más **8 mejoras de alto impacto** para las próximas iteraciones.

### Scorecard

| Área                          |   Estado Previo    | Estado Actual  | Tendencia |
| ----------------------------- | :----------------: | :------------: | :-------: |
| Seguridad (IDOR configurador) |   ❌ Vulnerable    |  ✅ Corregido  |    ⬆️     |
| Flujo de Reservas             | ⚠️ Sin validación  |  ✅ Validado   |    ⬆️     |
| Playwright / Reportes         | ⚠️ Config dispersa | ✅ Rutas fijas |    ⬆️     |
| TypeScript (tsconfig)         |    ⚠️ Obsoleto     |  ✅ NodeNext   |    ⬆️     |
| Tests de Seguridad            |    ❌ Ausentes     |   ✅ Creados   |    ⬆️     |
| Tests Unitarios Backend       |       ❌ 0%        |     ❌ 0%      |     →     |
| CI/CD Pipeline                |     ❌ Ausente     |   ❌ Ausente   |     →     |
| Linting Odoo                  |     ❌ Ausente     |   ❌ Ausente   |     →     |

---

## 2. PROBLEMAS CORREGIDOS (Esta Sesión)

### 2.1 🔴 CRÍTICO: Vulnerabilidad IDOR en Configurador de Diseños

**Archivo:** `sweet_cafe_configurator/controllers/configurator.py`  
**Archivo:** `sweet_cafe_configurator/security/ir.model.access.csv`

**Problema:** Los endpoints `POST /configurador/generar-imagen` y `/configurador/guardar-diseno` usaban `sudo()` sin verificar propiedad del diseño. Cualquier usuario podía modificar el diseño de otro pasando un `design_id` ajeno.

**Acceso CSV vulnerable (antes):**

```csv
access_product_design_public,...,,1,1,1,0  # perm_write=1 para TODOS (sin grupo)
```

**Corrección aplicada:**

1. Quitado `perm_write=1` del acceso público en `ir.model.access.csv`.
2. Añadido acceso `portal` con write/create.
3. Creado `security/product_design_rules.xml` con 3 record rules: usuarios ven/editan solo sus diseños, admins lo ven todo.
4. Añadida validación de propiedad en el controlador con logging de intentos de acceso no autorizado.

**Archivos modificados:**

- `sweet_cafe_configurator/security/ir.model.access.csv`
- `sweet_cafe_configurator/security/product_design_rules.xml` _(NUEVO)_
- `sweet_cafe_configurator/controllers/configurator.py`
- `sweet_cafe_configurator/__manifest__.py`

---

### 2.2 🔴 CRÍTICO: Flujo de Reservas Sin Validación de Seña/Depósito

**Archivo:** `sweet_cafe_management/models/sweet_reservation.py`

**Problema:** `action_confirm()` no validaba:

- Que la reserva tenga al menos un producto.
- Que si se registró un monto de depósito (`deposit_amount > 0`), este haya sido cobrado (`deposit_paid = True`).

Esto generaba órdenes de venta fantasmas y riesgo de pérdida económica.

**Corrección aplicada:** Añadidos dos `ValidationError` al inicio del flujo de confirmación antes de crear la `sale.order`.

---

### 2.3 🟠 ALTA: Playwright — Rutas de Reportes Inconsistentes

**Archivo:** `qa-agent/playwright.config.ts`

**Problema:** El reporte HTML nativo de Playwright no tenía ruta absoluta configurada. Cuando se ejecutaba `npx playwright test` desde directorios distintos, los reportes se generaban en ubicaciones imprevisibles.

**Corrección aplicada:**

- Rutas de `outputDir`, `outputFile` y `outputFolder` ahora usan `path.resolve(__dirname, ...)` con import de `path` y `fileURLToPath` para ESM.
- `trace` cambiado de `"on-first-retry"` a `"retain-on-failure"` para obtener trazas completas en fallos.
- `playwright-report/` ahora en la raíz del `qa-agent/` (consistente).
- Script `npm run report` apunta al directorio correcto.

---

### 2.4 🟡 MEDIA: TypeScript `moduleResolution: "node"` Obsoleto

**Archivo:** `qa-agent/tsconfig.json`

**Problema:** `module: "ESNext"` + `moduleResolution: "node"` es una combinación obsoleta y genera warnings en TypeScript 5.x cuando se usa `"type": "module"` en `package.json`.

**Corrección aplicada:** Cambiado a `module: "NodeNext"` + `moduleResolution: "NodeNext"`.

---

### 2.5 Tests de Seguridad del Configurador (NUEVO)

**Archivo:** `qa-agent/tests/sweet_cafe/configurator-security.spec.ts`

Creado nuevo spec con 4 suites de seguridad que cubren:

- Acceso público a la página del configurador
- Intentos IDOR con `design_id` ajeno
- Validación de entradas inválidas (`product_id: 0`, `product_id: 999999`)
- Solo lectura pública de opciones de diseño

---

## 3. PROBLEMAS PENDIENTES (Backlog Priorizado)

### P1 — 🔴 CRÍTICO: Cero Tests Unitarios en Módulos Python

**Módulos afectados:** Todos (11 módulos Odoo)

No existe ningún archivo `tests/test_*.py` en ningún módulo. Esto significa que la lógica fiscal (cálculo de tramos IS progresivo, IUFT, CSS, declaraciones ONAT) no tiene cobertura automatizada.

**Riesgo:** Un cambio mínimo en `sweet_declaracion_anual.py` puede romper el cálculo fiscal sin que nadie lo detecte hasta producción.

**Acción recomendada:**

```
Prioridad: sweet_cafe_management/tests/test_sweet_onat.py
         sweet_cafe_management/tests/test_sweet_reservation.py
         sweet_cafe_configurator/tests/test_product_design.py
```

---

### P2 — 🔴 CRÍTICO: Sin CI/CD Pipeline

No existe ningún `.github/workflows/*.yml`. Todo el QA es manual.

**Acción recomendada:** Crear `.github/workflows/qa.yml` que:

1. Instale dependencias Python + Node.js
2. Levante Docker Compose (`docker-compose.yml`)
3. Ejecute `cd qa-agent && npm test`
4. Publique el reporte Playwright como artefacto

---

### P3 — 🟠 ALTA: Validación de Stock Negativo en Carrito E-commerce

**Archivo:** `sweet_cafe_ecommerce/controllers/main.py`

El método que añade al carrito no verifica `qty_available > 0`. Se pueden vender productos con stock cero o negativo.

**Fix sugerido:**

```python
product = request.env['product.product'].browse(product_id)
if product.qty_available < add_qty:
    return {'error': _('Stock insuficiente para este producto.')}
```

---

### P4 — 🟠 ALTA: Campos Estáticos que Deberían Ser Computed en `l10n_cu_hr`

**Archivo:** `l10n_cu_hr/models/hr_employee.py`

Los campos `res_private_municipality_id` y `municipality_of_birth_id` son Many2one independientes. Deberían tener un `domain` dinámico o ser `computed` dependiendo de la provincia seleccionada, para evitar inconsistencias (municipio de una provincia diferente a la elegida).

---

### P5 — 🟠 ALTA: Complejidad Cognitiva Elevada

**Archivos:** `configurator.py` (>30), `sweet_reservation.py` (>22)

El método `generate_ai_image()` debería extraerse en:

- `_call_stability_api()`
- `_call_leonardo_api()`
- `_call_openai_api()`
- `_build_fallback_image()`

---

### P6 — 🟡 MEDIA: Logs de Auditoría Fiscal Insuficientes

Los métodos de cálculo de ONAT no loguean con `_logger.info()` cuándo se calcula, quién lo solicita y qué resultado se obtiene. En entornos de auditoría tributaria esto puede ser problemático.

**Acción:** Añadir logging a `_compute_is_progressive()` y `action_calcular()` en `sweet_declaracion_anual.py`.

---

### P7 — 🟡 MEDIA: Sin Linting Odoo Configurado

No existe `.pylintrc`, `pyproject.toml` (Black/isort) ni `.pre-commit-config.yaml` en la raíz del proyecto.

**Acción sugerida:**

```bash
# Instalar pylint-odoo
pip install pylint-odoo
# Crear .pylintrc
[MASTER]
load-plugins=pylint_odoo
[FORMAT]
max-line-length = 88
```

---

### P8 — 🟡 MEDIA: `rrhh_5p` Sin Versión 19.0 Explícita

El módulo `rrhh_5p` no tiene una versión `19.0.x.x.x` clara en su manifest. Esto puede generar confusión en entornos multi-versión.

---

## 4. ARQUITECTURA MÓDULOS (Estado Actual)

```
odoo-19.0/ (código base — fuente de verdad)
│
├── sweet_cafe_management/     ← Core de negocio
│   ├── models/
│   │   ├── sweet_reservation.py      ✅ Flujo corregido
│   │   ├── sweet_onat_report.py      ✅ IS Progresivo
│   │   ├── sweet_declaracion_anual.py ✅ DJ Anual
│   │   └── sweet_libro_igi.py        ✅ Libro IGI
│   ├── tests/                        ❌ VACÍO
│   └── security/
│
├── sweet_cafe_ecommerce/      ← Tienda online
│   ├── controllers/main.py           ⚠️ Stock sin validar (P3)
│   └── tests/                        ❌ VACÍO
│
├── sweet_cafe_configurator/   ← Configurador IA + Fabric.js
│   ├── controllers/configurator.py   ✅ IDOR corregido
│   ├── security/
│   │   ├── ir.model.access.csv       ✅ Corregido
│   │   └── product_design_rules.xml  ✅ NUEVO
│   └── tests/                        ❌ VACÍO
│
├── l10n_cu_*/                 ← Localización cubana
│   └── (sin RR-HH duplicado) ✅
│
├── qa-agent/                  ← Playwright QA
│   ├── playwright.config.ts          ✅ Rutas fijas
│   ├── tsconfig.json                 ✅ NodeNext
│   └── tests/sweet_cafe/
│       └── configurator-security.spec.ts ✅ NUEVO
│
└── .github/
    ├── copilot-instructions.md       ✅ Estándares SDD
    └── skills/
        ├── debug-consultant/SKILL.md ✅
        └── qa-validator/SKILL.md     ✅
```

---

## 5. HALLAZGO DE SEGURIDAD CRÍTICO — CREDENCIAL EN .ENV

⚠️ **El archivo `qa-agent/.env` contiene una contraseña de administrador Odoo en texto plano.**

El `.gitignore` SÍ excluye `qa-agent/.env`, por lo que no debería estar en el repositorio Git. Sin embargo, se recomienda:

1. **Rotar la contraseña** de `ODOO_ADMIN_PASSWORD` si este ordenador es compartido.
2. Verificar que `.env` no fue incluido en algún commit anterior con `git log --all -- qa-agent/.env`.
3. En CI/CD, usar **GitHub Secrets** en lugar de un `.env` físico.

---

## 6. RECOMENDACIONES SENIOR (Hoja de Ruta)

### Sprint 1 (Inmediato — Esta Semana)

- [x] Corregir IDOR en configurador
- [x] Validar depósito en reservas
- [x] Fix Playwright reportes
- [ ] Validar stock en carrito e-commerce
- [ ] Rotar contraseña de .env

### Sprint 2 (Próximas 2 Semanas)

- [ ] Primer test unitario: `test_sweet_onat.py`
- [ ] Logs de auditoría en módulo ONAT
- [ ] `.pylintrc` + `pre-commit` configurado

### Sprint 3 (Mes 1)

- [ ] CI/CD con GitHub Actions
- [ ] Extraer métodos AI en configurador (Complejidad Cognitiva)
- [ ] Computed fields para municipios en `l10n_cu_hr`

### Sprint 4 (Mes 2)

- [ ] Cobertura de tests unitarios ≥ 60% en módulos críticos
- [ ] ADR para cada proveedor de IA
- [ ] Documentación `docs/specs/` para cada feature nuevo

---

## 7. COMANDOS ÚTILES

```bash
# Ejecutar suite completa QA
cd qa-agent && npm test

# Ver reporte HTML nativo Playwright
cd qa-agent && npm run report

# Ver reporte custom acumulativo
cd qa-agent && open reports/index.html

# Solo tests de seguridad del configurador
cd qa-agent && npx playwright test tests/sweet_cafe/configurator-security.spec.ts

# Solo tests de backend
cd qa-agent && npm run test:backend

# Correr Odoo en Docker
docker-compose up -d
```

---

_Documento generado por: GitHub Copilot (Claude Sonnet 4.6) — 2026-05-28_  
_Metodología: Spec-Driven Development + Antigravity Skills + Karpathy Surgical Precision_
