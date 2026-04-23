# Sweet Café QA Agent 🍰

Tests automatizados con **Playwright** para validar el sistema **Sweet Café (Odoo 19)** y sus módulos personalizados, incluyendo la localización cubana de RRHH (`l10n_cu_*`).

## 📦 Estructura

```
qa-agent/
├── playwright.config.ts        # Configuración de proyectos (odoo-backend, odoo-website)
├── tests/
│   ├── setup/
│   │   └── global-setup.ts     # Login automático y cacheo de sesión
│   ├── auth/                   # Tests de autenticación
│   ├── sweet_cafe/             # Tests funcionales del backend Odoo
│   │   ├── branches.spec.ts
│   │   ├── ecommerce.spec.ts
│   │   ├── ecommerce-reservation.spec.ts
│   │   ├── hr.spec.ts                   # RRHH base
│   │   ├── hr-employee-flow.spec.ts     # ⭐ Flujo exhaustivo de empleado (Cuba)
│   │   ├── inventory.spec.ts
│   │   ├── payroll.spec.ts
│   │   ├── pos.spec.ts
│   │   ├── products.spec.ts
│   │   └── reservations.spec.ts
│   └── api/                    # Tests de endpoints
└── src/
    └── pages/                  # Page Objects reutilizables
```

## 🚀 Instalación

```powershell
cd qa-agent
npm install
npx playwright install chromium
```

Crear `.env` a partir de `.env.example` y ajustar:

```env
ODOO_URL=http://localhost:8069
ODOO_DB=prueba
ODOO_ADMIN_EMAIL=admin
ODOO_ADMIN_PASSWORD=tu_password
HEADLESS=true
```

## ▶️ Ejecución

### Todos los tests del backend Odoo

```powershell
npx playwright test --project=odoo-backend
```

### Solo flujo de empleado (RRHH Cuba)

```powershell
npx playwright test tests/sweet_cafe/hr.spec.ts tests/sweet_cafe/hr-employee-flow.spec.ts --project=odoo-backend
```

### Atajos definidos en `package.json`

```powershell
npm run test:hr             # tests RRHH
npm run test:payroll        # tests nómina
npm run test:pos            # tests POS
npm run test:branches       # tests sucursales
npm run test:products       # tests productos
npm run test:ecommerce      # tests web pública
npm run report              # abrir reporte HTML
```

## 🧪 Tests del Flujo de Empleado (`hr-employee-flow.spec.ts`)

Validan los fixes recientes del módulo `l10n_cu_hr`:

| #   | Test                                  | Verifica                                                              |
| --- | ------------------------------------- | --------------------------------------------------------------------- |
| 1   | Formulario carga correctamente        | Campos `name`, `last_name`, `second_last_name`, `work_email` visibles |
| 2   | Botón "Crear usuario" visible         | El CTA está renderizado en la cabecera                                |
| 3   | Pestaña "Others" oculta               | La pestaña de afiliación política NO aparece                          |
| 4   | `political_affiliation` no visible    | El campo está oculto en el form                                       |
| 5   | `private_phone` oculto                | No hay duplicado de teléfono privado                                  |
| 6   | Solo work/mobile en cabecera          | `work_phone` y `mobile_phone` visibles únicamente                     |
| 7   | "Código Empleado" en pestaña Trabajo  | Campo `number` movido fuera de la cabecera                            |
| 8   | `number` no en cabecera               | Verifica que no aparece junto al ícono de móvil                       |
| 9   | `occupational_category_id` disponible | El campo existe en el DOM                                             |
| 10  | Validación código no bloquea          | `@onchange` devuelve `warning`, no `ValidationError`                  |
| 11  | Crear empleado completo OK            | Flujo end-to-end de creación sin errores                              |
| 12  | Sin duplicados de `mobile_phone`      | Solo 1 instancia visible en cabecera                                  |
| 13  | Sin duplicados de `work_phone`        | Máximo 2 (cabecera + posible pestaña)                                 |
| 14  | Lista de empleados sin errores        | El fix de `payroll.movement` no rompe la vista                        |
| 15  | Vista de movimientos accesible        | El módulo de nómina sigue funcionando                                 |

