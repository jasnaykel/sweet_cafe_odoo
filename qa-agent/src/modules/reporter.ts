/**
 * CTRL QA Agent - Report Generator Module
 * Generates comprehensive QA reports in multiple formats
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import Handlebars from "handlebars";
import {
  QAReport,
  ExecutionSummary,
  ProjectStructure,
  ErrorAnalysis,
  FlowAnalysis,
  Recommendation,
  CriticalIssue,
} from "../types/index.js";
import { loadConfig } from "../config/index.js";

/**
 * Report Generator class
 */
export class ReportGenerator {
  private config = loadConfig();
  private outputDir: string;

  constructor(outputDir?: string) {
    this.outputDir = outputDir || this.config.reporting.outputDir;
    this.ensureOutputDir();
    this.registerHelpers();
  }

  /**
   * Generate complete QA report
   */
  async generateReport(
    summary: ExecutionSummary,
    structure: ProjectStructure,
    errorAnalysis: ErrorAnalysis[],
    flowAnalysis: FlowAnalysis[],
  ): Promise<QAReport> {
    console.log("📝 Generating QA Report...\n");

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      errorAnalysis,
      flowAnalysis,
    );

    // Identify critical issues
    const criticalIssues = this.identifyCriticalIssues(
      errorAnalysis,
      flowAnalysis,
    );

    // Calculate health score
    const healthScore = this.calculateHealthScore(summary, flowAnalysis);

    const report: QAReport = {
      projectName: "CTRL Assessment Platform",
      version: structure.version,
      generatedAt: new Date(),
      summary,
      projectStructure: structure,
      flowAnalysis,
      errorAnalysis,
      recommendations,
      healthScore,
      criticalIssues,
    };

    // Generate outputs
    await this.generateJSONReport(report);
    await this.generateHTMLReport(report);
    await this.generateMarkdownReport(report);

