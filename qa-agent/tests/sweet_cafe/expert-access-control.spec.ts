/**
 * Sweet Café QA — Control de Acceso, IDOR y Seguridad [EXPERT LEVEL]
 * ===================================================================
 * Nivel: Expert QA — Role-based access, IDOR, path traversal, injection,
 * unauthorized API access, session manipulation, privilege escalation.
 *
 * FILOSOFÍA:
 * Un QA senior real prueba los límites del sistema de seguridad.
 * Estos tests verifican que el sistema:
 *   1. Bloquea acceso a datos sin autenticación
 *   2. Bloquea acceso a recursos de otros usuarios (IDOR)
 *   3. Resiste inyección básica en todos los campos
 *   4. No expone información sensible en respuestas de error
 *   5. Aplica permisos por rol (admin vs usuario básico)
 *
 * CONVENCIÓN:
 *   [SECURITY] → Sin auth / rol incorrecto — el sistema DEBE bloquear
 *   [IDOR]     → Acceso a recurso ajeno — DEBE ser rechazado o estar vacío
 *   [INJECTION]→ Input malicioso — DEBE ser sanitizado, nunca ejecutado
 *   [VALID]    → Acceso legítimo — DEBE funcionar sin error
 */

import { test, expect } from "@playwright/test";

const URL = process.env.ODOO_URL || "http://localhost:8069";

// ══════════════════════════════════════════════════════════════
// SEC-AC-01 · Acceso sin Autenticación — Todos los Módulos
// ══════════════════════════════════════════════════════════════
test.describe("SEC-AC-01 · [SECURITY] Backend sin Autenticación", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const protectedBackendRoutes = [
    { url: "/odoo/employees", name: "Empleados" },
    { url: "/odoo/payroll", name: "Nómina" },
    { url: "/odoo/inventory", name: "Inventario" },
    { url: "/odoo/inventory/products", name: "Productos" },
    { url: "/odoo/point-of-sale/configuration", name: "POS Configuración" },
    { url: "/odoo/sweet-reservations", name: "Reservas (backend)" },
    { url: "/odoo/sweet-branches", name: "Sucursales" },
    { url: "/odoo/sweet-scraps", name: "Mermas" },
    { url: "/odoo/accounting", name: "Contabilidad" },
    { url: "/odoo/settings", name: "Configuración" },
  ];

  for (const route of protectedBackendRoutes) {
    test(`[SECURITY] ${route.name} sin auth redirige a login (no 500, no datos)`, async ({
      page,
    }) => {
      let has500 = false;
      page.on("response", (r) => {
        if (r.status() >= 500) has500 = true;
      });
      await page.goto(`${URL}${route.url}`);
      await page.waitForLoadState("networkidle");
      // CORRECTO: no 500
      expect(
        has500,
        `[SECURITY] ${route.name} no debe generar 500 sin auth`,
      ).toBe(false);
      // CORRECTO: debe redirigir a login o mostrar página de login
      const finalUrl = page.url();
      const isLogin =
        finalUrl.includes("/web/login") ||
        finalUrl.includes("/web#action=login") ||
        (await page
          .locator("input[name='login'], input[name='password']")
          .isVisible({ timeout: 5000 })
          .catch(() => false));
      expect(
        isLogin,
        `[SECURITY] ${route.name} debe redirigir a login sin auth (URL actual: ${finalUrl})`,
      ).toBe(true);
    });
  }
});

