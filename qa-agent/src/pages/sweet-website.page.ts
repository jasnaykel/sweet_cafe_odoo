/**
 * Sweet Café QA — Page Object para el Sitio Web / E-commerce
 *
 * Cubre el frontend público de Sweet Café:
 *  - Página de inicio
 *  - Catálogo de productos (website_sale)
 *  - Formulario de reservas online (/reservar)
 *
 * Rutas: sweet_cafe_ecommerce/controllers/main.py
 */

import { Page, expect } from "@playwright/test";

export interface OnlineReservationData {
  name: string;
  email: string;
  phone?: string;
  branchName: string;
  deliveryDate: string; // YYYY-MM-DD
  deliveryTime?: string;
  notes?: string;
}

export class SweetWebsitePage {
  readonly page: Page;
  readonly baseUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.baseUrl = process.env.ODOO_URL || "http://localhost:8069";
  }

  // ─── Navegación ──────────────────────────────────────────────

  async gotoHome() {
    await this.page.goto(`${this.baseUrl}/`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async gotoShop() {
    await this.page.goto(`${this.baseUrl}/shop`);
    await this.page.waitForLoadState("networkidle");
  }

  async gotoReservationForm() {
    await this.page.goto(`${this.baseUrl}/reservar`);
    await this.page.waitForSelector("form", { timeout: 15000 });
  }

  async gotoProductPage(slug: string) {
    await this.page.goto(`${this.baseUrl}/shop/${slug}`);
    await this.page.waitForLoadState("networkidle");
  }

  // ─── Locators — Home ─────────────────────────────────────────

  get navbar() {
    return this.page.locator("#wrapwrap .navbar, nav.o_navbar, .o_header");
  }

  get heroSection() {
    return this.page
      .locator(".s_sweet_hero, .o_header_standard .s_hero, section.o_hero")
      .first();
  }

  get shopLink() {
    return this.page
      .locator("a")
      .filter({ hasText: /tienda|shop|catálogo/i })
      .first();
  }

  get reservationLink() {
    return this.page
      .locator("a[href='/reservar'], a")
      .filter({ hasText: /reservar|reserva/i })
      .first();
  }

  // ─── Locators — Tienda ───────────────────────────────────────

  get productCards() {
    return this.page.locator(
      ".oe_product_cart, .o_wsale_product_grid_item, .s_product_list article",
    );
  }

  get searchInput() {
    return this.page.locator(
      "input[name='search'], .oe_search_box input, #search_input",
    );
  }

  get addToCartButton() {
    return this.page
      .locator("a[href*='cart'], button")
      .filter({ hasText: /añadir|add to cart/i })
      .first();
  }

  get cartIcon() {
    return this.page.locator(
      ".o_wsale_my_cart, a.my_cart_quantity, .fa-shopping-cart",
    );
  }

  // ─── Locators — Formulario de Reserva ────────────────────────

  get reservationNameInput() {
    return this.page.locator("input[name='name'], #customer_name").first();
  }

  get reservationEmailInput() {
    return this.page
      .locator("input[name='email'], input[type='email']")
      .first();
  }

  get reservationPhoneInput() {
    return this.page.locator("input[name='phone'], input[type='tel']").first();
  }

  get reservationBranchSelect() {
    return this.page.locator("select[name='branch_id'], #branch_id");
  }

  get reservationDateInput() {
    return this.page
      .locator("input[name='delivery_date'], input[type='date']")
      .first();
  }

  get reservationTimeInput() {
    return this.page.locator("input[name='delivery_time']").first();
  }

  get reservationNotesInput() {
    return this.page.locator("textarea[name='customer_notes'], #notes").first();
  }

  get reservationSubmitButton() {
    return this.page
      .locator("button[type='submit'], input[type='submit']")
      .filter({ hasText: /reservar|enviar|confirmar/i })
      .first();
  }

  get successMessage() {
    return this.page
      .locator(".alert-success, .o_success, .s_alert_success, p")
      .filter({ hasText: /éxito|confirmada|reserva recibida/i })
      .first();
  }

  get errorMessage() {
    return this.page.locator(".alert-danger, .alert-warning, .o_error").first();
  }

  // ─── Acciones — Home ─────────────────────────────────────────

  async clickShopLink() {
    await this.shopLink.click();
    await this.page.waitForLoadState("networkidle");
  }

  async clickReservationLink() {
    await this.reservationLink.click();
    await this.page.waitForSelector("form", { timeout: 15000 });
  }

  // ─── Acciones — Tienda ───────────────────────────────────────

  async searchProduct(term: string) {
    await this.searchInput.fill(term);
    await this.page.keyboard.press("Enter");
    await this.page.waitForLoadState("networkidle");
  }

  async clickFirstProduct() {
    const firstCard = this.productCards.first();
    await firstCard.click();
    await this.page.waitForLoadState("networkidle");
  }

  async addFirstProductToCart() {
    await this.addToCartButton.click();
    await this.page.waitForTimeout(1000);
  }

  // ─── Acciones — Formulario de Reserva ────────────────────────

  async fillReservationForm(data: OnlineReservationData) {
    await this.reservationNameInput.fill(data.name);
    await this.reservationEmailInput.fill(data.email);

    if (data.phone) {
      await this.reservationPhoneInput.fill(data.phone).catch(() => {});
    }

    // Seleccionar sucursal
    const branchOption = this.page
      .locator("select[name='branch_id'] option")
      .filter({ hasText: data.branchName });
    if ((await branchOption.count()) > 0) {
      await this.reservationBranchSelect
        .selectOption({ label: data.branchName })
        .catch(async () => {
          // Fallback: seleccionar por índice 1 (primera sucursal)
          await this.reservationBranchSelect.selectOption({ index: 1 });
        });
    }

    await this.reservationDateInput.fill(data.deliveryDate);

    if (data.deliveryTime) {
      await this.reservationTimeInput.fill(data.deliveryTime).catch(() => {});
    }

    if (data.notes) {
      await this.reservationNotesInput.fill(data.notes).catch(() => {});
    }
  }

  async submitReservation() {
    await this.reservationSubmitButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  // ─── Aserciones ──────────────────────────────────────────────

  async expectHomeLoaded() {
    await expect(this.page).toHaveURL(
      new RegExp(this.baseUrl.replace("http://", "")),
    );
    await expect(this.page.locator("body")).toBeVisible();
  }

  async expectShopLoaded() {
    await expect(this.page).toHaveURL(/\/shop/);
    // Al menos un producto debe estar visible
    await expect(this.productCards.first()).toBeVisible({ timeout: 15000 });
  }

  async expectReservationSuccess() {
    await expect(this.successMessage).toBeVisible({ timeout: 15000 });
  }

  async expectProductCountAtLeast(count: number) {
    await expect(this.productCards).toHaveCount(count, { timeout: 15000 });
  }
}