## 📊 Reporte

Los tests generan automáticamente:

- **HTML interactivo**: `reports/playwright-report/index.html`
- **JSON**: `reports/test-results.json`
- **Screenshots/videos**: `test-results/` (solo en fallos)

Abrir el reporte:

```powershell
npm run report
```

## 🔧 Solución de problemas

### Login falla con "Element is not visible"

El database manager se muestra cuando hay múltiples DBs. El `global-setup.ts` ya fuerza la DB con `?db=prueba` en la URL y desbloquea el formulario oculto vía JS.

### Tests intermitentes

- Aumentar `actionTimeout` y `navigationTimeout` en `playwright.config.ts`
- Ejecutar con `HEADLESS=false` para depurar visualmente
- Usar `--debug` para inspector paso a paso

```powershell
npx playwright test tests/sweet_cafe/hr-employee-flow.spec.ts --debug
```

### Ver traza de un fallo

```powershell
npx playwright show-trace test-results/<carpeta-del-fallo>/trace.zip
```

## 🎯 Estado actual

Última ejecución: **26/26 tests pasando** (`hr.spec.ts` + `hr-employee-flow.spec.ts`).

Cubre los siguientes fixes:

- Pestaña "Others" / afiliación política oculta
- `private_phone` duplicado oculto
- "Código Empleado" reubicado a pestaña Trabajo
- `occupational_category_id` visible (sin `required` bloqueante)
- Validaciones `@onchange` cambiadas a `warning` no bloqueante
- Guardia en `payroll.movement` cuando no hay `employee_id`

## 📚 Referencias

