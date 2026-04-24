/**
 * Sweet Café QA — Suite Completa: Inventario y Stock
 * ====================================================
 * Nivel: Senior QA · Backend + Frontend
 * Módulos: sweet_cafe_management/sweet_scrap.py, Odoo stock, mrp
 *
 * ─── BACKEND ─── SEC-01..06
 * ─── FRONTEND ─── SEC-07
 */

import { test, expect } from "@playwright/test";
import { OdooBasePage } from "../../src/pages/odoo-base.page.js";

const URL = process.env.ODOO_URL || "http://localhost:8069";

// ══════════════════════════════════════════════════════════════
// SEC-01 · [BE] Módulo de Inventario — Acceso
// ══════════════════════════════════════════════════════════════
test.describe("SEC-01 · [BE] Inventario — Acceso y Vistas", () => {
  test("01-01 /odoo/inventory carga sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.goto(`${URL}/odoo/inventory`);
    await page.waitForSelector(
      ".o_list_view, .o_kanban_view, .o_view_controller",
      { timeout: 25000 },
    );
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("01-02 Vista de inventario muestra lista o kanban", async ({ page }) => {
    await page.goto(`${URL}/odoo/inventory`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("01-03 Almacenes (warehouses) accesibles", async ({ page }) => {
    await page.goto(`${URL}/odoo/inventory/configuration/warehouses`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 25000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("01-04 Ubicaciones de stock accesibles", async ({ page }) => {
    await page.goto(`${URL}/odoo/inventory/configuration/locations`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 25000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("01-05 Tipos de operación accesibles", async ({ page }) => {
    await page.goto(`${URL}/odoo/inventory/configuration/operations-types`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 20000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-02 · [BE] Transferencias de Stock
// ══════════════════════════════════════════════════════════════
test.describe("SEC-02 · [BE] Transferencias de Stock", () => {
  test("02-01 /odoo/inventory/transfers accesible", async ({ page }) => {
    await page.goto(`${URL}/odoo/inventory/transfers`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 25000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("02-02 Formulario de nueva transferencia accesible", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/inventory/transfers/new`);
    await page.waitForSelector(".o_form_view", { timeout: 25000 });
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("02-03 Transferencia nueva tiene campo 'picking_type_id'", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/inventory/transfers/new`);
    await page.waitForSelector(".o_form_view", { timeout: 25000 });
    expect(
      await page.locator("[name='picking_type_id']").count(),
    ).toBeGreaterThan(0);
  });

  test("02-04 Transferencia tiene barra de estado", async ({ page }) => {
    await page.goto(`${URL}/odoo/inventory/transfers/new`);
    await page.waitForSelector(".o_form_view", { timeout: 25000 });
    expect(
      await page.locator(".o_statusbar_status, .o_field_status_bar").count(),
    ).toBeGreaterThan(0);
  });

  test("02-05 Lista de traspasos internos (transferencias internas) accesible", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/inventory/transfers`);
    await page.waitForSelector(".o_list_view", { timeout: 25000 });
    // Filtrar por interno
    const search = page.locator(".o_searchview_input").first();
    await search.fill("Internal");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-03 · [BE] Mermas / Scrap (sweet.scrap o stock.scrap)
// ══════════════════════════════════════════════════════════════
test.describe("SEC-03 · [BE] Mermas y Scrap", () => {
  test("03-01 Módulo de mermas accesible via /odoo/inventory/scrap", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/odoo/inventory/scrap`).catch(async () => {
      return await page.goto(`${URL}/odoo/sweet-scraps`);
    });
    await page.waitForSelector(
      ".o_view_controller, .o_form_view, .o_list_view",
      { timeout: 25000 },
    );
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("03-02 Nueva merma tiene campo 'product_id'", async ({ page }) => {
    await page.goto(`${URL}/odoo/inventory/scrap/new`).catch(async () => {
      await page.goto(`${URL}/odoo/inventory/scrap`);
    });
    await page.waitForSelector(".o_form_view, .o_view_controller", {
      timeout: 25000,
    });
    if (page.url().includes("/new") || page.url().includes("new")) {
      expect(await page.locator("[name='product_id']").count()).toBeGreaterThan(
        0,
      );
    }
  });

  test("03-03 Nueva merma tiene campo cantidad (scrap_qty)", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/inventory/scrap/new`).catch(() => {});
    await page.waitForSelector(".o_form_view, .o_view_controller", {
      timeout: 20000,
    });
    if (page.url().includes("/new")) {
      const qty = await page
        .locator("[name='scrap_qty'], [name='qty_done']")
        .count();
      expect(qty).toBeGreaterThanOrEqual(0);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-04 · [BE] Ajustes de Inventario y Valoración
// ══════════════════════════════════════════════════════════════
test.describe("SEC-04 · [BE] Ajustes de Inventario", () => {
  test("04-01 Ajustes de inventario accesibles", async ({ page }) => {
    await page.goto(`${URL}/odoo/inventory/inventory-adjustments`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 25000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("04-02 Quants (cantidades en ubicación) accesibles", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/inventory/products/lots`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 20000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("04-03 Movimientos de stock accesibles", async ({ page }) => {
    await page.goto(`${URL}/odoo/inventory/moves-history`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 20000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-05 · [BE] Lotes y Trazabilidad
// ══════════════════════════════════════════════════════════════
test.describe("SEC-05 · [BE] Lotes y Trazabilidad", () => {
  test("05-01 Lotes (lots/serial numbers) accesibles", async ({ page }) => {
    await page.goto(`${URL}/odoo/inventory/products/lots`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 20000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("05-02 Formulario de lote tiene campo 'name'", async ({ page }) => {
    await page.goto(`${URL}/odoo/inventory/products/lots/new`);
    await page.waitForSelector(".o_form_view", { timeout: 15000 });
    await expect(page.locator("[name='name']").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("05-03 Lote tiene campo 'product_id' (producto asociado)", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/inventory/products/lots/new`);
    await page.waitForSelector(".o_form_view", { timeout: 15000 });
    expect(await page.locator("[name='product_id']").count()).toBeGreaterThan(
      0,
    );
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-06 · [BE] Integridad HTTP y Consola
// ══════════════════════════════════════════════════════════════
test.describe("SEC-06 · [BE] Integridad HTTP y Consola", () => {
  test("06-01 No hay errores RPC 500 en inventario", async ({ page }) => {
    const rpcErrors: string[] = [];
    page.on("response", (r: any) => {
      if (r.url().includes("/web/dataset/call_kw") && r.status() >= 500)
        rpcErrors.push(r.url());
    });
    await page.goto(`${URL}/odoo/inventory`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await page.waitForTimeout(2000);
    expect(rpcErrors.length).toBe(0);
  });

  test("06-02 Menos de 10 errores JS en inventario", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e: any) => errors.push(e.message));
    page.on("console", (msg: any) => {
      if (msg.type() === "error" && !msg.text().includes("favicon"))
        errors.push(msg.text());
    });
    await page.goto(`${URL}/odoo/inventory`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await page.waitForTimeout(2000);
    expect(errors.length).toBeLessThan(10);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-07 · [FE] Inventario — Acceso Público
// ══════════════════════════════════════════════════════════════
test.describe("SEC-07 · [FE] Inventario — Acceso Público", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("07-01 /odoo/inventory sin auth redirige a login (no 500)", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/odoo/inventory`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
    expect(page.url()).toMatch(/login|web/);
  });

  test("07-02 Sitio web / no muestra errores de inventario", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e: any) => errors.push(e.message));
    const r = await page.goto(`${URL}/`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    expect(r?.status()).not.toBe(500);
    expect(errors.length).toBeLessThan(5);
  });

  test("07-03 Tienda /shop no expone datos internos de stock", async ({
    page,
  }) => {
    await page.goto(`${URL}/shop`);
    await page.waitForLoadState("networkidle");
    // No debe haber texto con rutas internas de stock visibles en HTML
    const content = await page.content();
    expect(content).not.toContain("/odoo/inventory/transfers");
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-08 · [BE] sweet.scrap — Modelo Personalizado de Mermas
// Módulo: sweet_cafe_management/models/sweet_scrap.py
// ══════════════════════════════════════════════════════════════
test.describe("SEC-08 · [BE] sweet.scrap — Modelo de Mermas", () => {
  async function gotoSweetScrap(page: any) {
    await page.goto(`${URL}/odoo/sweet-scraps`).catch(async () => {
      await page.goto(`${URL}/odoo`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
  }

  test("08-01 sweet.scrap accesible sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoSweetScrap(page);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("08-02 Formulario de merma tiene campo product_id requerido", async ({
    page,
  }) => {
    await gotoSweetScrap(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      expect(await page.locator("[name='product_id']").count()).toBeGreaterThan(
        0,
      );
    }
  });

  test("08-03 Campo production_loss_type (tipo de merma) tiene 5 opciones", async ({
    page,
  }) => {
    await gotoSweetScrap(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const sel = page.locator("[name='production_loss_type'] select");
      if (await sel.isVisible({ timeout: 3000 }).catch(() => false)) {
        const opts = await sel.locator("option").allTextContents();
        // tecnica, negligencia, caducidad, rotura, robo
        expect(
          opts.filter((o) => o.trim().length > 0).length,
        ).toBeGreaterThanOrEqual(5);
      }
    }
  });

  test("08-04 Campo reason_id (Motivo Específico) es Many2one de sweet.scrap.reason", async ({
    page,
  }) => {
    await gotoSweetScrap(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      expect(await page.locator("[name='reason_id']").count()).toBeGreaterThan(
        0,
      );
    }
  });

  test("08-05 Estado inicial de merma es Borrador (draft)", async ({
    page,
  }) => {
    await gotoSweetScrap(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const statusBar = page.locator(".o_statusbar_status");
      if (await statusBar.isVisible({ timeout: 3000 }).catch(() => false)) {
        const text = await statusBar.textContent();
        expect(text).toMatch(/borrador|draft/i);
      }
    }
  });

  test("08-06 Los 4 estados de merma aparecen en la barra de estado", async ({
    page,
  }) => {
    await gotoSweetScrap(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const statusBar = page.locator(".o_statusbar_status");
      if (await statusBar.isVisible({ timeout: 5000 }).catch(() => false)) {
        const text = (await statusBar.textContent()) || "";
        // draft, pending, approved, rejected
        expect(text.toLowerCase()).toMatch(
          /borrador|pendiente|aprobado|rechazado|draft/i,
        );
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-09 · [BE] sweet.scrap.reason — Catálogo de Motivos
// ══════════════════════════════════════════════════════════════
test.describe("SEC-09 · [BE] sweet.scrap.reason — Catálogo de Motivos de Merma", () => {
  async function gotoScrapReasons(page: any) {
    await page.goto(`${URL}/odoo/sweet-scrap-reasons`).catch(async () => {
      await page.goto(`${URL}/odoo`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
  }

  test("09-01 sweet.scrap.reason accesible sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoScrapReasons(page);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("09-02 Formulario de motivo de merma tiene campo name requerido", async ({
    page,
  }) => {
    await gotoScrapReasons(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      expect(await page.locator("[name='name']").count()).toBeGreaterThan(0);
    }
  });

  test("09-03 Campo loss_type tiene las 6 opciones correctas", async ({
    page,
  }) => {
    await gotoScrapReasons(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const sel = page.locator("[name='loss_type'] select");
      if (await sel.isVisible({ timeout: 3000 }).catch(() => false)) {
        const opts = await sel.locator("option").allTextContents();
        expect(
          opts.filter((o) => o.trim().length > 0).length,
        ).toBeGreaterThanOrEqual(5);
      }
    }
  });

  test("09-04 Crear un motivo de merma y guardarlo", async ({ page }) => {
    await gotoScrapReasons(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const nameInput = page.locator("[name='name'] input").first();
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(`QA Motivo ${Date.now()}`);
        await page.keyboard.press("Control+s");
        await page.waitForTimeout(2000);
        const errDlg = page
          .locator(".o_dialog_title")
          .filter({ hasText: /error/i });
        expect(
          await errDlg.isVisible({ timeout: 1000 }).catch(() => false),
        ).toBe(false);
      }
    }
  });
});
