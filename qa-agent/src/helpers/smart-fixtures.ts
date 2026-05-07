/**
 * Sweet Café QA — Smart Fixtures con Captura Automática
 * ======================================================
 * Nivel: Senior QA
 *
 * Extiende `test` de Playwright con fixtures que capturan automáticamente
 * por cada test:
 *   • networkLog  — todas las respuestas HTTP (URL, status, método)
 *   • consoleLog  — errores JS de consola y pageerrors (sin ruido conocido)
 *   • bugTrackedPage — page con listeners ya registrados
 *
 * Al terminar cada test, los datos capturados se adjuntan como JSON
 * al resultado (attachment "bug-data") para que el reporter los lea
 * y clasifique cada fallo correctamente.
 *
 * USO en tests:
 *   import { test, expect } from '../../src/helpers/smart-fixtures.js'
 *
 *   test('mi test', async ({ bugTrackedPage, networkLog, consoleLog }) => {
 *     await bugTrackedPage.goto('...');
 *     // ... acciones ...
 *     // Al fallar o pasar, los logs se adjuntan automáticamente.
 *   });
 *
 * Los tests existentes que usan `page` de @playwright/test siguen
 * funcionando sin cambios; el reporter clasifica usando solo el
 * mensaje de error cuando no hay attachment.
 */

import { test as base, expect, Page } from "@playwright/test";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface NetworkEntry {
  url: string;
  status: number;
  method: string;
  /** true si es un endpoint RPC de Odoo */
  isRpc: boolean;
}

export interface ConsoleEntry {
  type: "console-error" | "pageerror" | "console-warning";
  text: string;
}

export interface BugTrackFixtures {
  /** Page con listeners de red y consola ya registrados */
  bugTrackedPage: Page;
  /** Todas las respuestas HTTP recibidas durante el test */
  networkLog: NetworkEntry[];
  /** Errores de consola filtrados (sin ruido de Odoo) */
  consoleLog: ConsoleEntry[];
}

// ─── Patrones de ruido conocido (NO son bugs) ────────────────────────────────

const KNOWN_NOISE: RegExp[] = [
  /favicon\.ico/i,
  /sourcemap/i,
  /ResizeObserver loop/i,
  /net::ERR_ABORTED/i,
  /ERR_ABORTED/i,
  /Failed to load resource.*304/i,
  /Loading chunk \d+ failed/i,
  /already been destroyed/i,
  /Non-Error exception captured/i,
  /\[Violation\]/i,
  /Content Security Policy/i,
  /SameSite/i,
  /\[OWL\]/i,
  /owl debug/i,
  /Refused to apply style/i,
];

function isKnownNoise(text: string): boolean {
  return KNOWN_NOISE.some((p) => p.test(text));
}

// ─── Fixture extension ────────────────────────────────────────────────────────

export const test = base.extend<BugTrackFixtures>({
  networkLog: async ({}, use) => {
    const log: NetworkEntry[] = [];
    await use(log);
  },

  consoleLog: async ({}, use) => {
    const log: ConsoleEntry[] = [];
    await use(log);
  },

  bugTrackedPage: async ({ page, networkLog, consoleLog }, use, testInfo) => {
    // ── Captura de red ──────────────────────────────────────────────────────
    page.on("response", (resp) => {
      networkLog.push({
        url: resp.url().slice(0, 160),
        status: resp.status(),
        method: resp.request().method(),
        isRpc:
          resp.url().includes("/web/dataset/call_kw") ||
          resp.url().includes("/web/dataset/call"),
      });
    });

    // ── Captura de errores de consola ───────────────────────────────────────
    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error" || type === "warning") {
        const text = msg.text();
        if (!isKnownNoise(text)) {
          consoleLog.push({
            type: type === "error" ? "console-error" : "console-warning",
            text: text.slice(0, 400),
          });
        }
      }
    });

    // ── Captura de excepciones JS no controladas ────────────────────────────
    page.on("pageerror", (err) => {
      const text = err.message;
      if (!isKnownNoise(text)) {
        consoleLog.push({ type: "pageerror", text: text.slice(0, 400) });
      }
    });

    await use(page);

    // ── Adjuntar datos de bug al resultado del test ─────────────────────────
    const httpErrors = networkLog.filter((e) => e.status >= 400);
    const realConsoleErrors = consoleLog.filter(
      (e) => e.type !== "console-warning",
    );

    if (httpErrors.length > 0 || realConsoleErrors.length > 0) {
      await testInfo.attach("bug-data", {
        contentType: "application/json",
        body: Buffer.from(
          JSON.stringify(
            {
              httpErrors,
              consoleErrors: realConsoleErrors,
              allNetworkStatuses: networkLog.map((e) => e.status),
              capturedAt: new Date().toISOString(),
            },
            null,
            2,
          ),
        ),
      });
    }
  },
});

export { expect };

// ─── Helper: esperar respuesta RPC sin error ──────────────────────────────────
/**
 * Ejecuta una acción y verifica que no haya errores HTTP 500 ni RPC.
 * Usar con bugTrackedPage en tests [VALID].
 */
export async function expectNoServerError(
  networkLog: NetworkEntry[],
  description: string,
): Promise<void> {
  const crashes = networkLog.filter((e) => e.status >= 500);
  if (crashes.length > 0) {
    throw new Error(
      `[BUG CRÍTICO] "${description}" generó HTTP ${crashes[0].status} en: ${crashes[0].url}`,
    );
  }
}

/**
 * Verifica que los errores de consola capturados son todos ruido esperado.
 */
export async function expectNoRealConsoleErrors(
  consoleLog: ConsoleEntry[],
  description: string,
): Promise<void> {
  const realErrors = consoleLog.filter((e) => e.type === "pageerror");
  if (realErrors.length > 0) {
    throw new Error(
      `[BUG] "${description}" tiene excepción JS no controlada: ${realErrors[0].text}`,
    );
  }
}