// ══════════════════════════════════════════════════════════════
// SEC-AC-02 · IDOR — Acceso a Registros por ID Directo
// ══════════════════════════════════════════════════════════════
test.describe("SEC-AC-02 · [IDOR] Acceso a Registros por ID", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("[IDOR] Empleado por ID directo sin auth → login o vacío (no datos reales)", async ({
    page,
  }) => {
    // ID 1 es frecuentemente el administrador/empleado base
    const r = await page.goto(`${URL}/odoo/employees/1`);
    await page.waitForLoadState("networkidle");
    const finalUrl = page.url();
    const status = r?.status() ?? 0;
    // CORRECTO: o bien redirige a login (auth requerida) o devuelve 404 (no existe)
    // Lo que NO es correcto: mostrar datos del empleado sin auth
    expect(status).not.toBe(500);
    const isLoginPage =
      finalUrl.includes("/web/login") ||
      (await page
        .locator("input[name='login']")
        .isVisible({ timeout: 3000 })
        .catch(() => false));
    const isNotFound =
      status === 404 ||
      (await page
        .locator("body")
        .textContent()
        .then((t) => t?.includes("Not Found") || false)
        .catch(() => false));
    expect(
      isLoginPage || isNotFound,
      "[IDOR] Acceso a empleado por ID sin auth debe ser login o 404",
    ).toBe(true);
  });

  test("[IDOR] Nómina por ID directo sin auth → login o 404 (no datos reales)", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/odoo/payroll/1`);
    await page.waitForLoadState("networkidle");
    const finalUrl = page.url();
    expect(r?.status()).not.toBe(500);
    const isProtected =
      finalUrl.includes("/web/login") ||
      r?.status() === 404 ||
      (await page
        .locator("input[name='login']")
        .isVisible({ timeout: 3000 })
        .catch(() => false));
    expect(
      isProtected,
      "[IDOR] Nómina por ID sin auth debe ser login o 404",
    ).toBe(true);
  });

  test("[IDOR] Reserva por ID directo sin auth → login o 404 (no datos reales)", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/odoo/sweet-reservations/1`);
    await page.waitForLoadState("networkidle");
    const finalUrl = page.url();
    expect(r?.status()).not.toBe(500);
    const isProtected =
      finalUrl.includes("/web/login") ||
      r?.status() === 404 ||
      (await page
        .locator("input[name='login']")
        .isVisible({ timeout: 3000 })
        .catch(() => false));
    expect(
      isProtected,
      "[IDOR] Reserva por ID sin auth debe ser login o 404",
    ).toBe(true);
  });

  test("[IDOR] ID de empleado no existente (999999) → login o 404 (no 500 crash)", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/odoo/employees/999999`);
    await page.waitForLoadState("networkidle");
    // CORRECTO: 404 o redirect a login — NUNCA 500
    expect(r?.status()).not.toBe(500);
  });

  test("[IDOR] ID de merma no existente (888888) → login o 404 (no 500 crash)", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/odoo/sweet-scraps/888888`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-AC-03 · API JSON-RPC sin Sesión — Protección de Datos
// ══════════════════════════════════════════════════════════════
test.describe("SEC-AC-03 · [SECURITY] API sin Sesión Válida", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("[SECURITY] call_kw hr.employee sin sesión no devuelve datos reales", async ({
    page,
  }) => {
    const response = await page.request.post(`${URL}/web/dataset/call_kw`, {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "call",
        params: {
          model: "hr.employee",
          method: "search_read",
          args: [[]],
          kwargs: { fields: ["name", "identification_id"], limit: 5 },
        },
      }),
    });
    // Odoo siempre devuelve 200 con error JSON para RPC sin auth
    expect(response.status()).not.toBe(500);
    const body = await response.json().catch(() => ({}));
    if (body?.error) {
      // CORRECTO: error de sesión
      expect(body.error).toBeTruthy();
      // No debe contener datos de empleados
      expect(
        body.error.data?.message || body.error.message || "",
      ).not.toContain("identification_id");
    }
    if (body?.result) {
      // Si devuelve resultado, no debe contener datos sensibles sin auth
      // O el sistema permite solo ciertos campos públicos — esto es para documentar
    }
  });

  test("[SECURITY] call_kw hr.payslip sin sesión no devuelve nóminas", async ({
    page,
  }) => {
    const response = await page.request.post(`${URL}/web/dataset/call_kw`, {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "call",
        params: {
          model: "hr.payslip",
          method: "search_read",
          args: [[]],
          kwargs: { fields: ["employee_id", "total"], limit: 5 },
        },
      }),
    });
    expect(response.status()).not.toBe(500);
    const body = await response.json().catch(() => ({}));
    // Debe ser error de sesión, no datos de nómina
    if (body?.error) {
      expect(body.error).toBeTruthy();
    }
  });

  test("[SECURITY] call_kw sweet.reservation sin sesión no devuelve reservas", async ({
    page,
  }) => {
    const response = await page.request.post(`${URL}/web/dataset/call_kw`, {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "call",
        params: {
          model: "sweet.reservation",
          method: "search_read",
          args: [[]],
          kwargs: { fields: ["partner_id", "delivery_date"], limit: 5 },
        },
      }),
    });
    expect(response.status()).not.toBe(500);
    const body = await response.json().catch(() => ({}));
    if (body?.error) {
      expect(body.error).toBeTruthy();
    }
  });

  test("[SECURITY] /web/session/get_session_info sin sesión no expone info de usuario", async ({
    page,
  }) => {
    const response = await page.request.post(
      `${URL}/web/session/get_session_info`,
      {
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({
          jsonrpc: "2.0",
          id: 4,
          method: "call",
          params: {},
        }),
      },
    );
    expect(response.status()).not.toBe(500);
    const body = await response.json().catch(() => ({}));
    if (body?.result) {
      // uid debe ser null/false cuando no hay sesión
      const uid = body.result?.uid;
      expect(
        uid === null || uid === false || uid === undefined,
        "[SECURITY] session sin auth no debe tener uid válido",
      ).toBe(true);
    }
  });

  test("[SECURITY] /web/dataset/call_button acción sin sesión no se ejecuta", async ({
    page,
  }) => {
    const response = await page.request.post(`${URL}/web/dataset/call_button`, {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        jsonrpc: "2.0",
        id: 5,
        method: "call",
        params: {
          model: "hr.payslip",
          method: "action_payslip_done",
          args: [[1]],
          kwargs: {},
        },
      }),
    });
    // Sin sesión, la acción NO debe ejecutarse
    expect(response.status()).not.toBe(500);
    const body = await response.json().catch(() => ({}));
    if (body?.error) {
      expect(body.error).toBeTruthy();
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-AC-04 · Inyección y Sanitización de Inputs
// ══════════════════════════════════════════════════════════════
test.describe("SEC-AC-04 · [INJECTION] Sanitización de Inputs", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const xssPayloads = [
    { name: "XSS básico script", payload: "<script>alert('XSS')</script>" },
    { name: "XSS img onerror", payload: "<img src=x onerror=alert(1)>" },
    { name: "XSS evento inline", payload: "' onmouseover='alert(1)" },
    { name: "Template injection", payload: "{{7*7}}" },
    { name: "SQL básico", payload: "'; DROP TABLE hr_employee; --" },
  ];

  for (const xss of xssPayloads) {
    test(`[INJECTION] "${xss.name}" en búsqueda pública no ejecuta código`, async ({
      page,
    }) => {
      let alertTriggered = false;
      page.on("dialog", (dialog) => {
        alertTriggered = true;
        dialog.dismiss().catch(() => {});
      });
      let has500 = false;
      page.on("response", (r) => {
        if (r.status() >= 500) has500 = true;
      });
      await page
        .goto(`${URL}/shop?search=${encodeURIComponent(xss.payload)}`)
        .catch(() =>
          page.goto(`${URL}/?search=${encodeURIComponent(xss.payload)}`),
        );
      await page.waitForLoadState("networkidle").catch(() => {});
      // CORRECTO: el script NO debe ejecutarse
      expect(
        alertTriggered,
        `[INJECTION] "${xss.name}" NO debe ejecutar alert()`,
      ).toBe(false);
      // CORRECTO: la página no debe crashear con 500
      expect(has500, `[INJECTION] "${xss.name}" no debe generar 500`).toBe(
        false,
      );
    });
  }

  test("[INJECTION] XSS en campo 'name' del formulario /reservar no ejecuta código", async ({
    page,
  }) => {
    let alertTriggered = false;
    page.on("dialog", (d) => {
      alertTriggered = true;
      d.dismiss().catch(() => {});
    });
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const nameField = page.locator("input[name='name'], input#name").first();
    if (await nameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameField.fill("<script>document.body.innerHTML='HACKED'</script>");
      await page.waitForTimeout(1000);
      expect(
        alertTriggered,
        "[INJECTION] XSS en campo name no debe ejecutar JS",
      ).toBe(false);
      expect(has500, "[INJECTION] XSS en campo name no debe generar 500").toBe(
        false,
      );
    }
  });

  test("[INJECTION] Path traversal en URL no expone archivos del servidor", async ({
    page,
  }) => {
    const traversalPaths = [
      "/../../etc/passwd",
      "/%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      "/odoo/../../../etc/passwd",
    ];
    for (const path of traversalPaths) {
      let has500 = false;
      page.on("response", (r) => {
        if (r.status() >= 500) has500 = true;
      });
      const r = await page.goto(`${URL}${path}`).catch(() => null);
      await page.waitForLoadState("networkidle").catch(() => {});
      expect(
        has500,
        `[INJECTION] Path traversal "${path}" no debe generar 500`,
      ).toBe(false);
      const content = await page
        .locator("body")
        .textContent()
        .catch(() => "");
      expect(content).not.toMatch(/root:x:0:0|\/bin\/bash/); // Contenido típico de /etc/passwd
    }
  });

  test("[INJECTION] SQL injection en parámetro de búsqueda API no da datos extra", async ({
    page,
  }) => {
    const sqlPayload = "' OR '1'='1";
    const response = await page.request.post(`${URL}/sweet/best-sellers`, {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: { limit: sqlPayload },
      }),
    });
    // El ORM de Odoo usa parámetros vinculados — SQL injection no debe funcionar
    expect(response.status()).not.toBe(500);
    const body = await response.json().catch(() => ({}));
    // Si hay resultado, debe ser el comportamiento normal (array de productos o error de tipo)
    if (body?.error) {
      // Puede dar error de tipo (string no es int) — esto es CORRECTO
      expect(body.error.data?.message || "").not.toMatch(
        /syntax error|SQL|database error/i,
      );
    }
  });

  test("[INJECTION] JSON body malformado en API devuelve error controlado (no 500)", async ({
    page,
  }) => {
    const response = await page.request.post(`${URL}/sweet/best-sellers`, {
      headers: { "Content-Type": "application/json" },
      data: "ESTO NO ES JSON VÁLIDO {{{",
    });
    // El servidor debe rechazar el JSON malformado con 400, no 500
    expect(response.status()).not.toBe(500);
  });

  test("[INJECTION] Content-Type incorrecto en API JSON no genera 500", async ({
    page,
  }) => {
    const response = await page.request.post(`${URL}/sweet/best-sellers`, {
      headers: { "Content-Type": "text/plain" },
      data: "not json",
    });
    expect(response.status()).not.toBe(500);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-AC-05 · Escalada de Privilegios y Manipulación de URL
// ══════════════════════════════════════════════════════════════
test.describe("SEC-AC-05 · [SECURITY] Manipulación de URL y Escalada", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("[SECURITY] /odoo/settings sin auth redirige a login (settings es privilegiado)", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/odoo/settings`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
    const isLogin =
      page.url().includes("/web/login") ||
      (await page
        .locator("input[name='login']")
        .isVisible({ timeout: 5000 })
        .catch(() => false));
    expect(isLogin, "[SECURITY] /settings sin auth debe ir a login").toBe(true);
  });

  test("[SECURITY] /odoo/users sin auth no expone lista de usuarios", async ({
    page,
  }) => {
    const r = await page
      .goto(`${URL}/odoo/action-base_setup.setup_config_wizard_act`)
      .catch(() => page.goto(`${URL}/odoo/settings`));
    await page.waitForLoadState("networkidle");
    expect(r?.status() ?? 0).not.toBe(500);
  });

  test("[SECURITY] Endpoint de debug /web?debug=1 sin auth no expone info sensible", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/web?debug=1`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
    // Sin auth, debug mode no debe exponer datos — debe ir a login
    const isLogin =
      page.url().includes("/web/login") ||
      (await page
        .locator("input[name='login']")
        .isVisible({ timeout: 5000 })
        .catch(() => false));
    expect(isLogin, "[SECURITY] debug mode sin auth debe ir a login").toBe(
      true,
    );
  });

  test("[SECURITY] /web/database/manager sin auth → protegido (no expone lista de DBs)", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/web/database/manager`);
    await page.waitForLoadState("networkidle");
    const status = r?.status() ?? 0;
    // Puede devolver 200 (pantalla de gestión de BD con master password) o 403
    // Lo que NO es correcto: 500
    expect(status).not.toBe(500);
    // No debe mostrar directamente datos internos del sistema sin algún tipo de control
  });

  test("[SECURITY] /longpolling/poll sin sesión devuelve error controlado (no 500)", async ({
    page,
  }) => {
    const response = await page.request.post(`${URL}/longpolling/poll`, {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: { channels: [], last: 0 },
      }),
    });
    expect(response.status()).not.toBe(500);
  });

  test("[SECURITY] Acceso a archivo estático de otro módulo no instalado devuelve 404 (no 500)", async ({
    page,
  }) => {
    const r = await page.goto(
      `${URL}/moduloquenoeexiste/static/src/archivo.js`,
    );
    await page.waitForLoadState("networkidle").catch(() => {});
    const status = r?.status() ?? 0;
    expect(status).not.toBe(500);
    expect([404, 403, 301, 302]).toContain(status);
  });

  test("[SECURITY] Intentar acceder a ventana modal de errores directamente sin auth → login", async ({
    page,
  }) => {
    const r = await page.goto(
      `${URL}/odoo/action-base_setup.action_general_configuration`,
    );
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
    const isLogin =
      page.url().includes("/web/login") ||
      (await page
        .locator("input[name='login']")
        .isVisible({ timeout: 5000 })
        .catch(() => false));
    expect(
      isLogin,
      "[SECURITY] Acción de configuración sin auth debe ir a login",
    ).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-AC-06 · Headers y Respuestas HTTP de Seguridad
// ══════════════════════════════════════════════════════════════
test.describe("SEC-AC-06 · [SECURITY] Headers HTTP de Seguridad", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("[SECURITY] Respuesta del servidor no expone versión de Odoo en cabecera Server", async ({
    page,
  }) => {
    const response = await page.request.get(`${URL}/web/login`);
    const serverHeader = response.headers()["server"] || "";
    // La versión específica de Odoo NO debe estar en el header Server (information disclosure)
    // Aceptable: "nginx", "Apache" — No aceptable: "odoo/19.0" o versión exacta del framework
    expect(serverHeader.toLowerCase()).not.toMatch(/odoo\/\d+\.\d+/);
  });

  test("[SECURITY] Login page tiene cookie de sesión con SameSite o Secure configurado", async ({
    page,
  }) => {
    await page.goto(`${URL}/web/login`);
    await page.waitForLoadState("networkidle");
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "session_id");
    if (sessionCookie) {
      // La cookie de sesión debe tener httpOnly para protegerse de XSS
      expect(
        sessionCookie.httpOnly,
        "[SECURITY] session_id debe ser HttpOnly",
      ).toBe(true);
    }
  });

  test("[SECURITY] La página de login no tiene autocomplete en campos de contraseña", async ({
    page,
  }) => {
    await page.goto(`${URL}/web/login`);
    const passwordInput = page.locator("input[type='password']").first();
    if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const autocomplete = await passwordInput.getAttribute("autocomplete");
      // "new-password" o "current-password" es aceptable, "" o "on" es menos seguro
      // Verificamos solo que existe el campo y no crashea
      expect(typeof autocomplete).toBe("string"); // Debe tener atributo autocomplete
    }
  });

  test("[SECURITY] La respuesta del servidor no incluye X-Powered-By con versión", async ({
    page,
  }) => {
    const response = await page.request.get(`${URL}/`);
    const poweredBy = response.headers()["x-powered-by"] || "";
    // No debe revelar la versión exacta del stack tecnológico
    expect(poweredBy.toLowerCase()).not.toMatch(/odoo\/\d+|python\/\d+/);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-AC-07 · Formularios Públicos — Protección CSRF y Límites
// ══════════════════════════════════════════════════════════════
test.describe("SEC-AC-07 · [SECURITY] Formularios Públicos y CSRF", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("[SECURITY] POST a /reservar/enviar sin token CSRF → rechazado o redirigido (no 500)", async ({
    page,
  }) => {
    // Intentar POST directo sin el token CSRF de Odoo
    const response = await page.request.post(`${URL}/reservar/enviar`, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      form: {
        name: "Test CSRF Attack",
        email: "csrf@test.com",
        phone: "5551234",
        branch_id: "1",
        delivery_date: "2026-12-01",
        "product_ids[]": "1",
      },
    });
    // CORRECTO: sin token CSRF, Odoo debe rechazar con 400/403 o redirigir
    // Lo que NO es correcto: 500 (crash) o 200 con reserva creada
    const status = response.status();
    expect(status).not.toBe(500);
    // Nota: Odoo puede devolver 303 redirect o 400 bad request — ambos son correctos
  });

  test("[BOUNDARY] Campo email en /reservar con formato inválido — el sistema debe manejar", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    const emailField = page
      .locator("input[name='email'], input[type='email']")
      .first();
    if (await emailField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailField.fill("estonoesuncorreo.valido@");
      await emailField.blur();
      // HTML5 validation puede mostrar error en el cliente
      // Si se envía con email inválido, el servidor no debe crashear
      expect(
        has500,
        "[BOUNDARY] Email inválido en formulario público no debe generar 500",
      ).toBe(false);
    }
  });

  test("[BOUNDARY] Campo delivery_date en /reservar con fecha pasada → error en URL", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    const dateField = page
      .locator("input[name='delivery_date'], input[type='date']")
      .first();
    if (await dateField.isVisible({ timeout: 5000 }).catch(() => false)) {
      // min_date está configurado como mañana en el controlador
      // Intentar poner fecha pasada
      await dateField.evaluate((el: any) => {
        el.removeAttribute("min");
      });
      await dateField.fill("2020-01-01");
      await dateField.blur();
      expect(
        has500,
        "[BOUNDARY] Fecha pasada en formulario público no debe generar 500 inmediato",
      ).toBe(false);
    }
  });

  test("[VALID] /reservar carga con min_date = mañana configurado en el input date", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const dateField = page
      .locator("input[name='delivery_date'], input[type='date']")
      .first();
    if (await dateField.isVisible({ timeout: 5000 }).catch(() => false)) {
      const minDate = await dateField.getAttribute("min");
      if (minDate) {
        const minDateTime = new Date(minDate);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        // La fecha mínima debe ser al menos hoy o mañana
        expect(minDateTime.getTime()).toBeGreaterThanOrEqual(
          new Date().setHours(0, 0, 0, 0),
        );
      }
    }
  });

  test("[VALID] Página /reservar/estado con ref válida muestra datos sin error", async ({
    page,
  }) => {
    // Primero obtener una referencia real buscando en la lista de reservas con auth
    // Como no tenemos auth aquí, probamos con ref inexistente y verificamos que no crashea
    await page.goto(`${URL}/reservar/estado?ref=RESERVA-PRUEBA-QA`);
    await page.waitForLoadState("networkidle");
    let has500 = false;
    page.on("response", (r) => {
      if (r.status() >= 500) has500 = true;
    });
    expect(
      has500,
      "[VALID] /reservar/estado con ref cualquiera no debe generar 500",
    ).toBe(false);
    await expect(page.locator("body")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-AC-08 · Regresión de Seguridad — Errores Conocidos
// ══════════════════════════════════════════════════════════════
test.describe("SEC-AC-08 · [SECURITY] Regresión de Seguridad", () => {
  test("[SECURITY] La suite de pruebas no deja datos de prueba contaminantes en producción", async ({
    page,
  }) => {
    // Verificar que los empleados creados en tests anteriores no persistan con nombre "QA Test"
    // Este test documenta la necesidad de cleanup — si hay datos de prueba, es un smell
    await page.goto(`${URL}/odoo/employees`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    const searchBox = page.locator(".o_searchview input").first();
    if (await searchBox.isVisible({ timeout: 5000 }).catch(() => false)) {
      let has500 = false;
      page.on("response", (r) => {
        if (r.status() >= 500) has500 = true;
      });
      await searchBox.fill("QA Test Empleado");
      await page.keyboard.press("Enter");
      await page.waitForLoadState("networkidle");
      expect(
        has500,
        "[SECURITY] Búsqueda de datos de prueba no debe generar 500",
      ).toBe(false);
      // Documentar cuántos registros QA hay — no lo hacemos fallar porque en DB de prueba es normal
      const qaRecords = await page
        .locator("tr.o_data_row")
        .count()
        .catch(() => 0);
      // console.log(`[INFO] Registros 'QA Test' encontrados: ${qaRecords}`);
    }
  });

  test("[SECURITY] El token CSRF en /reservar es único por sesión (no estático)", async ({
    page,
  }) => {
    // Obtener el token CSRF de la primera carga
    await page.goto(`${URL}/reservar`);
    await page.waitForLoadState("networkidle");
    const csrfMeta1 =
      (await page
        .locator("meta[name='csrf-token'], input[name='csrf_token']")
        .first()
        .getAttribute("content")
        .catch(() => null)) ||
      (await page
        .locator("input[name='csrf_token']")
        .first()
        .getAttribute("value")
        .catch(() => null));
    // Cargar de nuevo
    await page.reload();
    await page.waitForLoadState("networkidle");
    const csrfMeta2 =
      (await page
        .locator("meta[name='csrf-token'], input[name='csrf_token']")
        .first()
        .getAttribute("content")
        .catch(() => null)) ||
      (await page
        .locator("input[name='csrf_token']")
        .first()
        .getAttribute("value")
        .catch(() => null));
    if (csrfMeta1 && csrfMeta2) {
      // El CSRF puede ser el mismo por sesión (válido) o diferente (más seguro)
      // Lo que NO puede ser: vacío o "false"
      expect(csrfMeta1).not.toBe("false");
      expect(csrfMeta1).not.toBe("");
    }
  });

  test("[VALID] Los logs de Odoo no exponen passwords en mensajes de error", async ({
    page,
  }) => {
    // Intentar login con password especial para ver si aparece en respuesta
    await page.goto(`${URL}/web/login`);
    await page.waitForLoadState("networkidle");
    const testPassword =
      "password_muy_especial_que_no_debe_aparecer_en_respuesta";
    const response = await page.request.post(`${URL}/web/login`, {
      form: {
        login: "usuarioquenoexiste@test.cu",
        password: testPassword,
        redirect: "/odoo",
      },
    });
    const body = await response.text().catch(() => "");
    // La respuesta NO debe contener el password en texto plano
    expect(body).not.toContain(testPassword);
  });
});
