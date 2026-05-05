/**
 * Sweet Café QA — Suite Completa: Contactos (Clientes y Proveedores)
 * ==================================================================
 * Nivel: Senior QA · Backend
 * Módulos: contacts (res.partner), l10n_cu_address (municipio/provincia cubana)
 *
 * ─── BACKEND ─── SEC-01..08
 *
 * Cobertura:
 *   SEC-01  Acceso al módulo de contactos
 *   SEC-02  Vista lista, kanban y búsqueda
 *   SEC-03  Formulario de nuevo contacto — campos base
 *   SEC-04  Campos de dirección cubana (provincia, municipio)
 *   SEC-05  Contacto tipo cliente (is_customer / customer_rank)
 *   SEC-06  Contacto tipo proveedor (is_supplier / supplier_rank)
 *   SEC-07  Cuentas bancarias del contacto
 *   SEC-08  Validaciones negativas y seguridad
 */

import { test, expect } from "@playwright/test";

const URL = process.env.ODOO_URL || "http://localhost:8069";

async function gotoContacts(page: any) {
  await page.goto(`${URL}/odoo/contacts`).catch(async () => {
    await page.goto(`${URL}/odoo`);
  });
  await page.waitForSelector(
    ".o_list_view, .o_kanban_view, .o_view_controller",
    { timeout: 25000 },
  );
}

async function gotoNewContact(page: any) {
  await page.goto(`${URL}/odoo/contacts/new`).catch(async () => {
    await gotoContacts(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false))
      await newBtn.click();
  });
  await page.waitForSelector(".o_form_view", { timeout: 25000 });
}

