/**
 * Sweet Café QA — Base Page Object para Odoo 19
 *
 * Encapsula la navegación y acciones comunes del backend Odoo:
 * menús de aplicaciones, breadcrumbs, notificaciones, formularios.
 *
 * Referencia: odoo-19.0/odoo/addons/web/static/src/
 */

import { Page, Locator, expect } from "@playwright/test";

export class OdooBasePage {
  readonly page: Page;
  readonly odooUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.odooUrl = process.env.ODOO_URL || "http://localhost:8069";
  }

  // ─── Navegación general ──────────────────────────────────────

  async gotoHome() {
    await this.page.goto(`${this.odooUrl}/odoo`);
    await this.waitForOdooReady();
  }

  async waitForOdooReady() {
    // Esperar que desaparezca el spinner de carga de Odoo
    await this.page
      .waitForSelector(".o_loading_indicator", {
        state: "hidden",
        timeout: 30000,
      })
      .catch(() => {
        // El spinner puede no aparecer si la página cargó rápido
      });
    // Esperar que la barra de menú esté visible
    await this.page.waitForSelector(".o_main_navbar, .o_web_client", {
      timeout: 30000,
    });
  }

  // ─── Menú de aplicaciones ───────────────────────────────────

  async openAppMenu() {
    const homeIcon = this.page.locator(
      ".o_menu_brand, .o_home_menu_btn, a.o_menu_brand",
    );
    if (await homeIcon.isVisible()) {
      await homeIcon.click();
      await this.page.waitForTimeout(500);
    }
  }

  async openApp(appName: string) {
    await this.openAppMenu();
    // Buscar la app por nombre en el menú principal
    const appLink = this.page
      .locator(`.o_app[data-menu-xmlid], .o_home_menu .o_app`)
      .filter({ hasText: appName });

    if (!(await appLink.isVisible())) {
      // Intentar con el menú de navegación superior
      const menuItem = this.page
        .locator(".o_menu_sections .o_nav_entry")
        .filter({ hasText: appName });
      await menuItem.click();
    } else {
      await appLink.click();
    }
    await this.waitForOdooReady();
  }

  async navigateToMenu(menuPath: string[]) {
    // Ej: ['Sweet Café', 'Sucursales']
    for (const item of menuPath) {
      const menuLocator = this.page
        .locator(`.o_menu_sections span, .o_nav_entry, .o_menu_item`)
        .filter({ hasText: item })
        .first();
      await menuLocator.click();
      await this.page.waitForTimeout(400);
    }
    await this.waitForOdooReady();
  }

  // ─── Formularios Odoo ────────────────────────────────────────

  async clickNew() {
    const newBtn = this.page
      .locator(
        "button.o_list_button_add, button[data-action='new'], .o_form_button_new",
      )
      .first();
    await newBtn.click();
    await this.waitForOdooReady();
  }

  async fillField(fieldName: string, value: string) {
    // Selector genérico para campos de formulario Odoo
    const field = this.page
      .locator(`[name="${fieldName}"] input, [name="${fieldName}"] textarea`)
      .first();
    await field.click();
    await field.fill(value);
  }

  async selectField(fieldName: string, value: string) {
    const field = this.page.locator(`[name="${fieldName}"] select`).first();
    await field.selectOption({ label: value });
  }

  async selectMany2One(fieldName: string, value: string) {
    const input = this.page
      .locator(`[name="${fieldName}"] input.o_input`)
      .first();
    await input.fill(value);
    await this.page.waitForTimeout(600);
    const option = this.page
      .locator(".o_field_widget .dropdown-item, .ui-menu-item")
      .filter({ hasText: value })
      .first();
    if (await option.isVisible()) {
      await option.click();
    } else {
      // Seleccionar primera opción del dropdown
      await this.page.keyboard.press("Enter");
    }
  }

  async clickSave() {
    const saveBtn = this.page
      .locator(
        "button.o_form_button_save, button[data-action='save'], .o_form_status_indicator_buttons button",
      )
      .first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await this.waitForOdooReady();
    }
  }

  async clickButton(label: string) {
    const btn = this.page
      .locator("button, .btn")
      .filter({ hasText: label })
      .first();
    await btn.click();
    await this.waitForOdooReady();
  }

  async clickBreadcrumb(label: string) {
    const crumb = this.page
      .locator(".o_breadcrumb .o_back_button, .breadcrumb-item a")
      .filter({ hasText: label })
      .first();
    await crumb.click();
    await this.waitForOdooReady();
  }

  // ─── Notificaciones / Alertas ────────────────────────────────

  async waitForSuccessNotification() {
    await expect(
      this.page.locator(".o_notification.bg-success, .o_notification_body"),
    ).toBeVisible({ timeout: 15000 });
  }

  async waitForErrorNotification() {
    await expect(
      this.page.locator(".o_notification.bg-danger, .o_error_dialog"),
    ).toBeVisible({ timeout: 10000 });
  }

  async dismissNotification() {
    const closeBtn = this.page
      .locator(".o_notification .o_notification_close")
      .first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  }

  // ─── Búsqueda en listas ──────────────────────────────────────

  async searchRecord(term: string) {
    const searchInput = this.page
      .locator(".o_searchview_input, input.o_searchview_input")
      .first();
    await searchInput.fill(term);
    await this.page.keyboard.press("Enter");
    await this.waitForOdooReady();
  }

  async clearSearch() {
    const clearBtn = this.page
      .locator(".o_searchview .o_facet_remove, .o_searchview_facet .o_delete")
      .first();
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await this.waitForOdooReady();
    }
  }

  // ─── Diálogos de confirmación ────────────────────────────────

  async confirmDialog(buttonLabel = "Aceptar") {
    const btn = this.page
      .locator(".modal-footer button, .o_dialog_footer button")
      .filter({ hasText: new RegExp(buttonLabel, "i") })
      .first();
    await btn.click();
    await this.waitForOdooReady();
  }

  async cancelDialog() {
    const btn = this.page
      .locator(".modal-footer button, .o_dialog_footer button")
      .filter({ hasText: /cancelar|descartar|cerrar/i })
      .first();
    await btn.click();
    await this.page.waitForTimeout(300);
  }

  // ─── Vista Kanban / Lista ────────────────────────────────────

  async switchToListView() {
    const listBtn = this.page
      .locator(
        "button.o_list_view, .o_view_switcher button[aria-label='List'], .o_switch_view.o_list",
      )
      .first();
    if (await listBtn.isVisible()) {
      await listBtn.click();
      await this.waitForOdooReady();
    }
  }

  async switchToKanbanView() {
    const kanbanBtn = this.page
      .locator(
        ".o_switch_view.o_kanban, .o_view_switcher button[aria-label='Kanban']",
      )
      .first();
    if (await kanbanBtn.isVisible()) {
      await kanbanBtn.click();
      await this.waitForOdooReady();
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────

  async getFieldValue(fieldName: string): Promise<string> {
    const field = this.page.locator(`[name="${fieldName}"]`).first();
    const input = field.locator("input, textarea, span.o_field_widget");
    return (await input.inputValue().catch(() => input.textContent())) ?? "";
  }

  async recordCount(): Promise<number> {
    const countText = await this.page
      .locator(".o_pager_value, .o_pager .o_pager_limit")
      .first()
      .textContent()
      .catch(() => "0");
    const match = countText?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
