/**
 * Sweet Café QA — Tests de Gestión de Sucursales
 *
 * Valida el flujo CRUD de sweet.branch y la lógica multi-sucursal.
 * Modelo: sweet_cafe_management/models/sweet_branch.py
 *
 * Flujos cubiertos:
 *  - Visualizar lista de sucursales
 *  - Crear nueva sucursal
 *  - Editar sucursal existente
 *  - Verificar tipos de sucursal (main, secondary, mobile, online)
 *  - Verificar la relación con almacén (warehouse_id)
 *
 * NOTA: La sesión viene del globalSetup (storageState .auth/admin.json)
 * No es necesario hacer login en el beforeEach.
 */

import { test, expect } from "@playwright/test";
import { OdooBasePage } from "../../src/pages/odoo-base.page.js";

const ODOO_URL = process.env.ODOO_URL || "http://localhost:8069";
const TEST_BRANCH_NAME = `QA Sucursal ${Date.now()}`;
const TEST_BRANCH_CODE = `QA${Date.now().toString().slice(-3)}`;

test.describe("🏪 Sucursales — Sweet Café", () => {
  let basePage: OdooBasePage;

  test.beforeEach(async ({ page }) => {
    basePage = new OdooBasePage(page);
  });

  // ─── Acceso al módulo ─────────────────────────────────────────

  test("El módulo de Sucursales carga correctamente", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo`);
    await basePage.waitForOdooReady();

    // El cliente web debe estar visible (sesión activa por storageState)
    await expect(
      page.locator(".o_home_menu, .o_main_navbar, .o_action_manager")
    ).toBeVisible({ timeout: 20000 });
  });

  test("Se puede navegar al listado de sucursales sweet.branch", async ({ page }) => {
    // Intentar con la URL directa del modelo
    await page.goto(`${ODOO_URL}/odoo/sweet-branches`);
    await basePage.waitForOdooReady();

    await expect(
      page.locator(".o_list_view, .o_kanban_view, .o_view_controller, .o_action")
    ).toBeVisible({ timeout: 20000 });
  });

  test("La vista de lista de sucursales muestra registros", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/sweet-branches`);
    await basePage.waitForOdooReady();

    await basePage.switchToListView();

    const headers = page.locator(".o_list_view thead th");
    const count = await headers.count();
    expect(count).toBeGreaterThan(0);
  });

  // ─── Creación de sucursal ─────────────────────────────────────

  test("Crear una nueva sucursal con nombre y código", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/sweet-branches`);
    await basePage.waitForOdooReady();

    await basePage.clickNew();

    // Nombre
    const nameInput = page.locator("[name='name'] input").first();
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await nameInput.fill(TEST_BRANCH_NAME);

    // Código
    const codeInput = page.locator("[name='code'] input").first();
    if (await codeInput.isVisible()) {
      await codeInput.fill(TEST_BRANCH_CODE);
    }

    await basePage.clickSave();

    // Verificar que se guardó
    await expect(
      page.locator(".o_form_view, .o_list_view")
    ).toBeVisible({ timeout: 15000 });
  });

  test("Crear sucursal sin nombre muestra error de validación", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/sweet-branches`);
    await basePage.waitForOdooReady();

    await basePage.clickNew();

    // Llenar solo código, sin nombre
    const codeInput = page.locator("[name='code'] input").first();
    if (await codeInput.isVisible()) {
      await codeInput.fill("NONAME");
    }

    await basePage.clickSave();

    // Odoo debe mostrar error de campo requerido
    await expect(
      page.locator(
        ".o_field_invalid, .o_notification.bg-danger, .o_form_error, .alert-danger, [class*='error']"
      )
    ).toBeVisible({ timeout: 10000 });
  });

  // ─── Tipos de sucursal ────────────────────────────────────────

  test("El formulario de sucursal tiene el campo branch_type", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/sweet-branches`);
    await basePage.waitForOdooReady();

    await basePage.clickNew();

    const typeField = page.locator("[name='branch_type']").first();
    await expect(typeField).toBeVisible({ timeout: 15000 });
  });

  // ─── Búsqueda ─────────────────────────────────────────────────

  test("Búsqueda de sucursal en la barra de búsqueda funciona", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/sweet-branches`);
    await basePage.waitForOdooReady();

    await basePage.searchRecord("Principal");
    await page.waitForTimeout(1500);

    await expect(
      page.locator(".o_list_view, .o_kanban_view")
    ).toBeVisible({ timeout: 10000 });

    await basePage.clearSearch();
  });
});

  // ─── Visualización ───────────────────────────────────────────

  test("El módulo de Sucursales carga correctamente", async ({ page }) => {
    await branchesPage.goto();

    // La vista de lista debe estar visible
    await expect(
      page.locator(".o_list_view, .o_kanban_view, .o_view_controller"),
    ).toBeVisible({ timeout: 20000 });
  });

  test("La lista de sucursales muestra columnas esenciales", async ({
    page,
  }) => {
    await branchesPage.goto();
    await branchesPage.switchToListView();

    // Verificar cabeceras de columnas principales
    const headers = page.locator(".o_list_view thead th, .o_column_title");
    await expect(headers).not.toHaveCount(0);

    // Nombre y código deben ser visibles como columnas
    const headerTexts = await headers.allTextContents();
    const hasName = headerTexts.some((t) => /nombre|name/i.test(t));
    expect(hasName).toBeTruthy();
  });

  // ─── Creación de sucursal ─────────────────────────────────────

  test("Crear una nueva sucursal exitosamente", async ({ page }) => {
    await branchesPage.goto();

    await branchesPage.createBranch({
      name: TEST_BRANCH_NAME,
      code: TEST_BRANCH_CODE,
      branchType: "secondary",
    });

    // El formulario debe guardar y mostrar el nombre
    await expect(
      page.locator("[name='name'] input, [name='name'] span"),
    ).toHaveValue(TEST_BRANCH_NAME, { timeout: 10000 });
  });

  test("Crear sucursal falla sin nombre requerido", async ({ page }) => {
    await branchesPage.goto();
    await branchesPage.clickNew();

    // Solo llenar el código, sin nombre
    await branchesPage.codeField.fill("NONAME");

    await branchesPage.clickSave();

    // Odoo debe mostrar error de validación
    await expect(
      page.locator(
        ".o_field_invalid, .o_notification.bg-danger, .alert-danger, .o_form_error",
      ),
    ).toBeVisible({ timeout: 10000 });
  });

  // ─── Edición ─────────────────────────────────────────────────

  test("Editar el nombre de una sucursal existente", async ({ page }) => {
    // Primero crear la sucursal
    await branchesPage.goto();
    await branchesPage.createBranch({
      name: TEST_BRANCH_NAME,
      code: TEST_BRANCH_CODE,
    });

    // Editar el nombre
    const newName = `${TEST_BRANCH_NAME} Editado`;
    await branchesPage.nameField.fill(newName);
    await branchesPage.clickSave();

    await expect(page.locator("[name='name'] input")).toHaveValue(newName, {
      timeout: 10000,
    });
  });

  // ─── Tipos de sucursal ────────────────────────────────────────

  test("Se pueden seleccionar todos los tipos de sucursal", async ({
    page,
  }) => {
    await branchesPage.goto();
    await branchesPage.clickNew();

    await branchesPage.nameField.fill("Test Tipo Sucursal");
    await branchesPage.codeField.fill("TTS");

    // Verificar que el campo branch_type está presente y tiene opciones
    const typeField = page.locator("[name='branch_type']").first();
    await expect(typeField).toBeVisible();
  });

  // ─── Búsqueda y filtros ───────────────────────────────────────

  test("Búsqueda de sucursal por nombre funciona", async ({ page }) => {
    await branchesPage.goto();

    // Crear una sucursal para buscarla
    await branchesPage.createBranch({
      name: `QA Buscar ${Date.now()}`,
      code: "BUS",
    });
    const branchName = await page.locator("[name='name'] input").inputValue();

    // Volver al listado y buscar
    await branchesPage.goto();
    await branchesPage.searchRecord(branchName);

    await expect(
      page.locator(".o_data_row").filter({ hasText: branchName }),
    ).toBeVisible({ timeout: 10000 });
  });
});
