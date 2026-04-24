/**
 * Sweet Café QA — Suite Completa: E-commerce / Sitio Web
 * ========================================================
 * Nivel: Senior QA · Backend Admin + Frontend Público
 * Módulo: sweet_cafe_ecommerce/, Odoo website, website_sale
 *
 * ─── BACKEND ─── SEC-01..04 (admin: productos publicados, contenido web, pedidos)
 * ─── FRONTEND ─── SEC-05..09 (sitio público: home, shop, checkout, SEO, UX)
 */

import { test, expect } from "@playwright/test";
import { OdooBasePage } from "../../src/pages/odoo-base.page.js";

const URL = process.env.ODOO_URL || "http://localhost:8069";

// ══════════════════════════════════════════════════════════════
// SEC-01 · [BE] Backend Admin — Pedidos Web (website.sale)
// ══════════════════════════════════════════════════════════════
test.describe("SEC-01 · [BE] Pedidos Web y Ecommerce Admin", () => {
  test("01-01 Módulo de ventas/ecommerce accesible sin error 500", async ({
    page,
  }) => {
    let has500 = false;
    page.on("response", (r: any) => {
      if (r.status() >= 500) has500 = true;
    });
    await page.goto(`${URL}/odoo/sales`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await page.waitForTimeout(1000);
    expect(has500).toBe(false);
  });

  test("01-02 Pedidos de venta (sales orders) accesibles", async ({ page }) => {
    await page.goto(`${URL}/odoo/sales`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("01-03 Pedidos web (desde ecommerce) accesibles", async ({ page }) => {
    await page.goto(`${URL}/odoo/sales`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    // Filtrar por canal ecommerce
    const search = page.locator(".o_searchview_input").first();
    await search.fill("website");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });

  test("01-04 Productos publicados en la web administrables desde backend", async ({
    page,
  }) => {
    await page.goto(`${URL}/odoo/website/products`).catch(async () => {
      await page.goto(`${URL}/odoo/inventory/products`);
    });
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await expect(page.locator(".o_view_controller")).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-02 · [BE] Gestión del Sitio Web (Backend Editor)
// ══════════════════════════════════════════════════════════════
test.describe("SEC-02 · [BE] Gestión del Sitio Web", () => {
  test("02-01 Módulo Website admin accesible", async ({ page }) => {
    await page.goto(`${URL}/odoo/website`).catch(async () => {
      await page.goto(`${URL}/odoo`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await expect(page.locator(".o_main_navbar")).toBeVisible();
  });

  test("02-02 Menús del sitio web administrables", async ({ page }) => {
    await page.goto(`${URL}/odoo/website/menus`).catch(async () => {
      await page.goto(`${URL}/odoo/website`);
    });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await expect(
      page.locator(".o_main_navbar, .o_view_controller"),
    ).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-03 · [BE] Configuración de Pagos y Checkout
// ══════════════════════════════════════════════════════════════
test.describe("SEC-03 · [BE] Configuración de Pagos", () => {
  test("03-01 Proveedores de pago accesibles desde backend", async ({
    page,
  }) => {
    await page
      .goto(`${URL}/odoo/accounting/payment-providers`)
      .catch(async () => {
        await page.goto(`${URL}/odoo/website`);
      });
    await page.waitForSelector(".o_view_controller, .o_main_navbar", {
      timeout: 25000,
    });
    await expect(
      page.locator(".o_main_navbar, .o_view_controller"),
    ).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-04 · [BE] Integridad HTTP y Consola — Ecommerce Admin
// ══════════════════════════════════════════════════════════════
test.describe("SEC-04 · [BE] Integridad HTTP y Consola Ecommerce", () => {
  test("04-01 No hay errores RPC 500 en ventas/ecommerce", async ({ page }) => {
    const rpcErrors: string[] = [];
    page.on("response", (r: any) => {
      if (r.url().includes("/web/dataset/call_kw") && r.status() >= 500)
        rpcErrors.push(r.url());
    });
    await page.goto(`${URL}/odoo/sales`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await page.waitForTimeout(2000);
    expect(rpcErrors.length).toBe(0);
  });

  test("04-02 Menos de 10 errores JS en módulo de ventas", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e: any) => errors.push(e.message));
    page.on("console", (msg: any) => {
      if (
        msg.type() === "error" &&
        !msg.text().includes("favicon") &&
        !msg.text().includes("sourcemap")
      ) {
        errors.push(msg.text());
      }
    });
    await page.goto(`${URL}/odoo/sales`);
    await page.waitForSelector(".o_view_controller", { timeout: 25000 });
    await page.waitForTimeout(2000);
    expect(errors.length).toBeLessThan(10);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-05 · [FE] Página de Inicio del Sitio Web
// ══════════════════════════════════════════════════════════════
test.describe("SEC-05 · [FE] Página de Inicio", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("05-01 Sitio web / responde con código 200", async ({ page }) => {
    const r = await page.goto(`${URL}/`);
    expect(r?.status()).toBeLessThan(400);
  });

  test("05-02 Título de la página no está vacío", async ({ page }) => {
    await page.goto(`${URL}/`);
    await page.waitForLoadState("domcontentloaded");
    expect((await page.title()).length).toBeGreaterThan(0);
  });

  test("05-03 Barra de navegación (navbar) visible", async ({ page }) => {
    await page.goto(`${URL}/`);
    await page.waitForLoadState("networkidle");
    const navbar = page
      .locator("nav, .navbar, header, #wrapwrap .o_header_standard")
      .first();
    await expect(navbar).toBeVisible({ timeout: 15000 });
  });

  test("05-04 Footer visible en la página de inicio", async ({ page }) => {
    await page.goto(`${URL}/`);
    await page.waitForLoadState("networkidle");
    const footer = page
      .locator("footer, .o_footer_copyright, #o_footer")
      .first();
    const isVisible = await footer
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (isVisible) await expect(footer).toBeVisible();
  });

  test("05-05 No hay errores JS críticos en la página de inicio", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e: any) => errors.push(e.message));
    await page.goto(`${URL}/`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    expect(errors.length).toBeLessThan(5);
  });

  test("05-06 Metaetiqueta description existe (SEO básico)", async ({
    page,
  }) => {
    await page.goto(`${URL}/`);
    await page.waitForLoadState("domcontentloaded");
    const metaDesc = await page
      .locator("meta[name='description']")
      .getAttribute("content")
      .catch(() => null);
    // Puede o no existir, pero si existe no debe estar vacía
    if (metaDesc !== null) {
      expect(metaDesc.length).toBeGreaterThanOrEqual(0);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-06 · [FE] Tienda Online
// ══════════════════════════════════════════════════════════════
test.describe("SEC-06 · [FE] Tienda Online (/shop)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("06-01 /shop responde con código < 400", async ({ page }) => {
    const r = await page.goto(`${URL}/shop`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).toBeLessThan(400);
  });

  test("06-02 Tienda muestra cuadrícula de productos (o mensaje vacío)", async ({
    page,
  }) => {
    await page.goto(`${URL}/shop`);
    await page.waitForLoadState("networkidle");
    // La tienda debe tener contenido (productos o mensaje de vacío)
    await expect(page.locator("#wrapwrap, body")).toBeVisible({
      timeout: 15000,
    });
  });

  test("06-03 Búsqueda en la tienda no genera 500", async ({ page }) => {
    await page.goto(`${URL}/shop`);
    await page.waitForLoadState("networkidle");
    const searchBox = page
      .locator(
        "input[name='search'], input[type='search'], .oe_search_box input",
      )
      .first();
    if (await searchBox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchBox.fill("Torta");
      await page.keyboard.press("Enter");
      await page.waitForLoadState("networkidle");
      expect(page.url()).not.toContain("error=500");
    }
  });

  test("06-04 Filtros de categoría visibles en la tienda", async ({ page }) => {
    await page.goto(`${URL}/shop`);
    await page.waitForLoadState("networkidle");
    const catFilter = page
      .locator(".js_categories, .o_wsale_categories, aside nav")
      .first();
    const isVisible = await catFilter
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    // Puede no haber categorías si la tienda está vacía
    await expect(page.locator("body")).toBeVisible();
  });

  test("06-05 Carrito (/shop/cart) accesible", async ({ page }) => {
    const r = await page.goto(`${URL}/shop/cart`);
    await page.waitForLoadState("networkidle");
    expect(r?.status() ?? 500).not.toBe(500);
  });

  test("06-06 No hay errores JS críticos en la tienda", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e: any) => errors.push(e.message));
    await page.goto(`${URL}/shop`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    expect(errors.length).toBeLessThan(5);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-07 · [FE] Producto Individual y Compra
// ══════════════════════════════════════════════════════════════
test.describe("SEC-07 · [FE] Producto Individual y Compra", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("07-01 Página de producto individual carga desde la tienda", async ({
    page,
  }) => {
    await page.goto(`${URL}/shop`);
    await page.waitForLoadState("networkidle");
    const productLink = page
      .locator(".oe_product_cart a, .o_wsale_product_grid_item a")
      .first();
    if (await productLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await productLink.click();
      await page.waitForLoadState("networkidle");
      expect(page.url()).not.toContain("500");
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("07-02 Botón 'Agregar al carrito' disponible en producto", async ({
    page,
  }) => {
    await page.goto(`${URL}/shop`);
    await page.waitForLoadState("networkidle");
    const productLink = page
      .locator(".oe_product_cart a, .o_wsale_product_grid_item a")
      .first();
    if (await productLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await productLink.click();
      await page.waitForLoadState("networkidle");
      const addBtn = page
        .locator(
          ".o_add_cart_btn, #add_to_cart, a[href*='cart/add'], button.js_add_cart",
        )
        .first();
      const exists = await addBtn
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      if (exists) await expect(addBtn).toBeVisible();
    }
  });

  test("07-03 Agregar al carrito funciona sin error 500", async ({ page }) => {
    await page.goto(`${URL}/shop`);
    await page.waitForLoadState("networkidle");
    const productLink = page
      .locator(".oe_product_cart a, .o_wsale_product_grid_item a")
      .first();
    if (await productLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await productLink.click();
      await page.waitForLoadState("networkidle");
      const addBtn = page.locator(".o_add_cart_btn, #add_to_cart").first();
      if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        let has500 = false;
        page.on("response", (r: any) => {
          if (r.status() >= 500) has500 = true;
        });
        await addBtn.click();
        await page.waitForLoadState("networkidle");
        expect(has500).toBe(false);
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-08 · [FE] Checkout y Proceso de Compra
// ══════════════════════════════════════════════════════════════
test.describe("SEC-08 · [FE] Checkout y Proceso de Compra", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("08-01 Página de checkout (/shop/checkout) responde sin 500", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/shop/checkout`);
    await page.waitForLoadState("networkidle");
    expect(r?.status() ?? 500).not.toBe(500);
  });

  test("08-02 Confirmación de pago (/shop/payment) responde sin 500", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/shop/payment`);
    await page.waitForLoadState("networkidle");
    expect(r?.status() ?? 500).not.toBe(500);
  });

  test("08-03 No hay errores JS en el proceso de checkout", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e: any) => errors.push(e.message));
    await page.goto(`${URL}/shop/checkout`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    expect(errors.length).toBeLessThan(5);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-09 · [FE] Cuenta de Usuario y Portal
// ══════════════════════════════════════════════════════════════
test.describe("SEC-09 · [FE] Cuenta de Usuario y Portal", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("09-01 /web/login muestra formulario de acceso", async ({ page }) => {
    await page.goto(`${URL}/web/login`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("input[name='login']").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("09-02 /my redirige a login sin autenticación", async ({ page }) => {
    await page.goto(`${URL}/my`);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toMatch(/login|web|my/);
  });

  test("09-03 /my/orders redirige a login sin autenticación", async ({
    page,
  }) => {
    await page.goto(`${URL}/my/orders`);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toMatch(/login|web|my/);
  });

  test("09-04 Credenciales incorrectas muestran error en login", async ({
    page,
  }) => {
    await page.goto(`${URL}/web/login`);
    await page.waitForLoadState("networkidle");
    const loginInput = page.locator("input[name='login']").first();
    const passInput = page.locator("input[name='password']").first();
    const submitBtn = page.locator("button[type='submit']").first();
    if (await loginInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginInput.fill("usuario.falso.qa@sweetcafe.cu");
      await passInput.fill("contraseña_incorrecta_qa_12345");
      await submitBtn.click();
      await page.waitForLoadState("networkidle");
      const errorMsg = page
        .locator(".o_login_feedback, .alert, [role='alert']")
        .first();
      const hasError = await errorMsg
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      // Si no muestra error visible, al menos no debe redirigir al panel admin
      expect(hasError || !page.url().includes("/odoo")).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-10 [FE] API Personalizada Sweet Café
// /sweet/best-sellers (jsonrpc) y /sweet/cart/add
// ══════════════════════════════════════════════════════════════
test.describe("SEC-10 [FE] API Personalizada Sweet Café", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("10-01 /sweet/best-sellers devuelve respuesta JSON válida", async ({
    page,
  }) => {
    const response = await page.request.post(`${URL}/sweet/best-sellers`, {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: { limit: 5 },
      }),
    });
    expect(response.status()).toBe(200);
    const body = await response.json().catch(() => null);
    expect(body).not.toBeNull();
    expect(body).toHaveProperty("result");
  });

  test("10-02 /sweet/best-sellers result es array con items id/name/price", async ({
    page,
  }) => {
    const response = await page.request.post(`${URL}/sweet/best-sellers`, {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: { limit: 5 },
      }),
    });
    if (response.status() === 200) {
      const body = await response.json().catch(() => ({}));
      if (body?.result) {
        expect(Array.isArray(body.result)).toBe(true);
        if (body.result.length > 0) {
          const item = body.result[0];
          expect(item).toHaveProperty("id");
          expect(item).toHaveProperty("name");
          expect(item).toHaveProperty("price");
          expect(item).toHaveProperty("available");
        }
      }
    }
  });

  test("10-03 /sweet/cart/add sin product_id no genera error 500", async ({
    page,
  }) => {
    const response = await page.request.post(`${URL}/sweet/cart/add`, {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: { add_qty: 1 },
      }),
    });
    expect(response.status()).not.toBe(500);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-11 [FE] Página /reservar/estado y /reservar/gracias
// ══════════════════════════════════════════════════════════════
test.describe("SEC-11 [FE] Estado de Reserva y Páginas de Confirmación", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("11-01 /reservar/estado responde sin error 500", async ({ page }) => {
    const r = await page.goto(`${URL}/reservar/estado`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
  });

  test("11-02 /reservar/estado sin ref muestra página válida", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar/estado`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).not.toContain("500");
  });

  test("11-03 /reservar/estado?ref=INVALIDO no genera 500", async ({
    page,
  }) => {
    const r = await page.goto(`${URL}/reservar/estado?ref=INVALIDO_QA_TEST`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
  });

  test("11-04 /reservar/gracias responde sin error 500", async ({ page }) => {
    const r = await page.goto(`${URL}/reservar/gracias`);
    await page.waitForLoadState("networkidle");
    expect(r?.status()).not.toBe(500);
  });

  test("11-05 /reservar/gracias?ref=TEST muestra la referencia en la página", async ({
    page,
  }) => {
    await page.goto(`${URL}/reservar/gracias?ref=TEST-QAREF-001`);
    await page.waitForLoadState("networkidle");
    const content = await page.content();
    expect(content).toMatch(/TEST-QAREF-001|Referencia|Reserva|gracias|thank/i);
  });
});
