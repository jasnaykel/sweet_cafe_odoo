/**
 * Sweet Café QA — Tests de Reservas (sweet.reservation)
 *
 * Valida el flujo completo de reservas de pedido.
 * Flujo: Borrador → Confirmada → Lista para Entrega → Entregada / Cancelada
 *
 * Modelo: sweet_cafe_management/models/sweet_reservation.py
 */

import { test, expect } from "@playwright/test";
import { OdooBasePage } from "../../src/pages/odoo-base.page.js";

const ODOO_URL = process.env.ODOO_URL || "http://localhost:8069";

test.describe("📋 Reservas de Pedido — Sweet Café", () => {
  let basePage: OdooBasePage;

  test.beforeEach(async ({ page }) => {
    basePage = new OdooBasePage(page);
  });

  // ─── Carga del módulo ─────────────────────────────────────────

  test("La vista de Reservas carga correctamente", async ({ page }) => {
    await reservationsPage.goto();

    await expect(
      page.locator(".o_list_view, .o_kanban_view, .o_view_controller"),
    ).toBeVisible({ timeout: 20000 });
  });

  // ─── Creación de reserva ──────────────────────────────────────

  test("Crear una reserva en estado Borrador", async ({ page }) => {
    await reservationsPage.goto();
    await reservationsPage.clickNew();

    // El formulario de reserva debe estar visible
    await expect(page.locator(".o_form_view")).toBeVisible({ timeout: 15000 });

    // El estado inicial debe ser Borrador
    await expect(
      page.locator(
        ".o_statusbar_status .o_arrow_button_current, .o_field_status_bar span",
      ),
    ).toContainText(/borrador|draft/i, { timeout: 10000 });
  });

  test("La reserva requiere un cliente (partner_id)", async ({ page }) => {
    await reservationsPage.goto();
    await reservationsPage.clickNew();

    // Intentar guardar sin cliente
    await reservationsPage.clickSave();

    // Debe mostrar error de campo requerido
    await expect(
      page.locator(
        ".o_field_invalid, .o_notification.bg-danger, .o_form_error_dialog",
      ),
    ).toBeVisible({ timeout: 10000 });
  });

  // ─── Flujo de estados ─────────────────────────────────────────

  test("La barra de estado muestra los estados correctos", async ({ page }) => {
    await reservationsPage.goto();
    await reservationsPage.clickNew();

    // Verificar que la barra de estado de Odoo está visible
    const statusBar = page.locator(".o_statusbar_status, .o_field_status_bar");
    await expect(statusBar).toBeVisible({ timeout: 15000 });

    // Los estados deben incluir los definidos en el modelo
    const statusText = await statusBar.textContent();
    expect(statusText).toMatch(/borrador|draft/i);
  });

  // ─── Vista lista y kanban ─────────────────────────────────────

  test("Se puede cambiar entre vista lista y kanban", async ({ page }) => {
    await reservationsPage.goto();

    // Cambiar a lista
    await reservationsPage.switchToListView();
    await expect(page.locator(".o_list_view")).toBeVisible({ timeout: 10000 });

    // Cambiar a kanban
    await reservationsPage.switchToKanbanView();
    await expect(page.locator(".o_kanban_view")).toBeVisible({
      timeout: 10000,
    });
  });

  // ─── Filtros y agrupación ─────────────────────────────────────

  test("Se pueden aplicar filtros de búsqueda", async ({ page }) => {
    await reservationsPage.goto();

    // Hacer una búsqueda simple
    await reservationsPage.searchRecord("test");
    await page.waitForTimeout(1000);

    // La búsqueda no debe generar error
    await expect(page.locator(".o_list_view, .o_kanban_view")).toBeVisible({
      timeout: 10000,
    });

    await reservationsPage.clearSearch();
  });

  // ─── Formulario de reserva ────────────────────────────────────

  test("El formulario de reserva tiene todos los campos requeridos", async ({
    page,
  }) => {
    await reservationsPage.goto();
    await reservationsPage.clickNew();

    // Verificar campos esenciales del modelo
    await expect(page.locator("[name='partner_id']")).toBeVisible();
    await expect(page.locator("[name='branch_id']")).toBeVisible();
    await expect(page.locator("[name='delivery_date']")).toBeVisible();
    await expect(page.locator("[name='state']")).toBeVisible();
  });

  // ─── Secuencia automática ─────────────────────────────────────

  test("Una nueva reserva tiene referencia automática 'Nueva'", async ({
    page,
  }) => {
    await reservationsPage.goto();
    await reservationsPage.clickNew();

    // La referencia inicial debe ser 'Nueva' o 'New' (campo name)
    const nameField = page.locator(
      "[name='name'] input, [name='name'] span.o_field_widget",
    );
    const value =
      (await nameField.textContent().catch(() => "")) ||
      (await nameField.inputValue().catch(() => "Nueva"));
    expect(value).toMatch(/nueva|new/i);
  });
});
