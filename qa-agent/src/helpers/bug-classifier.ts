/**
 * Sweet Café QA — Motor de Clasificación de Bugs
 * ================================================
 * Nivel: Senior QA
 *
 * Un QA senior distingue SIEMPRE entre:
 *
 *  🔴 CRASH              — HTTP 500, excepción JS no controlada.
 *                           SIEMPRE es un bug real.
 *
 *  🟠 MISSING_VALIDATION — El sistema aceptó datos inválidos sin error.
 *                           SIEMPRE es un bug real (validación faltante).
 *
 *  🟡 UI_BROKEN          — Elemento UI esperado no encontrado / roto.
 *                           Bug real: pantalla rota o selector obsoleto.
 *
 *  🟣 PERFORMANCE_ISSUE  — Timeout o respuesta > 30 s.
 *                           Bug potencial de rendimiento.
 *
 *  🔵 SYSTEM_VALIDATION  — El sistema rechazó correctamente la entrada.
 *                           COMPORTAMIENTO ESPERADO, NO es un bug.
 *
 *  🟢 KNOWN_BEHAVIOR     — Patrón conocido de Odoo (redirección a login,
 *                           warnings de favicon, CSP, etc.).
 *                           COMPORTAMIENTO ESPERADO, NO es un bug.
 *
 *  ⚫ SECURITY_VIOLATION — El sistema permitió acceso no autorizado.
 *                           Siempre CRÍTICO.
 *
 *  ⚪ UNKNOWN            — No clasificado. Revisar manualmente.
 */

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type BugSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type BugCategory =
  | "CRASH"
  | "MISSING_VALIDATION"
  | "UI_BROKEN"
  | "PERFORMANCE_ISSUE"
  | "SYSTEM_VALIDATION"
  | "KNOWN_BEHAVIOR"
  | "SECURITY_VIOLATION"
  | "UNKNOWN";

export interface BugClassification {
  category: BugCategory;
  severity: BugSeverity;
  /** true  → bug real que debe corregirse     */
  isRealBug: boolean;
  /** false → comportamiento esperado del sistema */
  reason: string;
  /** Etiqueta corta para mostrar en la UI */
  label: string;
  /** Color hex para el badge en el reporte HTML */
  color: string;
}

export interface BugInput {
  /** Título completo del test (puede incluir [INVALID] [SECURITY] etc.) */
  testTitle: string;
  suiteName: string;
  /** Mensaje de error del test (de result.errors[0].message) */
  errorMessage: string;
  /** Códigos HTTP capturados durante el test */
  httpStatuses?: number[];
  /** Mensajes de consola capturados durante el test */
  consoleMessages?: string[];
  /** Duración del test en ms */
  durationMs?: number;
  /** Estado devuelto por Playwright */
  playwrightStatus?:
    | "passed"
    | "failed"
    | "skipped"
    | "timedOut"
    | "interrupted";
}

// ─── Patrones de "ruido conocido" de Odoo ────────────────────────────────────
// Estos patrones en la consola / errores NO son bugs, son comportamiento normal.

const KNOWN_ODOO_NOISE: RegExp[] = [
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
  /owl debug/i,
  /\[OWL\]/i,
];

// ─── Patrones de crash real ───────────────────────────────────────────────────

const CRASH_PATTERNS: RegExp[] = [
  /Internal Server Error/i,
  /odoo server error/i,
  /traceback/i,
  /AttributeError/i,
  /KeyError/i,
  /ValueError.*server/i,
  /psycopg2/i,
  /database error/i,
];

// ─── Patrones de validación correcta del sistema ─────────────────────────────
// Cuando el sistema rechaza correctamente → NO es un bug.

const SYSTEM_VALIDATION_PATTERNS: RegExp[] = [
  /UserError/i,
  /ValidationError/i,
  /campo.*requerid|required field/i,
  /faltan.*campo|missing.*field/i,
  /acceso denegado|access denied/i,
  /no tiene permisos|you do not have/i,
];

// ─── Clasificador principal ───────────────────────────────────────────────────

