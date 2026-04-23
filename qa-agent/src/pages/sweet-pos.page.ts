/**
 * Sweet Café QA — Page Object para Punto de Venta (POS)
 *
 * Cubre la apertura de sesión POS, venta y cierre de sesión.
 * Modelo: pos.config extendido en sweet_cafe_management/models/pos_config.py
 * Referencia Odoo: odoo-19.0/addons/point_of_sale/
 */

import { Page, expect } from "@playwright/test";
import { OdooBasePage } from "./odoo-base.page.js";

export class SweetPosPage extends OdooBasePage {
  constructor(page: Page) {
    super(page);
  }

  // ─── Navegación al backend de POS ────────────────────────────

  async gotoPosBackend() {
    await this.gotoHome();
    await this.page
      .goto(`${this.odooUrl}/odoo/point-of-sale/configuration`)
      .catch(() => {});
    await this.waitForOdooReady();
  }

  // ─── Locators — Backend POS ──────────────────────────────────

  get posConfigRows() {
    return this.page.locator(
      ".o_pos_config_card, .o_data_row, .o_kanban_record",
    );
  }

  get openSessionButton() {
    return this.page
      .locator("button, .btn")
      .filter({ hasText: /abrir sesión|open session|nueva sesión/i })
      .first();
  }

  // ─── Locators — Interfaz POS (frontend) ──────────────────────

  get posProductGrid() {
    return this.page.locator(
      ".product-list, .o_product_list, .pos-product-grid",
    );
  }

  get posProductItem() {
    return this.page.locator(".product, .o_product, .pos-product").first();
  }

  get posOrderLines() {
    return this.page.locator(".orderlines .orderline, .order .orderline");
  }

  get posPaymentButton() {
    return this.page
      .locator("button.pay, .btn")
      .filter({ hasText: /pagar|payment|cobrar/i })
      .first();
  }

  get posNumpad() {
    return this.page.locator(".numpad, .o_numpad");
  }

  get posCloseButton() {
    return this.page
      .locator("button")
      .filter({ hasText: /cerrar sesión|close/i })
      .first();
  }

  get posOrderTotal() {
    return this.page.locator(".order-total, .o_total, .pos-order-total");
  }

  get posCustomerSearch() {
    return this.page
      .locator(".customer-search input, input[placeholder*='cliente']")
      .first();
  }

  get posValidatePaymentButton() {
    return this.page
      .locator("button.validate, .btn")
      .filter({ hasText: /validar|validate/i })
      .first();
  }

  // ─── Acciones ────────────────────────────────────────────────

  async openPosSession() {
    await this.openSessionButton.click();
    // Esperar la carga del POS (puede ser lenta la primera vez)
    await this.page.waitForLoadState("networkidle", { timeout: 60000 });
    await this.page.waitForSelector(
      ".product-list, .pos-product-grid, .o_product_list",
      {
        timeout: 60000,
      },
    );
  }

  async addProductToOrder(productName?: string) {
    if (productName) {
      const product = this.page
        .locator(".product, .pos-product")
        .filter({ hasText: productName })
        .first();
      await product.click();
    } else {
      await this.posProductItem.click();
    }
    await this.page.waitForTimeout(500);
  }

  async goToPayment() {
    await this.posPaymentButton.click();
    await this.page.waitForTimeout(1000);
  }

  async validatePayment() {
    await this.posValidatePaymentButton.click();
    await this.page.waitForTimeout(2000);
  }

  async closePosSession() {
    // Cerrar sesión desde el menú de POS
    const menuBtn = this.page
      .locator(
        ".o_pos_menu_button, .pos-topheader .btn-menu, button[class*='hamburger']",
      )
      .first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await this.page.waitForTimeout(500);
    }
    const closeOption = this.page
      .locator(".o_pos_close_button, .modal, a, button")
      .filter({ hasText: /cerrar sesión|close session/i })
      .first();
    if (await closeOption.isVisible()) {
      await closeOption.click();
      await this.confirmDialog("Cerrar");
    }
  }

  // ─── Aserciones ──────────────────────────────────────────────

  async expectPosSessionOpen() {
    await expect(this.posProductGrid).toBeVisible({ timeout: 30000 });
  }

  async expectOrderHasLines(count: number) {
    await expect(this.posOrderLines).toHaveCount(count, { timeout: 10000 });
  }

  async expectPaymentScreenVisible() {
    await expect(
      this.page.locator(".payment-screen, .o_payment_screen, .pos-payment"),
    ).toBeVisible({ timeout: 15000 });
  }
}