- [Playwright docs](https://playwright.dev/)
- [Odoo 19 Web Client](https://www.odoo.com/documentation/19.0/developer.html)
- Módulos cubanos: `l10n_cu_hr`, `l10n_cu_hr_contract`, `l10n_cu_hr_payroll`, `l10n_cu_hr_payroll_movement`

# CTRL QA Agent 🔍

Sistema de QA automatizado para la plataforma CTRL, integrado con **VS Code + Playwright Test Extension**.

## ✨ Características

- **🎯 Integración VS Code**: Ejecuta tests directamente desde el panel Testing de VS Code
- **🔍 Tests Completos**: Cubre autenticación, dashboard, typing test, call simulation, SJT
- **👨‍💼 Admin Tests**: Tests para el panel de administración
- **🔌 API Tests**: Validación de endpoints del backend
- **📱 Responsive**: Tests en desktop y mobile
- **📊 Reportes**: HTML interactivo con screenshots y videos

## 🚀 Instalación para VS Code

### 1. Instalar la extensión de Playwright

En VS Code, instala la extensión oficial:

- **Nombre**: Playwright Test for VS Code
- **ID**: `ms-playwright.playwright`
- O busca "Playwright" en el marketplace de extensiones

### 2. Instalar dependencias

```bash
cd qa-agent
npm install
npx playwright install
```

### 3. Configurar credenciales

Crea el archivo `.env` en la carpeta `qa-agent`:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:

```env
# URLs del sistema CTRL
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:1337

# Credenciales de candidato para pruebas
TEST_CANDIDATE_EMAIL=tu_candidato@test.com
TEST_CANDIDATE_PASSWORD=password123

# Credenciales de admin para pruebas
TEST_ADMIN_EMAIL=admin@ctrl.com
TEST_ADMIN_PASSWORD=adminpassword

# (Opcional) Para análisis con IA
OPENAI_API_KEY=sk-...
```

## 🎮 Uso en VS Code

### Panel de Testing

1. Abre VS Code en la carpeta `qa-agent`
2. Click en el ícono de **Testing** en la barra lateral (tubo de ensayo)
3. Verás todos los tests organizados por carpeta:
   ```
   📁 tests
   ├── 📁 admin
   │   └── 🧪 admin-panel.spec.ts
   ├── 📁 api
   │   └── 🧪 api-endpoints.spec.ts
   ├── 📁 assessment
   │   ├── 🧪 call-simulation.spec.ts
   │   ├── 🧪 situational-judgement.spec.ts
   │   └── 🧪 typing-test.spec.ts
   ├── 📁 auth
   │   └── 🧪 login.spec.ts
   └── 📁 dashboard
       └── 🧪 candidate-dashboard.spec.ts
   ```

### Ejecutar Tests

- **▶️ Ejecutar todos**: Click en "Run Tests" en la parte superior
- **▶️ Ejecutar un archivo**: Click en el ícono ▶️ junto al archivo
- **▶️ Ejecutar un test**: Click en el ícono ▶️ junto al test específico
- **🐛 Debug**: Click derecho → "Debug Test" para usar breakpoints

### Ver Resultados

- ✅ Verde = Test pasó
- ❌ Rojo = Test falló (click para ver detalles)
- ⏭️ Amarillo = Test saltado

### Modo Watch

1. Click en el ícono de "ojo" en el panel Testing
2. Los tests se re-ejecutan automáticamente al guardar cambios

## 📁 Estructura de Tests

```
qa-agent/
├── tests/
│   ├── auth/
│   │   └── login.spec.ts           # Tests de autenticación
│   ├── dashboard/
│   │   └── candidate-dashboard.spec.ts  # Dashboard del candidato
│   ├── assessment/
│   │   ├── typing-test.spec.ts     # Módulo de typing test
│   │   ├── call-simulation.spec.ts # Simulación de llamadas
│   │   └── situational-judgement.spec.ts  # SJT
│   ├── admin/
│   │   └── admin-panel.spec.ts     # Panel administrativo
│   └── api/
│       └── api-endpoints.spec.ts   # Tests de API
├── playwright.config.ts            # Configuración de Playwright
├── .env                            # Variables de entorno
└── reports/                        # Reportes generados
```

## 🧪 Tests Incluidos

### 🔐 Authentication (11 tests)

- Login page carga correctamente
- Validación de credenciales
- Login como candidato
- Login como admin
- Logout funciona

### 📊 Dashboard (12 tests)

- Dashboard carga correctamente
- Navegación a módulos
- Indicadores de progreso
- Responsive en mobile

### ⌨️ Typing Test (14 tests)

- Página carga correctamente
- Modo práctica funciona
- Input acepta texto
- Métricas (WPM, accuracy)
- Resultados se muestran

### 📞 Call Simulation (12 tests)

- Reproducción de audio
- Controles funcionan
- Grabación de respuesta
- Navegación entre llamadas

### 🎯 Situational Judgement (13 tests)

- Preguntas se muestran
- Selección de opciones
- Respuestas de texto
- Progreso visible
- Resultados finales

### 👨‍💼 Admin Panel (14 tests)

- Dashboard de admin
- Gestión de candidatos
- Gestión de empresas
- Gestión de preguntas
- Control de acceso

### 🔌 API (15 tests)

- Health endpoints
- Autenticación
- CRUD de resultados
- Manejo de errores

## ⚙️ Comandos de Terminal

Aunque VS Code es la forma principal de ejecutar tests, también puedes usar la terminal:

```bash
# Ejecutar todos los tests
npx playwright test

# Ejecutar tests específicos
npx playwright test tests/auth/
npx playwright test tests/assessment/typing-test.spec.ts

# Ejecutar en un browser específico
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=mobile-chrome

# Ejecutar con UI de Playwright
npx playwright test --ui

# Ver último reporte HTML
npx playwright show-report reports/playwright-report

# Ejecutar en modo headed (ver navegador)
npx playwright test --headed

# Debug con inspector
npx playwright test --debug
```

## 📊 Ver Reportes

Después de ejecutar tests, puedes ver el reporte HTML:

```bash
npx playwright show-report reports/playwright-report
```

El reporte incluye:

- Lista de tests con estado
- Screenshots de fallos
- Videos de ejecución
- Trazas para debugging

## 🔧 Personalización

### Agregar Nuevos Tests

1. Crea un archivo `.spec.ts` en la carpeta apropiada
2. Usa la estructura:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Mi Módulo", () => {
  test("Test específico", async ({ page }) => {
    await page.goto("/mi-pagina");
    await expect(page.locator("h1")).toBeVisible();
  });
});
```

3. El test aparecerá automáticamente en VS Code

### Configurar Browsers

Edita `playwright.config.ts` para cambiar los browsers:

```typescript
projects: [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  // Agrega o quita según necesites
];
```

## 🐛 Troubleshooting

### Tests no aparecen en VS Code

1. Asegúrate de tener la extensión Playwright instalada
2. Abre VS Code en la carpeta `qa-agent` (no en la raíz del proyecto)
3. Refresca el panel de Testing

### Error "Browser not found"

```bash
npx playwright install
```

### Tests fallan por timeout

Aumenta el timeout en `playwright.config.ts`:

```typescript
timeout: 90000, // 90 segundos
```

### Variables de entorno no se cargan

Asegúrate de que el archivo `.env` existe en `qa-agent/`

## 📝 License

MIT © CTRL Platform

- ✅ Typing Test (práctica + 3 tests)
- ✅ Call Simulation (3 llamadas)
- ✅ Situational Judgement Test
- ✅ Dashboard y resultados

### Admin

- ✅ Login de administrador
- ✅ Dashboard administrativo
- ✅ Gestión de candidatos
- ✅ Gestión de empresas
- ✅ Gestión de preguntas
- ✅ Textos de tipeo
- ✅ Audios de llamada
- ✅ Analíticas y reportes

## Estructura del Reporte

```
reports/
├── qa-report.html     # Reporte visual interactivo
├── qa-report.json     # Datos exportados
├── qa-report.md       # Markdown para docs
├── screenshots/       # Capturas de errores
└── videos/           # Videos de tests fallidos
```

## Health Score

El sistema calcula un puntaje de salud basado en:

- Tasa de éxito de tests
- Severidad de errores
- Cobertura de flujos críticos

| Score   | Estado               |
| ------- | -------------------- |
| 80-100% | 🟢 Excelente         |
| 50-79%  | 🟡 Necesita atención |
| 0-49%   | 🔴 Crítico           |

## Integración CI/CD

### GitHub Actions

```yaml
name: QA Tests

