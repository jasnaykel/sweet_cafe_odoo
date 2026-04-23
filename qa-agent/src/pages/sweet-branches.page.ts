/**
 * Sweet Café QA — Page Object para Sucursales (sweet.branch)
 *
 * Gestión de sucursales multi-ubicación de Sweet Café.
 * Modelo: sweet.branch en sweet_cafe_management/models/sweet_branch.py
 */

import { Page, expect } from "@playwright/test";
import { OdooBasePage } from "./odoo-base.page.js";

export type BranchType = "main" | "secondary" | "mobile" | "online";

export interface BranchData {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  branchType?: BranchType;
}

export class SweetBranchesPage extends OdooBasePage {
  constructor(page: Page) {
    super(page);
  }

  // ─── Navegación ──────────────────────────────────────────────

  async goto() {
    // Navegar al menú de Sucursales de Sweet Café
    await this.gotoHome();
    await this.page.goto(`${this.odooUrl}/odoo/sweet-branches`).catch(() => {
      // Fallback: navegar por menú
    });
    await this.waitForOdooReady();
  }

  async gotoViaMenu() {
    await this.gotoHome();
    // Abrir Sweet Café app
    const sweetApp = this.page
      .locator(".o_app_name, .o_home_menu .o_app")
      .filter({ hasText: /sweet café/i })
      .first();
    await sweetApp.click();
    await this.waitForOdooReady();
    // Navegar a Sucursales
    await this.navigateToMenu(["Configuración", "Sucursales"]);
  }

  // ─── Locators ────────────────────────────────────────────────

  get branchList() {
    return this.page.locator(".o_list_view .o_data_row");
  }

  get branchKanbanCards() {
    return this.page.locator(".o_kanban_view .o_kanban_record");
  }

  get nameField() {
    return this.page.locator("[name='name'] input").first();
  }

  get codeField() {
    return this.page.locator("[name='code'] input").first();
  }

  get addressField() {
    return this.page
      .locator("[name='address'] input, [name='address'] textarea")
      .first();
  }

  get phoneField() {
    return this.page.locator("[name='phone'] input").first();
  }

  get branchTypeSelect() {
    return this.page
      .locator(
        "[name='branch_type'] select, [name='branch_type'] .o_field_widget",
      )
      .first();
  }

  get activeToggle() {
    return this.page
      .locator(
        "[name='active'] input[type='checkbox'], [name='active'] .o_boolean_toggle",
      )
      .first();
  }

  // ─── Acciones ────────────────────────────────────────────────

  async createBranch(data: BranchData) {
    await this.clickNew();

    await this.nameField.fill(data.name);
    await this.codeField.fill(data.code);

    if (data.address) {
      await this.addressField.fill(data.address).catch(() => {});
    }
    if (data.phone) {
      await this.phoneField.fill(data.phone).catch(() => {});
    }
    if (data.branchType) {
      const typeLabels: Record<BranchType, string> = {
        main: "Matriz / Principal",
        secondary: "Sucursal Secundaria",
        mobile: "Punto de Venta Móvil",
        online: "Canal Online",
      };
      await this.selectField("branch_type", typeLabels[data.branchType]).catch(
        () => {},
      );
    }

    await this.clickSave();
  }

  async findBranchRow(name: string) {
    return this.page.locator(".o_data_row").filter({ hasText: name }).first();
  }

  async openBranch(name: string) {
    const row = await this.findBranchRow(name);
    await row.click();
    await this.waitForOdooReady();
  }

  async archiveBranch(name: string) {
    await this.openBranch(name);
    const actionMenu = this.page
      .locator(".o_action_manager .dropdown-toggle, button.o_cog_menu_toggle")
      .first();
    await actionMenu.click();
    const archiveOption = this.page
      .locator(".dropdown-item")
      .filter({ hasText: /archivar/i })
      .first();
    await archiveOption.click();
    await this.confirmDialog("Aceptar");
  }

  // ─── Aserciones ──────────────────────────────────────────────

  async expectBranchExists(name: string) {
    await this.searchRecord(name);
    await expect(
      this.page.locator(".o_data_row").filter({ hasText: name }),
    ).toBeVisible();
    await this.clearSearch();
  }

  async expectBranchCount(count: number) {
    const rows = this.branchList;
    await expect(rows).toHaveCount(count, { timeout: 10000 });
  }

  async expectCurrentBranchName(name: string) {
    await expect(this.nameField).toHaveValue(name, { timeout: 10000 });
  }
}
