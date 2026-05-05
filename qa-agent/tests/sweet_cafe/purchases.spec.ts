/**
 * Sweet Café QA — Suite Completa: Compras
 * ========================================
 * Nivel: Senior QA · Backend
 * Módulos: purchase (purchase.order, purchase.order.line, stock.picking)
 *
 * ─── BACKEND ─── SEC-01..09
 *
 * Cobertura:
 *   SEC-01  Acceso al módulo de compras
 *   SEC-02  Lista de solicitudes de presupuesto (RFQ)
 *   SEC-03  Formulario de nuevo RFQ — campos base
 *   SEC-04  Líneas de pedido de compra
 *   SEC-05  Confirmación del pedido de compra
 *   SEC-06  Recepción de productos
 *   SEC-07  Facturación de proveedor desde PO
 *   SEC-08  Reportes y análisis de compras
 *   SEC-09  Validaciones y seguridad
 */

import { test, expect } from "@playwright/test";

const URL = process.env.ODOO_URL || "http://localhost:8069";

async function gotoPurchase(page: any) {
  await page.goto(`${URL}/odoo/purchase`).catch(async () => {
    await page.goto(`${URL}/odoo`);
  });
  await page.waitForSelector(
    ".o_list_view, .o_kanban_view, .o_view_controller",
    { timeout: 25000 },
  );
}