    console.log(`✅ Reports generated in: ${this.outputDir}\n`);
    return report;
  }

  /**
   * Generate JSON report
   */
  private async generateJSONReport(report: QAReport): Promise<void> {
    const filePath = join(this.outputDir, "qa-report.json");
    writeFileSync(filePath, JSON.stringify(report, null, 2), "utf-8");
    console.log(`   📄 JSON: ${filePath}`);
  }

  /**
   * Generate HTML report
   */
  private async generateHTMLReport(report: QAReport): Promise<void> {
    const template = this.getHTMLTemplate();
    const compiled = Handlebars.compile(template);
    const html = compiled(report);

    const filePath = join(this.outputDir, "qa-report.html");
    writeFileSync(filePath, html, "utf-8");
    console.log(`   🌐 HTML: ${filePath}`);
  }

  /**
   * Generate Markdown report
   */
  private async generateMarkdownReport(report: QAReport): Promise<void> {
    const markdown = this.generateMarkdownContent(report);
    const filePath = join(this.outputDir, "qa-report.md");
    writeFileSync(filePath, markdown, "utf-8");
    console.log(`   📝 Markdown: ${filePath}`);
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    errorAnalysis: ErrorAnalysis[],
    flowAnalysis: FlowAnalysis[],
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Group errors by category
    const errorsByCategory = this.groupBy(errorAnalysis, "category");

    // Generate recommendations per category
    for (const [category, errors] of Object.entries(errorsByCategory)) {
      if (errors.length === 0) continue;

      const priority = this.getPriorityForCategory(category as string);

      recommendations.push({
        id: `REC-${category.toUpperCase()}-001`,
        priority,
        area: this.formatCategory(category as string),
        title: `Fix ${errors.length} ${this.formatCategory(category as string)} issue(s)`,
        description: errors.map((e) => e.suggestedFix).join("\n"),
        impact: errors[0].businessImpact || "Improves system stability",
        effort:
          errors.length > 3 ? "high" : errors.length > 1 ? "medium" : "low",
      });
    }

    // Add flow-based recommendations
    const brokenFlows = flowAnalysis.filter((f) => f.status === "broken");
    for (const flow of brokenFlows) {
      recommendations.push({
        id: `REC-FLOW-${flow.flowName.replace(/\s+/g, "-").toUpperCase()}`,
        priority: "critical",
        area: flow.flowName,
        title: `Restore ${flow.flowName}`,
        description: flow.recommendations.join("\n"),
        impact: `Critical business flow is not working`,
        effort: "high",
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );

    return recommendations;
  }

  /**
   * Identify critical issues
   */
  private identifyCriticalIssues(
    errorAnalysis: ErrorAnalysis[],
    flowAnalysis: FlowAnalysis[],
  ): CriticalIssue[] {
    const criticalIssues: CriticalIssue[] = [];

    // Critical errors
    const criticalErrors = errorAnalysis.filter(
      (e) => e.severity === "critical",
    );
    for (const error of criticalErrors) {
      criticalIssues.push({
        id: `CRIT-${error.testId}`,
        title: `Critical failure in ${error.affectedArea}`,
        description: error.rootCause,
        affectedFeature: error.affectedArea,
        businessImpact: error.businessImpact,
        reproduction: [`Caused by test: ${error.testId}`],
        suggestedFix: error.suggestedFix,
      });
    }

    // Broken flows
    const brokenFlows = flowAnalysis.filter((f) => f.status === "broken");
    for (const flow of brokenFlows) {
      criticalIssues.push({
        id: `CRIT-FLOW-${flow.flowName.replace(/\s+/g, "-")}`,
        title: `${flow.flowName} is completely broken`,
        description: `Flow fails at: ${flow.failurePoint || "first step"}`,
        affectedFeature: flow.flowName,
        businessImpact: "Users cannot complete this business workflow",
        reproduction: flow.errors.map((e) => e.testId),
        suggestedFix: flow.recommendations.join("\n"),
      });
    }

    return criticalIssues;
  }

  /**
   * Calculate system health score
   */
  private calculateHealthScore(
    summary: ExecutionSummary,
    flowAnalysis: FlowAnalysis[],
  ): number {
    let score = 100;

    // Test pass rate (max 50 points impact)
    const passRate =
      summary.totalTests > 0
        ? (summary.passed / summary.totalTests) * 100
        : 100;
    score -= (100 - passRate) * 0.5;

    // Flow status (max 30 points impact)
    const brokenFlows = flowAnalysis.filter(
      (f) => f.status === "broken",
    ).length;
    const partialFlows = flowAnalysis.filter(
      (f) => f.status === "partial",
    ).length;
    const totalFlows = flowAnalysis.length || 1;

    score -= (brokenFlows / totalFlows) * 20;
    score -= (partialFlows / totalFlows) * 10;

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate Markdown content
   */
  private generateMarkdownContent(report: QAReport): string {
    return `# 📊 CTRL QA Report

**Generated:** ${report.generatedAt.toISOString()}  
**Version:** ${report.version}  
**Health Score:** ${report.healthScore}%

---

## 📈 Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${report.summary.totalTests} |
| ✅ Passed | ${report.summary.passed} |
| ❌ Failed | ${report.summary.failed} |
| ⏭️ Skipped | ${report.summary.skipped} |
| ⏱️ Duration | ${(report.summary.duration / 1000).toFixed(2)}s |

---

## 🚨 Critical Issues (${report.criticalIssues.length})

${
  report.criticalIssues.length === 0
    ? "✅ No critical issues found!"
    : report.criticalIssues
        .map(
          (issue) => `
### ${issue.title}

- **ID:** ${issue.id}
- **Affected:** ${issue.affectedFeature}
- **Impact:** ${issue.businessImpact}

**Description:** ${issue.description}

**Fix:** ${issue.suggestedFix}
`,
        )
        .join("\n")
}

---

## 🔄 Business Flows Status

| Flow | Status | Progress | Failure Point |
|------|--------|----------|---------------|
${report.flowAnalysis
  .map(
    (flow) =>
      `| ${flow.flowName} | ${flow.status === "working" ? "✅" : flow.status === "partial" ? "🔄" : "❌"} ${flow.status} | ${flow.completedSteps}/${flow.totalSteps} | ${flow.failurePoint || "-"} |`,
  )
  .join("\n")}

---

## ❌ Failed Tests (${report.summary.failed})

${
  report.errorAnalysis.length === 0
    ? "✅ All tests passed!"
    : report.errorAnalysis
        .map(
          (error) => `
### ${error.testId}

- **Category:** ${error.category}
- **Severity:** ${error.severity}
- **Area:** ${error.affectedArea}

**Root Cause:** ${error.rootCause}

**Business Impact:** ${error.businessImpact}

**Suggested Fix:**
${error.suggestedFix}

${
  error.codeExample
    ? `\`\`\`
${error.codeExample}
\`\`\``
    : ""
}
`,
        )
        .join("\n")
}

---

## 💡 Recommendations

${report.recommendations
  .map(
    (rec, i) => `
### ${i + 1}. ${rec.title}

- **Priority:** ${rec.priority}
- **Area:** ${rec.area}
- **Effort:** ${rec.effort}

${rec.description}

**Impact:** ${rec.impact}
`,
  )
  .join("\n")}

---

## 📁 Project Structure

- **Routes:** ${report.projectStructure.routes.length}
- **Components:** ${report.projectStructure.components.length}
- **API Endpoints:** ${report.projectStructure.apiEndpoints.length}
- **Pages:** ${report.projectStructure.pages.length}

---

*Report generated by CTRL QA Agent*
`;
  }

  /**
   * Get HTML template
   */
  private getHTMLTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CTRL QA Report</title>
    <style>
        :root {
            --bg: #0f172a;
            --bg-card: #1e293b;
            --text: #f1f5f9;
            --text-muted: #94a3b8;
            --border: #334155;
            --success: #22c55e;
            --error: #ef4444;
            --warning: #f59e0b;
            --info: #3b82f6;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 2rem;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1, h2, h3 { margin-bottom: 1rem; }
        h1 { font-size: 2rem; border-bottom: 2px solid var(--border); padding-bottom: 1rem; }
        h2 { font-size: 1.5rem; margin-top: 2rem; color: var(--info); }
        .card {
            background: var(--bg-card);
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1rem 0;
            border: 1px solid var(--border);
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }
        .stat {
            text-align: center;
            padding: 1rem;
            background: var(--bg);
            border-radius: 8px;
        }
        .stat-value { font-size: 2rem; font-weight: bold; }
        .stat-label { color: var(--text-muted); font-size: 0.875rem; }
        .success { color: var(--success); }
        .error { color: var(--error); }
        .warning { color: var(--warning); }
        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-critical { background: var(--error); }
        .badge-high { background: #dc2626; }
        .badge-medium { background: var(--warning); color: #000; }
        .badge-low { background: var(--info); }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }
        th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }
        th { color: var(--text-muted); font-weight: 500; }
        .health-score {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            font-weight: bold;
            margin: 1rem auto;
        }
        .health-good { background: linear-gradient(135deg, #22c55e, #16a34a); }
        .health-medium { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .health-bad { background: linear-gradient(135deg, #ef4444, #dc2626); }
        pre {
            background: var(--bg);
            padding: 1rem;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 0.875rem;
        }
        .flow-status { display: flex; align-items: center; gap: 0.5rem; }
        .flow-icon { font-size: 1.25rem; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 CTRL QA Report</h1>
            <p style="color: var(--text-muted);">
                Generated: {{formatDate generatedAt}} | Version: {{version}}
            </p>
        </header>

        <section class="card">
            <h2>📈 Executive Summary</h2>
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">{{summary.totalTests}}</div>
                    <div class="stat-label">Total Tests</div>
                </div>
                <div class="stat">
                    <div class="stat-value success">{{summary.passed}}</div>
                    <div class="stat-label">Passed</div>
                </div>
                <div class="stat">
                    <div class="stat-value error">{{summary.failed}}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat">
                    <div class="stat-value">{{formatDuration summary.duration}}</div>
                    <div class="stat-label">Duration</div>
                </div>
            </div>
            
            <div class="health-score {{healthClass healthScore}}">
                {{healthScore}}%
            </div>
            <p style="text-align: center; color: var(--text-muted);">System Health Score</p>
        </section>

        {{#if criticalIssues.length}}
        <section class="card">
            <h2>🚨 Critical Issues</h2>
            {{#each criticalIssues}}
            <div class="card" style="border-color: var(--error);">
                <h3>{{title}}</h3>
                <p><strong>Affected:</strong> {{affectedFeature}}</p>
                <p><strong>Impact:</strong> {{businessImpact}}</p>
                <p><strong>Description:</strong> {{description}}</p>
                <p><strong>Fix:</strong> {{suggestedFix}}</p>
            </div>
            {{/each}}
        </section>
        {{/if}}

        <section class="card">
            <h2>🔄 Business Flows</h2>
            <table>
                <thead>
                    <tr>
                        <th>Flow</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Failure Point</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each flowAnalysis}}
                    <tr>
                        <td>{{flowName}}</td>
                        <td>
                            <span class="flow-status">
                                <span class="flow-icon">{{flowIcon status}}</span>
                                {{status}}
                            </span>
                        </td>
                        <td>{{completedSteps}}/{{totalSteps}}</td>
                        <td>{{#if failurePoint}}{{failurePoint}}{{else}}-{{/if}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </section>

        {{#if errorAnalysis.length}}
        <section class="card">
            <h2>❌ Failed Tests Analysis</h2>
            {{#each errorAnalysis}}
            <div class="card">
                <h3>{{testId}}</h3>
                <span class="badge badge-{{severity}}">{{severity}}</span>
                <span class="badge badge-medium">{{category}}</span>
                <p><strong>Area:</strong> {{affectedArea}}</p>
                <p><strong>Root Cause:</strong> {{rootCause}}</p>
                <p><strong>Impact:</strong> {{businessImpact}}</p>
                <details>
                    <summary>Suggested Fix</summary>
                    <pre>{{suggestedFix}}</pre>
                </details>
            </div>
            {{/each}}
        </section>
        {{/if}}

        <section class="card">
            <h2>💡 Recommendations</h2>
            {{#each recommendations}}
            <div class="card">
                <span class="badge badge-{{priority}}">{{priority}}</span>
                <h3>{{title}}</h3>
                <p><strong>Area:</strong> {{area}} | <strong>Effort:</strong> {{effort}}</p>
                <p>{{description}}</p>
                <p><strong>Impact:</strong> {{impact}}</p>
            </div>
            {{/each}}
        </section>

        <footer style="text-align: center; margin-top: 2rem; color: var(--text-muted);">
            <p>Generated by CTRL QA Agent</p>
        </footer>
    </div>
</body>
</html>`;
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    Handlebars.registerHelper("formatDate", (date: Date) => {
      return new Date(date).toLocaleString();
    });

    Handlebars.registerHelper("formatDuration", (ms: number) => {
      return `${(ms / 1000).toFixed(1)}s`;
    });

    Handlebars.registerHelper("healthClass", (score: number) => {
      if (score >= 80) return "health-good";
      if (score >= 50) return "health-medium";
      return "health-bad";
    });

    Handlebars.registerHelper("flowIcon", (status: string) => {
      if (status === "working") return "✅";
      if (status === "partial") return "🔄";
      return "❌";
    });
  }

  /**
   * Group items by key
   */
  private groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
    return items.reduce(
      (acc, item) => {
        const groupKey = String(item[key]);
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(item);
        return acc;
      },
      {} as Record<string, T[]>,
    );
  }

  /**
   * Get priority for error category
   */
  private getPriorityForCategory(category: string): Recommendation["priority"] {
    switch (category) {
      case "authentication":
        return "critical";
      case "api_integration":
      case "data_integrity":
        return "high";
      case "navigation":
      case "state_management":
        return "medium";
      default:
        return "low";
    }
  }

  /**
   * Format category name
   */
  private formatCategory(category: string): string {
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDir(): void {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }
}

export default ReportGenerator;
