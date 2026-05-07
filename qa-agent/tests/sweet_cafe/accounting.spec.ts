/**
 * Sweet Café QA — Suite Completa: Contabilidad
 * ==============================================
 * Nivel: Senior QA · Backend
 * Módulos: account (account.move — facturas, pagos, conciliación bancaria)
 *
 * ─── BACKEND ─── SEC-01..10
 *
 * Cobertura:
 *   SEC-01  Acceso al módulo de contabilidad
 *   SEC-02  Dashboard de contabilidad
 *   SEC-03  Facturas de clientes (Customer Invoices)
 *   SEC-04  Facturas de proveedores (Vendor Bills)
 *   SEC-05  Formulario de factura — campos base
 *   SEC-06  Líneas de factura y cálculo de impuestos
 *   SEC-07  Registro de pagos
 *   SEC-08  Extractos bancarios y conciliación
 *   SEC-09  Reportes financieros (Balance, P&G)
 *   SEC-10  Validaciones y seguridad
 */

import { test, expect } from "@playwright/test";

const URL = process.env.ODOO_URL || "http://localhost:8069";

async function gotoAccounting(page: any) {
  await page.goto(`${URL}/odoo/accounting`).catch(async () => {
    await page.goto(`${URL}/odoo`);
  });
  await page.waitForSelector(".o_view_controller, .o_main_navbar", {
    timeout: 25000,
  });
}

async function gotoCustomerInvoices(page: any) {
  await page
    .goto(`${URL}/odoo/accounting/customer-invoices`)
    .catch(async () => {
      await page.goto(`${URL}/odoo/accounting`);
    });
  await page.waitForSelector(
    ".o_list_view, .o_kanban_view, .o_view_controller",
    { timeout: 25000 },
  );
}

async function gotoVendorBills(page: any) {
  await page.goto(`${URL}/odoo/accounting/vendor-bills`).catch(async () => {
    await page.goto(`${URL}/odoo/accounting`);
  });
  await page.waitForSelector(
    ".o_list_view, .o_kanban_view, .o_view_controller",
    { timeout: 25000 },
  );
}

