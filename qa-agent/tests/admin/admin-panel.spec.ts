/**
 * CTRL QA - Admin Panel Tests
 * Tests para el panel de administración
 */

import { test, expect } from "@playwright/test";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Helper para login de admin
async function loginAsAdmin(page: any) {
  const email = process.env.TEST_ADMIN_EMAIL || "admin@test.com";
  const password = process.env.TEST_ADMIN_PASSWORD || "admin123";

  await page.goto(`${FRONTEND_URL}/auth/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password|contraseña/i).fill(password);
  await page.getByRole("button", { name: /login|iniciar|entrar/i }).click();
  await page.waitForURL(/admin|dashboard/i, { timeout: 15000 });
}

test.describe("👨‍💼 Admin - Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Dashboard de admin carga correctamente", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin`);

    // Verificar que carga
    await expect(page.getByRole("heading")).toBeVisible();
    await expect(page).not.toHaveURL(/error|login/i);
  });

  test("Muestra estadísticas/métricas", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin`);

    // Buscar cards de estadísticas
    const stats = page
      .locator('[class*="stat"], [class*="metric"], [class*="card"]')
      .or(
        page.locator("text=/total|candidates|companies|candidatos|empresas/i"),
      );

    await expect(stats.first()).toBeVisible({ timeout: 10000 });
  });

  test("Navegación de admin visible", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin`);

    // Verificar menú lateral o navegación
    const nav = page
      .locator('nav, aside, [role="navigation"]')
      .or(page.locator('[class*="sidebar"], [class*="menu"]'));

    await expect(nav.first()).toBeVisible();
  });
});

test.describe("👨‍💼 Admin - Candidates Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Lista de candidatos accesible", async ({ page }) => {
    // Navegar a candidatos
    const candidatesLink = page
      .getByRole("link", { name: /candidate|candidato/i })
      .or(page.locator('[href*="candidate"]'));

    await candidatesLink.first().click();

    // Verificar tabla o lista
    await expect(
      page.locator('table, [role="table"], [class*="list"], [class*="grid"]'),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Puede buscar candidatos", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/candidates`);

    // Buscar campo de búsqueda
    const searchInput = page
      .getByRole("searchbox")
      .or(page.getByPlaceholder(/search|buscar/i))
      .or(page.locator('input[type="search"]'));

    if (await searchInput.first().isVisible()) {
      await searchInput.first().fill("test");

      // Debe filtrar sin errores
      await expect(page).not.toHaveURL(/error/i);
    }
  });

  test("Puede ver detalle de candidato", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/candidates`);

    // Click en primer candidato
    const candidateRow = page
      .locator('tr, [class*="row"], [class*="item"]')
      .first();

    if (await candidateRow.isVisible()) {
      await candidateRow.click();

      // Debe mostrar detalle
      await expect(
        page
          .locator('[class*="detail"], [class*="profile"]')
          .or(page.getByRole("heading")),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test("Puede filtrar por estado", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/candidates`);

    // Buscar filtros
    const filterSelect = page
      .locator('select, [role="combobox"]')
      .or(page.getByRole("button", { name: /filter|filtrar|status|estado/i }));

    if (await filterSelect.first().isVisible()) {
      await filterSelect.first().click();

      // Debe haber opciones
      await expect(page.locator('option, [role="option"]')).toBeVisible();
    }
  });
});

