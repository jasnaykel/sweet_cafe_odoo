/**
 * Sweet Café QA — Helpers de Validación Positiva/Negativa
 * =========================================================
 * Nivel: Senior QA Real
 *
 * FILOSOFÍA DE ESTE MÓDULO:
 * Un QA senior distingue siempre entre:
 *
 *   ✅ ESCENARIO VÁLIDO    — El sistema DEBE funcionar correctamente
 *                            Falla si hay 500, crash, o comportamiento incorrecto
 *
 *   ⛔ ESCENARIO INVÁLIDO  — El sistema DEBE rechazar la entrada o mostrar error
 *                            Falla si NO muestra error (acepta datos inválidos)
 *                            Falla si genera un 500 en lugar de un error controlado
 *
 *   🔒 ESCENARIO SEGURIDAD — El sistema DEBE bloquear el acceso
 *                            Falla si permite acceso sin autenticación
 *
 * USO:
 *   import { assertValid, assertInvalid, assertSecure } from '../../src/helpers/qa-validation.js'
 */

import { expect, Page } from "@playwright/test";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type TestScenario = "VALID" | "INVALID" | "SECURITY";

export interface ValidationResult {
  scenario: TestScenario;
  passed: boolean;
  reason: string;
  httpStatus?: number;
  hasJsErrors?: boolean;
  hasValidationMessage?: boolean;
}

// ─── Helpers de aserción ─────────────────────────────────────────────────────

/**
 * ESCENARIO VÁLIDO: Verifica que una operación legítima funciona sin errores.
 * El test FALLA si:
 *   - Hay respuestas HTTP 500 del servidor
 *   - Aparece un diálogo de error de Odoo
 *   - El resultado no es el esperado
 */
export async function assertValidOperation(
  page: Page,
  description: string,
  operation: () => Promise<void>,
  expectedOutcome?: () => Promise<void>,
): Promise<void> {
  const serverErrors: string[] = [];
  const rpcErrors: string[] = [];

  page.on("response", (r) => {
    if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
    if (r.url().includes("/web/dataset/call_kw") && r.status() >= 400)
      rpcErrors.push(r.url());
  });

  await operation();

  // Un escenario VÁLIDO nunca debe generar 500
  expect(
    serverErrors,
    `[VALID] "${description}" generó errores 500: ${serverErrors.join(", ")}`,
  ).toHaveLength(0);

  // No debe aparecer diálogo de error de Odoo
  const errorDialog = page
    .locator(".o_dialog .o_error_dialog, .o_notification.bg-danger")
    .first();
  const hasOdooError = await errorDialog
    .isVisible({ timeout: 1000 })
    .catch(() => false);
  expect(
    hasOdooError,
    `[VALID] "${description}" mostró un diálogo de error de Odoo inesperado`,
  ).toBe(false);

  // Ejecutar verificación adicional si se proporcionó
  if (expectedOutcome) {
    await expectedOutcome();
  }
}

/**
 * ESCENARIO INVÁLIDO: Verifica que el sistema RECHAZA correctamente entradas inválidas.
 * El test FALLA si:
 *   - El sistema ACEPTA la entrada inválida sin mostrar error (BUG: validación faltante)
 *   - El sistema genera un 500 en lugar de un error controlado (BUG: crash)
 *
 * El test PASA si:
 *   - El sistema muestra un mensaje de error apropiado (comportamiento CORRECTO)
 *   - El sistema devuelve 422/400 con mensaje claro
 */
export async function assertInvalidRejected(
  page: Page,
  description: string,
  operation: () => Promise<void>,
  expectedErrorPatterns: RegExp[] = [
    /error|inválid|requerid|required|missing|faltan/i,
  ],
): Promise<void> {
  const serverCrashes: string[] = [];

  page.on("response", (r) => {
    if (r.status() >= 500)
      serverCrashes.push(`${r.status()} ${r.url().slice(0, 80)}`);
  });

  await operation();

  // Un escenario INVÁLIDO NUNCA debe generar 500 (eso sería un crash, no una validación)
  expect(
    serverCrashes,
    `[INVALID] "${description}" causó un crash 500 en lugar de validación controlada: ${serverCrashes.join(", ")}`,
  ).toHaveLength(0);

  // Verificar que al menos uno de los patrones de error esperados esté visible
  const errorIndicators = [
    ".o_field_invalid",
    ".o_notification",
    ".alert-danger",
    ".o_error_dialog",
    "[role='alert']",
    ".modal-body",
    ".invalid-feedback",
  ];

  let errorFound = false;
  for (const selector of errorIndicators) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = (await el.textContent().catch(() => "")) || "";
      if (expectedErrorPatterns.some((p) => p.test(text))) {
        errorFound = true;
        break;
      }
    }
  }

  // También verificar en el contenido de la página
  if (!errorFound) {
    const bodyText =
      (await page
        .locator("body")
        .textContent()
        .catch(() => "")) || "";
    errorFound = expectedErrorPatterns.some((p) => p.test(bodyText));
  }

  // Si no hay error visible, también es aceptable que la URL cambie a indicar error
  if (!errorFound) {
    const url = page.url();
    errorFound = /error|invalid|400|422/.test(url);
  }

  expect(
    errorFound,
    `[INVALID] "${description}" NO mostró ningún mensaje de validación — el sistema ACEPTÓ datos inválidos (BUG)`,
  ).toBe(true);
}

