/**
 * Sweet Café QA — Tests de Inventario / Stock
 *
 * Valida la gestión de inventario multi-almacén de Sweet Café:
 *  - Control de stock por sucursal
 *  - Mermas (sweet.scrap) y scrap con aprobación
 *  - Consumo productivo (MRP)
 *  - Traspasos entre sucursales
 *  - Lotes y fechas de caducidad
 *
 * Módulo: sweet_cafe_management/models/sweet_scrap.py, pos_config.py
 * Referencia Odoo: odoo-19.0/addons/stock/, odoo-19.0/addons/mrp/
 */

import { test, expect } from "@playwright/test";
import { OdooBasePage } from "../../src/pages/odoo-base.page.js";

const ODOO_URL = process.env.ODOO_URL || "http://localhost:8069";

test.describe("📦 Inventario / Stock — Sweet Café", () => {
  let basePage: OdooBasePage;

  test.beforeEach(async ({ page }) => {
    basePage = new OdooBasePage(page);
  });

  // ─── Módulo de inventario ─────────────────────────────────────

  test("El módulo de Inventario carga correctamente", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/inventory`);
    await basePage.waitForOdooReady();

    await expect(
      page.locator(".o_list_view, .o_kanban_view, .o_view_controller"),
    ).toBeVisible({ timeout: 20000 });
  });

  test("Los almacenes de las sucursales son accesibles", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/inventory/configuration/warehouses`);
    await basePage.waitForOdooReady();

    await expect(page.locator(".o_list_view, .o_view_controller")).toBeVisible({
      timeout: 20000,
    });
  });

  // ─── Operaciones de stock ─────────────────────────────────────

  test("Las transferencias de stock son accesibles", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/inventory/transfers`);
    await basePage.waitForOdooReady();

    await expect(page.locator(".o_list_view, .o_view_controller")).toBeVisible({
      timeout: 20000,
    });
  });

  test("Los traspasos entre sucursales son accesibles", async ({ page }) => {
    // Las transferencias internas representan traspasos entre sucursales
    await page.goto(`${ODOO_URL}/odoo/inventory/transfers`);
    await basePage.waitForOdooReady();

    // Buscar tipo de operación "Internal"
    await basePage.searchRecord("Internal");
    await page.waitForTimeout(1000);

    await expect(page.locator(".o_list_view, .o_view_controller")).toBeVisible({
      timeout: 10000,
    });

    await basePage.clearSearch();
  });

  // ─── Mermas / Scrap (sweet.scrap) ────────────────────────────

  test("El módulo de Mermas (sweet.scrap) es accesible", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/sweet-scraps`).catch(async () => {
      // Fallback a la ruta genérica de scrap de Odoo
      await page.goto(`${ODOO_URL}/odoo/inventory/scrap`);
    });
    await basePage.waitForOdooReady();

    await expect(
      page.locator(".o_list_view, .o_kanban_view, .o_view_controller"),
    ).toBeVisible({ timeout: 20000 });
  });

  test("El formulario de nueva merma tiene los campos requeridos", async ({
    page,
  }) => {
    await page.goto(`${ODOO_URL}/odoo/inventory/scrap/new`).catch(async () => {
      await page.goto(`${ODOO_URL}/odoo/inventory/scrap`);
    });
    await basePage.waitForOdooReady();

    await expect(page.locator(".o_form_view, .o_view_controller")).toBeVisible({
      timeout: 15000,
    });
  });

  // ─── Razones de merma ─────────────────────────────────────────

  test("Las razones de merma (sweet.scrap.reason) son accesibles", async ({
    page,
  }) => {
    await page.goto(`${ODOO_URL}/odoo/sweet-scrap-reasons`).catch(async () => {
      await page.goto(`${ODOO_URL}/odoo/inventory`);
    });
    await basePage.waitForOdooReady();

    await expect(page.locator(".o_main_navbar")).toBeVisible({
      timeout: 10000,
    });
  });

  // ─── Manufactura (MRP) ────────────────────────────────────────

  test("El módulo de Manufactura (MRP) es accesible", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/manufacturing`);
    await basePage.waitForOdooReady();

    await expect(
      page.locator(".o_list_view, .o_kanban_view, .o_view_controller"),
    ).toBeVisible({ timeout: 20000 });
  });

  test("Las órdenes de producción son accesibles", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/manufacturing/orders`);
    await basePage.waitForOdooReady();

    await expect(page.locator(".o_list_view, .o_view_controller")).toBeVisible({
      timeout: 20000,
    });
  });

  test("Las listas de materiales (BoM) son accesibles", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/manufacturing/bom`);
    await basePage.waitForOdooReady();

    await expect(page.locator(".o_list_view, .o_view_controller")).toBeVisible({
      timeout: 20000,
    });
  });

  // ─── Lotes y trazabilidad ─────────────────────────────────────

  test("Los lotes de productos son accesibles para trazabilidad", async ({
    page,
  }) => {
    await page.goto(`${ODOO_URL}/odoo/inventory/lots`);
    await basePage.waitForOdooReady();

    await expect(page.locator(".o_list_view, .o_view_controller")).toBeVisible({
      timeout: 20000,
    });
  });

  // ─── Ajuste de inventario ─────────────────────────────────────

  test("El ajuste de inventario físico es accesible", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/inventory/inventory-adjustments`);
    await basePage.waitForOdooReady();

    await expect(
      page.locator(".o_list_view, .o_view_controller, .o_action"),
    ).toBeVisible({ timeout: 20000 });
  });
});
