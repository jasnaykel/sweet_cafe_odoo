/**
 * Test básico para verificar que Playwright funciona
 */

import { test, expect } from "@playwright/test";

test.describe("🧪 Setup Verification", () => {
  test("Playwright está funcionando correctamente", async ({ page }) => {
    // Test básico con una página pública
    await page.goto("https://www.google.com");

    // Verificar que cargó
    await expect(page).toHaveTitle(/Google/i);

    console.log("✅ Playwright funciona correctamente!");
  });

  test("Puede hacer screenshots", async ({ page }) => {
    await page.goto("https://playwright.dev");

    // Tomar screenshot
    await page.screenshot({ path: "./reports/playwright-test.png" });

    await expect(page.locator("h1")).toBeVisible();

    console.log("✅ Screenshots funcionan!");
  });

  test("Puede interactuar con elementos", async ({ page }) => {
    await page.goto("https://playwright.dev");

    // Buscar documentación
    const getStarted = page.getByRole("link", { name: /Get started/i });

    if (await getStarted.isVisible()) {
      await getStarted.click();
      await expect(page).toHaveURL(/docs\/intro/i);
      console.log("✅ Interacción con elementos funciona!");
    }
  });
});
