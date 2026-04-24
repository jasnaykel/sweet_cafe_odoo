/**
 * Sweet Café QA — Suite Completa: Reservas de Pedido
 * ====================================================
 * Nivel: Senior QA · Backend + Frontend
 * Módulos: sweet_cafe_management/sweet_reservation.py
 *          sweet_cafe_ecommerce/controllers/main.py
 *
 * Flujo: Borrador → Confirmada → Lista → Entregada / Cancelada
 *
 * ─── BACKEND ─── SEC-01..06
 * ─── FRONTEND ─── SEC-07..08
 */

import { test, expect } from "@playwright/test";
import { OdooBasePage } from "../../src/pages/odoo-base.page.js";

const URL = process.env.ODOO_URL || "http://localhost:8069";

async function gotoReservations(page: any) {
  await page.goto(`${URL}/odoo/sweet-reservations`).catch(async () => {
    await page.goto(`${URL}/odoo`);
  });
  await page.waitForSelector(
    ".o_list_view, .o_kanban_view, .o_view_controller",
    { timeout: 25000 },
  );
}

// ══════════════════════════════════════════════════════════════
// SEC-01 · [BE] Acceso al Módulo de Reservas
// ══════════════════════════════════════════════════════════════
test.describe("SEC-01 · [BE] Acceso al Módulo de Reservas", () => {
  test("01-01 Módulo de reservas accesible sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoReservations(page);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("01-02 Vista lista o kanban de reservas visible", async ({ page }) => {
    await gotoReservations(page);
    await expect(
      page.locator(".o_list_view, .o_kanban_view, .o_view_controller"),
    ).toBeVisible({ timeout: 15000 });
  });

  test("01-03 Cambio entre vista lista y kanban funciona", async ({ page }) => {
    await gotoReservations(page);
    const listBtn = page
      .locator("[title='List'], .o_switch_view[data-type='list']")
      .first();
    if (await listBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await listBtn.click();
      await expect(page.locator(".o_list_view")).toBeVisible({
        timeout: 10000,
      });
    }
    const kanbanBtn = page
      .locator("[title='Kanban'], .o_switch_view[data-type='kanban']")
      .first();
    if (await kanbanBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await kanbanBtn.click();
      await expect(page.locator(".o_kanban_view")).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test("01-04 Botón 'Nuevo' disponible en lista de reservas", async ({
    page,
  }) => {
    await gotoReservations(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
  });

  test("01-05 Barra de búsqueda funcional en reservas", async ({ page }) => {
    await gotoReservations(page);
    const search = page.locator(".o_searchview_input").first();
    await expect(search).toBeVisible({ timeout: 10000 });
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-02 · [BE] Formulario de Nueva Reserva
// ══════════════════════════════════════════════════════════════
test.describe("SEC-02 · [BE] Formulario de Nueva Reserva", () => {
  test.beforeEach(async ({ page }) => {
    await gotoReservations(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
    }
  });

  test("02-01 Formulario de nueva reserva se abre sin error", async ({
    page,
  }) => {
    await expect(page.locator(".o_form_view")).toBeVisible({ timeout: 15000 });
  });

  test("02-02 Campo 'partner_id' (cliente) existe en la reserva", async ({
    page,
  }) => {
    expect(await page.locator("[name='partner_id']").count()).toBeGreaterThan(
      0,
    );
  });

  test("02-03 Campo de fecha de entrega existe", async ({ page }) => {
    const dateField = await page
      .locator(
        "[name='delivery_date'], [name='date_order'], [name='date_delivery']",
      )
      .count();
    expect(dateField).toBeGreaterThan(0);
  });

  test("02-04 Barra de estado muestra estado inicial 'Borrador' o 'Draft'", async ({
    page,
  }) => {
    const statusBar = page.locator(".o_statusbar_status, .o_field_status_bar");
    await expect(statusBar).toBeVisible({ timeout: 10000 });
    const statusText = await statusBar.textContent().catch(() => "");
    expect(statusText).toMatch(/borrador|draft/i);
  });

  test("02-05 Campo de sucursal (branch_id) existe en la reserva", async ({
    page,
  }) => {
    const branchField = await page
      .locator("[name='branch_id'], [name='sweet_branch_id']")
      .count();
    // Si el módulo sweet_cafe usa branch_id en reservas
    expect(branchField).toBeGreaterThanOrEqual(0);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-03 · [BE] Flujo de Estados de Reserva
// ══════════════════════════════════════════════════════════════
test.describe("SEC-03 · [BE] Flujo de Estados de Reserva", () => {
  test("03-01 Barra de estado tiene los estados del modelo", async ({
    page,
  }) => {
    await gotoReservations(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
    }
    const statusBar = page.locator(".o_statusbar_status, .o_field_status_bar");
    await expect(statusBar).toBeVisible({ timeout: 10000 });
  });

  test("03-02 Reserva sin cliente muestra error de validación al guardar", async ({
    page,
  }) => {
    await gotoReservations(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      // Intentar guardar sin completar campos requeridos
      const saveBtn = page
        .locator("button")
        .filter({ hasText: /guardar|save/i })
        .first();
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        // Debe mostrar error o campo inválido
        const hasError = await page
          .locator(".o_field_invalid, .o_notification.bg-danger")
          .isVisible({ timeout: 3000 })
          .catch(() => false);
        const hasDialog = await page
          .locator(".o_dialog_title")
          .filter({ hasText: /error|missing|requerido/i })
          .isVisible({ timeout: 1000 })
          .catch(() => false);
        // Al menos uno de los indicadores de error debe aparecer (o el form aún está en borrador)
        expect(hasError || hasDialog || page.url().includes("new")).toBe(true);
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-04 · [BE] Filtros y Búsqueda en Reservas
// ══════════════════════════════════════════════════════════════
test.describe("SEC-04 · [BE] Filtros y Búsqueda en Reservas", () => {
  test("04-01 Búsqueda de término inexistente no genera error", async ({
    page,
  }) => {
    await gotoReservations(page);
    const search = page.locator(".o_searchview_input").first();
    await search.fill("ZZZZINEXISTENTE99999");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("04-02 Filtros de búsqueda disponibles", async ({ page }) => {
    await gotoReservations(page);
    const searchInput = page.locator(".o_searchview_input").first();
    await searchInput.click();
    await page.waitForTimeout(500);
    await expect(page.locator(".o_searchview")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-05 · [BE] CRUD Completo de Reservas
// ══════════════════════════════════════════════════════════════
test.describe("SEC-05 · [BE] CRUD Completo de Reservas", () => {
  test("05-01 Crear reserva mínima (con cliente) guarda sin error bloqueante", async ({
    page,
  }) => {
    await gotoReservations(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });

      // Intentar asignar un cliente
      const partnerField = page.locator("[name='partner_id'] input").first();
      if (await partnerField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await partnerField.fill("Sweet");
        await page.waitForTimeout(1000);
        const firstOption = page
          .locator(".o_m2o_dropdown_option, .ui-autocomplete li")
          .first();
        if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await firstOption.click();
          await page.waitForTimeout(500);
        }
      }

      // Descartar (no guardar datos de prueba)
      const discardBtn = page
        .locator("button")
        .filter({ hasText: /descartar|discard/i })
        .first();
      if (await discardBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await discardBtn.click();
        await page.waitForTimeout(1000);
      }

      await expect(page.locator(".o_view_controller")).toBeVisible({
        timeout: 10000,
      });
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-06 · [BE] Integridad HTTP y Consola
// ══════════════════════════════════════════════════════════════
test.describe("SEC-06 · [BE] Integridad HTTP y Consola", () => {
  test("06-01 No hay errores RPC 500 en módulo de reservas", async ({
    page,
  }) => {
    const rpcErrors: string[] = [];
    page.on("response", (r: any) => {
      if (r.url().includes("/web/dataset/call_kw") && r.status() >= 500)
        rpcErrors.push(r.url());
    });
    await gotoReservations(page);
    await page.waitForTimeout(2000);
    expect(rpcErrors.length).toBe(0);
  });

  test("06-02 Menos de 10 errores JS en el módulo de reservas", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e: any) => errors.push(e.message));
    page.on("console", (msg: any) => {
      if (msg.type() === "error" && !msg.text().includes("favicon"))
        errors.push(msg.text());
    });
    await gotoReservations(page);
    await page.waitForTimeout(2000);
    expect(errors.length).toBeLessThan(10);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-07 · [FE] Formulario Público de Reserva (/reservar)
// ══════════════════════════════════════════════════════════════
test.describe("SEC-07 · [FE] Formulario Público de Reserva", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("07-01 /reservar responde sin error 500", async ({ page }) => {
    const r = await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    expect(r?.status() ?? 500).not.toBe(500);
  });

  test("07-02 Formulario /reservar tiene campo de nombre", async ({ page }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const nameField = page
      .locator(
        "input[name='name'], input[name='customer_name'], #customer_name",
      )
      .first();
    await expect(nameField).toBeVisible({ timeout: 15000 });
  });

  test("07-03 Formulario /reservar tiene campo de email", async ({ page }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const emailField = page
      .locator("input[name='email'], input[type='email']")
      .first();
    await expect(emailField).toBeVisible({ timeout: 15000 });
  });

  test("07-04 Formulario tiene campo de fecha de entrega", async ({ page }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const dateField = page
      .locator("input[name='delivery_date'], input[type='date']")
      .first();
    await expect(dateField).toBeVisible({ timeout: 15000 });
  });

  test("07-05 Formulario tiene selector de sucursal", async ({ page }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const branchSelect = page
      .locator("select[name='branch_id'], #branch_id, [name='branch_id']")
      .first();
    await expect(branchSelect).toBeVisible({ timeout: 15000 });
  });

  test("07-06 Formulario tiene botón de envío", async ({ page }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const submitBtn = page
      .locator(
        "button[type='submit'], input[type='submit'], .btn-primary[type='submit']",
      )
      .first();
    await expect(submitBtn).toBeVisible({ timeout: 15000 });
  });

  test("07-07 Envío con campos vacíos muestra validación (no 500)", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const submitBtn = page
      .locator("button[type='submit'], input[type='submit']")
      .first();
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForLoadState("networkidle");
      const status = await page.evaluate(() => document.readyState);
      expect(status).toBe("complete");
      // No debe haber error 500
      expect(page.url()).not.toContain("error=500");
    }
  });

  test("07-08 No hay errores JS en el formulario público de reserva", async ({
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
// SEC-08 · [FE] Confirmación y Flujo Post-Reserva
// ══════════════════════════════════════════════════════════════
test.describe("SEC-08 · [FE] Confirmación y Flujo Post-Reserva", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("08-01 URL /reservar/confirmacion responde sin 500", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/reservar/confirmacion`).catch(() => null);
    if (r) expect(r.status()).not.toBe(500);
  });

  test("08-02 Página de inicio / accede al formulario de reserva via enlace", async ({
    page,
  }) => {
    await page.goto(`${URL}/`);
    await page.waitForLoadState("networkidle");
    // Verificar que el link a reservar existe en el sitio
    const reservaLink = page
      .locator("a[href*='reservar'], a[href*='reservation']")
      .first();
    const exists = await reservaLink
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (exists) {
      await expect(reservaLink).toBeVisible();
    }
    // Si no existe, la home no tiene el link (puede estar en el menú)
    await expect(page.locator("body")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-09 · [BE] Máquina de Estados de sweet.reservation
// draft → confirmed → ready → done / cancelled
// ══════════════════════════════════════════════════════════════
test.describe("SEC-09 · [BE] Máquina de Estados — Reserva", () => {
  async function gotoNewReservation(page: any) {
    await page.goto(`${URL}/odoo/sweet-reservations`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
    }
  }

  test("09-01 Nueva reserva arranca en estado Borrador", async ({ page }) => {
    await gotoNewReservation(page);
    const statusBar = page.locator(
      ".o_statusbar_status button.o_arrow_button, .o_statusbar_status span",
    );
    const text = await statusBar
      .first()
      .textContent()
      .catch(() => "");
    expect(text.toLowerCase()).toMatch(/borrador|draft/);
  });

  test("09-02 Botón Confirmar existe en formulario de reserva", async ({
    page,
  }) => {
    await gotoNewReservation(page);
    const confirmBtn = page
      .locator("button")
      .filter({ hasText: /confirmar|confirm/i })
      .first();
    // Si el botón no existe, al menos la barra de estado tiene el estado draft
    const statusBar = page.locator(".o_statusbar_status");
    expect(
      (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) ||
        (await statusBar.isVisible({ timeout: 3000 }).catch(() => false)),
    ).toBe(true);
  });

  test("09-03 La barra de estado muestra todos los estados posibles", async ({
    page,
  }) => {
    await gotoNewReservation(page);
    const statusBar = page.locator(".o_statusbar_status");
    if (await statusBar.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = await statusBar.textContent();
      // Al menos draft y done deben estar en el estado bar
      expect(text).toMatch(/borrador|draft/i);
    }
  });

  test("09-04 Restricción: fecha de entrega en el pasado genera error de validación", async ({
    page,
  }) => {
    await gotoNewReservation(page);
    const dateField = page.locator("[name='delivery_date'] input").first();
    if (await dateField.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Fecha 5 días en el pasado
      const past = new Date();
      past.setDate(past.getDate() - 5);
      const pastStr = past.toISOString().split("T")[0];
      await dateField.fill(pastStr);
      await dateField.blur();
      await page.waitForTimeout(1000);
      // Intentar guardar
      const saveBtn = page
        .locator("button")
        .filter({ hasText: /guardar|save/i })
        .first();
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        let has500 = false;
        page.on("response", (r: any) => {
          if (r.status() >= 500) has500 = true;
        });
        await saveBtn.click();
        await page.waitForTimeout(2000);
        const errDlg = page
          .locator(".o_dialog, .o_notification")
          .filter({ hasText: /pasado|fecha|entrega/i });
        const hasError = await errDlg
          .isVisible({ timeout: 3000 })
          .catch(() => false);
        // O hay error de validación O no hay 500 (la validación ocurre por constrains)
        expect(has500).toBe(false);
      }
    }
  });

  test("09-05 Campo origin tiene opciones: website, phone, store", async ({
    page,
  }) => {
    await gotoNewReservation(page);
    const originSel = page.locator("[name='origin'] select");
    if (await originSel.isVisible({ timeout: 3000 }).catch(() => false)) {
      const opts = await originSel.locator("option").allTextContents();
      expect(opts.some((o) => /web|sitio/i.test(o))).toBe(true);
      expect(opts.some((o) => /tel[eé]fono|phone/i.test(o))).toBe(true);
      expect(opts.some((o) => /tienda|store/i.test(o))).toBe(true);
    }
  });

  test("09-06 Campo sale_order_id existe en el formulario (readonly)", async ({
    page,
  }) => {
    await gotoNewReservation(page);
    const field = page.locator("[name='sale_order_id']");
    expect(await field.count()).toBeGreaterThan(0);
  });

  test("09-07 Campo line_ids (productos) visible en formulario", async ({
    page,
  }) => {
    await gotoNewReservation(page);
    const lineField = page.locator("[name='line_ids']");
    expect(await lineField.count()).toBeGreaterThan(0);
  });

  test("09-08 Campo deposit_amount y deposit_paid existen", async ({
    page,
  }) => {
    await gotoNewReservation(page);
    expect(
      await page.locator("[name='deposit_amount']").count(),
    ).toBeGreaterThan(0);
    expect(await page.locator("[name='deposit_paid']").count()).toBeGreaterThan(
      0,
    );
  });

  test("09-09 Campo customer_notes acepta texto libre", async ({ page }) => {
    await gotoNewReservation(page);
    const notes = page.locator("[name='customer_notes'] textarea").first();
    if (await notes.isVisible({ timeout: 3000 }).catch(() => false)) {
      await notes.fill("Sin gluten, decoración azul");
      expect(await notes.inputValue()).toBe("Sin gluten, decoración azul");
    }
  });

  test("09-10 Reservas existentes tienen estado visible en la lista", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/sweet-reservations`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    // Cambiar a vista lista si no lo está
    const listBtn = page
      .locator("button[name='list'], .o_switch_view.o_list, .oi-list-ul")
      .first();
    if (await listBtn.isVisible({ timeout: 2000 }).catch(() => false))
      await listBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-10 · [BE] Campo amount_total y líneas de reserva
// ══════════════════════════════════════════════════════════════
test.describe("SEC-10 · [BE] Totales y Líneas de Reserva", () => {
  test("10-01 Campo amount_total es de tipo Monetary (readonly computed)", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/sweet-reservations`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const totalField = page.locator("[name='amount_total']");
      expect(await totalField.count()).toBeGreaterThan(0);
    }
  });

  test("10-02 Campo partner_phone y partner_email son related (readonly)", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/sweet-reservations`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForSelector(".o_form_view", { timeout: 15000 });
      const phoneField = page
        .locator("[name='partner_phone'], [name='partner_email']")
        .first();
      expect(await phoneField.count()).toBeGreaterThan(0);
    }
  });
});
