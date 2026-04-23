/**
 * Sweet Café QA — Page Object para Login de Odoo 19
 *
 * Maneja el flujo de autenticación del backend Odoo.
 * Referencia: odoo-19.0/odoo/addons/web/static/src/webclient/components/
 */

import { Page, expect } from "@playwright/test";

export class OdooLoginPage {
  readonly page: Page;
  readonly odooUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.odooUrl = process.env.ODOO_URL || "http://localhost:8069";
  }

  // ─── Navegación ──────────────────────────────────────────────

  async goto() {
    await this.page.goto(`${this.odooUrl}/web/login`);
    await this.page.waitForSelector("#login, input[name='login']", {
      timeout: 30000,
    });
  }

  async gotoWithDb(db: string) {
    await this.page.goto(`${this.odooUrl}/web/login?db=${db}`);
    await this.page.waitForSelector("#login, input[name='login']", {
      timeout: 30000,
    });
  }

  // ─── Locators ────────────────────────────────────────────────

  get loginInput() {
    return this.page.locator("input[name='login'], #login");
  }

  get passwordInput() {
    return this.page.locator("input[name='password'], #password");
  }

  get dbSelect() {
    return this.page.locator("select[name='db'], #db");
  }

  get loginButton() {
    return this.page
      .locator("button[type='submit'], .btn-primary[type='submit']")
      .first();
  }

  get errorMessage() {
    return this.page.locator(".alert-danger, .o_login_error p, p.alert");
  }

  get odooLogo() {
    return this.page.locator(".o_login_logo img, .oe_login_logo");
  }

  // ─── Acciones ────────────────────────────────────────────────

  async login(email: string, password: string, db?: string) {
    await this.loginInput.fill(email);
    await this.passwordInput.fill(password);

    if (db) {
      const dbSelector = this.dbSelect;
      if (await dbSelector.isVisible().catch(() => false)) {
        await dbSelector.selectOption(db).catch(() => {});
      }
    }

    await this.loginButton.click();

    // Odoo 19 redirige a /odoo o /web tras login exitoso.
    // Esperamos cualquier URL que no sea /web/login.
    await this.page.waitForFunction(
      () => !window.location.pathname.startsWith("/web/login"),
      { timeout: 30000 },
    );

    // Esperar que el cliente web esté cargado
    await this.page
      .waitForSelector(
        ".o_home_menu, .o_main_navbar, .o_action_manager, .o_web_client",
        {
          timeout: 30000,
        },
      )
      .catch(() => {});
  }

  async loginAsAdmin() {
    const email = process.env.ODOO_ADMIN_EMAIL || "admin";
    const password = process.env.ODOO_ADMIN_PASSWORD || "admin";
    const db = process.env.ODOO_DB;
    await this.login(email, password, db);
  }

  async loginAsUser() {
    const email = process.env.ODOO_USER_EMAIL || "usuario@sweetcafe.cu";
    const password = process.env.ODOO_USER_PASSWORD || "test1234";
    await this.login(email, password);
  }

  async logout() {
    // Hacer click en el menú de usuario
    const userMenu = this.page.locator(
      ".o_user_menu, .o_menu_user, .o_topbar_user_menu",
    );
    await userMenu.click();
    const logoutItem = this.page
      .locator("a[href='/web/session/logout'], .o_dropdown_item")
      .filter({ hasText: /salir|logout/i })
      .first();
    await logoutItem.click();
    await this.page.waitForURL(/\/web\/login/, { timeout: 15000 });
  }

  // ─── Aserciones ──────────────────────────────────────────────

  async expectLoginPageVisible() {
    await expect(this.loginInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  async expectErrorVisible() {
    await expect(this.errorMessage).toBeVisible({ timeout: 10000 });
  }

  async expectLoggedIn() {
    // Odoo 19: la URL post-login puede ser /odoo, /web, /, etc.
    await this.page.waitForFunction(
      () => !window.location.pathname.startsWith("/web/login"),
      { timeout: 15000 },
    );
    // El cliente web de Odoo debe estar visible
    await expect(
      this.page
        .locator(
          ".o_home_menu, .o_main_navbar, .o_action_manager, .o_web_client",
        )
        .first(),
    ).toBeVisible({ timeout: 15000 });
  }
}
