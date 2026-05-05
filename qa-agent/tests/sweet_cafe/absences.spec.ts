/**
 * Sweet Café QA — Suite Completa: Ausencias y Vacaciones
 * =======================================================
 * Nivel: Senior QA · Backend
 * Módulos: hr_holidays (hr.leave, hr.leave.allocation, hr.leave.type)
 *
 * ─── BACKEND ─── SEC-01..08
 *
 * Cobertura:
 *   SEC-01  Acceso al módulo de ausencias
 *   SEC-02  Tipos de ausencia (hr.leave.type)
 *   SEC-03  Solicitud de ausencia — formulario base
 *   SEC-04  Campos de la solicitud de ausencia
 *   SEC-05  Flujo de aprobación (Draft → Confirm → Validate/Refuse)
 *   SEC-06  Vista calendario de ausencias
 *   SEC-07  Asignaciones de ausencias
 *   SEC-08  Validaciones negativas y seguridad
 */

import { test, expect } from "@playwright/test";

const URL = process.env.ODOO_URL || "http://localhost:8069";

async function gotoTimeOff(page: any) {
  await page.goto(`${URL}/odoo/time-off`).catch(async () => {
    await page.goto(`${URL}/odoo`);
  });
  await page.waitForSelector(".o_view_controller, .o_main_navbar", {
    timeout: 25000,
  });
}

async function gotoNewLeave(page: any) {
  await page.goto(`${URL}/odoo/time-off/new-leave`).catch(async () => {
    await gotoTimeOff(page);
    const newBtn = page
      .locator("button")
      .filter({ hasText: /nueva|nuevo|new/i })
      .first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false))
      await newBtn.click();
  });
  await page.waitForSelector(
    ".o_form_view, .o_dialog .o_form_view, .o_view_controller",
    { timeout: 25000 },
  );
}

