/**
 * Sweet Café QA Agent - Playwright Configuration
 * Tests visuales y de flujo para el sistema Odoo 19 de Sweet Café
 *
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Cargar variables de entorno
config();

export default defineConfig({
  // Carpeta de tests
  testDir: "./tests",

  // Secuencial: Odoo necesita 1 worker para evitar conflictos de sesión
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,

  // Login una sola vez antes de todos los tests
  globalSetup: "./tests/setup/global-setup.ts",

  // Reportes
  reporter: [
    ["html", { open: "never", outputFolder: "./reports/playwright-report" }],
    ["json", { outputFile: "./reports/test-results.json" }],
    ["list"],
  ],

  // Configuración global
  use: {
    baseURL: process.env.ODOO_URL || "http://localhost:8069",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: process.env.HEADLESS !== "false",
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  timeout: 120000,
  expect: { timeout: 15000 },
  outputDir: "./test-results",

  // Proyectos — solo Chromium (instalado)
  projects: [
    // Proyecto para tests del BACKEND Odoo (requieren login)
    {
      name: "odoo-backend",
      testMatch: [
        "**/sweet_cafe/branches.spec.ts",
        "**/sweet_cafe/products.spec.ts",
        "**/sweet_cafe/reservations.spec.ts",
        "**/sweet_cafe/inventory.spec.ts",
        "**/sweet_cafe/pos.spec.ts",
        "**/sweet_cafe/hr.spec.ts",
        "**/sweet_cafe/hr-employee-flow.spec.ts",
        "**/sweet_cafe/payroll.spec.ts",
        "**/auth/odoo-login.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
        // Reutilizar sesión autenticada del globalSetup
        storageState: ".auth/admin.json",
      },
    },
    // Proyecto para tests del FRONTEND público (no requieren login)
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