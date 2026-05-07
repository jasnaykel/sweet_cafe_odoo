/**
 * Sweet Cafe QA - Custom HTML Reporter v3 (Acumulativo)
 * =======================================================
 * Genera reports/index.html automaticamente despues de cada spec run.
 * ACUMULA resultados de todos los specs en reports/accumulated.json,
 * de forma que el reporte siempre muestra TODOS los tests ejecutados
 * hasta el momento (un spec reemplaza sus resultados anteriores).
 *
 * Incluye:
 *   - Score global + split Backend/Frontend
 *   - Tabla por modulo/suite con barra de progreso
 *   - Listado completo de todos los tests
 *   - Screenshots y videos embebidos en los fallos
 *   - Tab "Bug Analysis": clasifica fallos por severidad y categoria
 *   - Historial de specs ejecutados con timestamp
 */

import type {
  Reporter,
  TestCase,
  TestResult,
  FullConfig,
  FullResult,
  Suite,
} from "@playwright/test/reporter";
import * as fs from "fs";
import * as path from "path";
import {
  classifyBug,
  type BugClassification,
  categoryLabel,
  severityOrder,
} from "../helpers/bug-classifier.js";

interface TestRecord {
  title: string;
  suiteName: string;
  fullTitle: string;
  status: "passed" | "failed" | "skipped" | "timedOut" | "interrupted";
  duration: number;
  error?: string;
  file: string;
  specFile: string;
  projectName: string;
  runAt: string;
  /** Rutas de screenshots relativas a la raiz de qa-agent */
  screenshots: string[];
  /** Ruta de video relativa a la raiz de qa-agent */
  video?: string;
  bug?: BugClassification;
  capturedHttpErrors?: number[];
  capturedConsoleErrors?: string[];
}

interface AccumulatedData {
  lastUpdated: string;
  specRuns: Record<string, string>; // specFile -> last run timestamp
  tests: TestRecord[];
}

interface SuiteStats {
  name: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  pct: number;
}

// Raiz del workspace qa-agent (donde se ejecuta playwright)
const ROOT = process.cwd();
const REPORTS_DIR = path.resolve(ROOT, "reports");
const ACCUMULATED_FILE = path.resolve(REPORTS_DIR, "accumulated.json");

class SweetCafeReporter implements Reporter {
  private tests: TestRecord[] = [];
  private startTime = 0;
  private outputPath: string;
  private currentSpecFiles = new Set<string>();
  private runTimestamp = new Date().toISOString();

  constructor(options: { outputFile?: string } = {}) {
    this.outputPath =
      options.outputFile || path.resolve(REPORTS_DIR, "index.html");
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.startTime = Date.now();
    this.tests = [];
    this.currentSpecFiles = new Set<string>();
    this.runTimestamp = new Date().toISOString();
  }

  private readBugAttachment(result: TestResult): {
    httpStatuses: number[];
    consoleMessages: string[];
  } {
    const att = result.attachments?.find((a) => a.name === "bug-data");
    if (!att?.body) return { httpStatuses: [], consoleMessages: [] };
    try {
      const data = JSON.parse(att.body.toString("utf-8"));
      const httpStatuses: number[] = data.allNetworkStatuses ?? [];
      const consoleMessages: string[] = (data.consoleErrors ?? []).map(
        (e: { text: string }) => e.text,
      );
      return { httpStatuses, consoleMessages };
    } catch {
      return { httpStatuses: [], consoleMessages: [] };
    }
  }

