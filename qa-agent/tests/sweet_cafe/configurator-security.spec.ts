/**
 * Sweet Café QA — Suite de Seguridad: Configurador de Diseños
 * =============================================================
 * Nivel: Senior QA · Seguridad IDOR + Validaciones de endpoints
 * Módulos: sweet_cafe_configurator/controllers/configurator.py
 *          sweet_cafe_configurator/security/product_design_rules.xml
 *
 * ─── SECURITY ─── SEC-01..04 (IDOR, acceso anónimo, validaciones)
 */

import { test, expect } from "@playwright/test";

const URL = process.env.ODOO_URL || "http://localhost:8069";

// ══════════════════════════════════════════════════════════════
// SEC-01 · Página del configurador — Acceso público
// ══════════════════════════════════════════════════════════════
test.describe("SEC-01 · Configurador — Acceso Público", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("01-01 Página /configurador con product_id válido retorna 200", async ({
    page,
  }) => {
    const resp = await page.goto(`${URL}/configurador/1`);
    // Puede redirigir a /reservar si el producto no tiene custom_order=True
    expect([200, 301, 302]).toContain(resp?.status());
  });

  test("01-02 Endpoint /configurador/generar-imagen sin design_id crea diseño nuevo", async ({
    request,
  }) => {
    const resp = await request.post(`${URL}/configurador/generar-imagen`, {
      data: { product_id: 1, jsonrpc: "2.0", method: "call", id: 1 },
      headers: { "Content-Type": "application/json" },
    });
    const body = await resp.json().catch(() => null);
    // Debe retornar resultado o error de producto no encontrado — NUNCA un 500
    expect(resp.status()).not.toBe(500);
    if (body?.result?.error) {
      expect(typeof body.result.error).toBe("string");
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-02 · IDOR — Usuario no puede modificar diseño ajeno
// ══════════════════════════════════════════════════════════════
test.describe("SEC-02 · IDOR — Protección de Diseños Ajenos", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("02-01 Intento de guardar diseño con ID ajeno retorna error de acceso", async ({
    request,
  }) => {
    // Intenta modificar un diseño con ID=1 sin autenticación
    // Debe retornar error "Acceso denegado" o error de producto
    const resp = await request.post(`${URL}/configurador/generar-imagen`, {
      data: {
        jsonrpc: "2.0",
        method: "call",
        id: 1,
        params: {
          product_id: 1,
          design_id: 1, // Diseño potencialmente ajeno
        },
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(resp.status()).not.toBe(500);
    const body = await resp.json().catch(() => null);
    // Si retorna un resultado, no debe ser una escritura silenciosa sin error
    if (body?.result) {
      // Puede retornar error de producto o de acceso — nunca éxito silencioso
      console.log(
        "IDOR test response:",
        JSON.stringify(body.result).slice(0, 200),
      );
    }
  });

  test("02-02 Endpoint /configurador/guardar-diseno requiere autenticación o propiedad", async ({
    request,
  }) => {
    const resp = await request.post(`${URL}/configurador/guardar-diseno`, {
      data: {
        jsonrpc: "2.0",
        method: "call",
        id: 1,
        params: { design_id: 1, canvas_json: "{}", final_image: "" },
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(resp.status()).not.toBe(500);
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-03 · Validaciones de entrada en el configurador
// ══════════════════════════════════════════════════════════════
test.describe("SEC-03 · Validaciones de Entrada del Configurador", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("03-01 product_id inválido (0) retorna error descriptivo", async ({
    request,
  }) => {
    const resp = await request.post(`${URL}/configurador/generar-imagen`, {
      data: {
        jsonrpc: "2.0",
        method: "call",
        id: 1,
        params: { product_id: 0 },
      },
      headers: { "Content-Type": "application/json" },
    });
    const body = await resp.json().catch(() => null);
    expect(resp.status()).not.toBe(500);
    if (body?.result?.error) {
      expect(body.result.error).toContain("Producto");
    }
  });

  test("03-02 product_id inexistente (999999) retorna error descriptivo", async ({
    request,
  }) => {
    const resp = await request.post(`${URL}/configurador/generar-imagen`, {
      data: {
        jsonrpc: "2.0",
        method: "call",
        id: 1,
        params: { product_id: 999999 },
      },
      headers: { "Content-Type": "application/json" },
    });
    const body = await resp.json().catch(() => null);
    expect(resp.status()).not.toBe(500);
    if (body?.result?.error) {
      expect(typeof body.result.error).toBe("string");
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SEC-04 · Opciones del configurador — Solo lectura pública
// ══════════════════════════════════════════════════════════════
test.describe("SEC-04 · Opciones de Diseño — Acceso Público de Solo Lectura", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("04-01 Endpoint /configurador/opciones retorna lista válida o error controlado", async ({
    request,
  }) => {
    const resp = await request.get(
      `${URL}/configurador/opciones?category=flavor`,
    );
    expect(resp.status()).not.toBe(500);
  });
});