on: [push, pull_request]

jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: |
          cd qa-agent
          npm ci
          npx playwright install --with-deps

      - name: Run QA Pipeline
        run: npm run qa
        env:
          FRONTEND_URL: ${{ secrets.FRONTEND_URL }}
          BACKEND_URL: ${{ secrets.BACKEND_URL }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: qa-report
          path: qa-agent/reports/
```

## Módulos

### ProjectDiscovery

Analiza la estructura del proyecto CTRL detectando:

- Rutas y páginas de Next.js
- Endpoints de API
- Componentes
- Configuración de autenticación

### TestGenerator

Genera tests de Playwright basados en:

- Flujos de negocio definidos
- Estructura descubierta
- Patrones de interacción

### TestExecutor

Ejecuta tests con:

- Múltiples navegadores
- Screenshots en fallos
- Videos de ejecución
- Recolección de métricas

### ErrorAnalyzer

Analiza errores usando IA:

- Identifica causa raíz
- Sugiere soluciones
- Prioriza por impacto
- Detecta patrones comunes

### ReportGenerator

Genera reportes en múltiples formatos:

- HTML interactivo
- JSON para integración
- Markdown para documentación

## Troubleshooting

### Error: Playwright no encuentra navegadores

```bash
npx playwright install --with-deps
```

### Error: OPENAI_API_KEY no configurada

El sistema funciona sin IA pero con análisis básico.

### Tests timeout

Aumenta el timeout en `playwright.config.ts`:

```typescript
timeout: 60000, // 60 segundos
```

## License

MIT © CTRL Platform

---

**Desarrollado para la plataforma CTRL** - Sistema de evaluación de candidatos
