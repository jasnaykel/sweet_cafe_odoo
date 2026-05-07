/**
 * Sweet CafÃ© QA â€” Custom HTML Reporter con AnÃ¡lisis de Bugs
 * ===========================================================
 * Genera reports/index.html automÃ¡ticamente despuÃ©s de cada test run.
 * Incluye:
 *   â€¢ Score global + split Backend/Frontend
 *   â€¢ Tabla por mÃ³dulo/suite
 *   â€¢ Listado completo de tests
 *   â€¢ ðŸ› Tab "Bug Analysis": clasifica cada fallo con severidad y categorÃ­a,
 *     distinguiendo bugs reales de comportamiento esperado del sistema.
 *
 * Uso en playwright.config.ts:
 *   reporter: [
 *     ['./src/reporters/sweet-cafe-reporter.ts'],
 *     ['list'],
 *   ]
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
  type BugCategory,
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
  projectName: string;
  /** ClasificaciÃ³n del bug (solo en tests fallidos) */
  bug?: BugClassification;
  /** HTTP errors capturados vÃ­a smart-fixtures attachment */
  capturedHttpErrors?: number[];
  /** Console errors capturados vÃ­a smart-fixtures attachment */
  capturedConsoleErrors?: string[];
}

interface SuiteStats {
  name: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  pct: number;
}

class SweetCafeReporter implements Reporter {
  private tests: TestRecord[] = [];
  private startTime = 0;
  private outputPath: string;

  constructor(options: { outputFile?: string } = {}) {
    this.outputPath =
      options.outputFile || path.resolve("reports", "index.html");
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.startTime = Date.now();
    this.tests = [];
  }

  /** Lee el attachment "bug-data" adjuntado por smart-fixtures.ts */
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

  onTestEnd(test: TestCase, result: TestResult): void {
    const titles = test.titlePath();
    const suiteName = titles.slice(1, -1).join(" > ") || "General";
    const errorMsg = result.errors?.[0]?.message;

    // Leer datos de red/consola adjuntados por smart-fixtures (si existen)
    const { httpStatuses, consoleMessages } = this.readBugAttachment(result);

    // Clasificar el bug si el test fallÃ³
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

    this.tests.push({
      title: test.title,
      suiteName,
      fullTitle: titles.join(" â€º "),
      status: result.status,
      duration: result.duration,
      error: errorMsg
        ? errorMsg.replace(/\x1b\[[0-9;]*m/g, "").slice(0, 400)
        : undefined,
      file: test.location?.file ? path.basename(test.location.file) : "unknown",
      projectName: test.parent?.project()?.name ?? "",
      bug,
      capturedHttpErrors: httpStatuses,
      capturedConsoleErrors: consoleMessages,
    });
  }

  async onEnd(result: FullResult): Promise<void> {
    const passed = this.tests.filter((t) => t.status === "passed").length;
    const failed = this.tests.filter(
      (t) => t.status === "failed" || t.status === "timedOut",
    ).length;
    const skipped = this.tests.filter((t) => t.status === "skipped").length;
    const total = this.tests.length;
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

    // Agrupar por suite
    const suitesMap = new Map<string, TestRecord[]>();
    for (const t of this.tests) {
      const key = `${t.file} â€º ${t.suiteName}`;
      if (!suitesMap.has(key)) suitesMap.set(key, []);
      suitesMap.get(key)!.push(t);
    }
    const suites: SuiteStats[] = [];
    for (const [name, tests] of suitesMap) {
      const sp = tests.filter((t) => t.status === "passed").length;
      const sf = tests.filter(
        (t) => t.status === "failed" || t.status === "timedOut",
      ).length;
      const ss = tests.filter((t) => t.status === "skipped").length;
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
      passed,
      failed,
      skipped,
      total,
      pct,
      duration,
      suites,
    );

    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.outputPath, html, "utf-8");
    console.log(`\nðŸ“Š  HTML Report â†’ ${this.outputPath}  (${pct}% passing)`);
  }

  private fillClass(pct: number): string {
    return pct >= 85 ? "fill-good" : pct >= 60 ? "fill-warn" : "fill-bad";
  }

  private statusBadge(status: TestRecord["status"]): string {
    switch (status) {
      case "passed":
        return '<span class="badge badge-pass">âœ“ PASA</span>';
      case "skipped":
        return '<span class="badge badge-skip">â€” SKIP</span>';
      default:
        return '<span class="badge badge-fail">âœ— FALLA</span>';
    }
  }