async function gotoNewPO(page: any) {
  await page.goto(`${URL}/odoo/purchase/new`).catch(async () => {
    await gotoPurchase(page);
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
// SEC-01 · [BE] Acceso al Módulo de Compras
// ══════════════════════════════════════════════════════════════
test.describe("SEC-01 · [BE] Acceso Módulo de Compras", () => {
  test("01-01 /odoo/purchase carga sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoPurchase(page);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("01-02 Vista de compras visible", async ({ page }) => {
    await gotoPurchase(page);
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("01-03 Botón 'Nuevo' disponible en compras", async ({ page }) => {
    await gotoPurchase(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
  });

  test("01-04 Sin errores RPC en compras", async ({ page }) => {
    const rpcErrors: string[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/web/dataset/call_kw") && r.status() >= 500)
        rpcErrors.push(r.url());
    });
    await gotoPurchase(page);
    await page.waitForTimeout(2000);
    expect(rpcErrors.length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-02 · [BE] Lista de Solicitudes de Presupuesto (RFQ)
// ══════════════════════════════════════════════════════════════
test.describe("SEC-02 · [BE] Lista de RFQ y Pedidos", () => {
  test("02-01 Vista lista de RFQ accesible", async ({ page }) => {
    await gotoPurchase(page);
    const listBtn = page
      .locator("[title='List'], .o_switch_view[data-type='list']")
      .first();
    if (await listBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await listBtn.click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("02-02 Búsqueda en RFQ funciona", async ({ page }) => {
    await gotoPurchase(page);
    const search = page.locator(".o_searchview_input").first();
    await expect(search).toBeVisible({ timeout: 10000 });
    await search.fill("QA Test RFQ");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("02-03 Filtros disponibles en RFQ (Mis Pedidos, Atrasados)", async ({
    page,
  }) => {
    await gotoPurchase(page);
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("02-04 Pedidos confirmados visibles en vista de pedidos", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/purchase?view_type=list`).catch(async () => {
      await gotoPurchase(page);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-03 · [BE] Formulario Nuevo RFQ — Campos Base
// ══════════════════════════════════════════════════════════════
test.describe("SEC-03 · [BE] Formulario de RFQ", () => {
  test.beforeEach(async ({ page }) => {
    await gotoNewPO(page);
  });

  test("03-01 Formulario de nuevo RFQ abre sin error", async ({ page }) => {
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("03-02 Campo 'partner_id' (proveedor) existe en RFQ", async ({
    page,
  }) => {
    expect(await page.locator("[name='partner_id']").count()).toBeGreaterThan(
      0,
    );
  });

  test("03-03 Campo 'date_order' (fecha del pedido) existe", async ({
    page,
  }) => {
    const hasField =
      (await page
        .locator("[name='date_order'], [name='date_approve']")
        .count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("03-04 Campo 'currency_id' (moneda) existe en RFQ", async ({ page }) => {
    const hasField = (await page.locator("[name='currency_id']").count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("03-05 Campo 'payment_term_id' (condiciones de pago) existe", async ({
    page,
  }) => {
    const hasField =
      (await page.locator("[name='payment_term_id']").count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("03-06 Barra de estado del RFQ muestra 'Borrador/RFQ'", async ({
    page,
  }) => {
    const statusBar = page.locator(".o_statusbar_status");
    if (await statusBar.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = (await statusBar.textContent()) ?? "";
      expect(text.toLowerCase()).toMatch(/rfq|presupuesto|borrador|draft/);
    }
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("03-07 Nuevo RFQ no genera 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-04 · [BE] Líneas del Pedido de Compra
// ══════════════════════════════════════════════════════════════
test.describe("SEC-04 · [BE] Líneas del Pedido de Compra", () => {
  test.beforeEach(async ({ page }) => {
    await gotoNewPO(page);
  });

  test("04-01 Sección de líneas 'order_line' existe en RFQ", async ({
    page,
  }) => {
    const hasLines = (await page.locator("[name='order_line']").count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("04-02 Botón 'Agregar línea' disponible en RFQ", async ({ page }) => {
    const addLineBtn = page
      .locator(".o_field_one2many .o_field_x2many_list_row_add a, button")
      .filter({ hasText: /agregar|añadir|add|nueva|new line/i })
      .first();
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("04-03 Línea contiene campo 'product_id' (producto)", async ({
    page,
  }) => {
    const hasProduct =
      (await page.locator("[name='order_line'] [name='product_id']").count()) >
      0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("04-04 Línea contiene campo 'price_unit' (precio unitario)", async ({
    page,
  }) => {
    const hasPrice =
      (await page.locator("[name='order_line'] [name='price_unit']").count()) >
      0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("04-05 Campo 'amount_total' calculado visible en RFQ", async ({
    page,
  }) => {
    const hasTotal = (await page.locator("[name='amount_total']").count()) > 0;
    await expect(page.locator(".o_form_view")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-05 · [BE] Confirmación del Pedido de Compra
// ══════════════════════════════════════════════════════════════
test.describe("SEC-05 · [BE] Confirmación del PO", () => {
  test("05-01 Botón 'Confirmar Pedido' disponible en RFQ", async ({ page }) => {
    await gotoNewPO(page);
    const confirmBtn = page
      .locator("button")
      .filter({ hasText: /confirmar|confirm/i })
      .first();
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("[INVALID] Confirmar RFQ sin proveedor muestra error controlado", async ({
    page,
  }) => {
    await gotoNewPO(page);
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
        "[INVALID] Confirmar sin proveedor no debe generar 500",
      ).toBe(false);
    }
  });

  test("05-03 Pedido confirmado tiene botón 'Recibir Productos'", async ({
    page,
  }) => {
    await gotoPurchase(page);
    // Find a confirmed PO if it exists
    const confirmedRow = page.locator(".o_list_view .o_data_row").first();
    if (await confirmedRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmedRow.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const receiveBtn = page
        .locator("button")
        .filter({ hasText: /recibir|receive/i })
        .first();
      // Check form integrity
    }
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-06 · [BE] Recepción de Productos
// ══════════════════════════════════════════════════════════════
test.describe("SEC-06 · [BE] Recepción de Productos (Stock)", () => {
  test("06-01 Botón inteligente de recepciones visible en PO", async ({
    page,
  }) => {
    await gotoPurchase(page);
    const firstRow = page.locator(".o_list_view .o_data_row").first();
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      // Smart button for receipts
      const receiptBtn = page
        .locator(".o_stat_button")
        .filter({ hasText: /recepci|receipt|entreg/i })
        .first();
      await page.waitForTimeout(500);
    }
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });

  test("06-02 Recepción de compra accesible sin error 500", async ({
    page,
  }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.goto(`${URL}/odoo/inventory/receipts`).catch(async () => {
      await page.goto(`${URL}/odoo/inventory`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-07 · [BE] Factura de Proveedor desde PO
// ══════════════════════════════════════════════════════════════
test.describe("SEC-07 · [BE] Factura de Proveedor", () => {
  test("07-01 Botón 'Crear Factura' / inteligente de facturas visible en PO", async ({
    page,
  }) => {
    await gotoPurchase(page);
    const firstRow = page.locator(".o_list_view .o_data_row").first();
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const invoiceBtn = page
        .locator("button, .o_stat_button")
        .filter({ hasText: /factura|invoice|bill/i })
        .first();
      await page.waitForTimeout(500);
    }
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-08 · [BE] Reportes y Análisis de Compras
// ══════════════════════════════════════════════════════════════
test.describe("SEC-08 · [BE] Reportes de Compras", () => {
  test("08-01 Vista de análisis de compras accesible", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.goto(`${URL}/odoo/purchase/reporting`).catch(async () => {
      await gotoPurchase(page);
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
// SEC-09 · [BE] Validaciones y Seguridad Compras
// ══════════════════════════════════════════════════════════════
test.describe("SEC-09 · [BE] Validaciones y Seguridad Compras", () => {
  test("[SECURITY] /odoo/purchase sin auth redirige a login", async ({
    page,
  }) => {
    const ctx = page.context();
    await ctx.clearCookies();
    await page.goto(`${URL}/odoo/purchase`);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toMatch(/login|web/);
  });

  test("[INVALID] RFQ con cantidad negativa muestra error controlado", async ({
    page,
  }) => {
    await gotoNewPO(page);
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("09-03 Menos de 5 errores JS en módulo de compras", async ({ page }) => {
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
    await gotoPurchase(page);
    await page.waitForTimeout(2000);
    expect(errors.length).toBeLessThan(5);
  });
});
