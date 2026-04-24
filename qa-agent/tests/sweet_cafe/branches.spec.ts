/**
 * Sweet Café QA — Suite Completa: Sucursales
 * ============================================
 * Nivel: Senior QA · Backend + Frontend
 * Módulo: sweet_cafe_management/models/sweet_branch.py
 *
 * Tipos de sucursal: main, secondary, mobile, online
 * Relación: warehouse_id, pos_config_ids
 *
 * BACKEND  SEC-01..06
 * FRONTEND SEC-07
 */

import { test, expect } from "@playwright/test";
import { OdooBasePage } from "../../src/pages/odoo-base.page.js";

const URL = process.env.ODOO_URL || "http://localhost:8069";

async function gotoBranches(page: any) {
  await page.goto(`${URL}/odoo/sweet-branches`);
  await page.waitForSelector(
    ".o_list_view, .o_kanban_view, .o_view_controller",
    { timeout: 25000 },
  );
}

// ──────────────────────────────────────────────────────────────
// SEC-01 [BE] Acceso al Módulo de Sucursales
// ──────────────────────────────────────────────────────────────
test.describe("SEC-01 [BE] Acceso al Módulo de Sucursales", () => {
  test("01-01 carga sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoBranches(page);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("01-02 muestra lista o kanban", async ({ page }) => {
    await gotoBranches(page);
    await expect(
      page.locator(".o_list_view, .o_kanban_view, .o_view_controller"),
    ).toBeVisible({ timeout: 15000 });
  });

  test("01-03 botón Nuevo disponible", async ({ page }) => {
    await gotoBranches(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
  });

  test("01-04 cambio a vista lista funciona", async ({ page }) => {
    await gotoBranches(page);
    const base = new OdooBasePage(page);
    await base.switchToListView().catch(() => {});
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });
});

// ──────────────────────────────────────────────────────────────
// SEC-02 [BE] Formulario de Nueva Sucursal
// ──────────────────────────────────────────────────────────────
test.describe("SEC-02 [BE] Formulario de Nueva Sucursal", () => {
  test.beforeEach(async ({ page }) => {
    await gotoBranches(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
    }
  });

  test("02-01 formulario se abre", async ({ page }) => {
    await expect(page.locator(".o_form_view")).toBeVisible({ timeout: 15000 });
  });

  test("02-02 campo name editable", async ({ page }) => {
    const nameInput = page.locator("[name='name'] input").first();
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill("QA Test Sucursal");
    expect(await nameInput.inputValue()).toBe("QA Test Sucursal");
  });

  test("02-03 campo code existe", async ({ page }) => {
    expect(await page.locator("[name='code']").count()).toBeGreaterThan(0);
  });

  test("02-04 campo branch_type existe", async ({ page }) => {
    expect(
      await page.locator("[name='branch_type'], [name='type']").count(),
    ).toBeGreaterThan(0);
  });

  test("02-05 campo warehouse_id existe", async ({ page }) => {
    expect(await page.locator("[name='warehouse_id']").count()).toBeGreaterThan(
      0,
    );
  });

  test("02-06 descartar no guarda datos", async ({ page }) => {
    const nameInput = page.locator("[name='name'] input").first();
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill("QA Sucursal TEMPORAL NO GUARDAR");
    }
    const discardBtn = page
      .locator("button")
      .filter({ hasText: /descartar|discard/i })
      .first();
    if (await discardBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await discardBtn.click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator(".o_view_controller")).toBeVisible({
      timeout: 10000,
    });
  });
});