export function classifyBug(input: BugInput): BugClassification {
  const {
    testTitle,
    suiteName,
    errorMessage,
    httpStatuses = [],
    consoleMessages = [],
    durationMs = 0,
    playwrightStatus,
  } = input;

  const titleLower = `${testTitle} ${suiteName}`.toLowerCase();
  const errorLower = errorMessage.toLowerCase();
  const allText = `${titleLower} ${errorLower}`;

  // ── 1. TIMEOUT → PERFORMANCE ─────────────────────────────────────────────
  if (
    playwrightStatus === "timedOut" ||
    /timeout|timed out/i.test(errorLower)
  ) {
    return {
      category: "PERFORMANCE_ISSUE",
      severity: "MEDIUM",
      isRealBug: true,
      reason:
        "El test superó el tiempo máximo de espera. Puede ser un bug de rendimiento, un elemento inexistente o el sistema caído.",
      label: "TIMEOUT",
      color: "#7c3aed",
    };
  }

  // ── 2. HTTP 500 → CRASH ───────────────────────────────────────────────────
  const has500 = httpStatuses.some((s) => s >= 500);
  const hasCrashPattern =
    CRASH_PATTERNS.some((p) => p.test(errorMessage)) ||
    consoleMessages.some((m) => CRASH_PATTERNS.some((p) => p.test(m)));

  if (has500 || hasCrashPattern) {
    return {
      category: "CRASH",
      severity: "CRITICAL",
      isRealBug: true,
      reason: `Error interno del servidor detectado (HTTP 500 o traceback). Esto SIEMPRE es un bug real que debe corregirse.`,
      label: "CRASH 500",
      color: "#dc2626",
    };
  }

  // ── 3. SECURITY test falló → acceso permitido sin auth ────────────────────
  if (
    /\[security\]/.test(titleLower) ||
    /sin auth|sin autent|no autenticad|acceso.*sin.*login/i.test(titleLower)
  ) {
    return {
      category: "SECURITY_VIOLATION",
      severity: "CRITICAL",
      isRealBug: true,
      reason:
        "El test de seguridad falló: el sistema permitió acceso a una ruta protegida sin autenticación.",
      label: "SEGURIDAD",
      color: "#991b1b",
    };
  }

  // ── 4. [INVALID] test falló → validación del sistema faltante ────────────
  if (/\[invalid\]/.test(titleLower)) {
    // Si falló con un crash → CRASH (ya cubierto arriba)
    // Si falló porque no apareció el mensaje de error → MISSING_VALIDATION
    const isValidationMissing =
      /expect.*received|toBeVisible.*false|no.*error.*found|not.*visible|locator.*not found/i.test(
        errorMessage,
      ) ||
      /el sistema aceptó|aceptó datos|sin mostrar error/i.test(errorMessage);

    if (isValidationMissing || !has500) {
      return {
        category: "MISSING_VALIDATION",
        severity: "HIGH",
        isRealBug: true,
        reason:
          "Validación del negocio faltante: el sistema aceptó datos inválidos o incorrectos sin rechazarlos.",
        label: "FALTA VALIDACIÓN",
        color: "#ea580c",
      };
    }
  }

  // ── 5. Error es comportamiento correcto del sistema ───────────────────────
  const isSystemValidation = SYSTEM_VALIDATION_PATTERNS.some((p) =>
    p.test(errorMessage),
  );
  if (isSystemValidation) {
    return {
      category: "SYSTEM_VALIDATION",
      severity: "INFO",
      isRealBug: false,
      reason:
        "El sistema rechazó la operación con un error controlado (UserError, ValidationError). Este es el comportamiento CORRECTO.",
      label: "VALIDACIÓN OK",
      color: "#2563eb",
    };
  }

  // ── 6. Error es ruido conocido de Odoo ───────────────────────────────────
  const isKnownNoise =
    KNOWN_ODOO_NOISE.some((p) => p.test(errorMessage)) ||
    KNOWN_ODOO_NOISE.some((p) => consoleMessages.some((m) => p.test(m)));
  if (isKnownNoise) {
    return {
      category: "KNOWN_BEHAVIOR",
      severity: "INFO",
      isRealBug: false,
      reason: "Patrón conocido de Odoo. No requiere acción.",
      label: "RUIDO ESPERADO",
      color: "#6b7280",
    };
  }

  // ── 7. Elemento UI no encontrado → UI_BROKEN ──────────────────────────────
  const isUiMissing =
    /locator.*not found|expect.*toBeVisible|element.*not visible|strict mode violation|no element/i.test(
      errorMessage,
    );
  if (isUiMissing) {
    const isCriticalUI =
      /form|button.*confirm|button.*guardar|menu|navbar/i.test(allText);
    return {
      category: "UI_BROKEN",
      severity: isCriticalUI ? "HIGH" : "MEDIUM",
      isRealBug: true,
      reason:
        "Elemento UI esperado no encontrado en la página. Puede ser un selector obsoleto, un elemento eliminado o un error de carga.",
      label: "UI ROTO",
      color: "#d97706",
    };
  }

  // ── 8. HTTP 4xx (no 500) en test de flujo normal → revisar ───────────────
  const has4xx = httpStatuses.some((s) => s >= 400 && s < 500);
  if (has4xx && !/\[invalid\]|\[security\]/i.test(titleLower)) {
    return {
      category: "UNKNOWN",
      severity: "LOW",
      isRealBug: true,
      reason: `Respuesta HTTP ${httpStatuses.find((s) => s >= 400)} inesperada en un flujo normal. Revisar manualmente.`,
      label: "HTTP ERROR",
      color: "#6b7280",
    };
  }

  // ── 9. Default: desconocido ───────────────────────────────────────────────
  return {
    category: "UNKNOWN",
    severity: "LOW",
    isRealBug: true,
    reason:
      "Fallo no clasificado automáticamente. Revisar manualmente el error y el contexto del test.",
    label: "NO CLASIFICADO",
    color: "#6b7280",
  };
}

// ─── Helpers de resumen ───────────────────────────────────────────────────────

export function severityOrder(s: BugSeverity): number {
  return { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }[s];
}

export function categoryLabel(c: BugCategory): string {
  return {
    CRASH: "💥 Crash / Error 500",
    MISSING_VALIDATION: "🚫 Validación Faltante",
    UI_BROKEN: "🖥️ UI Roto",
    PERFORMANCE_ISSUE: "⏱️ Rendimiento",
    SECURITY_VIOLATION: "🔓 Violación Seguridad",
    SYSTEM_VALIDATION: "✅ Validación Sistema (OK)",
    KNOWN_BEHAVIOR: "ℹ️ Comportamiento Conocido",
    UNKNOWN: "❓ Sin Clasificar",
  }[c];
}