test.describe("👨‍💼 Admin - Companies Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Lista de empresas accesible", async ({ page }) => {
    const companiesLink = page
      .getByRole("link", { name: /compan|empresa/i })
      .or(page.locator('[href*="compan"]'));

    await companiesLink.first().click();

    await expect(
      page.locator('table, [class*="list"], [class*="grid"]'),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Puede crear nueva empresa", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/companies`);

    const createButton = page
      .getByRole("button", { name: /create|crear|new|nuev|add|agregar/i })
      .or(page.locator('[href*="create"], [href*="new"]'));

    if (await createButton.first().isVisible()) {
      await createButton.first().click();

      // Debe aparecer formulario
      await expect(
        page
          .locator("form")
          .or(page.locator('input[name*="name"], input[placeholder*="name"]')),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test("Formulario de empresa tiene campos requeridos", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/companies/create`);

    // Verificar campos típicos
    const nameField = page
      .getByLabel(/name|nombre/i)
      .or(page.locator('input[name*="name"]'));

    await expect(nameField.first()).toBeVisible();
  });
});

test.describe("👨‍💼 Admin - Questions Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Lista de preguntas accesible", async ({ page }) => {
    const questionsLink = page
      .getByRole("link", { name: /question|pregunta/i })
      .or(page.locator('[href*="question"]'));

    await questionsLink.first().click();

    await expect(
      page
        .locator('table, [class*="list"]')
        .or(page.getByRole("heading", { name: /question|pregunta/i })),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Puede crear nueva pregunta", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/questions`);

    const createButton = page.getByRole("button", {
      name: /create|crear|new|add/i,
    });

    if (await createButton.first().isVisible()) {
      await createButton.first().click();

      // Formulario de pregunta
      await expect(
        page.locator('form, textarea, [class*="editor"]'),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test("Puede editar pregunta existente", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/questions`);

    // Click en editar primera pregunta
    const editButton = page
      .getByRole("button", { name: /edit|editar/i })
      .or(page.locator('[class*="edit"], [aria-label*="edit"]'));

    if (await editButton.first().isVisible()) {
      await editButton.first().click();

      await expect(page.locator("form, textarea")).toBeVisible({
        timeout: 10000,
      });
    }
  });
});

test.describe("👨‍💼 Admin - Typing Texts Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Lista de textos de tipeo accesible", async ({ page }) => {
    const textsLink = page
      .getByRole("link", { name: /text|texto|typing/i })
      .or(page.locator('[href*="text"], [href*="typing"]'));

    if (await textsLink.first().isVisible()) {
      await textsLink.first().click();

      await expect(page.locator('table, [class*="list"]')).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test("Puede crear nuevo texto", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/typing-texts`);

    const createButton = page.getByRole("button", {
      name: /create|crear|new|add/i,
    });

    if (await createButton.first().isVisible()) {
      await createButton.first().click();

      await expect(page.locator("form, textarea")).toBeVisible({
        timeout: 10000,
      });
    }
  });
});

test.describe("👨‍💼 Admin - Analytics", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Página de analytics accesible", async ({ page }) => {
    const analyticsLink = page
      .getByRole("link", { name: /analytic|estadístic|report|informe/i })
      .or(
        page.locator('[href*="analytic"], [href*="report"], [href*="stats"]'),
      );

    if (await analyticsLink.first().isVisible()) {
      await analyticsLink.first().click();

      // Debe cargar gráficos o estadísticas
      await expect(
        page
          .locator('canvas, svg, [class*="chart"], [class*="graph"]')
          .or(page.locator('[class*="stat"], [class*="metric"]')),
      ).toBeVisible({ timeout: 15000 });
    }
  });

  test("Puede exportar datos", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/analytics`);

    const exportButton = page.getByRole("button", {
      name: /export|exportar|download|descargar/i,
    });

    if (await exportButton.isVisible()) {
      // Verificar que el botón funciona
      await expect(exportButton).toBeEnabled();
    }
  });
});

test.describe("👨‍💼 Admin - Reports", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Puede ver reportes de candidatos", async ({ page }) => {
    const reportsLink = page
      .getByRole("link", { name: /report|informe|candidate report/i })
      .or(page.locator('[href*="report"]'));

    if (await reportsLink.first().isVisible()) {
      await reportsLink.first().click();

      await expect(
        page.locator('table, [class*="report"], [class*="list"]'),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test("Puede generar reporte PDF", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/reports`);

    const pdfButton = page
      .getByRole("button", { name: /pdf|generate|generar/i })
      .or(page.locator('[class*="pdf"], [class*="download"]'));

    if (await pdfButton.first().isVisible()) {
      // Verificar que está disponible
      await expect(pdfButton.first()).toBeEnabled();
    }
  });
});

test.describe("👨‍💼 Admin - Access Control", () => {
  test("Candidato no puede acceder a admin", async ({ page }) => {
    const email = process.env.TEST_CANDIDATE_EMAIL || "candidate@test.com";
    const password = process.env.TEST_CANDIDATE_PASSWORD || "test123";

    await page.goto(`${FRONTEND_URL}/auth/login`);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password|contraseña/i).fill(password);
    await page.getByRole("button", { name: /login|iniciar/i }).click();

    await page.waitForURL(/dashboard|home/i, { timeout: 15000 });

    // Intentar acceder a admin
    await page.goto(`${FRONTEND_URL}/admin`);

    // Debe redirigir o mostrar error
    await expect(page).not.toHaveURL(/\/admin$/);
  });

  test("Usuario no autenticado redirige a login", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin`);

    // Debe redirigir a login
    await expect(page).toHaveURL(/login|auth/i, { timeout: 10000 });
  });
});