/**
 * ESCENARIO SEGURIDAD: Verifica que el sistema bloquea acceso sin autenticación.
 * El test FALLA si:
 *   - La URL protegida no redirige a login
 *   - Devuelve datos del backend directamente
 *   - Genera un 500
 */
export async function assertSecureRedirect(
  page: Page,
  protectedUrl: string,
  description: string,
): Promise<void> {
  const r = await page.goto(protectedUrl);
  await page.waitForLoadState("networkidle");

  const status = r?.status() ?? 0;
  const finalUrl = page.url();

  // No debe ser 500
  expect(
    status,
    `[SECURITY] "${description}" generó 500 — el servidor crasheó en lugar de redirigir`,
  ).not.toBe(500);

  // Debe redirigir a login o mostrar página de acceso
  const redirectedToLogin =
    finalUrl.includes("/web/login") ||
    finalUrl.includes("/login") ||
    (await page
      .locator("input[name='login'], input[name='password']")
      .isVisible({ timeout: 3000 })
      .catch(() => false));

  expect(
    redirectedToLogin,
    `[SECURITY] "${description}" NO redirigió a login — expone ruta protegida sin autenticación (URL: ${finalUrl})`,
  ).toBe(true);
}

// ─── Utilidades para clasificar resultados ────────────────────────────────────

/**
 * Clasifica y loguea un resultado de test para el reporte.
 * Ayuda al agente a saber si un error es ESPERADO o un BUG REAL.
 */
export function classifyTestResult(
  scenario: TestScenario,
  testName: string,
  errorOccurred: boolean,
  errorMessage?: string,
): { isActualBug: boolean; explanation: string } {
  switch (scenario) {
    case "VALID":
      if (errorOccurred) {
        return {
          isActualBug: true,
          explanation: `BUG REAL: "${testName}" falló con escenario válido. El sistema debería aceptar esto. Error: ${errorMessage}`,
        };
      }
      return {
        isActualBug: false,
        explanation: "Comportamiento correcto: escenario válido aceptado",
      };

    case "INVALID":
      if (!errorOccurred) {
        return {
          isActualBug: true,
          explanation: `BUG REAL: "${testName}" aceptó datos inválidos sin error. Falta validación en el sistema.`,
        };
      }
      return {
        isActualBug: false,
        explanation:
          "Comportamiento correcto: datos inválidos rechazados apropiadamente",
      };

    case "SECURITY":
      if (!errorOccurred) {
        return {
          isActualBug: true,
          explanation: `VULNERABILIDAD: "${testName}" permite acceso sin autenticación.`,
        };
      }
      return {
        isActualBug: false,
        explanation:
          "Comportamiento correcto: acceso bloqueado sin autenticación",
      };
  }
}

// ─── Constantes de convención para nombres de test ───────────────────────────

/**
 * Prefijos para nombres de test — visible en los reportes HTML.
 *
 * [VALID]    → Flujo correcto — el sistema DEBE aceptar y procesar
 * [INVALID]  → Entrada incorrecta — el sistema DEBE rechazar con error controlado
 * [SECURITY] → Acceso sin auth — el sistema DEBE bloquear
 * [BOUNDARY] → Valor límite — verifica fronteras de validación
 * [WORKFLOW] → Flujo de negocio completo de múltiples pasos
 */
export const T = {
  VALID: "[VALID]",
  INVALID: "[INVALID]",
  SECURITY: "[SECURITY]",
  BOUNDARY: "[BOUNDARY]",
  WORKFLOW: "[WORKFLOW]",
} as const;