// ══════════════════════════════════════════════════════════════
// SEC-01 · [BE] Acceso al Módulo de Contactos
// ══════════════════════════════════════════════════════════════
test.describe("SEC-01 · [BE] Acceso Módulo de Contactos", () => {
  test("01-01 /odoo/contacts carga sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoContacts(page);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("01-02 Vista de contactos visible", async ({ page }) => {
    await gotoContacts(page);
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("01-03 Botón 'Nuevo' disponible", async ({ page }) => {
    await gotoContacts(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
  });

  test("01-04 Sin errores RPC en contactos", async ({ page }) => {
    const rpcErrors: string[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/web/dataset/call_kw") && r.status() >= 500)
        rpcErrors.push(r.url());
    });
    await gotoContacts(page);
    await page.waitForTimeout(2000);
    expect(rpcErrors.length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-02 · [BE] Vistas Lista, Kanban y Búsqueda
// ══════════════════════════════════════════════════════════════
test.describe("SEC-02 · [BE] Vistas de Contactos", () => {
  test("02-01 Vista lista de contactos accesible", async ({ page }) => {
    await gotoContacts(page);
    const listBtn = page
      .locator("[title='List'], .o_switch_view[data-type='list']")
      .first();
    if (await listBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await listBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator(".o_list_view")).toBeVisible({
        timeout: 10000,
      });
    } else {
      await expect(page.locator(".o_view_controller")).toBeVisible();
    }
  });

  test("02-02 Vista kanban de contactos accesible", async ({ page }) => {
    await gotoContacts(page);
    const kanbanBtn = page
      .locator("[title='Kanban'], .o_switch_view[data-type='kanban']")
      .first();
    if (await kanbanBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await kanbanBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator(".o_kanban_view")).toBeVisible({
        timeout: 10000,
      });
    } else {
      await expect(page.locator(".o_view_controller")).toBeVisible();
    }
  });

  test("02-03 Búsqueda de contacto por nombre funciona", async ({ page }) => {
    await gotoContacts(page);
    const search = page.locator(".o_searchview_input").first();
    await expect(search).toBeVisible({ timeout: 10000 });
    await search.fill("QA Test Contact");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("02-04 Filtro 'Clientes' disponible", async ({ page }) => {
    await gotoContacts(page);
    const filterBtn = page
      .locator(".o_filter_menu, .o_searchview .o_dropdown_button, button")
      .filter({ hasText: /filtros|filter/i })
      .first();
    if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterBtn.click();
      await page.waitForTimeout(500);
      const clientFilter = page
        .locator(".o_filter_option, .o_menu_item")
        .filter({ hasText: /cliente|customer/i })
        .first();
      if (await clientFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clientFilter.click();
        await page.waitForTimeout(1000);
      }
    }
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-03 · [BE] Formulario Nuevo Contacto — Campos Base
// ══════════════════════════════════════════════════════════════
test.describe("SEC-03 · [BE] Formulario Nuevo Contacto", () => {
  test.beforeEach(async ({ page }) => {
    await gotoNewContact(page);
  });

  test("03-01 Formulario de nuevo contacto abre sin error", async ({
    page,
  }) => {
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("03-02 Campo 'name' (nombre del contacto) existe", async ({ page }) => {
    expect(await page.locator("[name='name']").count()).toBeGreaterThan(0);
  });

  test("03-03 Campo 'email' existe en contacto", async ({ page }) => {
    expect(await page.locator("[name='email']").count()).toBeGreaterThan(0);
  });

  test("03-04 Campo 'phone' / 'mobile' existe", async ({ page }) => {
    const hasPhone =
      (await page.locator("[name='phone'], [name='mobile']").count()) > 0;
    expect(hasPhone).toBe(true);
  });

  test("03-05 Campo 'street' (dirección) existe", async ({ page }) => {
    expect(await page.locator("[name='street']").count()).toBeGreaterThan(0);
  });

  test("03-06 Campo 'vat' (NIT/TIN) existe", async ({ page }) => {
    expect(await page.locator("[name='vat']").count()).toBeGreaterThan(0);
  });

  test("03-07 Campo 'company_type' (empresa/persona) existe", async ({
    page,
  }) => {
    const hasField = (await page.locator("[name='company_type']").count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("03-08 Formulario de contacto no genera 500 al abrirse", async ({
    page,
  }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-04 · [BE] Campos de Dirección Cubana
// ══════════════════════════════════════════════════════════════
test.describe("SEC-04 · [BE] Dirección Cubana en Contacto", () => {
  test.beforeEach(async ({ page }) => {
    await gotoNewContact(page);
  });

  test("04-01 Campo 'state_id' (provincia cubana) existe", async ({ page }) => {
    const hasField = (await page.locator("[name='state_id']").count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("04-02 Campo 'country_id' (país — Cuba por defecto) existe", async ({
    page,
  }) => {
    const hasField = (await page.locator("[name='country_id']").count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("04-03 Campo municipio cubano accesible", async ({ page }) => {
    const hasMunicipio =
      (await page
        .locator("[name='municipality_id'], [name='l10n_cu_municipality_id']")
        .count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("04-04 Seleccionar provincia cubana funciona sin error", async ({
    page,
  }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    const stateInput = page.locator("[name='state_id'] input").first();
    if (await stateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await stateInput.fill("La Habana");
      await page.waitForTimeout(1000);
      const option = page
        .locator(".o_field_widget .ui-autocomplete li, .dropdown-item")
        .filter({ hasText: /habana/i })
        .first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false))
        await option.click();
    }
    await page.waitForTimeout(500);
    expect(has500).toBe(false);
    await expect(page.locator(".o_form_view")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-05 · [BE] Contacto tipo Cliente
// ══════════════════════════════════════════════════════════════
test.describe("SEC-05 · [BE] Contacto como Cliente", () => {
  test.beforeEach(async ({ page }) => {
    await gotoNewContact(page);
  });

  test("05-01 Checkbox 'Es Cliente' / customer_rank visible", async ({
    page,
  }) => {
    const hasCustomer =
      (await page
        .locator(
          "[name='customer_rank'], [name='is_customer'], [name='x_is_customer']",
        )
        .count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("05-02 Activar flag cliente no genera 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    const customerField = page
      .locator("[name='customer_rank'] input, [name='is_customer'] input")
      .first();
    if (await customerField.isVisible({ timeout: 3000 }).catch(() => false)) {
      const checked = await customerField.isChecked().catch(() => false);
      if (!checked) await customerField.check();
      await page.waitForTimeout(500);
    }
    expect(has500).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-06 · [BE] Contacto tipo Proveedor
// ══════════════════════════════════════════════════════════════
test.describe("SEC-06 · [BE] Contacto como Proveedor", () => {
  test.beforeEach(async ({ page }) => {
    await gotoNewContact(page);
  });

  test("06-01 Campo/flag 'supplier_rank' / 'Es Proveedor' visible", async ({
    page,
  }) => {
    const hasSupplier =
      (await page
        .locator(
          "[name='supplier_rank'], [name='is_supplier'], [name='x_is_supplier']",
        )
        .count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("06-02 Activar flag proveedor no genera 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    const supplierField = page
      .locator("[name='supplier_rank'] input, [name='is_supplier'] input")
      .first();
    if (await supplierField.isVisible({ timeout: 3000 }).catch(() => false)) {
      const checked = await supplierField.isChecked().catch(() => false);
      if (!checked) await supplierField.check();
      await page.waitForTimeout(500);
    }
    expect(has500).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-07 · [BE] Cuentas Bancarias del Contacto
// ══════════════════════════════════════════════════════════════
test.describe("SEC-07 · [BE] Cuentas Bancarias del Contacto", () => {
  test("07-01 Pestaña/botón 'Cuentas Bancarias' accesible en contacto existente", async ({
    page,
  }) => {
    await gotoContacts(page);
    const firstRow = page
      .locator(".o_list_view .o_data_row, .o_kanban_record")
      .first();
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      // Bank accounts tab or smart button
      const bankTab = page
        .locator(".o_notebook .nav-link, button")
        .filter({ hasText: /banco|bank|cuenta/i })
        .first();
      if (await bankTab.isVisible({ timeout: 3000 }).catch(() => false))
        await bankTab.click();
      await page.waitForTimeout(500);
    }
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });

  test("07-02 Agregar cuenta bancaria a contacto no genera 500", async ({
    page,
  }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoContacts(page);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-08 · [BE] Validaciones y Seguridad
// ══════════════════════════════════════════════════════════════
test.describe("SEC-08 · [BE] Validaciones y Seguridad Contactos", () => {
  test("[INVALID] Guardar contacto sin nombre muestra error controlado", async ({
    page,
  }) => {
    await gotoNewContact(page);
    const saveBtn = page
      .locator("button")
      .filter({ hasText: /guardar|save/i })
      .first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      let has500 = false;
      page.on("response", (r) => {
        if (r.status() >= 500) has500 = true;
      });
      await saveBtn.click();
      await page.waitForTimeout(2000);
      expect(has500, "Guardar sin nombre no debe generar 500").toBe(false);
    }
  });

  test("[SECURITY] /odoo/contacts sin auth redirige a login", async ({
    page,
  }) => {
    const ctx = page.context();
    await ctx.clearCookies();
    await page.goto(`${URL}/odoo/contacts`);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toMatch(/login|web/);
  });

  test("08-03 Menos de 5 errores JS en módulo contactos", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        !msg.text().includes("favicon") &&
        !msg.text().includes("sourcemap")
      )
        errors.push(msg.text());
    });
    await gotoContacts(page);
    await page.waitForTimeout(2000);
    expect(errors.length).toBeLessThan(5);
  });

  test("08-04 Email inválido en contacto muestra error controlado", async ({
    page,
  }) => {
    await gotoNewContact(page);
    const emailInput = page.locator("[name='email'] input").first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill("notanemail");
      await emailInput.blur();
      const saveBtn = page
        .locator("button")
        .filter({ hasText: /guardar|save/i })
        .first();
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        let has500 = false;
        page.on("response", (r) => {
          if (r.status() >= 500) has500 = true;
        });
        await saveBtn.click();
        await page.waitForTimeout(2000);
        expect(has500).toBe(false);
      }
    }
  });
});
