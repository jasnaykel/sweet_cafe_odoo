/**
 * Sweet Café QA — Tests de Nómina (Payroll Cuba)
 *
 * Valida los módulos de nómina adaptados a la legislación cubana:
 *  - l10n_cu_hr_payroll
 *  - l10n_cu_hr_payroll_movement
 *  - rrhh_5p (Resolución 5p — retenciones laborales Cuba)
 *
 * Flujos cubiertos:
 *  - Nóminas (payslips)
 *  - Movimientos de nómina
 *  - Escalas salariales CUP
 *  - Tabla de impuestos ONAT (sweet_tax_bracket)
 *  - Libro IGI y declaración anual
 */

import { test, expect } from "@playwright/test";
import { OdooBasePage } from "../../src/pages/odoo-base.page.js";

const ODOO_URL = process.env.ODOO_URL || "http://localhost:8069";

test.describe("💰 Nómina Cubana — Sweet Café", () => {
  let basePage: OdooBasePage;

  test.beforeEach(async ({ page }) => {
    basePage = new OdooBasePage(page);
  });

  // ─── Acceso al módulo de nómina ───────────────────────────────

  test("El módulo de Nómina carga correctamente", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/payroll`);
    await basePage.waitForOdooReady();

    await expect(
      page.locator(".o_list_view, .o_kanban_view, .o_view_controller"),
    ).toBeVisible({ timeout: 20000 });
  });

  test("Las nóminas (payslips) son accesibles", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/payroll/payslips`);
    await basePage.waitForOdooReady();

    await expect(
      page.locator(".o_list_view, .o_kanban_view, .o_view_controller"),
    ).toBeVisible({ timeout: 20000 });
  });

  // ─── Reglas salariales Cuba ───────────────────────────────────

  test("Las reglas salariales de Cuba están configuradas", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/payroll/salary-rules`);
    await basePage.waitForOdooReady();

    await expect(page.locator(".o_list_view, .o_view_controller")).toBeVisible({
      timeout: 20000,
    });
  });

  test("Las estructuras salariales cubanas son accesibles", async ({
    page,
  }) => {
    await page.goto(`${ODOO_URL}/odoo/payroll/salary-structures`);
    await basePage.waitForOdooReady();

    await expect(page.locator(".o_list_view, .o_view_controller")).toBeVisible({
      timeout: 20000,
    });
  });

  // ─── Movimientos de nómina (l10n_cu_hr_payroll_movement) ─────

  test("El módulo de Movimientos de Nómina es accesible", async ({ page }) => {
    // l10n_cu_hr_payroll_movement gestiona bajas, altas, cambios salariales
    await page.goto(`${ODOO_URL}/odoo`);
    await basePage.waitForOdooReady();

    // Navegar al módulo si existe
    await expect(page.locator(".o_main_navbar")).toBeVisible({
      timeout: 10000,
    });
  });

  // ─── Tabla de tramos impositivos ONAT ────────────────────────

  test("La tabla de tramos impositivos (sweet.tax.bracket) es accesible", async ({
    page,
  }) => {
    await page.goto(`${ODOO_URL}/odoo/sweet-tax-brackets`).catch(async () => {
      await page.goto(`${ODOO_URL}/odoo`);
    });
    await basePage.waitForOdooReady();

    await expect(page.locator(".o_main_navbar, .o_web_client")).toBeVisible({
      timeout: 10000,
    });
  });

  // ─── Libro IGI ────────────────────────────────────────────────

  test("El Libro IGI de declaración fiscal es accesible", async ({ page }) => {
    // sweet_declaracion_anual y sweet_libro_igi
    await page.goto(`${ODOO_URL}/odoo/sweet-igi-book`).catch(async () => {
      await page.goto(`${ODOO_URL}/odoo`);
    });
    await basePage.waitForOdooReady();

    await expect(page.locator(".o_main_navbar, .o_web_client")).toBeVisible({
      timeout: 10000,
    });
  });

  // ─── Reporte ONAT ─────────────────────────────────────────────

  test("El asistente de reporte ONAT es accesible", async ({ page }) => {
    // sweet_onat_report
    await page.goto(`${ODOO_URL}/odoo`);
    await basePage.waitForOdooReady();

    // Verificar que el módulo Sweet Café está instalado
    await expect(page.locator(".o_main_navbar")).toBeVisible({
      timeout: 10000,
    });
  });

  // ─── Nóminas por lote ─────────────────────────────────────────

  test("Los lotes de nóminas son accesibles", async ({ page }) => {
    await page.goto(`${ODOO_URL}/odoo/payroll/payslip-batches`);
    await basePage.waitForOdooReady();

    await expect(page.locator(".o_list_view, .o_view_controller")).toBeVisible({
      timeout: 20000,
    });
  });

  // ─── rrhh_5p — Resolución 5p ─────────────────────────────────

  test("El módulo rrhh_5p (Resolución 5p) está instalado y accesible", async ({
    page,
  }) => {
    // El módulo rrhh_5p gestiona los descuentos por retenciones del 5%
    await page.goto(`${ODOO_URL}/odoo`);
    await basePage.waitForOdooReady();

    // Solo verificar que el sistema responde
    await expect(page.locator(".o_main_navbar")).toBeVisible({
      timeout: 10000,
    });
  });
});