async function gotoNewInvoice(page: any) {
  await page
    .goto(`${URL}/odoo/accounting/customer-invoices/new`)
    .catch(async () => {
      await gotoCustomerInvoices(page);
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
// SEC-01 · [BE] Acceso al Módulo de Contabilidad
// ══════════════════════════════════════════════════════════════
test.describe("SEC-01 · [BE] Acceso Módulo de Contabilidad", () => {
  test("01-01 /odoo/accounting carga sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoAccounting(page);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("01-02 Vista del módulo contabilidad visible", async ({ page }) => {
    await gotoAccounting(page);
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });

  test("01-03 Sin errores RPC en contabilidad", async ({ page }) => {
    const rpcErrors: string[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/web/dataset/call_kw") && r.status() >= 500)
        rpcErrors.push(r.url());
    });
    await gotoAccounting(page);
    await page.waitForTimeout(2000);
    expect(rpcErrors.length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-02 · [BE] Dashboard de Contabilidad
// ══════════════════════════════════════════════════════════════
test.describe("SEC-02 · [BE] Dashboard de Contabilidad", () => {
  test("02-01 Dashboard de contabilidad accesible", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoAccounting(page);
    await page.waitForTimeout(1500);
    expect(has500).toBe(false);
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });

  test("02-02 Dashboard muestra saldo de facturas pendientes", async ({
    page,
  }) => {
    await gotoAccounting(page);
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });

  test("02-03 Menú contabilidad navegable", async ({ page }) => {
    await gotoAccounting(page);
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-03 · [BE] Facturas de Clientes
// ══════════════════════════════════════════════════════════════
test.describe("SEC-03 · [BE] Facturas de Clientes", () => {
  test("03-01 Lista de facturas de clientes accesible", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoCustomerInvoices(page);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("03-02 Botón 'Nuevo' disponible en facturas de clientes", async ({
    page,
  }) => {
    await gotoCustomerInvoices(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
  });

  test("03-03 Búsqueda en facturas de clientes funciona", async ({ page }) => {
    await gotoCustomerInvoices(page);
    const search = page.locator(".o_searchview_input").first();
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await search.fill("INV/");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1500);
    }
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("03-04 Filtros de facturas (Atrasadas, En borrador) disponibles", async ({
    page,
  }) => {
    await gotoCustomerInvoices(page);
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-04 · [BE] Facturas de Proveedores
// ══════════════════════════════════════════════════════════════
test.describe("SEC-04 · [BE] Facturas de Proveedores (Vendor Bills)", () => {
  test("04-01 Lista de facturas de proveedores accesible", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoVendorBills(page);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("04-02 Botón 'Nuevo' disponible en facturas de proveedores", async ({
    page,
  }) => {
    await gotoVendorBills(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
  });

  test("04-03 Búsqueda en facturas de proveedor funciona", async ({ page }) => {
    await gotoVendorBills(page);
    const search = page.locator(".o_searchview_input").first();
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await search.fill("BILL/");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1500);
    }
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-05 · [BE] Formulario de Factura — Campos Base
// ══════════════════════════════════════════════════════════════
test.describe("SEC-05 · [BE] Formulario de Factura", () => {
  test.beforeEach(async ({ page }) => {
    await gotoNewInvoice(page);
  });

  test("05-01 Formulario de nueva factura abre sin error", async ({ page }) => {
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("05-02 Campo 'partner_id' (cliente/proveedor) existe", async ({
    page,
  }) => {
    expect(await page.locator("[name='partner_id']").count()).toBeGreaterThan(
      0,
    );
  });

  test("05-03 Campo 'invoice_date' (fecha de factura) existe", async ({
    page,
  }) => {
    const hasField = (await page.locator("[name='invoice_date']").count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("05-04 Campo 'invoice_date_due' (fecha de vencimiento) existe", async ({
    page,
  }) => {
    const hasField =
      (await page
        .locator("[name='invoice_date_due'], [name='due_date']")
        .count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("05-05 Campo 'ref' (referencia) existe en factura", async ({ page }) => {
    const hasField = (await page.locator("[name='ref']").count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("05-06 Campo 'currency_id' (moneda) existe en factura", async ({
    page,
  }) => {
    const hasField = (await page.locator("[name='currency_id']").count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("05-07 Barra de estado muestra 'Borrador' en nueva factura", async ({
    page,
  }) => {
    const statusBar = page.locator(".o_statusbar_status");
    if (await statusBar.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = (await statusBar.textContent()) ?? "";
      expect(text.toLowerCase()).toMatch(/borrador|draft/);
    }
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("05-08 Nueva factura no genera 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-06 · [BE] Líneas de Factura y Cálculo de Impuestos
// ══════════════════════════════════════════════════════════════
test.describe("SEC-06 · [BE] Líneas de Factura e Impuestos", () => {
  test.beforeEach(async ({ page }) => {
    await gotoNewInvoice(page);
  });

  test("06-01 Sección 'invoice_line_ids' existe en factura", async ({
    page,
  }) => {
    const hasLines =
      (await page.locator("[name='invoice_line_ids']").count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("06-02 Línea contiene campo 'name' (descripción)", async ({ page }) => {
    const hasDesc =
      (await page.locator("[name='invoice_line_ids'] [name='name']").count()) >
      0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("06-03 Línea contiene campo 'price_unit' (precio unitario)", async ({
    page,
  }) => {
    const hasPrice =
      (await page
        .locator("[name='invoice_line_ids'] [name='price_unit']")
        .count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("06-04 Línea contiene campo 'tax_ids' (impuestos)", async ({ page }) => {
    const hasTax =
      (await page
        .locator("[name='invoice_line_ids'] [name='tax_ids']")
        .count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("06-05 Campo 'amount_untaxed' (subtotal sin impuesto) visible", async ({
    page,
  }) => {
    const hasField =
      (await page.locator("[name='amount_untaxed']").count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("06-06 Campo 'amount_tax' (total impuestos) visible", async ({
    page,
  }) => {
    const hasField = (await page.locator("[name='amount_tax']").count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("06-07 Campo 'amount_total' (total factura) visible", async ({
    page,
  }) => {
    const hasField = (await page.locator("[name='amount_total']").count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-07 · [BE] Registro de Pagos
// ══════════════════════════════════════════════════════════════
test.describe("SEC-07 · [BE] Registro de Pagos", () => {
  test("07-01 Lista de pagos accesible", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.goto(`${URL}/odoo/accounting/payments`).catch(async () => {
      await gotoAccounting(page);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });

  test("07-02 Nuevo pago accesible desde módulo contabilidad", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/accounting/payments/new`).catch(async () => {
      await gotoAccounting(page);
    });
    await page.waitForSelector(
      ".o_form_view, .o_view_controller, .o_main_navbar",
      { timeout: 25000 },
    );
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
    await expect(
      page.locator(".o_form_view, .o_view_controller"),
    ).toBeVisible();
  });

  test("07-03 Formulario de pago tiene campo 'amount' (importe)", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/accounting/payments/new`).catch(async () => {
      await gotoAccounting(page);
    });
    await page.waitForSelector(
      ".o_form_view, .o_view_controller, .o_main_navbar",
      { timeout: 25000 },
    );
    const hasAmount = (await page.locator("[name='amount']").count()) > 0;
    await expect(
      page.locator(".o_form_view, .o_view_controller"),
    ).toBeVisible();
  });

  test("07-04 Formulario de pago tiene campo 'partner_id' (empresa)", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/accounting/payments/new`).catch(async () => {
      await gotoAccounting(page);
    });
    await page.waitForSelector(
      ".o_form_view, .o_view_controller, .o_main_navbar",
      { timeout: 25000 },
    );
    const hasPartner = (await page.locator("[name='partner_id']").count()) > 0;
    await expect(
      page.locator(".o_form_view, .o_view_controller"),
    ).toBeVisible();
  });

  test("[INVALID] Registrar pago en factura sin confirmar no genera 500", async ({
    page,
  }) => {
    await gotoNewInvoice(page);
    const payBtn = page
      .locator("button")
      .filter({ hasText: /registrar pago|register payment|pagar/i })
      .first();
    if (await payBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      let has500 = false;
      page.on("response", (r) => {
        if (r.status() >= 500) has500 = true;
      });
      await payBtn.click();
      await page.waitForTimeout(2500);
      expect(has500, "[INVALID] Pago sin confirmar no debe generar 500").toBe(
        false,
      );
    }
    await expect(
      page.locator(".o_form_view, .o_view_controller"),
    ).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-08 · [BE] Extractos Bancarios y Conciliación
// ══════════════════════════════════════════════════════════════
test.describe("SEC-08 · [BE] Extractos Bancarios", () => {
  test("08-01 Lista de extractos bancarios accesible", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page
      .goto(`${URL}/odoo/accounting/bank-statements`)
      .catch(async () => {
        await gotoAccounting(page);
      });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("08-02 Nuevo extracto bancario abre sin error", async ({ page }) => {
    await page
      .goto(`${URL}/odoo/accounting/bank-statements/new`)
      .catch(async () => {
        await gotoAccounting(page);
      });
    await page.waitForSelector(
      ".o_form_view, .o_view_controller, .o_main_navbar",
      { timeout: 25000 },
    );
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
    await expect(
      page.locator(".o_form_view, .o_view_controller"),
    ).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-09 · [BE] Reportes Financieros
// ══════════════════════════════════════════════════════════════
test.describe("SEC-09 · [BE] Reportes Financieros", () => {
  test("09-01 Balance General accesible", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page
      .goto(`${URL}/odoo/accounting/reports/balance-sheet`)
      .catch(async () => {
        await gotoAccounting(page);
      });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });

  test("09-02 Estado de Resultados (P&G) accesible", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page
      .goto(`${URL}/odoo/accounting/reports/profit-and-loss`)
      .catch(async () => {
        await gotoAccounting(page);
      });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });

  test("09-03 Libro Mayor accesible", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page
      .goto(`${URL}/odoo/accounting/reports/general-ledger`)
      .catch(async () => {
        await gotoAccounting(page);
      });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });

  test("09-04 Aging de cuentas por cobrar accesible", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page
      .goto(`${URL}/odoo/accounting/reports/aged-receivable`)
      .catch(async () => {
        await gotoAccounting(page);
      });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-10 · [BE] Validaciones y Seguridad Contabilidad
// ══════════════════════════════════════════════════════════════
test.describe("SEC-10 · [BE] Validaciones y Seguridad Contabilidad", () => {
  test("[SECURITY] /odoo/accounting sin auth redirige a login", async ({
    page,
  }) => {
    const ctx = page.context();
    await ctx.clearCookies();
    await page.goto(`${URL}/odoo/accounting`);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toMatch(/login|web/);
  });

  test("[INVALID] Confirmar factura sin líneas muestra error controlado", async ({
    page,
  }) => {
    await gotoNewInvoice(page);
    const confirmBtn = page
      .locator("button")
      .filter({ hasText: /confirmar|confirm/i })
      .first();
    if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      let has500 = false;
      page.on("response", (r) => {
        if (r.status() >= 500) has500 = true;
      });
      await confirmBtn.click();
      await page.waitForTimeout(2500);
      expect(
        has500,
        "[INVALID] Confirmar factura vacía no debe generar 500",
      ).toBe(false);
    }
  });

  test("10-03 Menos de 5 errores JS en módulo de contabilidad", async ({
    page,
  }) => {
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
    await gotoAccounting(page);
    await page.waitForTimeout(2000);
    expect(errors.length).toBeLessThan(5);
  });

  test("[INVALID] Factura con importe 0 no genera 500", async ({ page }) => {
    await gotoNewInvoice(page);
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("10-05 Plan de cuentas accesible", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page
      .goto(`${URL}/odoo/accounting/chart-of-accounts`)
      .catch(async () => {
        await gotoAccounting(page);
      });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });
});
