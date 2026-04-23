/**
 * CTRL QA Agent - Test Executor Module
 * Executes generated tests using Playwright and captures results
 */

import { spawn, ChildProcess } from "child_process";
import { existsSync, readFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import {
  TestResult,
  ExecutionSummary,
  TestError,
  CoverageInfo,
} from "../types/index.js";
import { loadConfig } from "../config/index.js";

/**
 * Test Executor class
 */
export class TestExecutor {
  private config = loadConfig();
  private testsDir: string;
  private reportsDir: string;

  constructor(
    testsDir: string = "./generated-tests",
    reportsDir: string = "./reports",
  ) {
    this.testsDir = testsDir;
    this.reportsDir = reportsDir;
    this.ensureDirectories();
  }

  /**
   * Execute all generated tests
   */
  async executeAllTests(): Promise<ExecutionSummary> {
    console.log("🚀 Starting test execution...\n");
    const startTime = new Date();

    // Check if tests exist
    if (!this.hasTests()) {
      console.log('⚠️ No tests found. Run "generate" first.');
      return this.createEmptySummary(startTime);
    }

    // List available tests
    const testFiles = this.getTestFiles();
    console.log(`📋 Found ${testFiles.length} test files:`);
    testFiles.forEach((f) => console.log(`   - ${f}`));
    console.log("");

    // Execute Playwright tests
    const playwrightResult = await this.runPlaywright();

    // Parse results
    const results = await this.parseResults();
    const endTime = new Date();

    const summary: ExecutionSummary = {
      totalTests: results.length,
      passed: results.filter((r) => r.status === "passed").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      duration: endTime.getTime() - startTime.getTime(),
      startTime,
      endTime,
      results,
      coverage: this.calculateCoverage(results),
    };

    this.printSummary(summary);
    return summary;
  }

  /**
   * Execute specific test suite
   */
  async executeSuite(suiteName: string): Promise<ExecutionSummary> {
    console.log(`🚀 Executing suite: ${suiteName}\n`);
    const startTime = new Date();

    const testFile = this.findTestFile(suiteName);
    if (!testFile) {
      console.log(`⚠️ Suite not found: ${suiteName}`);
      return this.createEmptySummary(startTime);
    }

    // Execute specific test file
    const playwrightResult = await this.runPlaywright(testFile);

    // Parse results
    const results = await this.parseResults();
    const endTime = new Date();

    const summary: ExecutionSummary = {
      totalTests: results.length,
      passed: results.filter((r) => r.status === "passed").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      duration: endTime.getTime() - startTime.getTime(),
      startTime,
      endTime,
      results,
    };

    this.printSummary(summary);
    return summary;
  }

  /**
   * Run Playwright tests
   */
  private runPlaywright(
    testFile?: string,
  ): Promise<{ exitCode: number; output: string }> {
    return new Promise((resolve) => {
      const args = ["playwright", "test"];

      if (testFile) {
        args.push(testFile);
      }

      // Add configuration options
      args.push("--reporter=json,html");
      args.push(`--output=${this.reportsDir}/test-artifacts`);

      if (this.config.execution.headless) {
        // Headless is default in Playwright
      }

      if (this.config.execution.retries > 0) {
        args.push(`--retries=${this.config.execution.retries}`);
      }

      console.log(`📦 Running: npx ${args.join(" ")}\n`);

      let output = "";
      const proc = spawn("npx", args, {
        cwd: process.cwd(),
        shell: true,
        env: {
          ...process.env,
          FRONTEND_URL: this.config.urls.frontend,
          BACKEND_URL: this.config.urls.backend,
          TEST_ADMIN_EMAIL: this.config.auth.adminCredentials.email,
          TEST_ADMIN_PASSWORD: this.config.auth.adminCredentials.password,
          TEST_CANDIDATE_EMAIL: this.config.auth.candidateCredentials.email,
          TEST_CANDIDATE_PASSWORD:
            this.config.auth.candidateCredentials.password,
        },
      });

      proc.stdout?.on("data", (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      proc.stderr?.on("data", (data) => {
        const text = data.toString();
        output += text;
        process.stderr.write(text);
      });

      proc.on("close", (code) => {
        resolve({ exitCode: code || 0, output });
      });

      proc.on("error", (err) => {
        console.error("Failed to start Playwright:", err);
        resolve({ exitCode: 1, output: err.message });
      });
    });
  }

  /**
   * Parse test results from Playwright JSON output
   */
  private async parseResults(): Promise<TestResult[]> {
    const resultsFile = join(this.reportsDir, "test-results.json");

    if (!existsSync(resultsFile)) {
      console.log("⚠️ No results file found");
      return [];
    }

    try {
      const data = JSON.parse(readFileSync(resultsFile, "utf-8"));
      const results: TestResult[] = [];

      // Parse Playwright JSON format
      if (data.suites) {
        for (const suite of data.suites) {
          for (const spec of suite.specs || []) {
            for (const test of spec.tests || []) {
              const result = test.results?.[0];
              if (!result) continue;

              results.push({
                testId: spec.title,
                testName: spec.title,
                suite: suite.title,
                status: this.mapStatus(result.status),
                duration: result.duration || 0,
                error: result.error ? this.parseError(result.error) : undefined,
                screenshots:
                  result.attachments
                    ?.filter((a: any) => a.contentType?.includes("image"))
                    .map((a: any) => a.path) || [],
                video: result.attachments?.find((a: any) =>
                  a.contentType?.includes("video"),
                )?.path,
                retries: result.retry || 0,
                browser: test.projectName || "chromium",
                timestamp: new Date(result.startTime || Date.now()),
              });
            }
          }
        }
      }

      return results;
    } catch (error) {
      console.error("Error parsing results:", error);
      return [];
    }
  }

  /**
   * Map Playwright status to our status
   */
  private mapStatus(status: string): TestResult["status"] {
    switch (status) {
      case "passed":
        return "passed";
      case "failed":
        return "failed";
      case "skipped":
        return "skipped";
      case "timedOut":
        return "error";
      default:
        return "error";
    }
  }

  /**
   * Parse error details
   */
  private parseError(error: any): TestError {
    const message = error.message || String(error);

    // Determine error type
    let type: TestError["type"] = "unknown";
    if (message.includes("timeout") || message.includes("Timeout")) {
      type = "timeout";
    } else if (
      message.includes("locator") ||
      message.includes("selector") ||
      message.includes("not found")
    ) {
      type = "element_not_found";
    } else if (message.includes("expect") || message.includes("assertion")) {
      type = "assertion";
    } else if (message.includes("net::") || message.includes("network")) {
      type = "network";
    } else if (message.includes("Error:") || message.includes("TypeError")) {
      type = "javascript";
    }

    return {
      message,
      stack: error.stack,
      type,
      expected: error.expected,
      actual: error.actual,
    };
  }

  /**
   * Calculate test coverage
   */
  private calculateCoverage(results: TestResult[]): CoverageInfo {
    // Simple coverage calculation based on test categories
    const categories = new Set(results.map((r) => r.suite));
    const totalCategories = 8; // auth, candidate, admin, typing, call-sim, sjt, api, etc.

    return {
      pages: Math.round((categories.size / totalCategories) * 15), // Approximate pages covered
      routes: Math.round((categories.size / totalCategories) * 20),
      apis: results.filter((r) => r.suite.toLowerCase().includes("api")).length,
      components: Math.round((categories.size / totalCategories) * 30),
      percentage: Math.round(
        (results.filter((r) => r.status === "passed").length /
          Math.max(results.length, 1)) *
          100,
      ),
    };
  }

  /**
   * Print execution summary
   */
  private printSummary(summary: ExecutionSummary): void {
    console.log("\n" + "═".repeat(60));
    console.log("📊 TEST EXECUTION SUMMARY");
    console.log("═".repeat(60));
    console.log(`
Total Tests:  ${summary.totalTests}
✅ Passed:    ${summary.passed}
❌ Failed:    ${summary.failed}
⏭️ Skipped:   ${summary.skipped}
⏱️ Duration:  ${(summary.duration / 1000).toFixed(2)}s
`);

    if (summary.failed > 0) {
      console.log("❌ FAILED TESTS:");
      console.log("-".repeat(40));
      summary.results
        .filter((r) => r.status === "failed")
        .forEach((r) => {
          console.log(`  • ${r.testName}`);
          if (r.error) {
            console.log(`    Error: ${r.error.message.substring(0, 100)}...`);
          }
        });
      console.log("");
    }

    if (summary.coverage) {
      console.log("📈 COVERAGE:");
      console.log("-".repeat(40));
      console.log(`  Pages:      ${summary.coverage.pages}`);
      console.log(`  Routes:     ${summary.coverage.routes}`);
      console.log(`  APIs:       ${summary.coverage.apis}`);
      console.log(`  Components: ${summary.coverage.components}`);
      console.log(`  Pass Rate:  ${summary.coverage.percentage}%`);
    }

    console.log("═".repeat(60));
  }

  /**
   * Check if tests exist
   */
  private hasTests(): boolean {
    return existsSync(this.testsDir) && this.getTestFiles().length > 0;
  }

  /**
   * Get list of test files
   */
  private getTestFiles(): string[] {
    if (!existsSync(this.testsDir)) return [];
    return readdirSync(this.testsDir).filter((f) => f.endsWith(".spec.ts"));
  }

  /**
   * Find test file by suite name
   */
  private findTestFile(suiteName: string): string | null {
    const files = this.getTestFiles();
    const normalized = suiteName.toLowerCase().replace(/\s+/g, "-");
    const match = files.find((f) => f.toLowerCase().includes(normalized));
    return match ? join(this.testsDir, match) : null;
  }

  /**
   * Create empty summary
   */
  private createEmptySummary(startTime: Date): ExecutionSummary {
    const endTime = new Date();
    return {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: endTime.getTime() - startTime.getTime(),
      startTime,
      endTime,
      results: [],
    };
  }

  /**
   * Ensure directories exist
   */
  private ensureDirectories(): void {
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }
  }
}

export default TestExecutor;
