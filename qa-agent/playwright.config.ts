/**
 * Sweet Café QA Agent — Playwright Configuration
 * ================================================
 * Tests backend + frontend del sistema Odoo 19.
 * Arquitectura: UN proyecto principal con auth admin por defecto.
 * Los tests [FE] usan test.use({ storageState: {cookies:[],origins:[]} })
 * para limpiar la sesión y probar páginas públicas.
 *
 * Correr suite completa:       npx playwright test
 * Solo backend:                npx playwright test --grep "\[BE\]|SEC-0"
 * Solo frontend:               npx playwright test --grep "\[FE\]|SEC-16"
 * Solo un módulo:              npx playwright test tests/sweet_cafe/employees.spec.ts
 *
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config();

export default defineConfig({
  testDir: "./tests",

  // Secuencial — Odoo necesita 1 worker para evitar conflictos de sesión
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  globalSetup: "./tests/setup/global-setup.ts",

  // Reportes: custom HTML acumulativo + HTML nativo Playwright + JSON para CI + consola
  reporter: [
    ["./src/reporters/sweet-cafe-reporter.ts"],
    [
      "json",
      { outputFile: path.resolve(__dirname, "reports/test-results.json") },
    ],
    [
      "html",
      {
        outputFolder: path.resolve(__dirname, "playwright-report"),
        open: "never",
        attachmentsBaseURL: "../test-results/",
      },
    ],
    ["list"],
  ],

  use: {
    baseURL: process.env.ODOO_URL || "http://localhost:8069",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: process.env.HEADLESS !== "false",
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  // Timeouts óptimos: 120s por test, 15s para expect
  timeout: 120000,
  expect: { timeout: 15000 },
  outputDir: path.resolve(__dirname, "test-results"),

  projects: [
    // ─── Proyecto principal: todos los módulos, backend + frontend ───
    // Los tests [FE] dentro de cada spec limpian el storageState con test.use()
    {
      name: "sweet-cafe",
      testMatch: [
        // ── Módulos Sweet Café originales ──
        "**/sweet_cafe/employees.spec.ts",
        "**/sweet_cafe/products.spec.ts",
        "**/sweet_cafe/inventory.spec.ts",
        "**/sweet_cafe/reservations.spec.ts",
        "**/sweet_cafe/payroll.spec.ts",
        "**/sweet_cafe/pos.spec.ts",
        "**/sweet_cafe/branches.spec.ts",
        "**/sweet_cafe/ecommerce.spec.ts",
        "**/sweet_cafe/ecommerce-reservation.spec.ts",
        "**/sweet_cafe/negative-validation.spec.ts",
        "**/sweet_cafe/expert-workflows.spec.ts",
        "**/sweet_cafe/expert-access-control.spec.ts",
        // ── RRHH Cubano ──
        "**/sweet_cafe/recruitment.spec.ts",
        "**/sweet_cafe/contracts.spec.ts",
        "**/sweet_cafe/payroll-movements.spec.ts",
        "**/sweet_cafe/absences.spec.ts",
        "**/sweet_cafe/attendances.spec.ts",
        // ── Seguridad ──
        "**/sweet_cafe/configurator-security.spec.ts",
        // ── Tributación ──
        "**/sweet_cafe/onat.spec.ts",
        // ── Operaciones ──
        "**/sweet_cafe/contacts.spec.ts",
        "**/sweet_cafe/purchases.spec.ts",
        "**/sweet_cafe/sales.spec.ts",
        "**/sweet_cafe/accounting.spec.ts",
        // ── Auth ──
        "**/auth/odoo-login.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
        // Auth admin por defecto — los describes [FE] lo limpian con test.use()
        storageState: ".auth/admin.json",
      },
    },
    // ─── Proyecto legacy de compatibilidad (ecommerce público) ───────
    // Mantenido para poder correr --project=odoo-website por compatibilidad
    {
      name: "odoo-website",
      testMatch: [
        "**/sweet_cafe/ecommerce.spec.ts",
        "**/sweet_cafe/ecommerce-reservation.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
        // Sin storageState — usuario anónimo
      },
    },
  ],

  webServer: undefined,
});
