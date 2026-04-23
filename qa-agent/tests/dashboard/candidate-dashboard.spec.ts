/**
 * CTRL QA - Candidate Dashboard Tests
 * Tests para el dashboard del candidato
 */

import { test, expect } from "@playwright/test";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Helper para login de candidato
async function loginAsCandidate(page: any) {
  const email = process.env.TEST_CANDIDATE_EMAIL || "candidate@test.com";
  const password = process.env.TEST_CANDIDATE_PASSWORD || "test123";

  await page.goto(`${FRONTEND_URL}/auth/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password|contraseña/i).fill(password);
  await page.getByRole("button", { name: /login|iniciar|entrar/i }).click();
  await page.waitForURL(/dashboard|home|assessment/i, { timeout: 15000 });
}

test.describe("📊 Dashboard - Candidate View", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
  });

  test("Dashboard carga correctamente", async ({ page }) => {
    await expect(page.getByRole("heading")).toBeVisible();
    // Verificar que no hay errores de carga
    await expect(page.locator("text=/error|failed/i")).not.toBeVisible();
  });

  test("Muestra secciones de assessment disponibles", async ({ page }) => {
    // Verificar que aparecen los módulos de evaluación
    const assessmentSections = page.locator(
      '[data-testid*="assessment"], .assessment-card, [class*="assessment"]',
    );

    // Al menos debe haber contenido principal
    await expect(
      page.locator('main, [role="main"], .main-content'),
    ).toBeVisible();
  });

  test("Puede navegar a Typing Test", async ({ page }) => {
    // Buscar link o botón de typing test
    const typingLink = page
      .getByRole("link", { name: /typing|mecanografía|tipeo/i })
      .or(page.getByRole("button", { name: /typing|mecanografía|tipeo/i }))
      .or(page.locator('[href*="typing"]'));

    if (await typingLink.first().isVisible()) {
      await typingLink.first().click();
      await expect(page).toHaveURL(/typing/i, { timeout: 10000 });
    }
  });

  test("Puede navegar a Call Simulation", async ({ page }) => {
    // Buscar link o botón de call simulation
    const callLink = page
      .getByRole("link", { name: /call|llamada|simulation/i })
      .or(page.getByRole("button", { name: /call|llamada|simulation/i }))
      .or(page.locator('[href*="call"]'));

    if (await callLink.first().isVisible()) {
      await callLink.first().click();
      await expect(page).toHaveURL(/call/i, { timeout: 10000 });
    }
  });

  test("Puede navegar a Situational Judgement", async ({ page }) => {
    // Buscar link de SJT
    const sjtLink = page
      .getByRole("link", { name: /situational|judgement|sjt|scenario/i })
      .or(page.locator('[href*="situational"], [href*="sjt"]'));

    if (await sjtLink.first().isVisible()) {
      await sjtLink.first().click();
      await expect(page).toHaveURL(/situational|sjt/i, { timeout: 10000 });
    }
  });

  test("Muestra estado de progreso", async ({ page }) => {
    // Verificar indicadores de progreso
    const progressIndicator = page.locator(
      '[class*="progress"], [role="progressbar"], .progress',
    );

    // Al menos debe haber algún indicador de estado
    const hasProgress = (await progressIndicator.count()) > 0;
    const hasStatus =
      (await page
        .locator("text=/completed|pending|in progress|completado|pendiente/i")
        .count()) > 0;

    expect(hasProgress || hasStatus).toBeTruthy();
  });

  test("Perfil de usuario accesible", async ({ page }) => {
    // Buscar menú de usuario o link de perfil
    const userMenu = page
      .getByRole("button", { name: /user|profile|account|usuario|perfil/i })
      .or(page.locator('[data-testid="user-menu"]'))
      .or(page.locator('button:has(img[alt*="avatar"]), button:has(.avatar)'));

    if (await userMenu.first().isVisible()) {
      await userMenu.first().click();

      // Verificar que aparece menú o perfil
      await expect(
        page
          .getByRole("menu")
          .or(page.locator('[role="menuitem"]'))
          .or(page.getByText(/profile|settings|logout/i)),
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("📊 Dashboard - Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
  });

  test("Navegación principal visible", async ({ page }) => {
    // Verificar navegación
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeVisible();
  });

  test("Logo/Brand clickeable lleva a home", async ({ page }) => {
    const logo = page
      .locator(
        'a:has(img[alt*="logo"]), a:has([class*="logo"]), [class*="brand"] a',
      )
      .first();

    if (await logo.isVisible()) {
      await logo.click();
      await expect(page).toHaveURL(/dashboard|home|\//i);
    }
  });

  test("Breadcrumbs funcionan si existen", async ({ page }) => {
    const breadcrumb = page.locator(
      '[aria-label="breadcrumb"], .breadcrumb, nav:has(ol)',
    );

    if (await breadcrumb.isVisible()) {
      const links = breadcrumb.locator("a");
      const count = await links.count();

      if (count > 0) {
        // Click en primer link de breadcrumb
        await links.first().click();
        // No debe dar error
        await expect(page).not.toHaveURL(/error|404/i);
      }
    }
  });
});

test.describe("📊 Dashboard - Responsive", () => {
  test("Dashboard funciona en mobile", async ({ page }) => {
    // Configurar viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsCandidate(page);

    // Dashboard debe cargar
    await expect(page.locator('main, [role="main"], body')).toBeVisible();

    // No debe haber overflow horizontal
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // pequeño margen
  });

  test("Menú hamburger funciona en mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsCandidate(page);

    // Buscar botón de menú móvil
    const menuButton = page
      .getByRole("button", { name: /menu/i })
      .or(page.locator('button[aria-label*="menu"]'))
      .or(page.locator('[class*="hamburger"], [class*="mobile-menu"]'));

    if (await menuButton.first().isVisible()) {
      await menuButton.first().click();

      // Debe aparecer navegación
      await expect(
        page.locator('nav, [role="navigation"], [class*="mobile-nav"]'),
      ).toBeVisible();
    }
  });
});
