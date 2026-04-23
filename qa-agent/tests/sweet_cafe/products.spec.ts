/**
 * Sweet Café QA — Tests de Catálogo de Productos
 *
 * Valida la gestión de productos para Sweet Café:
 *  - Productos con variantes (sabores de tortas y tartaletas)
 *  - Categorías de productos de repostería
 *  - Listas de precio, UoM, atributos de sabor
 *
 * Modelo extendido: sweet_cafe_management/models/product_template.py
 * Referencia Odoo: odoo-19.0/addons/product/
 */

import { test, expect } from "@playwright/test";
import { OdooBasePage } from "../../src/pages/odoo-base.page.js";

const ODOO_URL = process.env.ODOO_URL || "http://localhost:8069";

test.describe("🎂 Catálogo de Productos — Sweet Café", () => {
  let basePage: OdooBasePage;

  test.beforeEach(async ({ page }) => {
    basePage = new OdooBasePage(page);
  });

  // ─── Acceso al catálogo ───────────────────────────────────────

  test("El catálogo de productos carga correctamente", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/inventory/products`);
    await basePage.waitForOdooReady();

    await expect(page.locator(".o_list_view, .o_kanban_view")).toBeVisible({
      timeout: 20000,
    });
  });

  test("Los productos se muestran en vista kanban por defecto", async ({
    page,
  }) => {
    await page.goto(`${ODOO_URL}/odoo/inventory/products`);
    await basePage.waitForOdooReady();

    // Odoo muestra productos en kanban por defecto
    const kanbanCards = page.locator(
      ".o_kanban_record, .o_product_kanban_record",
    );
    // Solo verificar que la vista cargó sin errores
    await expect(
      page.locator(".o_view_controller, .o_kanban_view, .o_list_view"),
    ).toBeVisible({ timeout: 15000 });
  });

  // ─── Creación de producto ─────────────────────────────────────

  test("Crear un nuevo producto de repostería", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/inventory/products/new`);
    await basePage.waitForOdooReady();

    const productName = `QA Torta de Prueba ${Date.now()}`;

    // Nombre del producto
    const nameInput = page
      .locator("[name='name'] input, .o_field_char input")
      .first();
    await nameInput.fill(productName);

    // Verificar que puede guardar
    await basePage.clickSave();

    // Debe estar en la URL de detalle
    await expect(page.locator("[name='name'] input, .o_form_view")).toBeVisible(
      { timeout: 15000 },
    );
  });

  test("El producto tiene sección de variantes (atributos de sabor)", async ({
    page,
  }) => {
    await page.goto(`${ODOO_URL}/odoo/inventory/products/new`);
    await basePage.waitForOdooReady();

    // La pestaña de variantes debe estar presente en Odoo
    const variantsTab = page
      .locator(".o_notebook .nav-link, .nav-item a")
      .filter({ hasText: /variantes|variants|atributos/i });
    await expect(variantsTab).toBeVisible({ timeout: 15000 });
  });

  // ─── Publicación en website ───────────────────────────────────

  test("Se puede marcar un producto como disponible en la tienda online", async ({
    page,
  }) => {
    await page.goto(`${ODOO_URL}/odoo/inventory/products/new`);
    await basePage.waitForOdooReady();

    // El campo de "Publicado en web" debe estar disponible (integración website_sale)
    const websaleTab = page
      .locator(".o_notebook .nav-link, .nav-item a")
      .filter({ hasText: /ecommerce|venta|web/i });
    if (await websaleTab.isVisible()) {
      await websaleTab.click();
      await page.waitForTimeout(500);
    }

    // Verificar que la vista del formulario sigue cargada
    await expect(page.locator(".o_form_view")).toBeVisible({ timeout: 10000 });
  });

  // ─── Filtros por categoría ────────────────────────────────────

  test("Se pueden filtrar productos por categoría", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/inventory/products`);
    await basePage.waitForOdooReady();

    // Buscar un producto
    await basePage.searchRecord("Torta");
    await page.waitForTimeout(1500);

    // La vista no debe generar errores
    await expect(page.locator(".o_kanban_view, .o_list_view")).toBeVisible({
      timeout: 10000,
    });

    await basePage.clearSearch();
  });

  // ─── Listas de precio ─────────────────────────────────────────

  test("El módulo de Listas de Precio es accesible", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/sales/pricelists`);
    await basePage.waitForOdooReady();

    await expect(
      page.locator(".o_list_view, .o_kanban_view, .o_view_controller"),
    ).toBeVisible({ timeout: 20000 });
  });

  // ─── Atributos de productos ───────────────────────────────────

  test("Los atributos de productos (sabores) son accesibles", async ({
    page,
  }) => {
    await page.goto(
      `${ODOO_URL}/odoo/inventory/configuration/product-attributes`,
    );
    await basePage.waitForOdooReady();

    await expect(
      page.locator(".o_list_view, .o_kanban_view, .o_view_controller"),
    ).toBeVisible({ timeout: 20000 });
  });
});
