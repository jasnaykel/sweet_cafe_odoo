/**
 * Configuración Playwright para pruebas sin servidor Odoo activo.
 * Úsala para verificar config, tsconfig, y generación de reportes
 * cuando el servidor no está disponible.
 *
 * Uso: npx playwright test --config=playwright.offline.config.ts
 */
import { defineConfig } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  // Sin globalSetup — para validar config y reportes offline
  reporter: [
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
    headless: true,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  timeout: 60000,
  expect: { timeout: 10000 },
  outputDir: path.resolve(__dirname, "test-results"),
  projects: [
    {
      name: "smoke-offline",
      testMatch: ["**/setup/verify-setup.spec.ts"],
    },
  ],
});
