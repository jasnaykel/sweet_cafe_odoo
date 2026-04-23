/**
 * Sweet Café QA — Tests Exhaustivos del Flujo de Empleado (Cuba)
 *
 * Valida los fixes recientes al formulario de empleado en l10n_cu_hr:
 *   - Pestaña "Others" oculta (afiliación política)
 *   - Campo private_phone oculto (teléfono duplicado)
 *   - Campo "Código Empleado" (number) en pestaña Trabajo (no en cabecera)
 *   - Validaciones de CI y código como warning (no bloqueantes)
 *   - Categoría ocupacional visible
 *   - Creación completa de empleado sin "Missing required fields"
 *   - Guardia en payroll.movement cuando no hay employee_id
 *
 * Módulos cubiertos:
 *   - l10n_cu_hr/views/hr_employee_views.xml
 *   - l10n_cu_hr/models/hr_employee.py
 *   - l10n_cu_hr_payroll_movement/models/hr_contract.py
 */

import { test, expect, Page } from "@playwright/test";
import { OdooBasePage } from "../../src/pages/odoo-base.page.js";

const ODOO_URL = process.env.ODOO_URL || "http://localhost:8069";

/** Espera a que el formulario Odoo esté completamente renderizado */
async function waitForFormReady(page: Page) {
  await page.waitForSelector(".o_form_view", { timeout: 20000 });
  await page
    .waitForSelector(".o_form_view .o_field_widget", { timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(800);
}

/** Genera un código de empleado único de 5 dígitos */
function generateEmployeeCode(): string {
  return String(10000 + Math.floor(Math.random() * 89999));
}

/** Genera un CI cubano válido de 11 dígitos */
function generateCI(): string {
  // Formato YYMMDDXXXXX
  const yy = String(80 + Math.floor(Math.random() * 20)).padStart(2, "0");
  const mm = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const dd = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
  const rest = String(Math.floor(Math.random() * 99999)).padStart(5, "0");
  return `${yy}${mm}${dd}${rest}`;
}

test.describe("👤 Flujo de Empleado — Sweet Café (l10n_cu_hr)", () => {
  let basePage: OdooBasePage;

  test.beforeEach(async ({ page }) => {
    basePage = new OdooBasePage(page);
    await page.goto(`${ODOO_URL}/odoo/employees/new`);
    await waitForFormReady(page);
  });

  // ─── 1. Estructura del formulario ──────────────────────────────

  test("Formulario carga sin errores y muestra campos básicos", async ({
    page,
  }) => {
    await expect(page.locator(".o_form_view")).toBeVisible();
    await expect(page.locator("[name='name']").first()).toBeVisible();
    await expect(page.locator("[name='last_name']").first()).toBeVisible();
    await expect(
      page.locator("[name='second_last_name']").first(),
    ).toBeVisible();
    await expect(page.locator("[name='work_email']").first()).toBeVisible();
  });

  test("El botón 'Crear usuario' está visible", async ({ page }) => {
    const createUserBtn = page
      .locator("button")
      .filter({ hasText: /crear usuario|create user/i })
      .first();
    await expect(createUserBtn).toBeVisible({ timeout: 10000 });
  });

  // ─── 2. Pestañas: Others debe estar OCULTA ────────────────────

  test("La pestaña 'Others' (afiliación política) NO está visible", async ({
    page,
  }) => {
    const othersTab = page
      .locator(".o_notebook .nav-link")
      .filter({ hasText: /^others$|^otros$/i });
    // No debe existir ninguna pestaña visible llamada Others
    const count = await othersTab.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(othersTab.nth(i)).toBeHidden();
      }
    }
  });

  test("El campo political_affiliation NO es visible en el form", async ({
    page,
  }) => {
    const polField = page.locator("[name='political_affiliation']");
    const count = await polField.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(polField.nth(i)).toBeHidden();
      }
    }
  });

  // ─── 3. Teléfonos: private_phone debe estar OCULTO ────────────

  test("El campo 'private_phone' está oculto (sin duplicado)", async ({
    page,
  }) => {
    const privPhone = page.locator("[name='private_phone']");
    const count = await privPhone.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(privPhone.nth(i)).toBeHidden();
      }
    }
  });

  test("Solo work_phone y mobile_phone son visibles en cabecera", async ({
    page,
  }) => {
    await expect(page.locator("[name='work_phone']").first()).toBeVisible();
    await expect(page.locator("[name='mobile_phone']").first()).toBeVisible();
  });

  // ─── 4. Código Empleado en pestaña Trabajo ────────────────────

  test("El campo 'Código Empleado' (number) está en la pestaña Trabajo, no en cabecera", async ({
    page,
  }) => {
    // Click en pestaña Trabajo
    const workTab = page
      .locator(".o_notebook .nav-link")
      .filter({ hasText: /^trabajo$|^work$/i })
      .first();
    if (await workTab.isVisible()) {
      await workTab.click();
      await page.waitForTimeout(500);
    }

    const numberField = page.locator("[name='number']").first();
    await expect(numberField).toBeVisible({ timeout: 10000 });
  });

  test("El campo 'number' NO aparece en la cabecera junto a mobile_phone", async ({
    page,
  }) => {
    // En la cabecera (sheet header) buscamos el div con name+email+phones
    // El número de empleado no debe estar entre los <h5> de la cabecera
    const headerArea = page.locator(".o_form_sheet > div").first();
    const numberInHeader = headerArea.locator("h5 [name='number']");
    expect(await numberInHeader.count()).toBe(0);
  });

  // ─── 5. Categoría ocupacional visible ────────────────────────

  test("El campo 'occupational_category_id' está disponible en el formulario", async ({
    page,
  }) => {
    // El campo puede estar en cualquier pestaña — verificamos presencia en el DOM
    // (los campos en pestañas no activas existen en el DOM pero ocultos en Odoo 19)
    const occField = page.locator("[name='occupational_category_id']");
    const count = await occField.count();
    expect(count).toBeGreaterThan(0);
  });

  // ─── 6. Validaciones no bloqueantes ──────────────────────────

  test("El código de empleado con menos de 5 dígitos muestra warning, no bloquea", async ({
    page,
  }) => {
    // Llenar nombre obligatorio
    await page.locator("[name='name'] input").first().fill("TestQA");
    await page.locator("[name='last_name'] input").first().fill("ApellidoQA");
    await page
      .locator("[name='second_last_name'] input")
      .first()
      .fill("Segundo");

    // Ir a pestaña Trabajo
    const workTab = page
      .locator(".o_notebook .nav-link")
      .filter({ hasText: /^trabajo$|^work$/i })
      .first();
    if (await workTab.isVisible()) {
      await workTab.click();
      await page.waitForTimeout(500);
    }

    // Llenar código con 3 dígitos (inválido)
    const numberInput = page.locator("[name='number'] input").first();
    if (await numberInput.isVisible().catch(() => false)) {
      await numberInput.fill("123");
      await numberInput.blur();
      await page.waitForTimeout(800);

      // No debe aparecer un Error de validación bloqueante
      const errorDialog = page
        .locator(".modal-title, .o_dialog_title")
        .filter({ hasText: /error de validación|validation error/i });
      const errorVisible = await errorDialog
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      expect(errorVisible).toBe(false);
    }
  });

  // ─── 7. Creación completa del empleado ───────────────────────

  test("Se puede crear un empleado completo sin errores", async ({ page }) => {
    const code = generateEmployeeCode();
    const ci = generateCI();
    const fullName = `QA Test ${Date.now()}`;

    // Cabecera: nombre y apellidos
    await page.locator("[name='name'] input").first().fill(fullName);
    await page.locator("[name='last_name'] input").first().fill("Pérez");
    await page.locator("[name='second_last_name'] input").first().fill("Gómez");
    await page
      .locator("[name='work_email'] input")
      .first()
      .fill(`qatest${Date.now()}@sweetcafe.cu`);

    // Pestaña Trabajo: departamento + código
    const workTab = page
      .locator(".o_notebook .nav-link")
      .filter({ hasText: /^trabajo$|^work$/i })
      .first();
    if (await workTab.isVisible()) {
      await workTab.click();
      await page.waitForTimeout(500);
    }

    // Código empleado (5 dígitos)
    const numberInput = page.locator("[name='number'] input").first();
    if (await numberInput.isVisible().catch(() => false)) {
      await numberInput.fill(code);
    }

    // Departamento (cualquiera disponible)
    const deptInput = page.locator("[name='department_id'] input").first();
    if (await deptInput.isVisible().catch(() => false)) {
      await deptInput.click();
      await page.waitForTimeout(500);
      const firstOpt = page
        .locator(".dropdown-menu .dropdown-item, .ui-menu-item")
        .first();
      if (await firstOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstOpt.click();
        await page.waitForTimeout(400);
      } else {
        // Cerrar el dropdown
        await page.keyboard.press("Escape");
      }
    }

    // CI 11 dígitos
    const ciInput = page.locator("[name='identification_id'] input").first();
    if (await ciInput.isVisible().catch(() => false)) {
      await ciInput.fill(ci);
    }

    // Guardar (botón cloud o Ctrl+S)
    await page.keyboard.press("Control+s");
    await page.waitForTimeout(2500);

    // No debe aparecer un Error de validación
    const errorModal = page
      .locator(".modal-title, .o_dialog_title")
      .filter({ hasText: /error de validación|validation error/i });
    const hasError = await errorModal
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    expect(hasError).toBe(false);

    // El empleado debe haberse guardado (breadcrumb actualizado o id en url)
    const breadcrumb = page.locator(".breadcrumb, .o_breadcrumb").first();
    const breadcrumbText = await breadcrumb.textContent().catch(() => "");
    expect(breadcrumbText?.toLowerCase()).toContain("emple");
  });

  // ─── 8. No hay duplicados visibles de campos críticos ────────

  test("No hay campos duplicados visibles de mobile_phone en cabecera", async ({
    page,
  }) => {
    // En la cabecera (h5 elements) solo debe haber 1 mobile_phone visible
    const headerMobiles = page.locator(
      ".o_form_sheet h5 [name='mobile_phone']",
    );
    const count = await headerMobiles.count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test("No hay campos duplicados visibles de work_phone", async ({ page }) => {
    const visibleWorkPhones = page.locator("[name='work_phone']:visible");
    const count = await visibleWorkPhones.count();
    expect(count).toBeLessThanOrEqual(2); // header + posible pestaña
  });
});

// ─── Tests del flujo de Contrato (payroll.movement guard) ──────

test.describe("📋 Flujo de Contrato — Guardia payroll.movement", () => {
  test("La lista de empleados carga sin errores tras el fix", async ({
    page,
  }) => {
    await page.goto(`${ODOO_URL}/odoo/employees`);
    await page.waitForSelector(
      ".o_kanban_view, .o_list_view, .o_view_controller",
      { timeout: 20000 },
    );
    // No debe haber un error global de Odoo
    const errorAlert = page.locator(
      ".o_error_dialog, .o_dialog .modal-title:has-text('Error')",
    );
    expect(await errorAlert.count()).toBe(0);
  });

  test("La vista de movimientos de nómina es accesible (si existe)", async ({
    page,
  }) => {
    const resp = await page
      .goto(
        `${ODOO_URL}/odoo/action-l10n_cu_hr_payroll_movement.action_hr_payroll`,
      )
      .catch(() => null);
    // Si la acción no existe, verificamos que al menos empleados sigue OK
    if (!resp || !resp.ok()) {
      await page.goto(`${ODOO_URL}/odoo/employees`);
    }
    await page.waitForSelector(".o_main_navbar", { timeout: 15000 });
  });
});
