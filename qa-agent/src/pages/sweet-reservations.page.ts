/**
 * Sweet Café QA — Page Object para Reservas (sweet.reservation)
 *
 * Flujo: draft → confirmed → ready → done / cancelled
 * Modelo: sweet.reservation en sweet_cafe_management/models/sweet_reservation.py
 */

import { Page, expect } from "@playwright/test";
import { OdooBasePage } from "./odoo-base.page.js";

export interface ReservationData {
  partnerName: string;
  branchName: string;
  deliveryDate: string; // YYYY-MM-DD
  deliveryTime?: string;
  notes?: string;
}

export class SweetReservationsPage extends OdooBasePage {
  constructor(page: Page) {
    super(page);
  }

  // ─── Navegación ──────────────────────────────────────────────

  async goto() {
    await this.gotoHome();
    await this.page
      .goto(`${this.odooUrl}/odoo/sweet-reservations`)
      .catch(() => {});
    await this.waitForOdooReady();
  }

  // ─── Locators ────────────────────────────────────────────────

  get partnerField() {
    return this.page.locator("[name='partner_id'] input").first();
  }

  get branchField() {
    return this.page.locator("[name='branch_id'] input").first();
  }

  get deliveryDateField() {
    return this.page.locator("[name='delivery_date'] input").first();
  }

  get deliveryTimeField() {
    return this.page.locator("[name='delivery_time'] input").first();
  }

  get notesField() {
    return this.page
      .locator("[name='customer_notes'] textarea, [name='note'] textarea")
      .first();
  }

  get stateField() {
    return this.page.locator(
      ".o_statusbar_status .o_arrow_button_current, .o_statusbar .o_statusbar_status button.o_arrow_button_current",
    );
  }

  get confirmButton() {
    return this.page
      .locator("button")
      .filter({ hasText: /confirmar/i })
      .first();
  }

  get readyButton() {
    return this.page
      .locator("button")
      .filter({ hasText: /lista para entrega|marcar lista/i })
      .first();
  }

  get doneButton() {
    return this.page
      .locator("button")
      .filter({ hasText: /entregar|done/i })
      .first();
  }

  get cancelButton() {
    return this.page
      .locator("button")
      .filter({ hasText: /cancelar/i })
      .first();
  }

  // ─── Acciones ────────────────────────────────────────────────

  async createReservation(data: ReservationData) {
    await this.clickNew();

    // Cliente
    await this.partnerField.fill(data.partnerName);
    await this.page.waitForTimeout(600);
    const partnerOption = this.page
      .locator(".o_field_widget .dropdown-item, .ui-menu-item")
      .filter({ hasText: data.partnerName })
      .first();
    if (await partnerOption.isVisible()) {
      await partnerOption.click();
    } else {
      // Crear cliente rápido si no existe
      const quickCreate = this.page
        .locator(".o_field_widget .o_m2o_dropdown_option")
        .filter({ hasText: /crear|create/i })
        .first();
      if (await quickCreate.isVisible()) {
        await quickCreate.click();
      }
    }
    await this.page.waitForTimeout(300);

    // Sucursal
    await this.branchField.fill(data.branchName);
    await this.page.waitForTimeout(600);
    const branchOption = this.page
      .locator(".dropdown-item")
      .filter({ hasText: data.branchName })
      .first();
    if (await branchOption.isVisible()) {
      await branchOption.click();
    }

    // Fecha de entrega
    await this.deliveryDateField.fill(data.deliveryDate);
    await this.page.keyboard.press("Escape");

    // Hora de entrega
    if (data.deliveryTime) {
      await this.deliveryTimeField.fill(data.deliveryTime).catch(() => {});
    }

    await this.clickSave();
  }

  async confirmReservation() {
    await this.confirmButton.click();
    await this.waitForOdooReady();
  }

  async markAsReady() {
    await this.readyButton.click();
    await this.waitForOdooReady();
  }

  async markAsDone() {
    await this.doneButton.click();
    await this.waitForOdooReady();
  }

  async cancelReservation() {
    await this.cancelButton.click();
    await this.confirmDialog();
    await this.waitForOdooReady();
  }

  async findReservationByPartner(partnerName: string) {
    await this.searchRecord(partnerName);
    return this.page
      .locator(".o_data_row")
      .filter({ hasText: partnerName })
      .first();
  }

  // ─── Aserciones ──────────────────────────────────────────────

  async expectState(
    state:
      | "Borrador"
      | "Confirmada"
      | "Lista para Entrega"
      | "Entregada"
      | "Cancelada",
  ) {
    await expect(this.stateField).toHaveText(new RegExp(state, "i"), {
      timeout: 10000,
    });
  }

  async expectReservationInList(partnerName: string) {
    await this.searchRecord(partnerName);
    await expect(
      this.page.locator(".o_data_row").filter({ hasText: partnerName }),
    ).toBeVisible({ timeout: 10000 });
    await this.clearSearch();
  }
}
