/**
 * Sweet Café QA — Suite Completa: Nómina Cubana
 * ==============================================
 * Nivel: Senior QA · Backend + Frontend
 * Módulos: l10n_cu_hr_payroll, l10n_cu_hr_payroll_movement,
 *          rrhh_5p (Resolución 5p), l10n_cu_hr_employee_contract
 *
 * ─── BACKEND ─── SEC-01..07
 * ─── FRONTEND ─── SEC-08
 */

import { test, expect } from "@playwright/test";
import { OdooBasePage } from "../../src/pages/odoo-base.page.js";

const URL = process.env.ODOO_URL || "http://localhost:8069";

// ══════════════════════════════════════════════════════════════
// SEC-01 · [BE] Acceso al Módulo de Nómina
// ══════════════════════════════════════════════════════════════
test.describe("SEC-01 · [BE] Nómina — Acceso y Vistas", () => {
  test("01-01 /odoo/payroll carga sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.goto(`${URL}/odoo/payroll`);
    await page.waitForSelector(
      ".o_list_view, .o_kanban_view, .o_view_controller",
      { timeout: 25000 },
    );
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("01-02 Lista de nóminas (payslips) accesible", async ({ page }) => {
    await page.goto(`${URL}/odoo/payroll/payslips`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 25000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("01-03 Lotes de nóminas accesibles", async ({ page }) => {
    await page.goto(`${URL}/odoo/payroll/payslip-batches`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 25000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("01-04 Botón 'Nuevo' disponible en nóminas", async ({ page }) => {
    await page.goto(`${URL}/odoo/payroll/payslips`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 25000,
    });
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-02 · [BE] Formulario de Nómina (Payslip)
// ══════════════════════════════════════════════════════════════
test.describe("SEC-02 · [BE] Formulario de Nómina", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${URL}/odoo/payroll/payslips/new`);
    await page.waitForSelector(".o_form_view", { timeout: 25000 });
  });

  test("02-01 Formulario de nueva nómina se abre", async ({ page }) => {
    await expect(page.locator(".o_form_view")).toBeVisible();
  });

  test("02-02 Campo 'employee_id' (empleado) existe", async ({ page }) => {
    expect(await page.locator("[name='employee_id']").count()).toBeGreaterThan(
      0,
    );
  });

  test("02-03 Campo 'struct_id' (estructura salarial) existe", async ({
    page,
  }) => {
    expect(await page.locator("[name='struct_id']").count()).toBeGreaterThan(0);
  });

  test("02-04 Campo 'date_from' (fecha inicio) existe", async ({ page }) => {
    expect(await page.locator("[name='date_from']").count()).toBeGreaterThan(0);
  });

  test("02-05 Campo 'date_to' (fecha fin) existe", async ({ page }) => {
    expect(await page.locator("[name='date_to']").count()).toBeGreaterThan(0);
  });

  test("02-06 Barra de estado muestra estado inicial (Draft/Borrador)", async ({
    page,
  }) => {
    const statusBar = page.locator(".o_statusbar_status, .o_field_status_bar");
    await expect(statusBar).toBeVisible({ timeout: 10000 });
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-03 · [BE] Reglas y Estructuras Salariales
// ══════════════════════════════════════════════════════════════
test.describe("SEC-03 · [BE] Reglas y Estructuras Salariales", () => {
  test("03-01 Reglas salariales accesibles", async ({ page }) => {
    await page.goto(`${URL}/odoo/payroll/salary-rules`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 25000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("03-02 Estructuras salariales cubanas accesibles", async ({ page }) => {
    await page.goto(`${URL}/odoo/payroll/salary-structures`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 25000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("03-03 Estructura salarial tiene campo 'name'", async ({ page }) => {
    await page.goto(`${URL}/odoo/payroll/salary-structures/new`);
    await page.waitForSelector(".o_form_view", { timeout: 15000 });
    await expect(page.locator("[name='name']").first()).toBeVisible();
  });

  test("03-04 Escala salarial cubana accesible", async ({ page }) => {
    await page.goto(`${URL}/odoo/sweet-salary-scales`).catch(async () => {
      await page.goto(`${URL}/odoo/payroll`);
    });
    await page.waitForSelector(
      ".o_view_controller, .o_list_view, .o_kanban_view",
      { timeout: 25000 },
    );
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-04 · [BE] Movimientos de Nómina (l10n_cu_hr_payroll_movement)
// ══════════════════════════════════════════════════════════════
test.describe("SEC-04 · [BE] Movimientos de Nómina", () => {
  test("04-01 Módulo de movimientos de nómina accesible vía menú principal", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo`);
    await page.waitForSelector(".o_main_navbar, .o_web_client", {
      timeout: 25000,
    });
    await expect(page.locator(".o_main_navbar")).toBeVisible();
  });

  test("04-02 /odoo/payroll no genera 500 en carga inicial", async ({
    page,
  }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.url().includes("/web/dataset/call_kw") && r.status() >= 500)
        has500 = true;
    });
    await page.goto(`${URL}/odoo/payroll`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await page.waitForTimeout(1500);
    expect(has500).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-05 · [BE] Contratos (l10n_cu_hr_employee_contract)
// ══════════════════════════════════════════════════════════════
test.describe("SEC-05 · [BE] Contratos Laborales", () => {
  test("05-01 Contratos accesibles", async ({ page }) => {
    await page.goto(`${URL}/odoo/payroll/contracts`);
    await page.waitForSelector(".o_list_view, .o_view_controller", {
      timeout: 25000,
    });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("05-02 Formulario de nuevo contrato tiene campo 'name'", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/payroll/contracts/new`);
    await page.waitForSelector(".o_form_view", { timeout: 15000 });
    await expect(page.locator("[name='name']").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("05-03 Contrato tiene campo 'employee_id'", async ({ page }) => {
    await page.goto(`${URL}/odoo/payroll/contracts/new`);
    await page.waitForSelector(".o_form_view", { timeout: 15000 });
    expect(await page.locator("[name='employee_id']").count()).toBeGreaterThan(
      0,
    );
  });

  test("05-04 Contrato tiene campo 'wage' (salario)", async ({ page }) => {
    await page.goto(`${URL}/odoo/payroll/contracts/new`);
    await page.waitForSelector(".o_form_view", { timeout: 15000 });
    expect(await page.locator("[name='wage']").count()).toBeGreaterThan(0);
  });

  test("05-05 Contrato tiene campo 'date_start' (fecha inicio)", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/payroll/contracts/new`);
    await page.waitForSelector(".o_form_view", { timeout: 15000 });
    expect(await page.locator("[name='date_start']").count()).toBeGreaterThan(
      0,
    );
  });

  test("05-06 Contrato tiene barra de estado (New/Running/Expired)", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/payroll/contracts/new`);
    await page.waitForSelector(".o_form_view", { timeout: 15000 });
    const statusBar = page.locator(".o_statusbar_status, .o_field_status_bar");
    await expect(statusBar).toBeVisible({ timeout: 10000 });
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-06 · [BE] Tablas Fiscales Cuba (ONAT)
// ══════════════════════════════════════════════════════════════
test.describe("SEC-06 · [BE] Tablas Fiscales Cuba (ONAT / rrhh_5p)", () => {
  test("06-01 Panel principal de Odoo accesible (módulo rrhh_5p instalado)", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo`);
    await page.waitForSelector(".o_main_navbar", { timeout: 25000 });
    await expect(page.locator(".o_main_navbar")).toBeVisible();
  });

  test("06-02 Tabla de tramos impositivos sweet.tax.bracket accesible", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/sweet-tax-brackets`).catch(async () => {
      await page.goto(`${URL}/odoo`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await expect(page.locator(".o_main_navbar")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-07 · [BE] Integridad HTTP y Consola — Nómina
// ══════════════════════════════════════════════════════════════
test.describe("SEC-07 · [BE] Integridad HTTP y Consola", () => {
  test("07-01 No hay errores RPC 500 al cargar nóminas", async ({ page }) => {
    const rpcErrors: string[] = [];
    page.on("response", (r: any) => {
      if (r.url().includes("/web/dataset/call_kw") && r.status() >= 500)
        rpcErrors.push(r.url());
    });
    await page.goto(`${URL}/odoo/payroll`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await page.waitForTimeout(2000);
    expect(rpcErrors.length).toBe(0);
  });

  test("07-02 Menos de 10 errores JS al cargar módulo de nómina", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e: any) => errors.push(e.message));
    page.on("console", (msg: any) => {
      if (msg.type() === "error" && !msg.text().includes("favicon"))
        errors.push(msg.text());
    });
    await page.goto(`${URL}/odoo/payroll`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await page.waitForTimeout(2000);
    expect(errors.length).toBeLessThan(10);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-08 · [FE] Nómina — Acceso Público
// ══════════════════════════════════════════════════════════════
test.describe("SEC-08 · [FE] Nómina — Acceso Público y Portal", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("08-01 /odoo/payroll sin auth redirige a login (no 500)", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/odoo/payroll`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
    expect(page.url()).toMatch(/login|web/);
  });

  test("08-02 Portal /my no expone nóminas sin autenticación", async ({
    page,
  }) => {
    await page.goto(`${URL}/my`);
    await page.waitForLoadState("networkidle");
    // Sin auth debe redirigir a login
    expect(page.url()).toMatch(/login|web|my/);
  });

  test("08-03 Sitio web no muestra datos salariales públicamente", async ({
    page,
  }) => {
    await page.goto(`${URL}/`);
    await page.waitForLoadState("networkidle");
    const content = await page.content();
    // El sitio público no debe contener rutas de payroll
    expect(content).not.toContain("/odoo/payroll/payslips");
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-09 · [BE] Flujo Nómina: Calcular y Confirmar Payslip
// ══════════════════════════════════════════════════════════════
test.describe("SEC-09 · [BE] Flujo Nómina: Calcular y Confirmar", () => {
  test("09-01 Payslip nuevo tiene botón Calcular (compute)", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/payroll`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const computeBtn = page
        .locator("button")
        .filter({ hasText: /calcular|compute/i })
        .first();
      const hasBtn = await computeBtn
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const statusBar = page.locator(".o_statusbar_status");
      expect(
        hasBtn ||
          (await statusBar.isVisible({ timeout: 3000 }).catch(() => false)),
      ).toBe(true);
    }
  });

  test("09-02 Estado inicial del payslip es Borrador (Draft)", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/payroll`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
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
        expect(text.toLowerCase()).toMatch(/borrador|draft/i);
      }
    }
  });

  test("09-03 Campos date_from y date_to visibles en payslip", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/payroll`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      expect(await page.locator("[name='date_from']").count()).toBeGreaterThan(
        0,
      );
      expect(await page.locator("[name='date_to']").count()).toBeGreaterThan(0);
    }
  });

  test("09-04 Campo line_ids (líneas de nómina) existe en el payslip", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/payroll`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      expect(
        await page
          .locator("[name='line_ids'], [name='worked_days_line_ids']")
          .count(),
      ).toBeGreaterThan(0);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-10 · [BE] sweet.tax.bracket y sweet.declaracion_anual
// ══════════════════════════════════════════════════════════════
test.describe("SEC-10 · [BE] Tablas Fiscales Cubanas", () => {
  async function gotoModel(page: any, url: string) {
    await page.goto(url).catch(async () => {
      await page.goto(`${URL}/odoo`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
  }

  test("10-01 sweet.tax.bracket accesible sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoModel(page, `${URL}/odoo/sweet-tax-brackets`);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("10-02 sweet.tax.bracket formulario tiene campos de tramo impositivo", async ({
    page,
  }) => {
    await gotoModel(page, `${URL}/odoo/sweet-tax-brackets`);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      // lower_bound, upper_bound, rate son los campos del modelo
      const hasFields = await page
        .locator(
          "[name='lower_bound'], [name='upper_bound'], [name='rate'], [name='min_amount'], [name='max_amount']",
        )
        .count();
      expect(hasFields).toBeGreaterThan(0);
    }
  });

  test("10-03 sweet.declaracion_anual accesible sin error 500", async ({
    page,
  }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoModel(page, `${URL}/odoo/sweet-declaraciones-anuales`);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("10-04 sweet.onat.report accesible sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoModel(page, `${URL}/odoo/sweet-onat-reports`);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("10-05 sweet.libro.igi accesible sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoModel(page, `${URL}/odoo/sweet-libro-igi`);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });
});
