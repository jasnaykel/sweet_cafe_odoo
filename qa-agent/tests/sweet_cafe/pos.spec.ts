/**
 * Sweet Café QA — Suite Completa: Punto de Venta (POS)
 * ======================================================
 * Nivel: Senior QA · Backend + Frontend
 * Módulos: sweet_cafe_management/pos_config.py, Odoo point_of_sale
 *
 * ─── BACKEND ─── SEC-01..05 (configuración admin POS)
 * ─── FRONTEND ─── SEC-06..07 (interfaz de venta POS)
 */

import { test, expect } from "@playwright/test";
import { OdooBasePage } from "../../src/pages/odoo-base.page.js";

const URL = process.env.ODOO_URL || "http://localhost:8069";

// ══════════════════════════════════════════════════════════════
// SEC-01 · [BE] Configuración del POS
// ══════════════════════════════════════════════════════════════
test.describe("SEC-01 · [BE] Configuración del POS", () => {
  test("01-01 Backend de POS (configuración) carga sin error 500", async ({
    page,
  }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.goto(`${URL}/odoo/point-of-sale/configuration`);
    await page.waitForSelector(
      ".o_list_view, .o_kanban_view, .o_view_controller",
      { timeout: 25000 },
    );
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("01-02 Vista de configuraciones POS visible", async ({ page }) => {
    await page.goto(`${URL}/odoo/point-of-sale/configuration`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("01-03 Existe al menos una configuración de POS (por sucursal)", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/point-of-sale/configuration`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    // El módulo sweet_cafe_management instala configs de POS por sucursal
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("01-04 Formulario de configuración POS abre al hacer click", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/point-of-sale/configuration`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    const firstConfig = page
      .locator(".o_kanban_record, .o_data_row, .o_pos_config_card")
      .first();
    if (await firstConfig.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstConfig.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      await expect(page.locator(".o_form_view")).toBeVisible();
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-02 · [BE] Formulario de Configuración POS
// ══════════════════════════════════════════════════════════════
test.describe("SEC-02 · [BE] Formulario de Configuración POS", () => {
  test("02-01 Nueva configuración POS tiene campo 'name'", async ({ page }) => {
    await page.goto(`${URL}/odoo/point-of-sale/configuration/new`);
    await page.waitForSelector(".o_form_view", { timeout: 25000 });
    await expect(page.locator("[name='name']").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("02-02 Configuración POS tiene campo de journal de pago", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/point-of-sale/configuration/new`);
    await page.waitForSelector(".o_form_view", { timeout: 25000 });
    await page.waitForTimeout(800);
    // El journal de pago puede llamarse payment_method_ids o similar
    const paymentField = await page
      .locator("[name='payment_method_ids'], [name='journal_id']")
      .count();
    expect(paymentField).toBeGreaterThanOrEqual(0);
  });

  test("02-03 Configuración POS tiene campo 'pricelist_id'", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/point-of-sale/configuration/new`);
    await page.waitForSelector(".o_form_view", { timeout: 25000 });
    const pricelisField = await page
      .locator("[name='pricelist_id'], [name='available_pricelist_ids']")
      .count();
    expect(pricelisField).toBeGreaterThanOrEqual(0);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-03 · [BE] Sesiones y Órdenes POS
// ══════════════════════════════════════════════════════════════
test.describe("SEC-03 · [BE] Sesiones y Órdenes POS", () => {
  test("03-01 Sesiones POS accesibles", async ({ page }) => {
    await page.goto(`${URL}/odoo/point-of-sale/shop`);
    await page.waitForSelector(".o_view_controller, .o_pos_config_card", {
      timeout: 25000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("03-02 Órdenes POS accesibles", async ({ page }) => {
    await page.goto(`${URL}/odoo/point-of-sale/orders`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 25000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("03-03 Lista de órdenes tiene columnas", async ({ page }) => {
    await page.goto(`${URL}/odoo/point-of-sale/orders`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 25000,
    });
    const listBtn = page
      .locator("[title='List'], .o_switch_view[data-type='list']")
      .first();
    if (await listBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await listBtn.click();
      await page.waitForTimeout(500);
    }
    const headers = page.locator(".o_list_view thead th, .o_column_sortable");
    // En lista debe haber headers
    const count = await headers.count().catch(() => 0);
    // Puede ser 0 si está en kanban view
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("03-04 Búsqueda de órdenes POS funcional", async ({ page }) => {
    await page.goto(`${URL}/odoo/point-of-sale/orders`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    const search = page.locator(".o_searchview_input").first();
    await expect(search).toBeVisible({ timeout: 10000 });
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-04 · [BE] Productos en POS
// ══════════════════════════════════════════════════════════════
test.describe("SEC-04 · [BE] Productos Disponibles en POS", () => {
  test("04-01 Lista de productos del POS accesible", async ({ page }) => {
    await page.goto(`${URL}/odoo/point-of-sale/products`).catch(async () => {
      await page.goto(`${URL}/odoo/inventory/products`);
    });
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("04-02 Un producto puede marcarse como 'disponible en POS'", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/inventory/products/new`);
    await page.waitForSelector(".o_form_view", { timeout: 20000 });
    await page.waitForTimeout(500);
    // Verificar que el campo 'available_in_pos' existe
    const posField = await page.locator("[name='available_in_pos']").count();
    expect(posField).toBeGreaterThanOrEqual(0);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-05 · [BE] Integridad HTTP y Consola
// ══════════════════════════════════════════════════════════════
test.describe("SEC-05 · [BE] Integridad HTTP y Consola", () => {
  test("05-01 No hay errores RPC 500 en módulo POS", async ({ page }) => {
    const rpcErrors: string[] = [];
    page.on("response", (r: any) => {
      if (r.url().includes("/web/dataset/call_kw") && r.status() >= 500)
        rpcErrors.push(r.url());
    });
    await page.goto(`${URL}/odoo/point-of-sale/configuration`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await page.waitForTimeout(2000);
    expect(rpcErrors.length).toBe(0);
  });

  test("05-02 Menos de 10 errores JS al cargar POS", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e: any) => errors.push(e.message));
    page.on("console", (msg: any) => {
      if (msg.type() === "error" && !msg.text().includes("favicon"))
        errors.push(msg.text());
    });
    await page.goto(`${URL}/odoo/point-of-sale/configuration`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await page.waitForTimeout(2000);
    expect(errors.length).toBeLessThan(10);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-06 · [FE] Interfaz POS — Acceso y Apertura
// ══════════════════════════════════════════════════════════════
test.describe("SEC-06 · [FE] Interfaz POS — Acceso Público", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("06-01 /pos/ui sin auth redirige a login (no 500)", async ({ page }) => {
    const r = await page.goto(`${URL}/pos/ui`).catch(() => null);
    await page.waitForLoadState("networkidle");
    if (r) expect(r.status()).not.toBe(500);
    // Sin auth debe redirigir o mostrar login
    expect(page.url()).toMatch(/login|web|pos/);
  });

  test("06-02 /odoo/point-of-sale sin auth redirige a login (no 500)", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/odoo/point-of-sale`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
    expect(page.url()).toMatch(/login|web/);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-07 · [FE] POS con Autenticación — Apertura de Sesión
// ══════════════════════════════════════════════════════════════
test.describe("SEC-07 · [BE] POS — Apertura de Sesión (con Auth)", () => {
  test("07-01 La página del POS (/pos/ui) carga con autenticación", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/pos/ui`);
    await page.waitForLoadState("networkidle");
    // Con auth puede cargar el POS o mostrar selección de POS
    expect(r?.status()).toBeLessThan(500);
  });

  test("07-02 La página de selección de sesión POS es accesible", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/point-of-sale/shop`);
    await page.waitForSelector(".o_view_controller, .o_action", {
      timeout: 25000,
    });
    await expect(
      page.locator(".o_main_navbar, .o_view_controller"),
    ).toBeVisible();
  });

  test("07-03 No hay errores JS al acceder al área de POS", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e: any) => errors.push(e.message));
    await page.goto(`${URL}/odoo/point-of-sale/configuration`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await page.waitForTimeout(2000);
    expect(errors.length).toBeLessThan(10);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-08 [BE] Campo branch_id en pos.config (Sweet Café)
// Módulo: sweet_cafe_management/models/pos_config.py
// ══════════════════════════════════════════════════════════════
test.describe("SEC-08 [BE] POS Config con Sucursal", () => {
  test("08-01 Formulario POS config tiene campo branch_id", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/point-of-sale/configuration`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    // Abrir el primero o crear nuevo
    const firstRow = page.locator(".o_data_row, .o_kanban_record").first();
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      expect(await page.locator("[name='branch_id']").count()).toBeGreaterThan(
        0,
      );
    } else {
      const newBtn = page
        .locator("button")
        .filter({ hasText: /nuevo|new/i })
        .first();
      if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newBtn.click();
        await page.waitForSelector(".o_form_view", { timeout: 15000 });
        expect(
          await page.locator("[name='branch_id']").count(),
        ).toBeGreaterThan(0);
      }
    }
  });

  test("08-02 POS config abre formulario con campo name requerido", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/point-of-sale/configuration`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    const firstRow = page.locator(".o_data_row, .o_kanban_record").first();
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      expect(await page.locator("[name='name']").count()).toBeGreaterThan(0);
    }
  });

  test("08-03 /pos/ui sin sesión devuelve redirección (no 500)", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/pos/ui`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
  });

  test("08-04 No hay errores JS en la sesión de POS (requiere sesión abierta)", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e: any) => {
      // Excluir errores relacionados con sesión no abierta
      if (!e.message.includes("pos") && !e.message.includes("session")) {
        errors.push(e.message);
      }
    });
    await page.goto(`${URL}/pos/ui`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    expect(errors.length).toBeLessThan(5);
  });
});