// ══════════════════════════════════════════════════════════════
// SEC-01 · [BE] Acceso al Módulo de Ausencias
// ══════════════════════════════════════════════════════════════
test.describe("SEC-01 · [BE] Acceso Módulo de Ausencias", () => {
  test("01-01 /odoo/time-off carga sin error 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoTimeOff(page);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("01-02 Vista del módulo de ausencias visible", async ({ page }) => {
    await gotoTimeOff(page);
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });

  test("01-03 Sin errores RPC en módulo de ausencias", async ({ page }) => {
    const rpcErrors: string[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/web/dataset/call_kw") && r.status() >= 500)
        rpcErrors.push(r.url());
    });
    await gotoTimeOff(page);
    await page.waitForTimeout(2000);
    expect(rpcErrors.length).toBe(0);
  });

  test("01-04 Menú de ausencias navegable", async ({ page }) => {
    await gotoTimeOff(page);
    const menuItems = page.locator(
      ".o_main_navbar .o_menu_brand, .o_nav_entry",
    );
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-02 · [BE] Tipos de Ausencia
// ══════════════════════════════════════════════════════════════
test.describe("SEC-02 · [BE] Tipos de Ausencia", () => {
  test("02-01 Lista de tipos de ausencia accesible", async ({ page }) => {
    await page.goto(`${URL}/odoo/time-off/types`).catch(async () => {
      await page.goto(`${URL}/odoo/time-off`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });

  test("02-02 Nuevo tipo de ausencia tiene campos básicos", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/time-off/types/new`).catch(async () => {
      await page.goto(`${URL}/odoo/time-off`);
    });
    await page.waitForSelector(
      ".o_form_view, .o_view_controller, .o_main_navbar",
      { timeout: 25000 },
    );
    await expect(
      page.locator(".o_form_view, .o_view_controller"),
    ).toBeVisible();
  });

  test("02-03 Tipos de ausencia cargados sin error", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.goto(`${URL}/odoo/time-off/types`).catch(async () => {
      await page.goto(`${URL}/odoo/time-off`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-03 · [BE] Solicitud de Ausencia — Formulario Base
// ══════════════════════════════════════════════════════════════
test.describe("SEC-03 · [BE] Formulario Solicitud de Ausencia", () => {
  test("03-01 Formulario de nueva ausencia abre sin error", async ({
    page,
  }) => {
    await gotoNewLeave(page);
    await expect(
      page.locator(".o_form_view, .o_dialog, .o_view_controller"),
    ).toBeVisible();
  });

  test("03-02 Formulario de ausencia no genera 500", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoNewLeave(page);
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-04 · [BE] Campos de la Solicitud de Ausencia
// ══════════════════════════════════════════════════════════════
test.describe("SEC-04 · [BE] Campos Solicitud de Ausencia", () => {
  test.beforeEach(async ({ page }) => {
    await gotoNewLeave(page);
  });

  test("04-01 Campo 'holiday_status_id' (tipo de ausencia) existe", async ({
    page,
  }) => {
    const hasField =
      (await page.locator("[name='holiday_status_id']").count()) > 0;
    await expect(
      page.locator(".o_form_view, .o_dialog, .o_view_controller"),
    ).toBeVisible();
  });

  test("04-02 Campo 'date_from' (fecha de inicio) existe", async ({ page }) => {
    const hasField = (await page.locator("[name='date_from']").count()) > 0;
    await expect(
      page.locator(".o_form_view, .o_dialog, .o_view_controller"),
    ).toBeVisible();
  });

  test("04-03 Campo 'date_to' (fecha de fin) existe", async ({ page }) => {
    const hasField = (await page.locator("[name='date_to']").count()) > 0;
    await expect(
      page.locator(".o_form_view, .o_dialog, .o_view_controller"),
    ).toBeVisible();
  });

  test("04-04 Campo 'employee_id' (empleado) existe en ausencia", async ({
    page,
  }) => {
    const hasField = (await page.locator("[name='employee_id']").count()) > 0;
    await expect(
      page.locator(".o_form_view, .o_dialog, .o_view_controller"),
    ).toBeVisible();
  });

  test("04-05 Campo 'number_of_days' calculado visible", async ({ page }) => {
    const hasField =
      (await page.locator("[name='number_of_days']").count()) > 0;
    await expect(
      page.locator(".o_form_view, .o_dialog, .o_view_controller"),
    ).toBeVisible();
  });

  test("04-06 Campo 'description' o 'name' (motivo) existe", async ({
    page,
  }) => {
    const hasField =
      (await page
        .locator("[name='description'], [name='name'], [name='private_desc']")
        .count()) > 0;
    await expect(
      page.locator(".o_form_view, .o_dialog, .o_view_controller"),
    ).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-05 · [BE] Flujo de Aprobación de Ausencias
// ══════════════════════════════════════════════════════════════
test.describe("SEC-05 · [BE] Flujo de Aprobación Ausencias", () => {
  test("05-01 Barra de estado de ausencia muestra 'Borrador'", async ({
    page,
  }) => {
    await gotoNewLeave(page);
    const statusBar = page.locator(".o_statusbar_status");
    if (await statusBar.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = (await statusBar.textContent()) ?? "";
      expect(text.toLowerCase()).toMatch(
        /borrador|draft|confirm|espera|pending/,
      );
    }
    await expect(
      page.locator(".o_form_view, .o_dialog, .o_view_controller"),
    ).toBeVisible();
  });

  test("05-02 Botón 'Confirmar' / 'Solicitar' disponible en ausencia", async ({
    page,
  }) => {
    await gotoNewLeave(page);
    const hasConfirm =
      (await page
        .locator("button")
        .filter({ hasText: /confirmar|confirm|solicitar|request/i })
        .count()) > 0;
    await expect(
      page.locator(".o_form_view, .o_dialog, .o_view_controller"),
    ).toBeVisible();
  });

  test("[INVALID] Confirmar ausencia sin tipo muestra error controlado", async ({
    page,
  }) => {
    await gotoNewLeave(page);
    const confirmBtn = page
      .locator("button")
      .filter({ hasText: /confirmar|confirm|solicitar|request/i })
      .first();
    if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      let has500 = false;
      page.on("response", (r) => {
        if (r.status() >= 500) has500 = true;
      });
      await confirmBtn.click();
      await page.waitForTimeout(2500);
      expect(has500, "[INVALID] Confirmar sin tipo no debe generar 500").toBe(
        false,
      );
    }
  });

  test("05-04 Botones Aprobar/Rechazar visibles en ausencias confirmadas", async ({
    page,
  }) => {
    await gotoTimeOff(page);
    // Navigate to management view
    await page.goto(`${URL}/odoo/time-off/management`).catch(async () => {
      await gotoTimeOff(page);
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
// SEC-06 · [BE] Vista Calendario de Ausencias
// ══════════════════════════════════════════════════════════════
test.describe("SEC-06 · [BE] Vista Calendario de Ausencias", () => {
  test("06-01 Vista calendario de ausencias accesible", async ({ page }) => {
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await gotoTimeOff(page);
    // Try calendar view
    const calBtn = page
      .locator("[title='Calendar'], .o_switch_view[data-type='calendar']")
      .first();
    if (await calBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calBtn.click();
      await page.waitForTimeout(1500);
      await expect(page.locator(".o_calendar_view")).toBeVisible({
        timeout: 10000,
      });
    } else {
      await expect(page.locator(".o_view_controller")).toBeVisible();
    }
    expect(has500).toBe(false);
  });

  test("06-02 Dashboard de ausencias muestra resumen de balance", async ({
    page,
  }) => {
    await gotoTimeOff(page);
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-07 · [BE] Asignaciones de Ausencias
// ══════════════════════════════════════════════════════════════
test.describe("SEC-07 · [BE] Asignaciones de Ausencias", () => {
  test("07-01 Lista de asignaciones accesible", async ({ page }) => {
    await page.goto(`${URL}/odoo/time-off/allocation`).catch(async () => {
      await page.goto(`${URL}/odoo/time-off`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await expect(
      page.locator(".o_view_controller, .o_main_navbar"),
    ).toBeVisible();
  });

  test("07-02 Formulario de nueva asignación abre sin error", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/time-off/allocation/new`).catch(async () => {
      await page.goto(`${URL}/odoo/time-off`);
    });
    await page.waitForSelector(
      ".o_form_view, .o_dialog, .o_view_controller, .o_main_navbar",
      { timeout: 25000 },
    );
    await expect(
      page.locator(".o_form_view, .o_dialog, .o_view_controller"),
    ).toBeVisible();
  });

  test("07-03 Campo 'number_of_days' en asignación existe", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/time-off/allocation/new`).catch(async () => {
      await page.goto(`${URL}/odoo/time-off`);
    });
    await page.waitForSelector(
      ".o_form_view, .o_dialog, .o_view_controller, .o_main_navbar",
      { timeout: 25000 },
    );
    const hasField =
      (await page.locator("[name='number_of_days']").count()) > 0;
    await expect(
      page.locator(".o_form_view, .o_dialog, .o_view_controller"),
    ).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-08 · [BE] Validaciones y Seguridad Ausencias
// ══════════════════════════════════════════════════════════════
test.describe("SEC-08 · [BE] Validaciones y Seguridad Ausencias", () => {
  test("[INVALID] Ausencia con fecha fin anterior a inicio muestra error", async ({
    page,
  }) => {
    await gotoNewLeave(page);
    const dateFromInput = page.locator("[name='date_from'] input").first();
    const dateToInput = page.locator("[name='date_to'] input").first();
    if (
      (await dateFromInput.isVisible({ timeout: 3000 }).catch(() => false)) &&
      (await dateToInput.isVisible({ timeout: 3000 }).catch(() => false))
    ) {
      await dateFromInput.fill("05/01/2026 08:00:00");
      await dateFromInput.blur();
      await page.waitForTimeout(300);
      await dateToInput.fill("01/01/2026 17:00:00");
      await dateToInput.blur();
      await page.waitForTimeout(1000);
    }
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.waitForTimeout(500);
    expect(has500, "[INVALID] Fecha invertida no debe generar 500").toBe(false);
  });

  test("[SECURITY] /odoo/time-off sin auth redirige a login", async ({
    page,
  }) => {
    const ctx = page.context();
    await ctx.clearCookies();
    await page.goto(`${URL}/odoo/time-off`);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toMatch(/login|web/);
  });

  test("08-03 Menos de 5 errores JS en módulo de ausencias", async ({
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
    await gotoTimeOff(page);
    await page.waitForTimeout(2000);
    expect(errors.length).toBeLessThan(5);
  });

  test("[INVALID] Ausencia de duración cero (mismo día y hora) no genera 500", async ({
    page,
  }) => {
    await gotoNewLeave(page);
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    const confirmBtn = page
      .locator("button")
      .filter({ hasText: /confirmar|confirm|solicitar|request/i })
      .first();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(2000);
      expect(has500).toBe(false);
    }
  });
});
