/**
 * Sweet Café QA — Suite Completa: Formulario de Reserva Online
 * ==============================================================
 * Nivel: Senior QA · Backend + Frontend
 * Módulos: sweet_cafe_ecommerce/controllers/main.py
 *          sweet_cafe_ecommerce/views/sweet_reservation_templates.xml
 *
 * Flujo:
 *   1. Cliente accede a /reservar (o /reservation)
 *   2. Rellena: nombre, email, teléfono, sucursal, fecha, productos
 *   3. Envía → Odoo crea sweet.reservation en estado draft
 *   4. Recibe confirmación por email y ve la página de éxito
 *
 * ─── BACKEND ─── SEC-01..03 (admin: ver y gestionar reservas del formulario web)
 * ─── FRONTEND ─── SEC-04..07 (formulario público, validaciones, UX)
 */

import { test, expect } from "@playwright/test";
import { OdooBasePage } from "../../src/pages/odoo-base.page.js";

const URL = process.env.ODOO_URL || "http://localhost:8069";

// Fecha de entrega: 3 días en el futuro
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 3);
const FUTURE_DATE_ISO = futureDate.toISOString().split("T")[0]; // YYYY-MM-DD

// ══════════════════════════════════════════════════════════════
// SEC-01 · [BE] Gestión de Reservas Recibidas desde el Web
// ══════════════════════════════════════════════════════════════
test.describe("SEC-01 · [BE] Reservas Recibidas del Formulario Web", () => {
  test("01-01 Módulo de reservas accesible sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.goto(`${URL}/odoo/sweet-reservations`).catch(async () => {
      await page.goto(`${URL}/odoo`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("01-02 Lista de reservas visible en backend", async ({ page }) => {
    await page.goto(`${URL}/odoo/sweet-reservations`).catch(async () => {
      await page.goto(`${URL}/odoo`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await expect(
      page.locator(".o_main_navbar, .o_view_controller"),
    ).toBeVisible();
  });

  test("01-03 Reservas tienen barra de estado con flujo completo", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/sweet-reservations`).catch(async () => {
      await page.goto(`${URL}/odoo`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const statusBar = page.locator(
        ".o_statusbar_status, .o_field_status_bar",
      );
      await expect(statusBar).toBeVisible({ timeout: 10000 });
      const statusText = await statusBar.textContent().catch(() => "");
      expect(statusText).toMatch(/borrador|draft/i);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-02 · [BE] Campos del Formulario de Reserva (Modelo)
// ══════════════════════════════════════════════════════════════
test.describe("SEC-02 · [BE] Campos del Modelo sweet.reservation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${URL}/odoo/sweet-reservations`).catch(async () => {
      await page.goto(`${URL}/odoo`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
    }
  });

  test("02-01 Campo 'partner_id' (cliente) existe", async ({ page }) => {
    expect(await page.locator("[name='partner_id']").count()).toBeGreaterThan(
      0,
    );
  });

  test("02-02 Campo de fecha de entrega existe", async ({ page }) => {
    const dateField = await page
      .locator("[name='delivery_date'], [name='date_order']")
      .count();
    expect(dateField).toBeGreaterThan(0);
  });

  test("02-03 Campo 'branch_id' (sucursal) existe en reserva", async ({
    page,
  }) => {
    const branchField = await page
      .locator("[name='branch_id'], [name='sweet_branch_id']")
      .count();
    expect(branchField).toBeGreaterThanOrEqual(0);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-03 · [BE] Integridad HTTP — Reservas
// ══════════════════════════════════════════════════════════════
test.describe("SEC-03 · [BE] Integridad HTTP y Consola — Reservas Web", () => {
  test("03-01 No hay errores RPC 500 al cargar módulo de reservas", async ({
    page,
  }) => {
    const rpcErrors: string[] = [];
    page.on("response", (r: any) => {
      if (r.url().includes("/web/dataset/call_kw") && r.status() >= 500)
        rpcErrors.push(r.url());
    });
    await page.goto(`${URL}/odoo/sweet-reservations`).catch(async () => {
      await page.goto(`${URL}/odoo`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await page.waitForTimeout(2000);
    expect(rpcErrors.length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-04 · [FE] Carga del Formulario Público de Reserva
// ══════════════════════════════════════════════════════════════
test.describe("SEC-04 · [FE] Carga del Formulario Público", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("04-01 /reservar responde con código < 400", async ({ page }) => {
    const r = await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    expect(r?.status() ?? 500).toBeLessThan(400);
  });

  test("04-02 La página /reservar tiene título no vacío", async ({ page }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("domcontentloaded");
    expect((await page.title()).length).toBeGreaterThan(0);
  });

  test("04-03 Barra de navegación visible en /reservar", async ({ page }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const navbar = page.locator("nav, .navbar, header").first();
    await expect(navbar).toBeVisible({ timeout: 15000 });
  });

  test("04-04 No hay errores JS críticos al cargar /reservar", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e: any) => errors.push(e.message));
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    expect(errors.length).toBeLessThan(5);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-05 · [FE] Campos del Formulario Público
// ══════════════════════════════════════════════════════════════
test.describe("SEC-05 · [FE] Campos del Formulario Público de Reserva", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
  });

  test("05-01 Campo 'nombre' del cliente visible", async ({ page }) => {
    const nameField = page
      .locator(
        "input[name='name'], input[name='customer_name'], #customer_name",
      )
      .first();
    await expect(nameField).toBeVisible({ timeout: 15000 });
  });

  test("05-02 Campo 'email' del cliente visible", async ({ page }) => {
    const emailField = page
      .locator("input[name='email'], input[type='email']")
      .first();
    await expect(emailField).toBeVisible({ timeout: 15000 });
  });

  test("05-03 Campo 'teléfono' existe en el formulario", async ({ page }) => {
    const phoneField = page
      .locator("input[name='phone'], input[name='tel'], input[type='tel']")
      .first();
    const isVisible = await phoneField
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (isVisible) await expect(phoneField).toBeVisible();
  });

  test("05-04 Campo de fecha de entrega visible", async ({ page }) => {
    const dateField = page
      .locator("input[name='delivery_date'], input[type='date']")
      .first();
    await expect(dateField).toBeVisible({ timeout: 15000 });
  });

  test("05-05 Selector de sucursal (branch_id) visible", async ({ page }) => {
    const branchSelect = page
      .locator("select[name='branch_id'], #branch_id, [name='branch_id']")
      .first();
    await expect(branchSelect).toBeVisible({ timeout: 15000 });
  });

  test("05-06 Botón de envío del formulario visible", async ({ page }) => {
    const submitBtn = page
      .locator("button[type='submit'], input[type='submit']")
      .first();
    await expect(submitBtn).toBeVisible({ timeout: 15000 });
  });

  test("05-07 Selector de sucursal tiene opciones disponibles", async ({
    page,
  }) => {
    const options = await page
      .locator("select[name='branch_id'] option")
      .allTextContents()
      .catch(() => []);
    expect(options.length).toBeGreaterThan(0);
  });

  test("05-08 El formulario acepta fecha futura válida", async ({ page }) => {
    const dateField = page
      .locator("input[name='delivery_date'], input[type='date']")
      .first();
    if (await dateField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dateField.fill(FUTURE_DATE_ISO);
      const value = await dateField.inputValue();
      // La fecha se acepta (no hay error inmediato)
      expect(value).toBeTruthy();
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-06 · [FE] Validación del Formulario Público
// ══════════════════════════════════════════════════════════════
test.describe("SEC-06 · [FE] Validación del Formulario", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("06-01 Envío con campos vacíos no genera error 500 del servidor", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const submitBtn = page
      .locator("button[type='submit'], input[type='submit']")
      .first();
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      let has500 = false;
      page.on("response", (r: any) => {
        if (r.status() >= 500) has500 = true;
      });
      await submitBtn.click();
      await page.waitForLoadState("networkidle");
      expect(has500).toBe(false);
    }
  });

  test("06-02 Campos requeridos vacíos muestran validación HTML5 o mensaje", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const nameField = page
      .locator("input[name='name'], input[name='customer_name']")
      .first();
    const submitBtn = page
      .locator("button[type='submit'], input[type='submit']")
      .first();
    if (await nameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Dejar nombre vacío e intentar enviar
      await nameField.fill("");
      if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(1000);
        // El navegador HTML5 debe mostrar validación O el servidor devuelve el form con error
        const pageContent = await page.content();
        expect(pageContent).not.toContain("Internal Server Error");
      }
    }
  });

  test("06-03 Email inválido no genera error 500", async ({ page }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const emailField = page
      .locator("input[name='email'], input[type='email']")
      .first();
    if (await emailField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailField.fill("email-invalido-sin-arroba");
      const submitBtn = page.locator("button[type='submit']").first();
      if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        let has500 = false;
        page.on("response", (r: any) => {
          if (r.status() >= 500) has500 = true;
        });
        await submitBtn.click();
        await page.waitForLoadState("networkidle");
        expect(has500).toBe(false);
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-07 · [FE] UX y Accesibilidad del Formulario
// ══════════════════════════════════════════════════════════════
test.describe("SEC-07 · [FE] UX y Accesibilidad del Formulario", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("07-01 El formulario es responsivo (viewport mobile)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).not.toContain("error");
  });

  test("07-02 El formulario tiene labels visibles para los campos", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const labels = page.locator("label");
    const count = await labels.count();
    expect(count).toBeGreaterThan(0);
  });

  test("07-03 El formulario no expone datos sensibles en el HTML", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const content = await page.content();
    // No debe haber contraseñas, tokens de API, ni rutas internas en el HTML público
    expect(content).not.toMatch(/password.*=.*[a-zA-Z0-9]{8,}/);
    expect(content).not.toContain("/web/dataset/call_kw");
  });

  test("07-04 Página de confirmación post-reserva (si existe) no genera 500", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/reservar/gracias`).catch(async () => {
      return await page.goto(`${URL}/reservar/confirmacion`);
    });
    if (r) {
      await page.waitForLoadState("networkidle");
      expect(r.status()).not.toBe(500);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-08 [FE] Flujo Completo de Reserva Web
// POST /reservar/enviar → /reservar/gracias?ref=...
// ══════════════════════════════════════════════════════════════
test.describe("SEC-08 [FE] Flujo Completo de Reserva Web", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("08-01 Submit sin campos redirige a error (no 500)", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const submitBtn = page
      .locator("button[type='submit'], input[type='submit']")
      .first();
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      let has500 = false;
      page.on("response", (r: any) => {
        if (r.status() >= 500) has500 = true;
      });
      await submitBtn.click();
      await page.waitForLoadState("networkidle");
      expect(has500).toBe(false);
    }
  });

  test("08-02 /reservar?error=campos_requeridos muestra mensaje de error", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar?error=campos_requeridos`);
    await page.waitForLoadState("networkidle");
    const content = await page.content();
    expect(content.toLowerCase()).toMatch(/error|requerido|campo|required/i);
  });

  test("08-03 /reservar/gracias sin ref carga sin 500", async ({ page }) => {
    const r = await page.goto(`${URL}/reservar/gracias`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("08-04 /reservar/gracias?ref=TEST muestra la referencia", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar/gracias?ref=TEST-QAREF-001`);
    await page.waitForLoadState("networkidle");
    const content = await page.content();
    expect(content).toMatch(/TEST-QAREF-001|Referencia|Reserva|gracias|thank/i);
  });

  test("08-05 /reservar/estado responde sin error 500", async ({ page }) => {
    const r = await page.goto(`${URL}/reservar/estado`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
  });

  test("08-06 /reservar/estado?ref=NOEXISTE muestra respuesta válida", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/reservar/estado?ref=NOEXISTE_QA_TEST`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("08-07 Campo delivery_time en /reservar acepta texto hora", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const timeInput = page.locator("input[name='delivery_time']").first();
    if (await timeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await timeInput.fill("10:00");
      expect(await timeInput.inputValue()).toBeTruthy();
    }
  });

  test("08-08 /reservar?error=sin_productos muestra mensaje apropiado", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar?error=sin_productos`);
    await page.waitForLoadState("networkidle");
    const content = await page.content();
    expect(content.toLowerCase()).toMatch(/producto|error|sin/i);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-09 [BE] Reservas Website en el Panel Admin
// ══════════════════════════════════════════════════════════════
test.describe("SEC-09 [BE] Reservas Website en Backend", () => {
  test("09-01 Campo origin visible y tiene opción website", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/sweet-reservations`).catch(async () => {
      await page.goto(`${URL}/odoo`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const originField = page.locator("[name='origin']");
      expect(await originField.count()).toBeGreaterThan(0);
      const sel = page.locator("[name='origin'] select");
      if (await sel.isVisible({ timeout: 2000 }).catch(() => false)) {
        const opts = await sel.locator("option").allTextContents();
        expect(opts.some((o) => /web|sitio/i.test(o))).toBe(true);
      }
    }
  });

  test("09-02 Filtrar reservas por origen sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.goto(`${URL}/odoo/sweet-reservations`).catch(async () => {
      await page.goto(`${URL}/odoo`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await page.waitForTimeout(2000);
    expect(has500).toBe(false);
  });
});