  /** Convierte una ruta absoluta a relativa desde la raiz de qa-agent */
  private toRelative(absPath: string): string {
    try {
      const rel = path.relative(ROOT, absPath);
      return rel.replace(/\\/g, "/");
    } catch {
      return absPath;
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const titles = test.titlePath();
    const suiteName = titles.slice(1, -1).join(" > ") || "General";
    const errorMsg = result.errors?.[0]?.message;
    const specFilePath = test.location?.file ?? "";
    const specFile = path.basename(specFilePath);

    this.currentSpecFiles.add(specFile);

    const { httpStatuses, consoleMessages } = this.readBugAttachment(result);

    let bug: BugClassification | undefined;
    if (result.status === "failed" || result.status === "timedOut") {
      bug = classifyBug({
        testTitle: test.title,
        suiteName,
        errorMessage: errorMsg ?? "",
        httpStatuses,
        consoleMessages,
        durationMs: result.duration,
        playwrightStatus: result.status,
      });
    }

    // Capturar screenshots y video de los attachments
    const screenshots: string[] = [];
    let video: string | undefined;

    for (const att of result.attachments ?? []) {
      if (!att.path) continue;
      if (att.contentType === "image/png" || att.name === "screenshot") {
        screenshots.push(this.toRelative(att.path));
      } else if (att.contentType === "video/webm" || att.name === "video") {
        video = this.toRelative(att.path);
      }
    }

    this.tests.push({
      title: test.title,
      suiteName,
      fullTitle: titles.join(" > "),
      status: result.status,
      duration: result.duration,
      error: errorMsg
        ? errorMsg.replace(/\x1b\[[0-9;]*m/g, "").slice(0, 500)
        : undefined,
      file: specFile,
      specFile,
      projectName: test.parent?.project()?.name ?? "",
      runAt: this.runTimestamp,
      screenshots,
      video,
      bug,
      capturedHttpErrors: httpStatuses,
      capturedConsoleErrors: consoleMessages,
    });
  }

  /** Carga los datos acumulados del archivo JSON */
  private loadAccumulated(): AccumulatedData {
    if (fs.existsSync(ACCUMULATED_FILE)) {
      try {
        const raw = fs.readFileSync(ACCUMULATED_FILE, "utf-8");
        return JSON.parse(raw) as AccumulatedData;
      } catch {
        // Si el JSON esta corrupto, empezar de cero
      }
    }
    return { lastUpdated: "", specRuns: {}, tests: [] };
  }

  /** Guarda los datos acumulados en el archivo JSON */
  private saveAccumulated(data: AccumulatedData): void {
    if (!fs.existsSync(REPORTS_DIR))
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    fs.writeFileSync(ACCUMULATED_FILE, JSON.stringify(data, null, 2), "utf-8");
  }

  async onEnd(_result: FullResult): Promise<void> {
    // 1. Cargar datos acumulados existentes
    const accumulated = this.loadAccumulated();

    // 2. Eliminar los tests de los specs que acaban de correr (los reemplazamos)
    accumulated.tests = accumulated.tests.filter(
      (t) => !this.currentSpecFiles.has(t.specFile),
    );

    // 3. Agregar los nuevos resultados
    accumulated.tests.push(...this.tests);

    // 4. Actualizar timestamps de spec runs
    for (const specFile of Array.from(this.currentSpecFiles)) {
      accumulated.specRuns[specFile] = this.runTimestamp;
    }
    accumulated.lastUpdated = new Date().toISOString();

    // 5. Guardar JSON acumulado
    this.saveAccumulated(accumulated);

    // 6. Generar HTML con TODOS los datos acumulados
    const allTests = accumulated.tests;
    const passed = allTests.filter((t) => t.status === "passed").length;
    const failed = allTests.filter(
      (t) => t.status === "failed" || t.status === "timedOut",
    ).length;
    const skipped = allTests.filter((t) => t.status === "skipped").length;
    const total = allTests.length;
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

    // Agrupar por suite
    const suitesMap = new Map<string, TestRecord[]>();
    for (const t of allTests) {
      const key = `${t.file} > ${t.suiteName}`;
      if (!suitesMap.has(key)) suitesMap.set(key, []);
      suitesMap.get(key)!.push(t);
    }
    const suites: SuiteStats[] = [];
    for (const [name, tests] of Array.from(suitesMap)) {
      const sp = tests.filter((t: TestRecord) => t.status === "passed").length;
      const sf = tests.filter(
        (t: TestRecord) => t.status === "failed" || t.status === "timedOut",
      ).length;
      const ss = tests.filter((t: TestRecord) => t.status === "skipped").length;
      const st = tests.length;
      suites.push({
        name,
        passed: sp,
        failed: sf,
        skipped: ss,
        total: st,
        pct: st > 0 ? Math.round((sp / st) * 100) : 0,
      });
    }

    const html = this.buildHtml(
      allTests,
      passed,
      failed,
      skipped,
      total,
      pct,
      duration,
      suites,
      accumulated.specRuns,
    );

    if (!fs.existsSync(REPORTS_DIR))
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    fs.writeFileSync(this.outputPath, html, "utf-8");
    console.log(
      `\n📊  HTML Report → ${this.outputPath}  (${pct}% passing, ${total} tests acumulados)`,
    );
  }

  private fillClass(pct: number): string {
    return pct >= 85 ? "fill-good" : pct >= 60 ? "fill-warn" : "fill-bad";
  }

  private statusBadge(status: TestRecord["status"]): string {
    switch (status) {
      case "passed":
        return '<span class="badge badge-pass">✓ PASA</span>';
      case "skipped":
        return '<span class="badge badge-skip">– SKIP</span>';
      default:
        return '<span class="badge badge-fail">✗ FALLA</span>';
    }
  }

  private bugSeverityBadge(sev: string, label: string, color: string): string {
    return `<span style="display:inline-block;padding:2px 9px;border-radius:999px;font-size:.72rem;font-weight:700;background:${color}20;color:${color};border:1px solid ${color}60">${label}</span>`;
  }

  /** Genera href relativo para una ruta guardada (de test-results/) hacia reports/ */
  private assetHref(relPath: string): string {
    // relPath es relativa a qa-agent root, el HTML esta en reports/
    // Convertir: test-results/foo/bar.png -> ../test-results/foo/bar.png
    return "../" + relPath.replace(/\\/g, "/");
  }

  /** HTML con thumbnails de screenshots y link de video */
  private renderMedia(t: TestRecord): string {
    if (t.screenshots.length === 0 && !t.video) return "";
    let html = '<div class="media-row">';
    for (const sc of t.screenshots) {
      if (fs.existsSync(path.resolve(ROOT, sc))) {
        html += `<a href="${this.assetHref(sc)}" target="_blank" title="Ver screenshot completo">
          <img src="${this.assetHref(sc)}" class="thumb" alt="screenshot" loading="lazy">
        </a>`;
      }
    }
    if (t.video && fs.existsSync(path.resolve(ROOT, t.video))) {
      html += `<a href="${this.assetHref(t.video)}" target="_blank" class="video-link">
        🎬 Ver video del fallo
      </a>`;
    }
    html += "</div>";
    return html;
  }

  private buildBugSection(tests: TestRecord[]): string {
    const failedTests = tests.filter(
      (t) => t.status === "failed" || t.status === "timedOut",
    );

    if (failedTests.length === 0) {
      return `<div class="empty-state">🎉 ¡Sin fallos! No hay bugs que reportar.</div>`;
    }

    const realBugs = failedTests.filter((t) => t.bug?.isRealBug !== false);
    const expectedBehavior = failedTests.filter(
      (t) => t.bug?.isRealBug === false,
    );

    const byCategory = new Map<string, typeof realBugs>();
    for (const t of realBugs) {
      const cat = t.bug?.category ?? "UNKNOWN";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(t);
    }

    const criticalCount = realBugs.filter(
      (t) => t.bug?.severity === "CRITICAL",
    ).length;
    const highCount = realBugs.filter((t) => t.bug?.severity === "HIGH").length;
    const mediumCount = realBugs.filter(
      (t) => t.bug?.severity === "MEDIUM",
    ).length;
    const lowCount = realBugs.filter(
      (t) => t.bug?.severity === "LOW" || t.bug?.severity === "INFO",
    ).length;

    const legend = `
<div class="bug-legend">
  <div class="legend-title">📖 Guia de Clasificacion</div>
  <div class="legend-grid">
    <div class="legend-item"><span class="sev-dot" style="background:#dc2626"></span><strong>CRITICAL</strong> – Crash / Error 500 / Violacion de seguridad. Bloquea produccion.</div>
    <div class="legend-item"><span class="sev-dot" style="background:#ea580c"></span><strong>HIGH</strong> – Validacion faltante o UI critico roto. Afecta flujos de negocio.</div>
    <div class="legend-item"><span class="sev-dot" style="background:#d97706"></span><strong>MEDIUM</strong> – UI secundario roto o timeout. No bloquea pero degrada UX.</div>
    <div class="legend-item"><span class="sev-dot" style="background:#6b7280"></span><strong>LOW / INFO</strong> – Error no clasificado o comportamiento conocido.</div>
    <div class="legend-item"><span class="sev-dot" style="background:#2563eb"></span><strong>SISTEMA OK</strong> – El sistema rechaza correctamente. NO es un bug.</div>
    <div class="legend-item"><span class="sev-dot" style="background:#16a34a"></span><strong>ESPERADO</strong> – Comportamiento conocido de Odoo. NO requiere accion.</div>
  </div>
</div>`;

    const summary = `
<div class="bug-summary-grid">
  <div class="bug-sev-card" style="border-color:#dc2626;background:#fef2f2">
    <div class="bsc-num" style="color:#dc2626">${criticalCount}</div><div class="bsc-lbl">CRITICOS</div>
  </div>
  <div class="bug-sev-card" style="border-color:#ea580c;background:#fff7ed">
    <div class="bsc-num" style="color:#ea580c">${highCount}</div><div class="bsc-lbl">ALTOS</div>
  </div>
  <div class="bug-sev-card" style="border-color:#d97706;background:#fffbeb">
    <div class="bsc-num" style="color:#d97706">${mediumCount}</div><div class="bsc-lbl">MEDIOS</div>
  </div>
  <div class="bug-sev-card" style="border-color:#6b7280;background:#f9fafb">
    <div class="bsc-num" style="color:#6b7280">${lowCount}</div><div class="bsc-lbl">BAJOS</div>
  </div>
  <div class="bug-sev-card" style="border-color:#2563eb;background:#eff6ff">
    <div class="bsc-num" style="color:#2563eb">${expectedBehavior.length}</div><div class="bsc-lbl">ESPERADOS ✓</div>
  </div>
</div>`;

    const categoryOrder = [
      "CRASH",
      "SECURITY_VIOLATION",
      "MISSING_VALIDATION",
      "UI_BROKEN",
      "PERFORMANCE_ISSUE",
      "UNKNOWN",
    ];
    let bugCards = "";
    for (const cat of categoryOrder) {
      const catTests = byCategory.get(cat);
      if (!catTests || catTests.length === 0) continue;
      const catLabel = categoryLabel(
        cat as Parameters<typeof categoryLabel>[0],
      );
      bugCards += `<div class="bug-cat-section">
  <div class="bug-cat-header">${catLabel} <span style="font-size:.82rem;font-weight:500;color:var(--muted)">(${catTests.length})</span></div>`;
      for (const t of catTests.sort(
        (a, b) =>
          severityOrder(a.bug!.severity) - severityOrder(b.bug!.severity),
      )) {
        const sev = t.bug!;
        bugCards += `
  <div class="bug-card" style="border-left-color:${sev.color}">
    <div class="bug-card-header">
      <span>${this.bugSeverityBadge(sev.severity, sev.label, sev.color)}</span>
      <span class="badge badge-proj">${t.specFile}</span>
      <span class="bug-card-file">${t.suiteName}</span>
      <span class="bug-card-dur">${(t.duration / 1000).toFixed(1)}s</span>
    </div>
    <div class="bug-card-title">${t.title}</div>
    <div class="bug-card-reason">${sev.reason}</div>
    ${t.error ? `<div class="bug-card-error"><code>${t.error.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, " ").slice(0, 300)}</code></div>` : ""}
    ${this.renderMedia(t)}
  </div>`;
      }
      bugCards += `</div>`;
    }

    let expectedSection = "";
    if (expectedBehavior.length > 0) {
      expectedSection = `
<div class="bug-cat-section" style="opacity:.7">
  <div class="bug-cat-header" style="color:#6b7280">ℹ️ Comportamiento Esperado del Sistema (${expectedBehavior.length}) – No son bugs</div>
  <table>
    <thead><tr><th>Spec</th><th>Test</th><th>Clasificacion</th><th>Razon</th></tr></thead>
    <tbody>${expectedBehavior
      .map(
        (t) => `<tr>
      <td style="font-size:.78rem"><code>${t.specFile}</code></td>
      <td style="font-size:.82rem">${t.title}</td>
      <td>${this.bugSeverityBadge("INFO", t.bug?.label ?? "INFO", "#6b7280")}</td>
      <td style="font-size:.8rem;color:var(--muted)">${t.bug?.reason ?? "-"}</td>
    </tr>`,
      )
      .join("")}
    </tbody>
  </table>
</div>`;
    }

    return summary + legend + bugCards + expectedSection;
  }

  private buildHtml(
    allTests: TestRecord[],
    passed: number,
    failed: number,
    skipped: number,
    total: number,
    pct: number,
    duration: string,
    suites: SuiteStats[],
    specRuns: Record<string, string>,
  ): string {
    const now = new Date().toLocaleString("es-CU");
    const ringOffset = Math.round((1 - pct / 100) * 377);
    const ringColor = pct >= 85 ? "#16a34a" : pct >= 65 ? "#d97706" : "#dc2626";
    const bannerClass =
      pct >= 85 ? "banner-pass" : pct >= 65 ? "banner-warn" : "banner-fail";
    const bannerIcon = pct >= 85 ? "✅" : pct >= 65 ? "⚠️" : "🔴";
    const bannerMsg =
      pct >= 85
        ? `Sistema en buen estado: ${pct}% de tests pasan.`
        : pct >= 65
          ? `Sistema necesita atencion: ${pct}% de tests pasan. Revisar los ${failed} fallos.`
          : `Sistema con problemas criticos: solo ${pct}% de tests pasan.`;

    const realBugCount = allTests.filter(
      (t) =>
        (t.status === "failed" || t.status === "timedOut") &&
        t.bug?.isRealBug !== false,
    ).length;

    const suiteRows = suites
      .map((s) => {
        const fc = this.fillClass(s.pct);
        return `<tr>
        <td><code>${s.name}</code></td>
        <td><span class="badge badge-pass">${s.passed}</span></td>
        <td>${s.failed > 0 ? `<span class="badge badge-fail">${s.failed}</span>` : `<span style="color:var(--muted)">0</span>`}</td>
        <td><span style="color:var(--muted)">${s.skipped}</span></td>
        <td>${s.total}</td>
        <td><div style="display:flex;align-items:center;gap:8px"><div class="progress" style="flex:1"><div class="progress-fill ${fc}" style="width:${s.pct}%"></div></div><span style="font-size:.8rem;color:var(--muted);min-width:34px">${s.pct}%</span></div></td>
      </tr>`;
      })
      .join("");

    const allRows = allTests
      .map((t) => {
        const dur = t.duration > 0 ? `${(t.duration / 1000).toFixed(1)}s` : "-";
        const bugBadge = t.bug
          ? ` ${this.bugSeverityBadge(t.bug.severity, t.bug.label, t.bug.color)}`
          : "";
        const errHtml = t.error
          ? `<br><code class="err-msg">${t.error.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, " ")}</code>`
          : "";
        const mediaHtml =
          t.screenshots.length > 0 || t.video
            ? `<br>${this.renderMedia(t)}`
            : "";
        const runDate = t.runAt
          ? new Date(t.runAt).toLocaleString("es-CU")
          : "";
        return `<tr>
        <td><code style="font-size:.72rem">${t.specFile}</code></td>
        <td style="font-size:.8rem;color:var(--muted)">${t.suiteName}</td>
        <td>${t.title}${bugBadge}${errHtml}${mediaHtml}</td>
        <td>${this.statusBadge(t.status)}</td>
        <td style="font-size:.75rem;color:var(--muted)">${dur}</td>
        <td style="font-size:.72rem;color:var(--muted)">${runDate}</td>
      </tr>`;
      })
      .join("");

    const failedTests = allTests.filter(
      (t) => t.status === "failed" || t.status === "timedOut",
    );
    const failedCards =
      failedTests.length === 0
        ? `<div class="empty-state">🎉 ¡Sin fallos! Todos los tests pasan.</div>`
        : failedTests
            .map(
              (t) => `
      <div class="failed-card">
        <div class="fc-header">
          <span class="fc-suite"><code>${t.specFile}</code> › ${t.suiteName}</span>
          <span class="fc-dur">${(t.duration / 1000).toFixed(1)}s</span>
        </div>
        <div class="fc-title">${t.title}${t.bug ? ` ${this.bugSeverityBadge(t.bug.severity, t.bug.label, t.bug.color)}` : ""}</div>
        ${t.bug ? `<div class="fc-reason">ℹ️ ${t.bug.reason}</div>` : ""}
        ${t.error ? `<div class="fc-error"><code>${t.error.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</code></div>` : ""}
        ${this.renderMedia(t)}
      </div>`,
            )
            .join("");

    const beTests = allTests.filter(
      (t) => !t.suiteName.includes("[FE]") && !t.file.includes("ecommerce"),
    );
    const feTests = allTests.filter(
      (t) => t.suiteName.includes("[FE]") || t.file.includes("ecommerce"),
    );
    const bePassed = beTests.filter((t) => t.status === "passed").length;
    const fePassed = feTests.filter((t) => t.status === "passed").length;
    const bePct =
      beTests.length > 0 ? Math.round((bePassed / beTests.length) * 100) : 0;
    const fePct =
      feTests.length > 0 ? Math.round((fePassed / feTests.length) * 100) : 0;

    const bugSection = this.buildBugSection(allTests);

    // Historial de specs ejecutados
    const specEntries = Object.entries(specRuns).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    const specHistoryRows = specEntries
      .map(([spec, ts]) => {
        const specTests = allTests.filter((t) => t.specFile === spec);
        const sp = specTests.filter((t) => t.status === "passed").length;
        const sf = specTests.filter(
          (t) => t.status === "failed" || t.status === "timedOut",
        ).length;
        const st = specTests.length;
        const spct = st > 0 ? Math.round((sp / st) * 100) : 0;
        const runDate = new Date(ts).toLocaleString("es-CU");
        return `<tr>
        <td><code>${spec}</code></td>
        <td>${st}</td>
        <td><span class="badge badge-pass">${sp}</span></td>
        <td>${sf > 0 ? `<span class="badge badge-fail">${sf}</span>` : '<span style="color:var(--muted)">0</span>'}</td>
        <td><div style="display:flex;align-items:center;gap:8px"><div class="progress" style="flex:1"><div class="progress-fill ${this.fillClass(spct)}" style="width:${spct}%"></div></div><span style="font-size:.8rem;color:var(--muted);min-width:34px">${spct}%</span></div></td>
        <td style="font-size:.78rem;color:var(--muted)">${runDate}</td>
      </tr>`;
      })
      .join("");

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="refresh" content="60">
<title>QA Report – Sweet Cafe Odoo 19</title>
<style>
  :root{--pass:#16a34a;--fail:#dc2626;--warn:#d97706;--info:#2563eb;--pass-bg:#f0fdf4;--fail-bg:#fef2f2;--warn-bg:#fffbeb;--info-bg:#eff6ff;--border:#e5e7eb;--text:#111827;--muted:#6b7280}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f9fafb;color:var(--text)}
  .header{background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#fff;padding:36px 48px}
  .header h1{font-size:1.9rem;font-weight:700;margin-bottom:6px}
  .header p{opacity:.75;font-size:.9rem}
  .header .meta{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
  .header .meta span{background:rgba(255,255,255,.15);border-radius:6px;padding:4px 12px;font-size:.8rem}
  .score-section{background:#fff;border-bottom:1px solid var(--border);padding:28px 48px;display:flex;gap:36px;align-items:center;flex-wrap:wrap}
  .ring-wrap{position:relative;width:130px;height:130px;flex-shrink:0}
  svg.ring{transform:rotate(-90deg)}
  .ring-pct{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:800;font-size:1.7rem}
  .ring-pct small{font-size:.68rem;font-weight:500;color:var(--muted)}
  .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:12px;flex:1;min-width:280px}
  .stat-card{border-radius:10px;padding:12px 14px;text-align:center}
  .stat-card .num{font-size:1.7rem;font-weight:800}
  .stat-card .lbl{font-size:.76rem;color:var(--muted);margin-top:2px}
  .stat-pass{background:var(--pass-bg);color:var(--pass)}
  .stat-fail{background:var(--fail-bg);color:var(--fail)}
  .stat-warn{background:var(--warn-bg);color:var(--warn)}
  .stat-info{background:var(--info-bg);color:var(--info)}
  .stat-crit{background:#fef2f2;color:#dc2626}
  .split-stats{display:flex;gap:12px;flex-wrap:wrap}
  .split-card{flex:1;min-width:130px;background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:12px 14px}
  .split-card .sc-label{font-weight:700;margin-bottom:4px;font-size:.88rem}
  .summary-banner{margin:14px 48px 0;padding:11px 16px;border-radius:8px;font-size:.88rem;font-weight:600}
  .banner-pass{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
  .banner-fail{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c}
  .banner-warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
  .tabs{display:flex;gap:0;border-bottom:2px solid var(--border);padding:0 48px;margin-top:18px;background:#fff;flex-wrap:wrap}
  .tab-btn{padding:11px 18px;cursor:pointer;font-size:.88rem;font-weight:500;color:var(--muted);border:none;background:none;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .15s}
  .tab-btn.active{color:#2563eb;border-bottom-color:#2563eb}
  .tab-content{display:none;padding:22px 48px 48px}
  .tab-content.active{display:block}
  .sec-title{font-size:1.05rem;font-weight:700;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:8px}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  thead{background:#f3f4f6}
  th{padding:10px 12px;text-align:left;font-size:.74rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
  td{padding:8px 12px;font-size:.855rem;border-top:1px solid var(--border);vertical-align:top}
  tr:hover{background:#f9fafb}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:.72rem;font-weight:600}
  .badge-pass{background:#dcfce7;color:#15803d}
  .badge-fail{background:#fee2e2;color:#b91c1c}
  .badge-skip{background:#f3f4f6;color:#6b7280}
  .badge-proj{background:#dbeafe;color:#1d4ed8;font-size:.68rem}
  .progress{height:7px;background:#e5e7eb;border-radius:999px;overflow:hidden}
  .progress-fill{height:100%;border-radius:999px}
  .fill-good{background:#16a34a}.fill-warn{background:#d97706}.fill-bad{background:#dc2626}
  .failed-card{background:#fff;border-radius:8px;padding:14px 18px;margin-bottom:10px;border-left:4px solid #dc2626;box-shadow:0 1px 3px rgba(0,0,0,.07)}
  .fc-header{display:flex;justify-content:space-between;margin-bottom:4px;font-size:.76rem;color:var(--muted)}
  .fc-title{font-weight:600;font-size:.88rem;color:var(--text);margin-bottom:4px}
  .fc-reason{font-size:.78rem;color:#374151;margin-bottom:6px;font-style:italic}
  .fc-error{background:#fef2f2;border-radius:4px;padding:8px 10px;margin-top:6px;margin-bottom:8px}
  .fc-error code{font-size:.74rem;color:#991b1b;word-break:break-word;white-space:pre-wrap;font-family:monospace}
  code{background:#f3f4f6;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:.78rem}
  .err-msg{color:#b91c1c;font-size:.73rem;background:transparent;padding:0}
  .empty-state{text-align:center;padding:48px;color:var(--muted);font-size:1.05rem}
  /* Media (screenshots + videos) */
  .media-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
  .thumb{width:180px;height:101px;object-fit:cover;border-radius:4px;border:1px solid var(--border);cursor:pointer;transition:transform .15s}
  .thumb:hover{transform:scale(1.04);box-shadow:0 4px 12px rgba(0,0,0,.2)}
  .video-link{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;background:#eff6ff;color:#1d4ed8;border-radius:6px;font-size:.8rem;font-weight:600;text-decoration:none;border:1px solid #bfdbfe}
  .video-link:hover{background:#dbeafe}
  /* Bug analysis */
  .bug-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;margin-bottom:18px}
  .bug-sev-card{border-radius:8px;padding:12px;text-align:center;border:2px solid}
  .bsc-num{font-size:1.8rem;font-weight:800}
  .bsc-lbl{font-size:.7rem;font-weight:600;text-transform:uppercase;color:var(--muted);margin-top:2px}
  .bug-legend{background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin-bottom:18px}
  .legend-title{font-weight:700;font-size:.88rem;margin-bottom:8px}
  .legend-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:5px}
  .legend-item{display:flex;align-items:center;gap:8px;font-size:.8rem;color:#374151}
  .sev-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
  .bug-cat-section{margin-bottom:22px}
  .bug-cat-header{font-size:.98rem;font-weight:700;color:var(--text);padding:8px 0;border-bottom:2px solid var(--border);margin-bottom:8px}
  .bug-card{background:#fff;border-radius:8px;padding:12px 16px;margin-bottom:8px;border-left:4px solid #dc2626;box-shadow:0 1px 3px rgba(0,0,0,.07)}
  .bug-card-header{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}
  .bug-card-file{font-size:.73rem;color:var(--muted);flex:1}
  .bug-card-dur{font-size:.73rem;color:var(--muted)}
  .bug-card-title{font-weight:600;font-size:.88rem;margin-bottom:4px}
  .bug-card-reason{font-size:.78rem;color:#374151;margin-bottom:4px;font-style:italic}
  .bug-card-error{background:#fef2f2;border-radius:4px;padding:6px 10px;margin-top:6px}
  .bug-card-error code{font-size:.72rem;color:#991b1b;word-break:break-word;font-family:monospace}
  footer{background:#1f2937;color:#9ca3af;text-align:center;padding:16px;font-size:.8rem;margin-top:28px}
  .spec-history{background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin-bottom:20px}
  .spec-history-title{font-weight:700;font-size:.9rem;margin-bottom:10px;color:var(--text)}
</style>
</head>
<body>

<div class="header">
  <h1>📊 QA Report – Sweet Cafe Odoo 19</h1>
  <p>Suite QA acumulativa · Backend + Frontend · Modulos: RRHH, Productos, Inventario, Reservas, POS, Ecommerce, Ventas, Contabilidad</p>
  <div class="meta">
    <span>📅 Actualizado: ${now}</span>
    <span>⏱️ Ultimo run: ${duration}s</span>
    <span>🌐 localhost:8069</span>
    <span>🗄️ Odoo 19</span>
    <span>📋 ${total} tests acumulados</span>
    <span>🐛 ${realBugCount} bugs reales</span>
    <span>📁 ${specEntries.length} specs ejecutados</span>
  </div>
</div>

<div class="score-section">
  <div class="ring-wrap">
    <svg class="ring" width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r="55" fill="none" stroke="#e5e7eb" stroke-width="13"/>
      <circle cx="65" cy="65" r="55" fill="none" stroke="${ringColor}" stroke-width="13"
        stroke-dasharray="345" stroke-dashoffset="${Math.round((1 - pct / 100) * 345)}" stroke-linecap="round"/>
    </svg>
    <div class="ring-pct" style="color:${ringColor}">${pct}%<small>SCORE</small></div>
  </div>
  <div class="stats-grid">
    <div class="stat-card stat-info"><div class="num">${total}</div><div class="lbl">Total</div></div>
    <div class="stat-card stat-pass"><div class="num">${passed}</div><div class="lbl">Pasan ✓</div></div>
    <div class="stat-card stat-fail"><div class="num">${failed}</div><div class="lbl">Fallan ✗</div></div>
    <div class="stat-card stat-crit"><div class="num">${realBugCount}</div><div class="lbl">Bugs Reales 🐛</div></div>
    <div class="stat-card stat-warn"><div class="num">${skipped}</div><div class="lbl">Saltados</div></div>
  </div>
  <div class="split-stats">
    <div class="split-card">
      <div class="sc-label" style="color:#1d4ed8">🔧 Backend</div>
      <div style="font-size:1.3rem;font-weight:800;color:#1d4ed8">${bePct}%</div>
      <div style="font-size:.78rem;color:var(--muted)">${bePassed}/${beTests.length}</div>
      <div class="progress" style="margin-top:5px"><div class="progress-fill ${this.fillClass(bePct)}" style="width:${bePct}%"></div></div>
    </div>
    <div class="split-card">
      <div class="sc-label" style="color:#059669">🌐 Frontend</div>
      <div style="font-size:1.3rem;font-weight:800;color:#059669">${fePct}%</div>
      <div style="font-size:.78rem;color:var(--muted)">${fePassed}/${feTests.length}</div>
      <div class="progress" style="margin-top:5px"><div class="progress-fill ${this.fillClass(fePct)}" style="width:${fePct}%"></div></div>
    </div>
  </div>
</div>

<div class="summary-banner ${bannerClass}">${bannerIcon} ${bannerMsg}</div>

<div class="tabs">
  <button class="tab-btn active" onclick="showTab('history',this)">📁 Specs (${specEntries.length})</button>
  <button class="tab-btn" onclick="showTab('suites',this)">📦 Por Modulo</button>
  <button class="tab-btn" onclick="showTab('all',this)">📋 Todos (${total})</button>
  <button class="tab-btn" onclick="showTab('failed',this)">🐛 Fallos (${failed})</button>
  <button class="tab-btn" onclick="showTab('bugs',this)">🔍 Bug Analysis (${realBugCount})</button>
</div>

<div id="tab-history" class="tab-content active">
  <div class="sec-title">📁 Specs Ejecutados – Historial</div>
  <table>
    <thead><tr><th>Spec</th><th>Tests</th><th>Pasan</th><th>Fallan</th><th style="min-width:160px">Cobertura</th><th>Ultimo Run</th></tr></thead>
    <tbody>${specHistoryRows || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">No hay specs ejecutados aun.</td></tr>'}</tbody>
  </table>
</div>

<div id="tab-suites" class="tab-content">
  <div class="sec-title">📦 Resultados por Modulo / Suite</div>
  <table>
    <thead><tr><th>Suite</th><th>Pasan</th><th>Fallan</th><th>Skip</th><th>Total</th><th style="min-width:160px">Cobertura</th></tr></thead>
    <tbody>${suiteRows}</tbody>
  </table>
</div>

<div id="tab-all" class="tab-content">
  <div class="sec-title">📋 Todos los Tests (${total})</div>
  <div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap">
    <input id="search-box" type="text" placeholder="🔍 Filtrar tests..." oninput="filterTests()" style="padding:7px 12px;border:1px solid var(--border);border-radius:6px;font-size:.85rem;width:300px">
    <select id="status-filter" onchange="filterTests()" style="padding:7px 12px;border:1px solid var(--border);border-radius:6px;font-size:.85rem">
      <option value="">Todos los estados</option>
      <option value="passed">Solo pasan</option>
      <option value="failed">Solo fallan</option>
      <option value="timedOut">Solo timeout</option>
    </select>
    <select id="spec-filter" onchange="filterTests()" style="padding:7px 12px;border:1px solid var(--border);border-radius:6px;font-size:.85rem">
      <option value="">Todos los specs</option>
      ${specEntries.map(([s]) => `<option value="${s}">${s}</option>`).join("")}
    </select>
  </div>
  <table id="all-tests-table">
    <thead><tr><th>Spec</th><th>Suite</th><th>Test</th><th>Estado</th><th>Tiempo</th><th>Ejecutado</th></tr></thead>
    <tbody>${allRows}</tbody>
  </table>
</div>

<div id="tab-failed" class="tab-content">
  <div class="sec-title">🐛 Tests Fallidos (${failed})</div>
  ${failedCards}
</div>

<div id="tab-bugs" class="tab-content">
  <div class="sec-title">🔍 Analisis de Bugs – Clasificacion por Severidad y Tipo</div>
  ${bugSection}
</div>

<footer>
  QA Report · Sweet Cafe Odoo 19 · Actualizado: ${now} · ${passed}/${total} pasan = ${pct}% · ${realBugCount} bugs reales
  · Generado por SweetCafeReporter v3 (acumulativo)
</footer>

<script>
function showTab(name, btn){
  document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  btn.classList.add('active');
}
function filterTests(){
  const search = document.getElementById('search-box').value.toLowerCase();
  const statusFilter = document.getElementById('status-filter').value;
  const specFilter = document.getElementById('spec-filter').value;
  const rows = document.querySelectorAll('#all-tests-table tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const hasBadgeFail = row.innerHTML.includes('badge-fail') || row.innerHTML.includes('timedOut');
    const hasBadgePass = row.innerHTML.includes('badge-pass') && !row.innerHTML.includes('badge-fail');
    const specCell = row.cells[0]?.textContent?.trim() || '';
    let show = true;
    if (search && !text.includes(search)) show = false;
    if (statusFilter === 'passed' && !hasBadgePass) show = false;
    if (statusFilter === 'failed' && !hasBadgeFail) show = false;
    if (specFilter && !specCell.includes(specFilter)) show = false;
    row.style.display = show ? '' : 'none';
  });
}
</script>
</body>
</html>`;
  }
}

export default SweetCafeReporter;