  private bugSeverityBadge(sev: string, label: string, color: string): string {
    return `<span style="display:inline-block;padding:2px 9px;border-radius:999px;font-size:.72rem;font-weight:700;background:${color}20;color:${color};border:1px solid ${color}60">${label}</span>`;
  }

  private buildBugSection(): string {
    const failedTests = this.tests.filter(
      (t) => t.status === "failed" || t.status === "timedOut",
    );

    if (failedTests.length === 0) {
      return `<div class="empty-state">ðŸŽ‰ Â¡Sin fallos! No hay bugs que reportar.</div>`;
    }

    // â”€â”€ Separar bugs reales de comportamiento esperado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const realBugs = failedTests.filter((t) => t.bug?.isRealBug !== false);
    const expectedBehavior = failedTests.filter(
      (t) => t.bug?.isRealBug === false,
    );

    // â”€â”€ Agrupar bugs reales por categorÃ­a â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const byCategory = new Map<string, typeof realBugs>();
    for (const t of realBugs) {
      const cat = t.bug?.category ?? "UNKNOWN";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(t);
    }

    // â”€â”€ Contadores de severidad â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Leyenda de clasificaciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const legend = `
<div class="bug-legend">
  <div class="legend-title">ðŸ“– GuÃ­a de ClasificaciÃ³n</div>
  <div class="legend-grid">
    <div class="legend-item"><span class="sev-dot" style="background:#dc2626"></span><strong>CRITICAL</strong> â€” Crash / Error 500 / ViolaciÃ³n de seguridad. Bloquea producciÃ³n.</div>
    <div class="legend-item"><span class="sev-dot" style="background:#ea580c"></span><strong>HIGH</strong> â€” ValidaciÃ³n faltante o UI crÃ­tico roto. Afecta flujos de negocio.</div>
    <div class="legend-item"><span class="sev-dot" style="background:#d97706"></span><strong>MEDIUM</strong> â€” UI secundario roto o timeout. No bloquea pero degrada UX.</div>
    <div class="legend-item"><span class="sev-dot" style="background:#6b7280"></span><strong>LOW / INFO</strong> â€” Error no clasificado o comportamiento conocido.</div>
    <div class="legend-item"><span class="sev-dot" style="background:#2563eb"></span><strong>SISTEMA OK</strong> â€” El sistema rechaza correctamente. NO es un bug.</div>
    <div class="legend-item"><span class="sev-dot" style="background:#16a34a"></span><strong>ESPERADO</strong> â€” Comportamiento conocido de Odoo. NO requiere acciÃ³n.</div>
  </div>
</div>`;

    // â”€â”€ Resumen de severidad â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const summary = `
<div class="bug-summary-grid">
  <div class="bug-sev-card" style="border-color:#dc2626;background:#fef2f2">
    <div class="bsc-num" style="color:#dc2626">${criticalCount}</div>
    <div class="bsc-lbl">CRÃTICOS</div>
  </div>
  <div class="bug-sev-card" style="border-color:#ea580c;background:#fff7ed">
    <div class="bsc-num" style="color:#ea580c">${highCount}</div>
    <div class="bsc-lbl">ALTOS</div>
  </div>
  <div class="bug-sev-card" style="border-color:#d97706;background:#fffbeb">
    <div class="bsc-num" style="color:#d97706">${mediumCount}</div>
    <div class="bsc-lbl">MEDIOS</div>
  </div>
  <div class="bug-sev-card" style="border-color:#6b7280;background:#f9fafb">
    <div class="bsc-num" style="color:#6b7280">${lowCount}</div>
    <div class="bsc-lbl">BAJOS</div>
  </div>
  <div class="bug-sev-card" style="border-color:#2563eb;background:#eff6ff">
    <div class="bsc-num" style="color:#2563eb">${expectedBehavior.length}</div>
    <div class="bsc-lbl">ESPERADOS âœ“</div>
  </div>
</div>`;

    // â”€â”€ Cards de bugs reales por categorÃ­a â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const categoryOrder: string[] = [
      "CRASH",
      "SECURITY_VIOLATION",
      "MISSING_VALIDATION",
      "UI_BROKEN",
      "PERFORMANCE_ISSUE",
      "UNKNOWN",
    ];

    let bugCards = "";
    for (const cat of categoryOrder) {
      const tests = byCategory.get(cat);
      if (!tests || tests.length === 0) continue;
      const catLabel = categoryLabel(cat as Parameters<typeof categoryLabel>[0]);
      bugCards += `<div class="bug-cat-section">
  <div class="bug-cat-header">${catLabel} <span style="font-size:.82rem;font-weight:500;color:var(--muted)">(${tests.length})</span></div>`;
      for (const t of tests.sort((a, b) =>
        severityOrder(a.bug!.severity) - severityOrder(b.bug!.severity),
      )) {
        const sev = t.bug!;
        bugCards += `
  <div class="bug-card" style="border-left-color:${sev.color}">
    <div class="bug-card-header">
      <span>${this.bugSeverityBadge(sev.severity, sev.label, sev.color)}</span>
      <span class="bug-card-file">${t.file} â€º ${t.suiteName}</span>
      <span class="bug-card-dur">${(t.duration / 1000).toFixed(1)}s</span>
    </div>
    <div class="bug-card-title">${t.title}</div>
    <div class="bug-card-reason">${sev.reason}</div>
    ${t.error ? `<div class="bug-card-error"><code>${t.error.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, " ").slice(0, 300)}</code></div>` : ""}
  </div>`;
      }
      bugCards += `</div>`;
    }

    // â”€â”€ SecciÃ³n de comportamiento esperado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let expectedSection = "";
    if (expectedBehavior.length > 0) {
      expectedSection = `
<div class="bug-cat-section" style="opacity:.7">
  <div class="bug-cat-header" style="color:#6b7280">â„¹ï¸ Comportamiento Esperado del Sistema (${expectedBehavior.length}) â€” No son bugs</div>
  <table>
    <thead><tr><th>Test</th><th>ClasificaciÃ³n</th><th>RazÃ³n</th></tr></thead>
    <tbody>${expectedBehavior
      .map(
        (t) => `<tr>
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
    passed: number,
    failed: number,
    skipped: number,
    total: number,
    pct: number,
    duration: string,
    suites: SuiteStats[],
  ): string {
    const now = new Date().toLocaleString("es-CU");
    const ringOffset = Math.round((1 - pct / 100) * 377);
    const ringColor = pct >= 85 ? "#16a34a" : pct >= 65 ? "#d97706" : "#dc2626";

    const bannerClass =
      pct >= 85 ? "banner-pass" : pct >= 65 ? "banner-warn" : "banner-fail";
    const bannerIcon = pct >= 85 ? "âœ…" : pct >= 65 ? "âš ï¸" : "ðŸ”´";
    const bannerMsg =
      pct >= 85
        ? `Sistema en buen estado: ${pct}% de tests pasan.`
        : pct >= 65
          ? `Sistema necesita atenciÃ³n: ${pct}% de tests pasan. Revisar los ${failed} fallos.`
          : `Sistema con problemas crÃ­ticos: solo ${pct}% de tests pasan.`;

    // Real bugs count (excluding expected behavior)
    const realBugCount = this.tests.filter(
      (t) => (t.status === "failed" || t.status === "timedOut") && t.bug?.isRealBug !== false,
    ).length;

    // Suite rows
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

    // All test rows
    const allRows = this.tests
      .map((t) => {
        const dur = t.duration > 0 ? `${(t.duration / 1000).toFixed(1)}s` : "-";
        const bugBadge = t.bug
          ? ` ${this.bugSeverityBadge(t.bug.severity, t.bug.label, t.bug.color)}`
          : "";
        const errHtml = t.error
          ? `<br><code class="err-msg">${t.error.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, " ")}</code>`
          : "";
        return `<tr>
        <td><span class="badge badge-proj">${t.projectName}</span></td>
        <td style="font-size:.8rem;color:var(--muted)">${t.suiteName}</td>
        <td>${t.title}${bugBadge}${errHtml}</td>
        <td>${this.statusBadge(t.status)}</td>
        <td style="font-size:.8rem;color:var(--muted)">${dur}</td>
      </tr>`;
      })
      .join("");

    // Failed test cards
    const failedTests = this.tests.filter(
      (t) => t.status === "failed" || t.status === "timedOut",
    );
    const failedCards =
      failedTests.length === 0
        ? `<div class="empty-state">ðŸŽ‰ Â¡Sin fallos! Todos los tests pasan.</div>`
        : failedTests
            .map(
              (t) => `
      <div class="failed-card">
        <div class="fc-header">
          <span class="fc-suite">${t.file} â€º ${t.suiteName}</span>
          <span class="fc-dur">${(t.duration / 1000).toFixed(1)}s</span>
        </div>
        <div class="fc-title">${t.title}${t.bug ? ` ${this.bugSeverityBadge(t.bug.severity, t.bug.label, t.bug.color)}` : ""}</div>
        ${t.bug ? `<div class="fc-reason" style="font-size:.8rem;color:#374151;margin-bottom:4px">â„¹ï¸ ${t.bug.reason}</div>` : ""}
        ${t.error ? `<div class="fc-error"><code>${t.error.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</code></div>` : ""}
      </div>`,
            )
            .join("");

    // Backend vs Frontend stats
    const beTests = this.tests.filter(
      (t) => !t.suiteName.includes("[FE]") && !t.file.includes("ecommerce"),
    );
    const feTests = this.tests.filter(
      (t) => t.suiteName.includes("[FE]") || t.file.includes("ecommerce"),
    );
    const bePassed = beTests.filter((t) => t.status === "passed").length;
    const fePassed = feTests.filter((t) => t.status === "passed").length;
    const bePct =
      beTests.length > 0 ? Math.round((bePassed / beTests.length) * 100) : 0;
    const fePct =
      feTests.length > 0 ? Math.round((fePassed / feTests.length) * 100) : 0;

    // Bug analysis section
    const bugSection = this.buildBugSection();

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QA Report â€” Sweet CafÃ© Odoo 19</title>
<style>
  :root {
    --pass:#16a34a;--fail:#dc2626;--warn:#d97706;--info:#2563eb;
    --pass-bg:#f0fdf4;--fail-bg:#fef2f2;--warn-bg:#fffbeb;--info-bg:#eff6ff;
    --border:#e5e7eb;--text:#111827;--muted:#6b7280;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f9fafb;color:var(--text)}
  .header{background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#fff;padding:40px 48px}
  .header h1{font-size:2rem;font-weight:700;margin-bottom:6px}
  .header p{opacity:.75;font-size:.95rem}
  .header .meta{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}
  .header .meta span{background:rgba(255,255,255,.15);border-radius:6px;padding:4px 12px;font-size:.82rem}
  .score-section{background:#fff;border-bottom:1px solid var(--border);padding:32px 48px;display:flex;gap:40px;align-items:center;flex-wrap:wrap}
  .ring-wrap{position:relative;width:140px;height:140px;flex-shrink:0}
  svg.ring{transform:rotate(-90deg)}
  .ring-pct{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:800;font-size:1.8rem}
  .ring-pct small{font-size:.7rem;font-weight:500;color:var(--muted)}
  .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:14px;flex:1;min-width:300px}
  .stat-card{border-radius:10px;padding:14px 16px;text-align:center}
  .stat-card .num{font-size:1.8rem;font-weight:800}
  .stat-card .lbl{font-size:.78rem;color:var(--muted);margin-top:2px}
  .stat-pass{background:var(--pass-bg);color:var(--pass)}
  .stat-fail{background:var(--fail-bg);color:var(--fail)}
  .stat-warn{background:var(--warn-bg);color:var(--warn)}
  .stat-info{background:var(--info-bg);color:var(--info)}
  .stat-crit{background:#fef2f2;color:#dc2626}
  .split-stats{display:flex;gap:12px;flex-wrap:wrap;align-items:stretch}
  .split-card{flex:1;min-width:140px;background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:12px 16px;font-size:.85rem}
  .split-card .sc-label{font-weight:700;margin-bottom:6px;font-size:.9rem}
  .summary-banner{margin:16px 48px 0;padding:12px 18px;border-radius:8px;font-size:.9rem;font-weight:600}
  .banner-pass{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
  .banner-fail{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c}
  .banner-warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
  .tabs{display:flex;gap:0;border-bottom:2px solid var(--border);padding:0 48px;margin-top:20px;background:#fff;flex-wrap:wrap}
  .tab-btn{padding:12px 20px;cursor:pointer;font-size:.9rem;font-weight:500;color:var(--muted);border:none;background:none;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .15s}
  .tab-btn.active{color:#2563eb;border-bottom-color:#2563eb}
  .tab-content{display:none;padding:24px 48px 48px}
  .tab-content.active{display:block}
  .sec-title{font-size:1.1rem;font-weight:700;margin-bottom:16px;color:var(--text);display:flex;align-items:center;gap:8px}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  thead{background:#f3f4f6}
  th{padding:11px 14px;text-align:left;font-size:.76rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
  td{padding:9px 14px;font-size:.875rem;border-top:1px solid var(--border);vertical-align:top}
  tr:hover{background:#f9fafb}
  .badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:.73rem;font-weight:600}
  .badge-pass{background:#dcfce7;color:#15803d}
  .badge-fail{background:#fee2e2;color:#b91c1c}
  .badge-skip{background:#f3f4f6;color:#6b7280}
  .badge-proj{background:#dbeafe;color:#1d4ed8;font-size:.7rem}
  .progress{height:7px;background:#e5e7eb;border-radius:999px;overflow:hidden}
  .progress-fill{height:100%;border-radius:999px;transition:width .3s}
  .fill-good{background:#16a34a}
  .fill-warn{background:#d97706}
  .fill-bad{background:#dc2626}
  .failed-card{background:#fff;border-radius:8px;padding:14px 18px;margin-bottom:10px;border-left:4px solid #dc2626;box-shadow:0 1px 3px rgba(0,0,0,.07)}
  .fc-header{display:flex;justify-content:space-between;margin-bottom:4px;font-size:.78rem;color:var(--muted)}
  .fc-title{font-weight:600;font-size:.9rem;color:var(--text);margin-bottom:4px}
  .fc-reason{font-size:.8rem;color:#374151;margin-bottom:4px}
  .fc-error{background:#fef2f2;border-radius:4px;padding:8px 10px;margin-top:6px}
  .fc-error code{font-size:.76rem;color:#991b1b;word-break:break-word;white-space:pre-wrap;font-family:monospace}
  code{background:#f3f4f6;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:.8rem}
  .err-msg{color:#b91c1c;font-size:.75rem;background:transparent;padding:0}
  .empty-state{text-align:center;padding:48px;color:var(--muted);font-size:1.1rem}
  footer{background:#1f2937;color:#9ca3af;text-align:center;padding:18px;font-size:.82rem;margin-top:32px}
  /* â”€â”€ Bug Analysis styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  .bug-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:12px;margin-bottom:20px}
  .bug-sev-card{border-radius:8px;padding:14px;text-align:center;border:2px solid}
  .bsc-num{font-size:2rem;font-weight:800}
  .bsc-lbl{font-size:.72rem;font-weight:600;text-transform:uppercase;color:var(--muted);margin-top:2px}
  .bug-legend{background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin-bottom:20px}
  .legend-title{font-weight:700;font-size:.9rem;margin-bottom:10px}
  .legend-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:6px}
  .legend-item{display:flex;align-items:center;gap:8px;font-size:.82rem;color:#374151}
  .sev-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
  .bug-cat-section{margin-bottom:24px}
  .bug-cat-header{font-size:1rem;font-weight:700;color:var(--text);padding:8px 0;border-bottom:2px solid var(--border);margin-bottom:10px}
  .bug-card{background:#fff;border-radius:8px;padding:14px 18px;margin-bottom:8px;border-left:4px solid #dc2626;box-shadow:0 1px 3px rgba(0,0,0,.07)}
  .bug-card-header{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}
  .bug-card-file{font-size:.75rem;color:var(--muted);flex:1}
  .bug-card-dur{font-size:.75rem;color:var(--muted)}
  .bug-card-title{font-weight:600;font-size:.9rem;margin-bottom:4px}
  .bug-card-reason{font-size:.8rem;color:#374151;margin-bottom:4px;font-style:italic}
  .bug-card-error{background:#fef2f2;border-radius:4px;padding:6px 10px;margin-top:6px}
  .bug-card-error code{font-size:.74rem;color:#991b1b;word-break:break-word;font-family:monospace}
</style>
</head>
<body>

<div class="header">
  <h1>ðŸ“Š QA Report â€” Sweet CafÃ© Odoo 19</h1>
  <p>Suite QA completa Â· Backend + Frontend Â· MÃ³dulos: RRHH, Productos, Inventario, Reservas, POS, Ecommerce, Ventas, Contabilidad</p>
  <div class="meta">
    <span>ðŸ“… ${now}</span>
    <span>â±ï¸ ${duration}s</span>
    <span>ðŸŒ localhost:8069</span>
    <span>ðŸ—„ï¸ Odoo 19</span>
    <span>ðŸ“‹ ${total} tests</span>
    <span>ðŸ› ${realBugCount} bugs reales</span>
  </div>
</div>

<div class="score-section">
  <div class="ring-wrap">
    <svg class="ring" width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r="60" fill="none" stroke="#e5e7eb" stroke-width="14"/>
      <circle cx="70" cy="70" r="60" fill="none" stroke="${ringColor}" stroke-width="14"
        stroke-dasharray="377" stroke-dashoffset="${ringOffset}" stroke-linecap="round"/>
    </svg>
    <div class="ring-pct" style="color:${ringColor}">${pct}%<small>SCORE</small></div>
  </div>
  <div class="stats-grid">
    <div class="stat-card stat-info"><div class="num">${total}</div><div class="lbl">Total</div></div>
    <div class="stat-card stat-pass"><div class="num">${passed}</div><div class="lbl">Pasan âœ“</div></div>
    <div class="stat-card stat-fail"><div class="num">${failed}</div><div class="lbl">Fallan âœ—</div></div>
    <div class="stat-card stat-crit"><div class="num">${realBugCount}</div><div class="lbl">Bugs Reales ðŸ›</div></div>
    <div class="stat-card stat-warn"><div class="num">${skipped}</div><div class="lbl">Saltados</div></div>
  </div>
  <div class="split-stats">
    <div class="split-card">
      <div class="sc-label" style="color:#1d4ed8">ðŸ”§ Backend</div>
      <div style="font-size:1.4rem;font-weight:800;color:#1d4ed8">${bePct}%</div>
      <div style="font-size:.8rem;color:var(--muted)">${bePassed}/${beTests.length}</div>
      <div class="progress" style="margin-top:6px"><div class="progress-fill ${this.fillClass(bePct)}" style="width:${bePct}%"></div></div>
    </div>
    <div class="split-card">
      <div class="sc-label" style="color:#059669">ðŸŒ Frontend</div>
      <div style="font-size:1.4rem;font-weight:800;color:#059669">${fePct}%</div>
      <div style="font-size:.8rem;color:var(--muted)">${fePassed}/${feTests.length}</div>
      <div class="progress" style="margin-top:6px"><div class="progress-fill ${this.fillClass(fePct)}" style="width:${fePct}%"></div></div>
    </div>
  </div>
</div>

<div class="summary-banner ${bannerClass}">${bannerIcon} ${bannerMsg}</div>

<div class="tabs">
  <button class="tab-btn active" onclick="showTab('suites',this)">ðŸ“¦ Por MÃ³dulo</button>
  <button class="tab-btn" onclick="showTab('all',this)">ðŸ“‹ Todos (${total})</button>
  <button class="tab-btn" onclick="showTab('failed',this)">ðŸ› Fallos (${failed})</button>
  <button class="tab-btn" onclick="showTab('bugs',this)">ðŸ” Bug Analysis (${realBugCount} reales)</button>
</div>

<div id="tab-suites" class="tab-content active">
  <div class="sec-title">ðŸ“¦ Resultados por MÃ³dulo / Suite</div>
  <table>
    <thead><tr><th>Suite</th><th>Pasan</th><th>Fallan</th><th>Skip</th><th>Total</th><th style="min-width:180px">Cobertura</th></tr></thead>
    <tbody>${suiteRows}</tbody>
  </table>
</div>

<div id="tab-all" class="tab-content">
  <div class="sec-title">ðŸ“‹ Todos los Tests</div>
  <table>
    <thead><tr><th>Proyecto</th><th>Suite</th><th>Test</th><th>Estado</th><th>Tiempo</th></tr></thead>
    <tbody>${allRows}</tbody>
  </table>
</div>

<div id="tab-failed" class="tab-content">
  <div class="sec-title">ðŸ› Tests Fallidos (${failed})</div>
  ${failedCards}
</div>

<div id="tab-bugs" class="tab-content">
  <div class="sec-title">ðŸ” AnÃ¡lisis de Bugs â€” ClasificaciÃ³n por Severidad y Tipo</div>
  ${bugSection}
</div>

<footer>
  QA Report Â· Sweet CafÃ© Odoo 19 Â· ${now} Â· ${passed}/${total} pasan = ${pct}% Â· ${realBugCount} bugs reales
  Â· Generado por SweetCafeReporter v2
</footer>

<script>
function showTab(name, btn){
  document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  btn.classList.add('active');
}
</script>
</body>
</html>`;
  }
}

export default SweetCafeReporter;