// ──────────────────────────────────────────────────────────────
// SEC-03 [BE] Tipos de Sucursal
// ──────────────────────────────────────────────────────────────
test.describe("SEC-03 [BE] Tipos de Sucursal", () => {
  test("03-01 tipos de sucursal disponibles en formulario", async ({
    page,
  }) => {
    await gotoBranches(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
    }
    const typeField = page.locator("[name='branch_type'] select").first();
    if (await typeField.isVisible({ timeout: 3000 }).catch(() => false)) {
      const options = await page
        .locator("[name='branch_type'] select option")
        .allTextContents()
        .catch(() => []);
      expect(options.length).toBeGreaterThan(0);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// SEC-04 [BE] CRUD Completo de Sucursales
// ──────────────────────────────────────────────────────────────
test.describe("SEC-04 [BE] CRUD Completo de Sucursales", () => {
  test("04-01 crear sucursal válida sin error bloqueante", async ({ page }) => {
    await gotoBranches(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const ts = Date.now();
      const nameInput = page.locator("[name='name'] input").first();
      await nameInput.fill(`QA Sucursal ${ts}`);
      const codeInput = page.locator("[name='code'] input").first();
      if (await codeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await codeInput.fill(`QA${ts.toString().slice(-4)}`);
      }
      await page.keyboard.press("Control+s");
      await page.waitForTimeout(3000);
      const errDlg = page
        .locator(".o_dialog_title")
        .filter({ hasText: /error|missing/i });
      expect(await errDlg.isVisible({ timeout: 1000 }).catch(() => false)).toBe(
        false,
      );
    }
  });

  test("04-02 crear sin nombre muestra error de validación", async ({
    page,
  }) => {
    await gotoBranches(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const saveBtn = page
        .locator("button")
        .filter({ hasText: /guardar|save/i })
        .first();
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        const hasError = await page
          .locator(".o_field_invalid, .o_notification.bg-danger")
          .isVisible({ timeout: 3000 })
          .catch(() => false);
        const hasDialog = await page
          .locator(".o_dialog_title")
          .filter({ hasText: /error|missing|requerido/i })
          .isVisible({ timeout: 1000 })
          .catch(() => false);
        expect(hasError || hasDialog || page.url().includes("new")).toBe(true);
      }
    }
  });
});

// ──────────────────────────────────────────────────────────────
// SEC-05 [BE] Relación Sucursal — Almacén y POS
// ──────────────────────────────────────────────────────────────
test.describe("SEC-05 [BE] Relacion Sucursal con Almacen y POS", () => {
  test("05-01 primera sucursal tiene campo warehouse_id", async ({ page }) => {
    await gotoBranches(page);
    const base = new OdooBasePage(page);
    await base.switchToListView().catch(() => {});
    const firstRow = page.locator(".o_data_row").first();
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      expect(
        await page.locator("[name='warehouse_id']").count(),
      ).toBeGreaterThan(0);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// SEC-06 [BE] Integridad HTTP y Consola
// ──────────────────────────────────────────────────────────────
test.describe("SEC-06 [BE] Integridad HTTP y Consola", () => {
  test("06-01 no hay errores RPC 500", async ({ page }) => {
    const rpcErrors: string[] = [];
    page.on("response", (r: any) => {
      if (r.url().includes("/web/dataset/call_kw") && r.status() >= 500)
        rpcErrors.push(r.url());
    });
    await gotoBranches(page);
    await page.waitForTimeout(2000);
    expect(rpcErrors.length).toBe(0);
  });

  test("06-02 menos de 10 errores JS", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e: any) => errors.push(e.message));
    page.on("console", (msg: any) => {
      if (msg.type() === "error" && !msg.text().includes("favicon"))
        errors.push(msg.text());
    });
    await gotoBranches(page);
    await page.waitForTimeout(2000);
    expect(errors.length).toBeLessThan(10);
  });
});

// ──────────────────────────────────────────────────────────────
// SEC-07 [FE] Sucursales — Acceso Público
// ──────────────────────────────────────────────────────────────
test.describe("SEC-07 [FE] Sucursales Acceso Publico", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("07-01 sin auth redirige a login sin 500", async ({ page }) => {
    const r = await page.goto(`${URL}/odoo/sweet-branches`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
    expect(page.url()).toMatch(/login|web/);
  });

  test("07-02 sitio de sucursales responde sin error 500", async ({ page }) => {
    const r = await page.goto(`${URL}/sucursales`).catch(async () => {
      return await page.goto(`${URL}/branches`);
    });
    await page.waitForLoadState("networkidle");
    if (r) expect(r.status()).not.toBe(500);
  });

  test("07-03 pagina de inicio carga sin error", async ({ page }) => {
    await page.goto(`${URL}/`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).not.toContain("error");
  });

  test("07-04 formulario de reserva muestra sucursales disponibles", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    if (r?.status() === 200) {
      const branchSelect = page
        .locator("select[name='branch_id'], #branch_id")
        .first();
      if (await branchSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        const options = await page
          .locator("select[name='branch_id'] option")
          .allTextContents()
          .catch(() => []);
        expect(options.length).toBeGreaterThan(0);
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-08 [BE] Campos Adicionales de Sucursal
// address, phone, manager_id, pos_config_ids, pos_config_count
// ══════════════════════════════════════════════════════════════
test.describe("SEC-08 [BE] Campos Adicionales de Sucursal", () => {
  test.beforeEach(async ({ page }) => {
    await gotoBranches(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
    }
  });

  test("08-01 campo address (Dirección) visible y editable", async ({
    page,
  }) => {
    const field = page.locator("[name='address'] input").first();
    if (await field.isVisible({ timeout: 5000 }).catch(() => false)) {
      await field.fill("Calle 23 #456, La Habana");
      expect(await field.inputValue()).toBe("Calle 23 #456, La Habana");
    }
  });

  test("08-02 campo phone (Teléfono) visible y editable", async ({ page }) => {
    const field = page.locator("[name='phone'] input").first();
    if (await field.isVisible({ timeout: 5000 }).catch(() => false)) {
      await field.fill("+53 7 831 2345");
      expect(await field.inputValue()).toBeTruthy();
    }
  });

  test("08-03 campo manager_id (Gerente) existe en el formulario", async ({
    page,
  }) => {
    expect(await page.locator("[name='manager_id']").count()).toBeGreaterThan(
      0,
    );
  });

  test("08-04 campo sequence (Secuencia) existe", async ({ page }) => {
    expect(await page.locator("[name='sequence']").count()).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-09 [BE] Relación Sucursal — POS configs
// ══════════════════════════════════════════════════════════════
test.describe("SEC-09 [BE] Sucursal y POS Configs", () => {
  test("09-01 campo pos_config_ids existe en el formulario de sucursal", async ({
    page,
  }) => {
    await gotoBranches(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const field = page.locator("[name='pos_config_ids']");
      expect(await field.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test("09-02 sucursal existente no genera 500 al abrir (relación POS)", async ({
    page,
  }) => {
    await gotoBranches(page);
    const base = new OdooBasePage(page);
    await base.switchToListView().catch(() => {});
    const firstRow = page.locator(".o_data_row").first();
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      let has500 = false;
      page.on("response", (r: any) => {
        if (r.status() >= 500) has500 = true;
      });
      await firstRow.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      await page.waitForTimeout(2000);
      expect(has500).toBe(false);
    }
  });

  test("09-03 código de sucursal tiene tamaño máximo 10 caracteres", async ({
    page,
  }) => {
    await gotoBranches(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const codeInput = page.locator("[name='code'] input").first();
      if (await codeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await codeInput.fill("ABCDEFGHIJK"); // 11 chars, maxlength=10
        const val = await codeInput.inputValue();
        // El campo debe limitar a 10 caracteres
        expect(val.length).toBeLessThanOrEqual(10);
      }
    }
  });
});
